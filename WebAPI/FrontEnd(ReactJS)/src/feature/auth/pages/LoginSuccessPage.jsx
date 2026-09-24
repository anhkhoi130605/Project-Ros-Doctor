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
    const token = searchParams.get('token');
    const error = searchParams.get('error');

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

      const normalizedRole = roleClaim.toLowerCase().includes('admin')
        ? 'admin'
        : roleClaim.toLowerCase().includes('engineer')
        ? 'engineer'
        : 'viewer';

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
        navigate('/dashboard', { replace: true });
      }, 500);

      return () => clearTimeout(timer);
    } catch (err) {
      console.error('Error handling google login callback:', err);
      setStatus({
        isProcessing: false,
        isSuccess: false,
        message: 'Đã xảy ra lỗi khi lưu thông tin đăng nhập.',
      });
    }
  }, [searchParams, navigate, dispatch, notify]);

  return (
    <div className="editorial-login">
      <header>
        <Link to="/" aria-label="CTRN SHIFT N, trang chủ">
          <Logo />
        </Link>
      </header>

      <main className="editorial-login-grid" style={{ minHeight: '500px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="card" style={{ maxWidth: '480px', width: '100%', textAlign: 'center', padding: '36px 28px' }}>
          <span className="section-kicker">GOOGLE AUTHENTICATION</span>
          <h2>{status.isSuccess ? 'Xác thực thành công!' : status.isProcessing ? 'Đang xử lý...' : 'Thông báo'}</h2>
          <p style={{ margin: '16px 0 24px', fontSize: '13px', color: 'var(--muted)' }}>
            {status.message}
          </p>

          {status.isSuccess && (
            <Notice tone="green" icon="check" style={{ marginBottom: '20px' }}>
              Phiên đăng nhập đã sẵn sàng. Bạn đang được chuyển vào hệ thống.
            </Notice>
          )}

          {!status.isProcessing && !status.isSuccess && (
            <Button to="/login" icon="arrow" style={{ marginTop: '16px' }}>
              Quay lại đăng nhập
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
