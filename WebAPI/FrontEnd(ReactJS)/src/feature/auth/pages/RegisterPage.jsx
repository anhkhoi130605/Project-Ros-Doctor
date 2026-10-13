import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hook/useAuth';
import { useApp } from '../../../stored/appStore';
import { getGoogleRegisterUrl } from '../api/authApi';
import { Logo, Button, FormField, Notice, Icon } from '../../../components/common/UIComponents';
import LanguageSwitcher from '../../../components/common/LanguageSwitcher';
import PearlScene from '../../../components/common/PearlScene';
import SmoothReveal from '../../../components/common/SmoothReveal';
import './AuthPresentation.css';

const DEFAULT_BIO_VI = 'Kỹ sư nghiên cứu điều khiển ROS2 robot tự hành.';
const DEFAULT_BIO_EN = 'Engineer researching control systems for autonomous ROS2 robots.';

export default function RegisterPage() {
  const { t, i18n } = useTranslation(['auth', 'common']);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isSubmitting, register } = useAuth();
  const { dispatch, notify } = useApp();

  const [formData, setFormData] = useState({
    fullName: '',
    email: searchParams.get('email') || '',
    phone: '',
    gender: '0', // 0: Nam (Male), 1: Nữ (Female), 2: Khác (Other)
    dateOfBirth: '',
    workspace: '',
    bio: '',
    password: '',
    confirmPassword: '',
    role: 'User',
  });

  const [isSuccess, setIsSuccess] = useState(searchParams.get('pending') === '1');
  const [approvalPending, setApprovalPending] = useState(searchParams.get('pending') === '1');
  useEffect(() => {
    if (searchParams.get('pending') !== '1') return;
    ['accessToken', 'userRole', 'userEmail', 'currentUser'].forEach((key) => localStorage.removeItem(key));
    dispatch({ type: 'LOGOUT' });
  }, [searchParams, dispatch]);
  const [error, setError] = useState('');
  const isEnglish = String(i18n.resolvedLanguage || i18n.language || 'vi').split('-')[0] === 'en';
  const displayedBio = formData.bio === DEFAULT_BIO_VI || formData.bio === DEFAULT_BIO_EN
    ? isEnglish ? DEFAULT_BIO_EN : DEFAULT_BIO_VI
    : formData.bio;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleGoogleRegister = () => {
    window.location.href = getGoogleRegisterUrl(formData.role);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError(t('auth:register.passwordMismatch'));
      return;
    }

    try {
      // 1. Gửi request đăng ký sang Backend ASP.NET
      const payload = {
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        phone: formData.phone,
        gender: parseInt(formData.gender, 10),
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : null,
        bio: formData.bio,
        role: formData.role,
      };

      const res = await register(payload);
      const token = res?.accessToken || res?.token;
      // Engineer không được dùng token/session cũ hoặc nhận quyền trước khi Admin duyệt.
      if (res?.requiresApproval) {
        ['accessToken', 'userRole', 'userEmail', 'currentUser'].forEach((key) => localStorage.removeItem(key));
        dispatch({ type: 'LOGOUT' });
        setApprovalPending(true);
        setIsSuccess(true);
        notify(t('auth:register.pendingNotification'), 'info');
        return;
      }
      if (payload.role === 'Engineering') throw new Error(t('auth:register.failed'));
      if (!token) throw new Error(t('auth:register.failed'));
      const user = { ...(res.user || {}), id: res.userId || res.user?.id };
      localStorage.setItem('accessToken', token);
      localStorage.setItem('userRole', 'User');
      localStorage.setItem('userEmail', formData.email);
      localStorage.setItem('currentUser', JSON.stringify(user));
      dispatch({ type: 'LOGIN', email: formData.email, userName: formData.fullName,
        role: 'User', userId: user.id });
      notify(t('auth:register.successNotification'), 'success');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      // Chỉ báo thành công sau khi server thực sự tạo tài khoản.
      setError(err.data?.message || err.data?.Message || err.message || t('auth:register.failed'));
    }
  };

  return (
    <div className="ctrn-register auth-screen">
      <header className="ctrn-public-header">
        <Link to="/" aria-label={t('common:aria.home')}>
          <Logo />
        </Link>
        <nav className="auth-header-actions">
          <LanguageSwitcher />
          <div className="auth-prompt">
            <span>{t('auth:register.haveAccount')}</span>
            <Link to="/login" className="auth-route-link">
              {t('auth:register.login')} <Icon name="arrow" size={14} aria-hidden="true" />
            </Link>
          </div>
        </nav>
      </header>

      <main className="ctrn-register-grid">
        <aside>
          <span className="section-kicker">CTRN SHIFT N / RAV-13</span>
          <h1>
            {t('auth:register.heroTitleLine1')}<br />
            <em>{t('auth:register.heroTitleLine2')}</em>
          </h1>
          <p>
            {t('auth:register.heroDescriptionLine1')}<br />
            {t('auth:register.heroDescriptionLine2')}
          </p>

          <PearlScene compact />

          <div className="ctrn-register-note" style={{ marginTop: '20px' }}>
            <Icon name="shield" />
            <span>
              {t('auth:register.permissionNoteLine1')}<br />
              {t('auth:register.permissionNoteLine2')}
            </span>
          </div>
        </aside>

        <section>
          {isSuccess ? (
            <div className="ctrn-register-success">
              <Icon name="success" size={52} />
              <span className="section-kicker">{t('auth:register.successKicker')}</span>
              <h2>{t(approvalPending ? 'auth:register.pendingTitle' : 'auth:register.successTitle')}</h2>
              <p>
                {t(approvalPending ? 'auth:register.pendingDescription' : 'auth:register.successDescription', { name: formData.fullName })}
              </p>
              <Notice tone={approvalPending ? 'orange' : 'green'} style={{ marginBottom: '20px' }}>
                {t(approvalPending ? 'auth:register.pendingHint' : 'auth:register.welcome')}
              </Notice>
              <Button to={`/login?email=${encodeURIComponent(formData.email)}`} icon="arrow">
                {t('auth:register.goToLogin')}
              </Button>
            </div>
          ) : (
            <SmoothReveal begin={80} duration={460} distance={12}>
              <form className="auth-register-form" onSubmit={handleSubmit}>
              <span className="section-kicker">{t('auth:register.formKicker')}</span>
              <h2>{t('auth:register.formTitle')}</h2>

              {error && <Notice tone="red" style={{ marginBottom: '16px' }}>{error}</Notice>}

              <div className="form-grid">
                <div className="span-2">
                  <FormField label={t('auth:register.accountType')}>
                    <select name="role" value={formData.role} onChange={handleChange} disabled={isSubmitting} required>
                      <option value="User">{t('auth:register.userOption')}</option>
                      <option value="Engineering">{t('auth:register.engineerOption')}</option>
                    </select>
                    <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: 13 }}>
                      {t(formData.role === 'Engineering' ? 'auth:register.engineerHint' : 'auth:register.userHint')}
                    </p>
                  </FormField>
                </div>
                <FormField label={t('auth:register.fullName')}>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder={t('auth:register.placeholders.fullName')}
                    required
                  />
                </FormField>

                <FormField label={t('auth:register.email')}>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder={t('auth:register.placeholders.email')}
                    required
                  />
                </FormField>

                <FormField label={t('auth:register.phone')}>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder={t('auth:register.placeholders.phone')}
                  />
                </FormField>

                <FormField label={t('auth:register.gender')}>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                  >
                    <option value="0">{t('auth:register.male')}</option>
                    <option value="1">{t('auth:register.female')}</option>
                    <option value="2">{t('auth:register.other')}</option>
                  </select>
                </FormField>

                <FormField label={t('auth:register.dateOfBirth')}>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                  />
                </FormField>

                <FormField label={t('auth:register.workspace')}>
                  <input
                    type="text"
                    name="workspace"
                    value={formData.workspace}
                    onChange={handleChange}
                    placeholder={t('auth:register.placeholders.workspace')}
                    required
                  />
                </FormField>

                <div className="span-2">
                  <FormField label={t('auth:register.bio')}>
                    <textarea
                      name="bio"
                      rows={2}
                      value={displayedBio}
                      onChange={handleChange}
                      placeholder={t('auth:register.placeholders.bio')}
                    />
                  </FormField>
                </div>

                <FormField label={t('auth:register.password')}>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                  />
                </FormField>

                <FormField label={t('auth:register.confirmPassword')}>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                  />
                </FormField>
              </div>

              <Button
                type="submit"
                icon="arrow"
                loading={isSubmitting}
                className="ctrn-full"
                style={{ marginTop: '12px' }}
              >
                {isSubmitting ? t('auth:register.creating') : t('auth:register.create')}
              </Button>

              <div className="ctrn-or">{t('auth:register.or')}</div>

              <Button
                type="button"
                variant="secondary"
                className="ctrn-full auth-google-button"
                onClick={handleGoogleRegister}
                disabled={isSubmitting}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg> {t('auth:register.google')}
              </Button>

              <div className="ctrn-auth-bottom auth-prompt">
                <span>{t('auth:register.haveAccount')}</span>
                <Link to="/login" className="auth-route-link">{t('auth:register.login')} <Icon name="arrow" size={14} aria-hidden="true" /></Link>
              </div>
              </form>
            </SmoothReveal>
          )}
        </section>
      </main>
    </div>
  );
}
