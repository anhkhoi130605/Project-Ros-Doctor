import { apiClient } from './apiClient';

export async function getReportsApi() {
  return apiClient.get('/api/reports');
}

export async function getReportByIdApi(id) {
  return apiClient.get(`/api/reports/${id}`);
}

export async function createReportApi(reportData) {
  return apiClient.post('/api/reports', reportData);
}
