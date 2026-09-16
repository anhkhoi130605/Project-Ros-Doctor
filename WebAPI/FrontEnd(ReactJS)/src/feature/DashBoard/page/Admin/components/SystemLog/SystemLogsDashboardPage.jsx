import React from 'react';
import DashboardPage from '../../../DashBoard';

const navItems = [
  { label: 'Overview', path: '/admin-dashboard/overview', active: false },
  { label: 'Members', path: '/admin-dashboard/members', active: false },
  { label: 'Activity', path: '/admin-dashboard/activity', active: false },
  { label: 'System Logs', path: '/admin-dashboard/system-logs', active: true },
  { label: 'User Activity Logs', path: '/admin-dashboard/user-activity', active: false },
  { label: 'Settings', path: '/admin-dashboard/settings', active: false },
];

const systemLogs = [
  { title: 'API heartbeat', status: 'Healthy', detail: 'Tất cả các endpoint đang phản hồi bình thường.' },
  { title: 'Database backup', status: 'Success', detail: 'Backup đã chạy thành công lúc 02:00.' },
  { title: 'Security scan', status: 'Verified', detail: 'Không phát hiện lỗ hổng nghiêm trọng.' },
];

export default function SystemLogsDashboardPage() {
  return (
    <DashboardPage
      title="System Logs"
      subtitle="Thông tin trạng thái và sự kiện hệ thống"
      sidebarTitle="ADMIN CONSOLE"
      navItems={navItems}
      actions={<button type="button" className="dashboard-ghost-button">Refresh</button>}
    >
      <div className="dashboard-grid dashboard-grid-1">
        <section className="panel-card" style={{ padding: 20 }}>
          <div className="panel-header" style={{ marginBottom: 16 }}>
            <h3>System status</h3>
          </div>
          <div className="log-list">
            {systemLogs.map((item) => (
              <div key={item.title} className="log-row">
                <div className="log-dot" />
                <div className="log-copy">
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </div>
                <time>{item.status}</time>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardPage>
  );
}
