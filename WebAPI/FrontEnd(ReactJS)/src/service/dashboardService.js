import { apiClient } from './apiClient';

export async function getDashboardStatsApi() {
  return apiClient.get('/api/dashboard/stats');
}
