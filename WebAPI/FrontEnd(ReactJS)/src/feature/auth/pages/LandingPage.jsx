import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logo, Button, Icon } from '../../../components/common/UIComponents';
import LanguageSwitcher from '../../../components/common/LanguageSwitcher';
import PearlScene from '../../../components/common/PearlScene';
import SmoothReveal from '../../../components/common/SmoothReveal';

export default function LandingPage() {
  const { t } = useTranslation(['auth', 'common']);
  const workflowSteps = t('auth:landing.workflowSteps', { returnObjects: true });
  const roles = t('auth:landing.roles', { returnObjects: true });

  return (
    <div className="ctrn-home">
      <header className="ctrn-public-header">
        <Link to="/" aria-label={t('common:aria.home')}>
          <Logo />
        </Link>
        <nav>
          <a href="#workflow">{t('auth:landing.workflowLink')}</a>
          <a href="#roles">{t('auth:landing.rolesLink')}</a>
          <LanguageSwitcher />
          <Button to="/login" variant="secondary">
            {t('auth:landing.login')}
          </Button>
          <Button to="/register">{t('auth:landing.register')}</Button>
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
              <Button to="/login" icon="arrow">
                {t('auth:landing.enterWorkspace')}
              </Button>
              <a className="ctrn-text-link" href="#workflow">
                {t('auth:landing.exploreWorkflow')} <Icon name="down" size={16} />
              </a>
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
            {workflowSteps.map((step) => (
              <article key={step.number}>
                <span>{step.number}</span>
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
            {roles.map((role) => (
              <div key={role.title} className="card">
                <h3>{role.title}</h3>
                <p>{role.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="ctrn-public-footer">
        <span>CTRL SHIFT N / ROS2 Diagnostic System</span>
        <span>Phoenix Agent Platform · VinUni</span>
      </footer>
    </div>
  );
}
