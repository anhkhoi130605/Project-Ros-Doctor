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

export async function getWorkspaceMembersApi() {
  return apiClient.get('/api/admin/members');
}

export async function fetchUserActivityLogsApi(take = 50) {
  return apiClient.get(`/api/user-activity?take=${take}`);
}

export async function logUserActivityApi(payload) {
  return apiClient.post('/api/user-activity/log', payload);
}

