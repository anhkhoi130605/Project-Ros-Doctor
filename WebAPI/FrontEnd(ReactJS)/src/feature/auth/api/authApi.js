import { apiClient } from '../../../service/apiClient/apiClient';

export async function loginApi({ email, password }) {
  return apiClient.post('/api/auth/login', { email, password });
}

export async function registerApi(registerData) {
  return apiClient.post('/api/auth/register', registerData);
}

export function getGoogleLoginUrl() {
  return `${apiClient.baseUrl}/api/auth/login-google`;
}
