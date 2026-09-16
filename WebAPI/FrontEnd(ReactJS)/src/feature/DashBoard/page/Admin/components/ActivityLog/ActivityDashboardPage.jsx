import React from 'react';
import DashboardPage from '../../../DashBoard';

const navItems = [
  { label: 'Overview', path: '/admin-dashboard/overview', active: false },
  { label: 'Members', path: '/admin-dashboard/members', active: false },
  { label: 'Activity', path: '/admin-dashboard/activity', active: true },
  { label: 'System Logs', path: '/admin-dashboard/system-logs', active: false },
  { label: 'User Activity Logs', path: '/admin-dashboard/user-activity', active: false },
  { label: 'Settings', path: '/admin-dashboard/settings', active: false },
];

const recentActivities = [
  { title: 'Create new campaign', user: 'Alice', time: '10:15 AM' },
  { title: 'User updated profile', user: 'Minh', time: '11:30 AM' },
  { title: 'Permission changed', user: 'Admin', time: '01:45 PM' },
];

export default function ActivityDashboardPage() {
  return (
    <DashboardPage
      title="Activity"
      subtitle="Theo dõi các hành động gần đây trong hệ thống"
      sidebarTitle="ADMIN CONSOLE"
      navItems={navItems}
      actions={<button type="button" className="dashboard-ghost-button">Export</button>}
    >
      <div className="dashboard-grid dashboard-grid-1">
        <section className="panel-card" style={{ padding: 20 }}>
          <div className="panel-header" style={{ marginBottom: 16 }}>
            <h3>Recent Activity</h3>
          </div>
          <div className="log-list">
            {recentActivities.map((item) => (
              <div key={item.title} className="log-row">
                <div className="log-dot" />
                <div className="log-copy">
                  <strong>{item.title}</strong>
                  <span>{item.user}</span>
                </div>
                <time>{item.time}</time>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardPage>
  );
}
