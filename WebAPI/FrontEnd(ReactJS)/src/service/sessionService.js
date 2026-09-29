import { apiClient } from './apiClient';

export async function getSessionByIdApi(id) {
  return apiClient.get(`/api/sessions/${id}`);
}

export async function startAnalysisApi(analysisData) {
  return apiClient.post('/api/sessions/start', analysisData);
}
