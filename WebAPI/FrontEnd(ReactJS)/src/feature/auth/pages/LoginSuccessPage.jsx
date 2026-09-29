import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useApp } from '../../../stored/appStore';
import { Logo, Notice, Button } from '../../../components/common/UIComponents';

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error('Failed to parse JWT:', err);
    return null;
  }
}

export default function LoginSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { dispatch, notify } = useApp();
  const [status, setStatus] = useState({
    isProcessing: true,
    isSuccess: false,
    message: 'Đang xử lý kết quả xác thực từ Google...',
  });

  useEffect(() => {
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const token = searchParams.get('token') || urlParams.get('token');
    const error = searchParams.get('error') || urlParams.get('error');

    if (error) {
      setStatus({
        isProcessing: false,
        isSuccess: false,
        message: decodeURIComponent(error) || 'Xác thực tài khoản Google thất bại.',
      });
      return;
    }

    if (!token) {
      setStatus({
        isProcessing: false,
        isSuccess: false,
        message: 'Không tìm thấy mã xác thực token từ hệ thống.',
      });
      return;
    }

    try {
      localStorage.setItem('accessToken', token);

      const payload = parseJwt(token);
      const roleClaim =
        payload?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
        payload?.role ||
        payload?.Role ||
        'User';

      const email =
        payload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ||
        payload?.email ||
        '';

      const fullName = payload?.name || payload?.FullName || (email ? email.split('@')[0] : 'User');

      const lowerRole = roleClaim.toLowerCase().trim();
      const normalizedRole = lowerRole.includes('admin')
        ? 'Admin'
        : lowerRole.includes('engineer')
        ? 'Engineering'
        : 'User';

      localStorage.setItem('userRole', normalizedRole);
      localStorage.setItem('userEmail', email);

      dispatch({
        type: 'LOGIN',
        role: normalizedRole,
        email,
        userName: fullName,
      });

      setStatus({
        isProcessing: false,
        isSuccess: true,
        message: 'Đăng nhập Google thành công! Đang chuyển hướng...',
      });
      notify('Đăng nhập bằng tài khoản Google thành công!', 'success');

      const timer = setTimeout(() => {
        if (normalizedRole === 'Admin') {
          navigate('/admin', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }, 500);

      return () => clearTimeout(timer);
    } catch (err) {
      console.error('Lỗi khi lưu token đăng nhập:', err);
      setStatus({
        isProcessing: false,
        isSuccess: false,
        message: 'Lỗi trong quá trình xử lý dữ liệu token.',
      });
    }
  }, [searchParams, navigate, dispatch, notify]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        padding: '24px',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '36px',
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
          <Logo />
        </div>

        {status.isProcessing ? (
          <div>
            <div
              style={{
                width: '40px',
                height: '40px',
                border: '3px solid #e2e8f0',
                borderTopColor: '#0284c7',
                borderRadius: '50%',
                margin: '0 auto 16px',
                animation: 'spin 1s linear infinite',
              }}
            />
            <h3 style={{ margin: '0 0 8px', color: '#0f172a', fontSize: '18px' }}>Đang xác thực tài khoản</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>{status.message}</p>
          </div>
        ) : status.isSuccess ? (
          <div>
            <div
              style={{
                width: '48px',
                height: '48px',
                background: '#dcfce7',
                color: '#16a34a',
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 16px',
                fontSize: '24px',
                fontWeight: 700,
              }}
            >
              ✓
            </div>
            <h3 style={{ margin: '0 0 8px', color: '#0f172a', fontSize: '18px' }}>Đăng nhập thành công!</h3>
            <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '13px' }}>{status.message}</p>
            <Button to="/admin" variant="primary" style={{ background: '#0f172a', color: '#ffffff' }}>
              Vào trang Quản trị
            </Button>
          </div>
        ) : (
          <div>
            <div
              style={{
                width: '48px',
                height: '48px',
                background: '#fef2f2',
                color: '#dc2626',
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 16px',
                fontSize: '24px',
                fontWeight: 700,
              }}
            >
              ✕
            </div>
            <h3 style={{ margin: '0 0 8px', color: '#0f172a', fontSize: '18px' }}>Đăng nhập thất bại</h3>
            <p style={{ margin: '0 0 20px', color: '#dc2626', fontSize: '13px' }}>{status.message}</p>
            <Button to="/login" variant="primary">
              Quay lại trang Đăng nhập
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
