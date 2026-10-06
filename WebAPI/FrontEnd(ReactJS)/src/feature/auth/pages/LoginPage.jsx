import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../hook/useAuth';
import { useApp } from '../../../stored/appStore';
import { getGoogleLoginUrl } from '../api/authApi';
import { Logo, Button, FormField, Notice } from '../../../components/common/UIComponents';
import PearlScene from '../../../components/common/PearlScene';
import { ROLE_NAMES } from '../../../domain/appTypes';
import SmoothReveal from '../../../components/common/SmoothReveal';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isSubmitting, status, login } = useAuth();
  const { state, dispatch, notify } = useApp();

  const [email, setEmail] = useState(searchParams.get('email') || 'engineer@ros2doctor.local');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState(searchParams.get('error') || '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // 1. Attempt API login first
      const loginResult = await login({ email, password });
      if (loginResult && loginResult.success) {
        const userRole = loginResult.role || (email.toLowerCase().includes('admin') ? 'Admin' : 'Engineering');
        const userName = loginResult.user?.fullName || loginResult.user?.FullName || loginResult.user?.name || email.split('@')[0];

        dispatch({
          type: 'LOGIN',
          email,
          userName,
          role: userRole,
          userId: loginResult.user?.id || loginResult.user?.Id || null,
        });

        localStorage.setItem('accessToken', loginResult.token || ('token-' + Date.now()));
        localStorage.setItem('userRole', userRole);
        localStorage.setItem('userEmail', email);

        const roleDisplay = ROLE_NAMES[userRole] || userRole;
        notify(`Đăng nhập hệ thống thành công với vai trò ${roleDisplay}!`, 'success');

        if (userRole.toLowerCase() === 'admin') {
          navigate('/admin', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
        return;
      }
    } catch (err) {
      console.warn('API Login attempt error, falling back to demo check:', err);
    }

    // 2. Demo fallback check
    const demoUser = (state.users || []).find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (password === 'demo123') {
      const role = demoUser?.role || (email.toLowerCase().includes('admin') ? 'Admin' : email.toLowerCase().includes('user') ? 'User' : 'Engineering');
      const name = demoUser?.name || (role === 'Admin' ? 'Quản trị viên' : role === 'User' ? 'Người dùng' : 'Kỹ sư Robotics');
      
      dispatch({
        type: 'LOGIN',
        role,
        userId: demoUser?.id || null,
        email,
        userName: name,
      });

      localStorage.setItem('accessToken', 'demo-token-' + role);
      localStorage.setItem('userRole', role);
      localStorage.setItem('userEmail', email);

      const roleDisplay = ROLE_NAMES[role] || role;
      notify(`Đăng nhập thành công với vai trò ${roleDisplay}!`, 'success');

      if (role.toLowerCase() === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } else {
      setError('Email hoặc mật khẩu chưa đúng. Với bản thử nghiệm, hãy dùng mật khẩu demo123.');
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = getGoogleLoginUrl();
  };



  return (
    <div className="editorial-login">
      <header>
        <Link to="/" aria-label="CTRN SHIFT N, trang chủ">
          <Logo />
        </Link>
        <nav aria-label="Lựa chọn phương thức">
          <span>Chưa có tài khoản?</span>
          <Link to="/register" className="text-link">
            Đăng ký
          </Link>
        </nav>
      </header>

      <div className="login-grid">
        <section
          className="login-hero"
          style={{
            position: 'relative',
            overflow: 'hidden',
            minHeight: '560px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div className="hero-content" style={{ position: 'relative', zIndex: 3, maxWidth: '440px' }}>
            <span className="eyebrow">RAV-13 / ROBOTICS INTELLIGENCE</span>
            <h1>
              Hiểu dữ liệu.<br />
              <em>Giải mã robot.</em>
            </h1>
            <p>Hệ thống hỗ trợ chẩn đoán sự cố ROS2 tự động. AI đề xuất, kỹ sư quyết định.</p>
          </div>

          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: '58%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2,
            }}
          >
            <PearlScene />
          </div>
        </section>

        <div className="login-form-wrap">
          <SmoothReveal begin={80} duration={460} distance={12}>
            <form className="login-form card" onSubmit={handleSubmit} noValidate>
            <span className="eyebrow">KHÔNG GIAN CHẨN ĐOÁN</span>
            <h2>Chào mừng trở lại.</h2>
            <p>Đăng nhập để tiếp tục công việc của bạn.</p>

            {(error || status.message) && (
              <Notice tone={error || status.type === 'error' ? 'orange' : 'green'} icon={error || status.type === 'error' ? 'alert' : 'check'}>
                {error || status.message}
              </Notice>
            )}

            <FormField label="Email">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@ros2doctor.local"
                autoComplete="email"
              />
            </FormField>

            <FormField label="Mật khẩu">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </FormField>

            <Button type="submit" variant="primary" loading={isSubmitting} icon="arrow">
              Đăng nhập
            </Button>

            <div style={{ textAlign: 'center', margin: '20px 0 16px', color: '#94a3b8', fontSize: '12px' }}>
              hoặc
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                cursor: 'pointer',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Đăng nhập bằng Google</span>
            </button>

            <small className="demo-login-note" style={{ display: 'block', marginTop: '16px', color: '#64748b' }}>
              Bản preview sử dụng mật khẩu mẫu <strong>demo123</strong>.
            </small>


            </form>
          </SmoothReveal>
        </div>
      </div>

      <footer className="login-footer">
        <span>© 2026 CTRN SHIFT N / RAV-13</span>
        <span>Hệ thống chẩn đoán lỗi ROS2 tự động</span>
      </footer>
    </div>
  );
}
