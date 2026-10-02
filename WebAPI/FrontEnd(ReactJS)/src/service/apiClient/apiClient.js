const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:7149';

// In-memory cache & In-flight request deduplication
const apiCache = new Map();
const inFlightRequests = new Map();
const CACHE_DELIMITER = '@@token:';

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

export async function request(endpoint, options = {}) {
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
        const response = await fetch(url, config);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const errorMessage = data.message || data.title || `Lỗi kết nối máy chủ (${response.status})`;
          const error = new Error(errorMessage);
          error.status = response.status;
          error.data = data;
          throw error;
        }
        apiCache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      } finally {
        inFlightRequests.delete(cacheKey);
      }
    })();

    // Gắn no-op catch handler vào stored promise để tránh UnhandledPromiseRejection leak
    fetchPromise.catch(() => {});

    inFlightRequests.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  const response = await fetch(url, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = data.message || data.title || `Lỗi kết nối máy chủ (${response.status})`;
    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
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
  baseUrl: API_URL,
};
