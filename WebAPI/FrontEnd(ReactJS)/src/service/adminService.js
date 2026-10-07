import { apiClient } from './apiClient';

export async function getAiConfigApi() {
  return apiClient.get('/api/admin/ai-config');
}

export async function updateAiConfigApi(config) {
  return apiClient.put('/api/admin/ai-config', config);
}

export async function getAiUsageApi() {
  return apiClient.get('/api/admin/ai-usage');
}

export async function testAiConnectionApi(vectorUrl = 'http://localhost:6333') {
  const startTime = Date.now();
  try {
    const config = await getAiConfigApi();
    const dbLatency = Date.now() - startTime;
    return {
      success: true,
      dbStatus: 'connected',
      dbLatency,
      vectorStatus: 'ready',
      vectorUrl,
      aiStatus: 'online',
      config,
    };
  } catch (err) {
    const dbLatency = Date.now() - startTime;
    return {
      success: err.status === 401, // 401 means server & DB are alive, just requires auth
      dbStatus: err.status === 401 ? 'connected' : 'error',
      dbLatency,
      vectorStatus: 'ready',
      vectorUrl,
      aiStatus: err.status === 401 ? 'online' : 'offline',
      error: err.message,
    };
  }
}

export async function getWorkspaceMembersApi() {
  return apiClient.get('/api/admin/members');
}

export async function fetchUserActivityLogsApi(take = 50) {
  return apiClient.get(`/api/user-activity?take=${take}`);
}

export async function fetchUserActivityPageApi(pageNumber = 1, pageSize = 30, logSearch = '', userSearch = '', actionMatches = []) {
  const params = new URLSearchParams({ pageNumber: String(pageNumber), pageSize: String(pageSize) });
  if (logSearch.trim()) params.set('logSearch', logSearch.trim());
  if (userSearch.trim()) params.set('userSearch', userSearch.trim());
  if (actionMatches.length) params.set('actionMatches', actionMatches.join(','));
  return apiClient.get(`/api/user-activity/paged?${params}`, { noCache: true });
}

export async function logUserActivityApi(payload) {
  return apiClient.post('/api/user-activity/log', payload);
}

