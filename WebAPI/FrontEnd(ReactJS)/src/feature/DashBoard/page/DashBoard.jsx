import React from 'react';
import './dashboard.css';

const defaultNav = [
  { label: 'Overview', active: true },
  { label: 'Activity' },
  { label: 'Settings' },
];

export default function DashboardPage({
  title = 'Dashboard',
  subtitle = 'System overview',
  sidebarTitle = 'ADMIN CONSOLE',
  navItems = defaultNav,
  actions,
  children,
}) {
  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar" aria-label="Dashboard sidebar">
        <div className="dashboard-branding">
          <span className="dashboard-logo">CSN</span>
          <small>{sidebarTitle}</small>
        </div>

        

        <nav className="dashboard-nav" aria-label="Dashboard navigation">
          {navItems.map((item) => (
            <button key={item.label} type="button" className={`dashboard-nav-item ${item.active ? 'active' : ''}`}>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="dashboard-sidebar-footer">
          <div className="dashboard-status-pill">
            <span className="dashboard-status-dot" />
            <span>25°</span>
          </div>
        </div>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <p className="dashboard-kicker">Overview</p>
            <h1 className="dashboard-page-title">{title}</h1>
            {subtitle && <p className="dashboard-subtitle">{subtitle}</p>}
          </div>

          {actions ? <div className="dashboard-actions">{actions}</div> : <button type="button" className="dashboard-ghost-button">Log out</button>}
        </header>

        <div className="dashboard-content">{children}</div>
      </section>
    </main>
  );
}
