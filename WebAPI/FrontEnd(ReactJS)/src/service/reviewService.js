import { apiClient } from './apiClient';

export async function getReviewsApi() {
  return apiClient.get('/api/reviews');
}

export async function getReviewByIdApi(findingId) {
  return apiClient.get(`/api/reviews/${findingId}`);
}

export async function submitDecisionApi(findingId, { decision, note }) {
  return apiClient.post(`/api/reviews/${findingId}/decision`, { decision, note });
}
