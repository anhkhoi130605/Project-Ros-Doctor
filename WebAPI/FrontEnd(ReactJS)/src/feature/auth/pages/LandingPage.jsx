import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logo, Button, Icon } from '../../../components/common/UIComponents';
import LanguageSwitcher from '../../../components/common/LanguageSwitcher';
import PearlScene from '../../../components/common/PearlScene';
import SmoothReveal from '../../../components/common/SmoothReveal';
import { useApp } from '../../../stored/appStore';
import './LandingPage.css';

const PROJECT_GITHUB = 'https://github.com/AI20K-Build-Phase-Cohort-4/P-137';
const WORKFLOW_ICONS = ['upload', 'activity', 'message-square', 'file-text'];
const ROLE_ICONS = ['activity', 'shield', 'user'];

function readCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('currentUser')) || {};
  } catch {
    return {};
  }
}

function scrollToSection(sectionId) {
  document.getElementById(sectionId)?.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'start',
  });
}

export default function LandingPage() {
  const { t } = useTranslation(['auth', 'common']);
  const { state } = useApp();
  const isSignedIn = state.signedIn && Boolean(localStorage.getItem('accessToken'));
  const currentUser = isSignedIn ? readCurrentUser() : {};
  const accountName = currentUser.fullName || currentUser.FullName || currentUser.name || currentUser.Name
    || state.profile?.name || state.profile?.email || t('common:actions.profile');
  const workflowSteps = t('auth:landing.workflowSteps', { returnObjects: true });
  const roles = t('auth:landing.roles', { returnObjects: true });

  return (
    <div className="ctrn-home landing-refined" id="home">
      <header className="ctrn-public-header">
        <Link to="/" aria-label={t('common:aria.home')}>
          <Logo />
        </Link>
        <nav aria-label={t('auth:landing.navigationLabel')}>
          <button type="button" className="ctrn-section-link" onClick={() => scrollToSection('workflow')}>
            {t('auth:landing.workflowLink')}
          </button>
          <button type="button" className="ctrn-section-link" onClick={() => scrollToSection('roles')}>
            {t('auth:landing.rolesLink')}
          </button>
          <LanguageSwitcher />
          {isSignedIn ? (
            <Link to="/dashboard" className="ctrn-public-account" title={t('auth:landing.enterWorkspace')}
              aria-label={t('auth:landing.accountWorkspace', { name: accountName })}>
              <span className="ctrn-public-account-avatar" aria-hidden="true"><Icon name="user" size={19} /></span>
              <span className="ctrn-public-account-copy">
                <strong translate="no" data-i18n-ignore="true">{accountName}</strong>
                <small>{t('auth:landing.enterWorkspace')}</small>
              </span>
              <Icon name="chevron" size={16} aria-hidden="true" />
            </Link>
          ) : (
            <>
              <Button to="/login" variant="secondary">
                {t('auth:landing.login')}
              </Button>
              <Button to="/register">{t('auth:landing.register')}</Button>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="ctrn-hero">
          <SmoothReveal duration={520} distance={14}>
            <div className="ctrn-hero-copy">
            <span className="section-kicker">RAV-13 / ROS2 DIAGNOSTICS</span>
            <h1>
              {t('auth:landing.heroTitleLine1')}<br />
              <em>{t('auth:landing.heroTitleLine2')}</em>
            </h1>
            <p>
              {t('auth:landing.heroDescription')}
            </p>

            <div className="button-row">
              <Button to={isSignedIn ? '/dashboard' : '/login'} icon="arrow">
                {t('auth:landing.enterWorkspace')}
              </Button>
              <Button type="button" variant="secondary" icon="down" className="landing-explore-button" onClick={() => scrollToSection('workflow')}>
                {t('auth:landing.exploreWorkflow')}
              </Button>
            </div>

            <div className="ctrn-hero-meta">
              <span>{t('auth:landing.metaAnalysis')}</span>
              <span>{t('auth:landing.metaEvidence')}</span>
            </div>
            </div>
          </SmoothReveal>

          <PearlScene />
        </section>

        <section className="ctrn-workflow" id="workflow">
          <div>
            <span className="section-kicker">{t('auth:landing.workflowKicker')}</span>
            <h2>
              {t('auth:landing.workflowTitleLine1')}<br />
              {t('auth:landing.workflowTitleLine2')}
            </h2>
          </div>

          <div className="ctrn-workflow-grid">
            {workflowSteps.map((step, index) => (
              <article key={step.number}>
                <div className="landing-step-heading">
                  <Icon name={WORKFLOW_ICONS[index]} size={20} aria-hidden="true" />
                  <span>{step.number}</span>
                </div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="ctrn-roles" id="roles">
          <span className="section-kicker">{t('auth:landing.rolesKicker')}</span>
          <h2>{t('auth:landing.rolesTitle')}</h2>
          <div className="ctrn-role-grid">
            {roles.map((role, index) => (
              <div key={role.title} className="card landing-role-card">
                <span className="landing-role-icon"><Icon name={ROLE_ICONS[index]} size={21} aria-hidden="true" /></span>
                <h3>{role.title}</h3>
                <p>{role.description}</p>
              </div>
            ))}
          </div>
        </section>

      </main>

      <footer className="ctrn-public-footer landing-footer">
        <div className="landing-footer-grid">
          <div className="landing-footer-brand">
            <Link to="/" aria-label={t('common:aria.home')}><Logo /></Link>
            <p>{t('auth:landing.footerDescription')}</p>
            <a className="landing-repo-link" href={PROJECT_GITHUB} target="_blank" rel="noopener noreferrer" title={t('auth:landing.newTab')}>
              GitHub / P-137 <Icon name="arrow" size={15} aria-hidden="true" />
            </a>
          </div>
          <nav className="landing-footer-group" aria-label={t('auth:landing.productNavigation')}>
            <h3>{t('auth:landing.productNavigation')}</h3>
            <button type="button" onClick={() => scrollToSection('home')}>{t('auth:landing.homeLink')}</button>
            <button type="button" onClick={() => scrollToSection('workflow')}>{t('auth:landing.workflowLink')}</button>
            <button type="button" onClick={() => scrollToSection('roles')}>{t('auth:landing.rolesLink')}</button>
          </nav>
          <nav className="landing-footer-group" aria-label={t('auth:landing.resourcesNavigation')}>
            <h3>{t('auth:landing.resourcesNavigation')}</h3>
            <a href={PROJECT_GITHUB} target="_blank" rel="noopener noreferrer" title={t('auth:landing.newTab')}>{t('auth:landing.repository')} <Icon name="arrow" size={13} aria-hidden="true" /></a>
            <a href={`${PROJECT_GITHUB}#readme`} target="_blank" rel="noopener noreferrer" title={t('auth:landing.newTab')}>{t('auth:landing.documentation')} <Icon name="arrow" size={13} aria-hidden="true" /></a>
            <a href={`${PROJECT_GITHUB}/issues`} target="_blank" rel="noopener noreferrer" title={t('auth:landing.newTab')}>{t('auth:landing.issues')} <Icon name="arrow" size={13} aria-hidden="true" /></a>
          </nav>
          <nav className="landing-footer-group" aria-label={t('auth:landing.accessNavigation')}>
            <h3>{t('auth:landing.accessNavigation')}</h3>
            {isSignedIn ? (
              <Link to="/dashboard">{t('auth:landing.enterWorkspace')}</Link>
            ) : (
              <>
                <Link to="/login">{t('auth:landing.login')}</Link>
                <Link to="/register">{t('auth:landing.register')}</Link>
              </>
            )}
          </nav>
        </div>
        <div className="landing-footer-bottom">
          <span>© {new Date().getFullYear()} CTRL SHIFT N · RAV-13</span>
          <span>Phoenix Agent Platform · VinUni</span>
          <button type="button" onClick={() => scrollToSection('home')}>{t('auth:landing.backToTop')} <Icon name="down" size={14} aria-hidden="true" /></button>
        </div>
      </footer>
    </div>
  );
}
