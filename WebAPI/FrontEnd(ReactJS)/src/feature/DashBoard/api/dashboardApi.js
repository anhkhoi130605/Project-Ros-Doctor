import { apiClient } from '../../../service/apiClient';

export async function fetchAdminActivityLogsApi(take = 20) {
  return apiClient.get(`/api/user-activity?take=${take}`);
}

export async function fetchAdminMembersApi() {
  return apiClient.get('/api/admin/members');
}

export async function fetchSystemLogsApi(queryParams = {}, options = {}) {
  const params = new URLSearchParams();
  if (queryParams.search?.trim()) params.append('search', queryParams.search.trim());
  if (queryParams.logLevel) params.append('logLevel', queryParams.logLevel);
  if (queryParams.exceptionType) params.append('exceptionType', queryParams.exceptionType);
  if (queryParams.pageIndex) params.append('pageIndex', String(queryParams.pageIndex));
  if (queryParams.pageSize) params.append('pageSize', String(queryParams.pageSize));

  const endpoint = `/api/system-logs?${params.toString()}`;
  return apiClient.get(endpoint, options);
}

export async function triggerTestErrorApi({ errorType, message }) {
  return apiClient.post('/api/system-logs/trigger-test-error', {
    errorType,
    message: message || undefined,
  });
}
