import { apiClient } from '../../../service/apiClient';

export async function loginApi({ email, password }) {
  return apiClient.post('/api/auth/login', { email, password });
}

export async function registerApi(registerData) {
  return apiClient.post('/api/auth/register', registerData);
}

export async function forgotPasswordApi({ email }) {
  return apiClient.post('/api/auth/forgot-password', { email });
}

export async function resetPasswordApi({ email, otpCode, newPassword }) {
  return apiClient.post('/api/auth/reset-password', { email, otpCode, newPassword });
}

export function getGoogleLoginUrl() {
  return `${apiClient.baseUrl}/api/auth/login-google`;
}

export function getGoogleRegisterUrl(role = 'User') {
  return `${apiClient.baseUrl}/api/auth/register-google?role=${encodeURIComponent(role)}`;
}
