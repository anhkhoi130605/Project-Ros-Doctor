import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hook/useAuth';
import { useApp } from '../../../stored/appStore';
import { getGoogleRegisterUrl } from '../api/authApi';
import { Logo, Button, FormField, Notice, Icon } from '../../../components/common/UIComponents';
import LanguageSwitcher from '../../../components/common/LanguageSwitcher';
import PearlScene from '../../../components/common/PearlScene';
import SmoothReveal from '../../../components/common/SmoothReveal';

const DEFAULT_BIO_VI = 'Kỹ sư nghiên cứu điều khiển ROS2 robot tự hành.';
const DEFAULT_BIO_EN = 'Engineer researching control systems for autonomous ROS2 robots.';

export default function RegisterPage() {
  const { t, i18n } = useTranslation(['auth', 'common']);
  const navigate = useNavigate();
  const { isSubmitting, register } = useAuth();
  const { dispatch, notify } = useApp();

  const [formData, setFormData] = useState({
    fullName: 'Nguyễn Văn A',
    email: 'kpham6488@gmail.com',
    phone: '0987654321',
    gender: '0', // 0: Nam (Male), 1: Nữ (Female), 2: Khác (Other)
    dateOfBirth: '2000-01-15',
    workspace: 'AGV-Lab',
    bio: DEFAULT_BIO_VI,
    password: 'demo123',
    confirmPassword: 'demo123',
  });

  const [isSuccess, setIsSuccess] = useState(false);
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
    window.location.href = getGoogleRegisterUrl();
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
      };

      const res = await register(payload);
      const token = res?.accessToken || res?.token;

      if (token) {
        localStorage.setItem('accessToken', token);
        localStorage.setItem('userRole', 'user');
        localStorage.setItem('userEmail', formData.email);
      }

      dispatch({
        type: 'REGISTER_DEMO',
        user: {
          name: formData.fullName,
          email: formData.email,
          workspace: formData.workspace,
          phone: formData.phone,
          gender: formData.gender,
          bio: formData.bio,
        },
      });

      setIsSuccess(true);
      notify(t('auth:register.successNotification'), 'success');
    } catch (err) {
      // Fallback demo nếu backend báo lỗi hoặc email đã có
      console.warn('Backend register error, fallback demo mode:', err);
      dispatch({
        type: 'REGISTER_DEMO',
        user: {
          name: formData.fullName,
          email: formData.email,
          workspace: formData.workspace,
          phone: formData.phone,
          gender: formData.gender,
          bio: formData.bio,
        },
      });
      setIsSuccess(true);
      notify(err.message || t('auth:register.demoSuccessNotification'), 'info');
    }
  };

  return (
    <div className="ctrn-register">
      <header className="ctrn-public-header">
        <Link to="/" aria-label={t('common:aria.home')}>
          <Logo />
        </Link>
        <nav>
          <LanguageSwitcher />
          <Link to="/login">
            {t('auth:register.haveAccount')} <strong>{t('auth:register.login')}</strong>
          </Link>
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
              <h2>{t('auth:register.successTitle')}</h2>
              <p>
                {t('auth:register.successDescription', { name: formData.fullName })}
              </p>
              <Notice tone="green" style={{ marginBottom: '20px' }}>
                {t('auth:register.welcome')}
              </Notice>
              <Button to={`/login?email=${encodeURIComponent(formData.email)}`} icon="arrow">
                {t('auth:register.goToLogin')}
              </Button>
            </div>
          ) : (
            <SmoothReveal begin={80} duration={460} distance={12}>
              <form onSubmit={handleSubmit}>
              <span className="section-kicker">{t('auth:register.formKicker')}</span>
              <h2>{t('auth:register.formTitle')}</h2>

              {error && <Notice tone="red" style={{ marginBottom: '16px' }}>{error}</Notice>}

              <div className="form-grid">
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
                className="ctrn-full"
                onClick={handleGoogleRegister}
              >
                <span className="google-g">G</span> {t('auth:register.google')}
              </Button>

              <p className="ctrn-auth-bottom">
                {t('auth:register.haveAccount')} <Link to="/login">{t('auth:register.login')}</Link>
              </p>
              </form>
            </SmoothReveal>
          )}
        </section>
      </main>
    </div>
  );
}
