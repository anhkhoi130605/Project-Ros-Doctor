import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hook/useAuth';
import { useApp } from '../../../stored/appStore';
import { getGoogleLoginUrl } from '../api/authApi';
import { Logo, Button, FormField, Notice, Icon } from '../../../components/common/UIComponents';
import LanguageSwitcher from '../../../components/common/LanguageSwitcher';
import PearlScene from '../../../components/common/PearlScene';
import { ROLE_NAMES } from '../../../domain/appTypes';
import SmoothReveal from '../../../components/common/SmoothReveal';
import './AuthPresentation.css';

export default function LoginPage() {
  const { t } = useTranslation(['auth', 'common']);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isSubmitting, login } = useAuth();
  const { dispatch, notify } = useApp();

  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(searchParams.get('error') || '');
  const [errorCode, setErrorCode] = useState(searchParams.get('errorCode') || '');
  const displayedError = errorCode === 'ENGINEER_PENDING_APPROVAL'
    ? t('auth:login.pendingEngineer') : error;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setErrorCode('');

    try {
      // 1. Attempt API login with real backend
      const loginResult = await login({ email, password });
      if (loginResult && loginResult.success) {
        const userRole = loginResult.role || (email.toLowerCase().includes('admin') ? 'Admin' : 'Engineering');
        const userName = loginResult.user?.fullName || loginResult.user?.FullName || loginResult.user?.name || email.split('@')[0];
        const userAvatar = loginResult.user?.avatarUrl || loginResult.user?.AvatarUrl || '';

        dispatch({
          type: 'LOGIN',
          email,
          userName,
          role: userRole,
          userId: loginResult.user?.id || loginResult.user?.Id || null,
          avatarUrl: userAvatar,
        });

        localStorage.setItem('accessToken', loginResult.token);
        localStorage.setItem('userRole', userRole);
        localStorage.setItem('userEmail', email);

        const roleDisplay = ROLE_NAMES[userRole] || userRole;
        notify(t('auth:login.systemSuccess', { role: roleDisplay }), 'success');

        // Đi vào trang tổng quan hệ thống (/dashboard)
        navigate('/dashboard', { replace: true });
        return;
      }
      setErrorCode(loginResult?.errorCode || '');
      setError(loginResult?.error || t('auth:login.invalidCredentials'));
    } catch (err) {
      setError(err.message || t('auth:login.invalidCredentials'));
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = getGoogleLoginUrl();
  };



  return (
    <div className="editorial-login auth-screen">
      <header>
        <Link to="/" aria-label={t('common:aria.home')}>
          <Logo />
        </Link>
        <nav className="auth-header-actions" aria-label={t('auth:login.methodNavigation')}>
          <LanguageSwitcher />
          <div className="auth-prompt">
            <span>{t('auth:login.noAccount')}</span>
            <Link to="/register" className="auth-route-link">
              {t('auth:login.register')} <Icon name="arrow" size={14} aria-hidden="true" />
            </Link>
          </div>
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
              {t('auth:login.heroTitleLine1')}<br />
              <em>{t('auth:login.heroTitleLine2')}</em>
            </h1>
            <p>{t('auth:login.heroDescription')}</p>
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
            <span className="eyebrow">{t('auth:login.kicker')}</span>
            <h2>{t('auth:login.welcome')}</h2>
            <p>{t('auth:login.description')}</p>

            {displayedError && (
              <Notice tone="orange" icon="alert">
                {displayedError}
              </Notice>
            )}

            <FormField label={t('auth:login.email')}>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth:login.emailPlaceholder', 'Email hoặc tài khoản')}
                autoComplete="username email"
              />
            </FormField>

            <FormField label={t('auth:login.password')}>
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
              {t('auth:login.submit')}
            </Button>

            <div style={{ textAlign: 'center', margin: '20px 0 16px', color: '#94a3b8', fontSize: '12px' }}>
              {t('auth:login.or')}
            </div>

            <button
              className="auth-google-button"
              type="button"
              onClick={handleGoogleLogin}
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
              <span>{t('auth:login.google')}</span>
            </button>

            <small className="demo-login-note" style={{ display: 'block', marginTop: '16px', color: '#64748b' }}>
              {t('auth:login.accessNote')}
            </small>


            </form>
          </SmoothReveal>
        </div>
      </div>

      <footer className="login-footer">
        <span>© 2026 CTRN SHIFT N / RAV-13</span>
        <span>{t('auth:login.footer')}</span>
      </footer>
    </div>
  );
}
