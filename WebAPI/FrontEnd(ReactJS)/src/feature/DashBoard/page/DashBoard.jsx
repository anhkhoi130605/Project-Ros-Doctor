import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import UserAvatarDropdown from '../components/UserAvatarDropdown';
import './dashboard.css';

const defaultNav = [
  { label: 'Overview', active: true, path: '/admin-dashboard/overview' },
  { label: 'Activity', path: '/admin-dashboard/activity' },
  { label: 'Settings', path: '/admin-dashboard/settings' },
];

export default function DashboardPage({
  title = 'Dashboard',
  subtitle = 'System overview',
  sidebarTitle = 'ADMIN CONSOLE',
  navItems = defaultNav,
  actions,
  children,
  onNavItemClick,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const resolvedNavItems = navItems.map((item) => {
    const isOverviewItem = item.label === 'Overview';
    const isActive = item.path
      ? isOverviewItem
        ? currentPath === item.path || currentPath === '/admin-dashboard'
        : currentPath === item.path
      : Boolean(item.active);

    return { ...item, active: Boolean(isActive) };
  });

  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar" aria-label="Dashboard sidebar">
        <div className="dashboard-branding">
          <span className="dashboard-logo">CSN</span>
          <small>{sidebarTitle}</small>
        </div>

        <nav className="dashboard-nav" aria-label="Dashboard navigation">
          {resolvedNavItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`dashboard-nav-item ${item.active ? 'active' : ''}`}
              onClick={() => {
                if (onNavItemClick) {
                  const shouldContinue = onNavItemClick(item.label, item.path) !== false;
                  if (item.path && shouldContinue) {
                    navigate(item.path);
                  }
                  return;
                }

                if (item.path) {
                  navigate(item.path);
                }
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <p className="dashboard-kicker">Overview</p>
            <h1 className="dashboard-page-title">{title}</h1>
            {subtitle && <p className="dashboard-subtitle">{subtitle}</p>}
          </div>

          <div className="dashboard-topbar-right">
            {actions && <div className="dashboard-actions">{actions}</div>}
            <UserAvatarDropdown />
          </div>
        </header>

        <div className="dashboard-content dashboard-content-animated">{children}</div>
      </section>
    </main>
  );
}
