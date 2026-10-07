import { apiClient } from './apiClient';

export async function getReviewsApi() {
  return apiClient.get('/api/reviews');
}

export function mapReviewsResponse(response) {
  const reviews = Array.isArray(response) ? response : (response?.data ?? response?.Data);
  if (!Array.isArray(reviews)) throw new Error('Invalid reviews response');

  return reviews.map((review) => ({
    ...review,
    review: {
      status: normalizeReviewStatus(review.status),
      note: review.note || '',
      by: review.reviewedBy || null,
      at: review.reviewedAt || null,
    },
  }));
}

export function normalizeReviewStatus(status) {
  return status === 'changesneeded' ? 'changes' : (status || 'pending');
}

export async function getReviewByIdApi(findingId) {
  return apiClient.get(`/api/reviews/${findingId}`);
}

export async function submitDecisionApi(findingId, { decision, note }) {
  return apiClient.post(`/api/reviews/${findingId}/decision`, { decision, note });
}
