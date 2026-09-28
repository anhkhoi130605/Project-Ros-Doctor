import React from 'react';
import DashboardPage from '../../DashboardPage';

const navItems = [
  { label: 'Overview', path: '/admin-dashboard/overview', active: false },
  { label: 'Members', path: '/admin-dashboard/members', active: false },
  { label: 'Activity', path: '/admin-dashboard/activity', active: false },
  { label: 'System Logs', path: '/admin-dashboard/system-logs', active: false },
  { label: 'User Activity Logs', path: '/admin-dashboard/user-activity', active: false },
  { label: 'Settings', path: '/admin-dashboard/settings', active: true },
];

export default function SettingsDashboardPage() {
  return (
    <DashboardPage
      title="Settings"
      subtitle="Cấu hình và tùy chọn quản trị"
      sidebarTitle="ADMIN CONSOLE"
      navItems={navItems}
      actions={<button type="button" className="dashboard-ghost-button">Save</button>}
    >
      <div className="dashboard-grid dashboard-grid-2">
        <section className="panel-card" style={{ padding: 20 }}>
          <h3>General</h3>
          <p style={{ color: '#4b5563' }}>Site name, timezone, default language</p>
        </section>
        <section className="panel-card" style={{ padding: 20 }}>
          <h3>Security</h3>
          <p style={{ color: '#4b5563' }}>JWT, rate limits, session timeout</p>
        </section>
      </div>
    </DashboardPage>
  );
}
