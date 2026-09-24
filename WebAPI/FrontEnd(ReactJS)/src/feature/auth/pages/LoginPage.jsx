import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../hook/useAuth';
import { useApp } from '../../../stored/appStore';
import { getGoogleLoginUrl } from '../api/authApi';
import { Logo, Button, FormField, Notice } from '../../../components/common/UIComponents';
import PearlScene from '../../../components/common/PearlScene';

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

    // If using real backend credentials
    const success = await login({ email, password });
    if (success) {
      dispatch({
        type: 'LOGIN',
        email,
        userName: email.split('@')[0],
        role: 'engineer',
      });
      notify('Đăng nhập hệ thống thành công!', 'success');
      navigate('/dashboard');
      return;
    }

    // Demo fallback check
    const demoUser = (state.users || []).find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (password === 'demo123') {
      const role = demoUser?.role || (email.includes('admin') ? 'admin' : email.includes('viewer') ? 'viewer' : 'engineer');
      const name = demoUser?.name || (role === 'admin' ? 'Quản trị viên' : role === 'viewer' ? 'Người xem' : 'Kỹ sư Robotics');
      dispatch({
        type: 'LOGIN',
        role,
        userId: demoUser?.id || null,
        email,
        userName: name,
      });
      localStorage.setItem('accessToken', 'demo-token-' + role);
      localStorage.setItem('userRole', role);
      notify(`Đăng nhập thành công với vai trò ${role}!`, 'success');
      navigate('/dashboard');
    } else {
      setError('Email hoặc mật khẩu chưa đúng. Với bản thử nghiệm, hãy dùng mật khẩu demo123.');
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = getGoogleLoginUrl();
  };

  const handleRoleSwitch = (role) => {
    const userMap = {
      admin: { email: 'admin@ros2doctor.local', name: 'Quản trị viên' },
      engineer: { email: 'engineer@ros2doctor.local', name: 'Kỹ sư Robotics' },
      viewer: { email: 'viewer@ros2doctor.local', name: 'Người xem' },
    };
    const u = userMap[role];
    setEmail(u.email);
    setPassword('demo123');
    dispatch({
      type: 'LOGIN',
      role,
      email: u.email,
      userName: u.name,
    });
    localStorage.setItem('accessToken', 'demo-token-' + role);
    localStorage.setItem('userRole', role);
    notify(`Đã chuyển sang luồng ${role === 'admin' ? 'Admin' : role === 'engineer' ? 'Engineer' : 'User'}`, 'success');
    navigate('/dashboard');
  };

  return (
    <div className="editorial-login">
      <header>
        <Link to="/" aria-label="CTRN SHIFT N, trang chủ">
          <Logo />
        </Link>
        <Link to="/register">
          Chưa có tài khoản? <strong>Đăng ký</strong>
        </Link>
      </header>

      <main className="editorial-login-grid">
        <section className="login-art-panel">
          <span className="section-kicker">RAV-13 / ROBOTICS INTELLIGENCE</span>
          <h1>
            Hiểu dữ liệu.<br />
            <span>Giải mã robot.</span>
          </h1>
          <PearlScene compact />
        </section>

        <div className="editorial-login-form">
          <form onSubmit={handleSubmit}>
            <span className="section-kicker">KHÔNG GIAN CHẨN ĐOÁN</span>
            <h2>Chào mừng trở lại.</h2>
            <p>Đăng nhập để tiếp tục công việc của bạn.</p>

            {status?.message && (
              <Notice tone={status.type === 'error' ? 'red' : 'green'} style={{ marginBottom: '16px' }}>
                {status.message}
              </Notice>
            )}

            <FormField label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </FormField>

            <FormField label="Mật khẩu" error={error}>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                required
                autoComplete="current-password"
              />
            </FormField>

            <Button
              type="submit"
              icon="arrow"
              loading={isSubmitting}
              style={{ width: '100%', marginTop: '8px' }}
            >
              Đăng nhập
            </Button>

            <div className="ctrn-or">hoặc</div>

            <Button
              type="button"
              variant="secondary"
              style={{ width: '100%' }}
              onClick={handleGoogleLogin}
            >
              <span className="google-g">G</span> Đăng nhập bằng Google
            </Button>

            <p className="small-note">
              Bản preview sử dụng mật khẩu mẫu <b>demo123</b>.
            </p>

            <div className="ctrn-demo-access">
              <small>XEM LUỒNG MẪU</small>
              <div className="login-demo-roles">
                <button
                  type="button"
                  onClick={() => handleRoleSwitch('admin')}
                  aria-label="Xem luồng Admin"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleSwitch('engineer')}
                  aria-label="Xem luồng Engineer"
                >
                  Engineer
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleSwitch('viewer')}
                  aria-label="Xem luồng User"
                >
                  User
                </button>
              </div>
            </div>

            <p style={{ marginTop: '20px', fontSize: '13px' }}>
              Chưa có tài khoản? <Link to="/register">Tạo tài khoản</Link>
            </p>
          </form>
        </div>
      </main>

      <footer className="login-back-note">
        CTRN SHIFT N / RAV-13 · AI đề xuất, kỹ sư xác nhận.
      </footer>
    </div>
  );
}
