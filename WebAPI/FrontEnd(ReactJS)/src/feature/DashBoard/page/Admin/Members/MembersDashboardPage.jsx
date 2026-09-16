import React from 'react';
import DashboardPage from '../../DashBoard';

const navItems = [
  { label: 'Overview', path: '/admin-dashboard/overview', active: false },
  { label: 'Members', path: '/admin-dashboard/members', active: true },
  { label: 'Activity', path: '/admin-dashboard/activity', active: false },
  { label: 'System Logs', path: '/admin-dashboard/system-logs', active: false },
  { label: 'User Activity Logs', path: '/admin-dashboard/user-activity', active: false },
  { label: 'Settings', path: '/admin-dashboard/settings', active: false },
];

const members = [
  { name: 'Alice Nguyen', role: 'Admin', status: 'Online' },
  { name: 'Minh Tran', role: 'User', status: 'Offline' },
  { name: 'Hoa Le', role: 'Manager', status: 'Online' },
  { name: 'Duy Pham', role: 'User', status: 'Away' },
];

export default function MembersDashboardPage() {
  return (
    <DashboardPage
      title="Members"
      subtitle="Danh sách thành viên và trạng thái hoạt động"
      sidebarTitle="ADMIN CONSOLE"
      navItems={navItems}
      actions={<button type="button" className="dashboard-ghost-button">+ Add member</button>}
    >
      <div className="dashboard-grid dashboard-grid-2">
        {members.map((member) => (
          <section key={member.name} className="panel-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <strong>{member.name}</strong>
                <div style={{ color: '#6b7280' }}>{member.role}</div>
              </div>
              <span
                style={{
                  background: member.status === 'Online' ? '#dcfce7' : '#f3f4f6',
                  color: member.status === 'Online' ? '#166534' : '#374151',
                  borderRadius: 999,
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {member.status}
              </span>
            </div>
            <div style={{ color: '#4b5563' }}>Last active: 2 mins ago</div>
          </section>
        ))}
      </div>
    </DashboardPage>
  );
}
