const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:7149';

// In-memory cache & In-flight request deduplication
const apiCache = new Map();
const inFlightRequests = new Map();
const CACHE_DELIMITER = '@@token:';
const failureListeners = new Set();
let sessionVersion = 0;

export function subscribeApiFailures(listener) {
  failureListeners.add(listener);
  return () => failureListeners.delete(listener);
}

/**
 * Mapping các tài nguyên liên quan khi có thao tác mutation (POST, PUT, DELETE).
 * Giúp invalidate chính xác các endpoint bị ảnh hưởng thay vì xoá sạch toàn bộ cache.
 */
const RESOURCE_DEPENDENCIES = {
  '/api/bags': ['/api/bags', '/api/sessions', '/api/dashboard/stats'],
  '/api/sessions': ['/api/sessions', '/api/bags', '/api/reviews', '/api/dashboard/stats'],
  '/api/reviews': ['/api/reviews', '/api/sessions', '/api/reports', '/api/dashboard/stats'],
  '/api/reports': ['/api/reports'],
  '/api/admin/members': ['/api/admin/members', '/api/dashboard/stats'],
  '/api/admin/ai-config': ['/api/admin/ai-config', '/api/admin/ai-usage'],
  '/api/user-activity': ['/api/user-activity'],
};

/**
 * Xóa cache theo prefix hoặc danh sách tài nguyên liên quan.
 * Tách riêng phần URL để so khớp, tránh so nhầm vào chuỗi token hoặc URL không liên quan.
 */
function invalidateCache(endpointOrPrefixes) {
  if (!endpointOrPrefixes) {
    apiCache.clear();
    return;
  }

  let prefixesToInvalidate = [];

  if (Array.isArray(endpointOrPrefixes)) {
    prefixesToInvalidate = endpointOrPrefixes;
  } else {
    // Tìm các tài nguyên liên quan trong danh mục dependencies
    const matchedKey = Object.keys(RESOURCE_DEPENDENCIES).find((key) =>
      endpointOrPrefixes.includes(key)
    );

    if (matchedKey) {
      prefixesToInvalidate = RESOURCE_DEPENDENCIES[matchedKey];
    } else {
      // Mặc định: tách lấy base resource path (ví dụ /api/xyz)
      const pathOnly = endpointOrPrefixes.split('?')[0];
      const segments = pathOnly.split('/').filter(Boolean);
      const baseResource = segments.length >= 2 ? `/${segments[0]}/${segments[1]}` : pathOnly;
      prefixesToInvalidate = [baseResource];
    }
  }

  // Duyệt và xoá các cache entry khớp prefix dựa trên URL path
  for (const cacheKey of apiCache.keys()) {
    // Tách phần URL ra khỏi token để tránh match nhầm ký tự trong token string
    const [cachedUrl] = cacheKey.split(CACHE_DELIMITER);
    let cachedPath = cachedUrl;
    try {
      cachedPath = new URL(cachedUrl, API_URL).pathname;
    } catch {
      cachedPath = cachedUrl.split('?')[0];
    }

    const shouldInvalidate = prefixesToInvalidate.some((prefix) => {
      return (
        cachedPath === prefix ||
        cachedPath.startsWith(`${prefix}/`) ||
        cachedPath.startsWith(`${prefix}?`)
      );
    });

    if (shouldInvalidate) {
      apiCache.delete(cacheKey);
    }
  }
}

async function performRequest(endpoint, options = {}) {
  const version = sessionVersion;
  const method = (options.method || 'GET').toUpperCase();
  const token = localStorage.getItem('accessToken');
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };
  delete config.handleErrorLocally;

  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

  // Invalidate có mục tiêu (Granular Cache Invalidation) khi thực hiện mutation
  if (method !== 'GET') {
    invalidateCache(endpoint);
  } else if (!options.noCache) {
    const cacheKey = `${url}${CACHE_DELIMITER}${token || ''}`;
    const cached = apiCache.get(cacheKey);
    const now = Date.now();
    const ttl = options.cacheTtlMs || 5000; // 5s short-term cache for rapid navigation

    if (cached && now - cached.timestamp < ttl) {
      return cached.data;
    }

    // Deduplicate in-flight GET requests
    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey);
    }

    const fetchPromise = (async () => {
      try {
        const response = await checkedFetch(url, config, token);
        const data = await readResponseData(response);
        if (!response.ok) {
          const errorMessage = data.message || data.title || `Lỗi kết nối máy chủ (${response.status})`;
          const error = new Error(errorMessage);
          error.status = response.status;
          error.data = data;
          throw error;
        }
        if (version !== sessionVersion || token !== localStorage.getItem('accessToken')) {
          throw new DOMException('Request belongs to a previous session.', 'AbortError');
        }
        apiCache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      } finally {
        if (inFlightRequests.get(cacheKey) === fetchPromise) inFlightRequests.delete(cacheKey);
      }
    })();

    inFlightRequests.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  const response = await checkedFetch(url, config, token);
  const data = await readResponseData(response);

  if (!response.ok) {
    const errorMessage = data.message || data.title || `Lỗi kết nối máy chủ (${response.status})`;
    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

async function readResponseData(response) {
  if (response.status === 204) return {};
  try {
    return await response.json();
  } catch {
    if (!response.ok) return {};
    const error = new Error('Máy chủ trả về dữ liệu không hợp lệ.');
    error.status = 502;
    throw error;
  }
}

async function checkedFetch(url, config, token) {
  const version = sessionVersion;
  const response = await fetch(url, {
    ...config,
    cache: 'no-store',
    signal: config.signal || ((config.method || 'GET') === 'GET' ? AbortSignal.timeout(12000) : undefined),
  });
  if (version !== sessionVersion || token !== localStorage.getItem('accessToken')) {
    throw new DOMException('Request belongs to a previous session.', 'AbortError');
  }
  return response;
}

export async function request(endpoint, options = {}) {
  const version = sessionVersion;
  const token = localStorage.getItem('accessToken');
  try {
    const data = await performRequest(endpoint, options);
    if (version !== sessionVersion || token !== localStorage.getItem('accessToken')) {
      throw new DOMException('Request belongs to a previous session.', 'AbortError');
    }
    return data;
  } catch (error) {
    if (version !== sessionVersion || error.name === 'AbortError') throw error;
    const method = (options.method || 'GET').toUpperCase();
    // Validation errors stay with their form; failed reads must never look like live data.
    if (!(options.handleErrorLocally && method !== 'GET') && (!error.status || method === 'GET' || error.status >= 500)) {
      apiCache.clear();
      failureListeners.forEach((listener) => listener(error));
    }
    throw error;
  }
}

export const apiClient = {
  get: (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => {
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    return request(endpoint, {
      ...options,
      method: 'POST',
      body: isForm ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    });
  },
  put: (endpoint, body, options = {}) => {
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    return request(endpoint, {
      ...options,
      method: 'PUT',
      body: isForm ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    });
  },
  delete: (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' }),
  clearCache: (prefix) => invalidateCache(prefix),
  resetSession: () => {
    sessionVersion += 1;
    apiCache.clear();
    inFlightRequests.clear();
  },
  baseUrl: API_URL,
};
