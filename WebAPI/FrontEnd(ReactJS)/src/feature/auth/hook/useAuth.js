import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginApi, registerApi, forgotPasswordApi, resetPasswordApi } from '../api/authApi';
import { parseUserRole } from '../type/authTypes';

function parseJwtRole(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return '';
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return '';
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    return payload?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || payload?.role || payload?.Role || '';
  } catch (err) {
    return '';
  }
}

export function useAuth() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const login = async ({ email, password }) => {
    setStatus({ type: '', message: '' });

    if (!email || !password) {
      setStatus({ type: 'error', message: 'Vui lòng nhập email và mật khẩu.' });
      return null;
    }

    setIsSubmitting(true);
    try {
      const data = await loginApi({ email, password });
      const token = data?.accessToken || data?.token || data?.data?.accessToken || data?.data?.token || data?.jwt || ('auth-token-' + Date.now());
      const user = data?.user || data?.data?.user || {};
      
      const jwtRole = parseJwtRole(token);
      const rawRole = parseUserRole(data, user) || jwtRole || (email.toLowerCase().includes('admin') ? 'Admin' : email.toLowerCase().includes('user') ? 'User' : 'Engineering');

      const rawRoleLower = rawRole.toString().toLowerCase().trim();
      let normalizedRole = 'User';
      if (rawRoleLower.includes('admin')) {
        normalizedRole = 'Admin';
      } else if (rawRoleLower.includes('engineer') || rawRoleLower.includes('kỹ sư')) {
        normalizedRole = 'Engineering';
      } else {
        normalizedRole = 'User';
      }

      localStorage.setItem('accessToken', token);
      localStorage.setItem('userRole', normalizedRole);
      localStorage.setItem('userEmail', email);
      if (user && typeof user === 'object') {
        localStorage.setItem('currentUser', JSON.stringify(user));
      }

      setStatus({ type: 'success', message: 'Đăng nhập thành công.' });

      return {
        success: true,
        token,
        user,
        role: normalizedRole,
        rawRole,
        data,
      };
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Không thể kết nối đến máy chủ.' });
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const register = async (formData) => {
    setStatus({ type: '', message: '' });
    setIsSubmitting(true);
    try {
      const data = await registerApi(formData);
      setStatus({ type: 'success', message: 'Đăng ký tài khoản thành công.' });
      return data;
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Đăng ký thất bại.' });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestForgotPassword = async ({ email }) => {
    setIsSubmitting(true);
    try {
      const res = await forgotPasswordApi({ email });
      return res;
    } catch (error) {
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyAndResetPassword = async ({ email, otpCode, newPassword }) => {
    setIsSubmitting(true);
    try {
      const res = await resetPasswordApi({ email, otpCode, newPassword });
      return res;
    } catch (error) {
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    status,
    login,
    register,
    requestForgotPassword,
    verifyAndResetPassword,
  };
}
