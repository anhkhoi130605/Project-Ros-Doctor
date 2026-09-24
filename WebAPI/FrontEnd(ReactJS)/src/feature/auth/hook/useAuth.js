import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginApi, registerApi, forgotPasswordApi, resetPasswordApi } from '../api/authApi';
import { parseUserRole } from '../type/authTypes';

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
      const token = data?.accessToken || data?.token;
      const user = data?.user || {};
      const rawRole = parseUserRole(data, user) || '';

      const normalizedRole = rawRole.toLowerCase().includes('admin')
        ? 'admin'
        : rawRole.toLowerCase().includes('viewer')
        ? 'viewer'
        : rawRole.toLowerCase().includes('user')
        ? 'viewer'
        : 'engineer';

      if (token) localStorage.setItem('accessToken', token);
      localStorage.setItem('userRole', normalizedRole);
      if (user) localStorage.setItem('currentUser', JSON.stringify(user));

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
    setStatus,
    login,
    register,
    requestForgotPassword,
    verifyAndResetPassword,
  };
}
