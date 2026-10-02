const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:7149';

// In-memory cache & In-flight request deduplication
const apiCache = new Map();
const inFlightRequests = new Map();

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

  // Invalidate read cache on mutation methods (POST, PUT, DELETE)
  if (method !== 'GET') {
    apiCache.clear();
  } else if (!options.noCache) {
    const cacheKey = `${url}:${token || ''}`;
    const cached = apiCache.get(cacheKey);
    const now = Date.now();
    const ttl = options.cacheTtlMs || 5000; // 5s short-term cache for rapid navigation

    if (cached && now - cached.timestamp < ttl) {
      return cached.data;
    }

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
  clearCache: () => apiCache.clear(),
  baseUrl: API_URL,
};
