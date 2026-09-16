import React from 'react';
import DashboardPage from '../DashBoard';
import AdminStatWidget from './components/AdminStatWidget';
import AdminActivityFeedPanel from './components/AdminActivityFeedPanel';
import AdminSystemStatusPanel from './components/AdminSystemStatusPanel';
import ActivityLogPanel from './components/ActivityLogPanel';
import SystemLogPanel from './components/SystemLogPanel';
import SystemLogTaskbar from './components/SystemLogTaskbar';

const widgets = [
  { label: 'Total Members', value: '1,284', tone: 'green', detail: 'vs last month' },
  { label: 'Active Now', value: '964', tone: 'blue', detail: 'in the last 30 days' },
  { label: 'New Accounts', value: '86', tone: 'amber', detail: 'this month' },
  { label: 'Retention Rate', value: '92.6%', tone: 'purple', detail: 'vs last month' },
];

const feed = [
  { name: 'Phạm Hoàng Anh Khôi', action: 'just created an account', time: '2 minutes ago' },
  { name: 'Mai Ngọc Anh', action: 'logged in to the system', time: '18 minutes ago' },
  { name: 'Trần Linh Chi', action: 'updated profile', time: '42 minutes ago' },
];

const metrics = [
  { label: 'API response time', value: '124ms' },
  { label: 'This month uptime', value: '99.98%' },
  { label: 'Database', value: 'Connected', ok: true },
];

const activityLogEntries = [
  { title: 'User registration', detail: 'new student account was created', time: '08:45 AM' },
  { title: 'Course updated', detail: 'club training module was edited', time: '09:10 AM' },
  { title: 'Permission changed', detail: 'admin role access was updated', time: '10:30 AM' },
];

const systemLogEntries = [
  { title: 'API heartbeat', detail: 'stable response time across all services', status: 'Healthy' },
  { title: 'Database backup', detail: 'nightly backup completed successfully', status: 'Success' },
  { title: 'Security scan', detail: 'no critical vulnerabilities detected', status: 'Verified' },
];

export default function AdminDashboardPage() {
  return (
    <DashboardPage
      title="Admin Dashboard"
      subtitle="Administrative operations overview"
      sidebarTitle="ADMIN CONSOLE"
      actions={<button type="button" className="dashboard-ghost-button">+ Add new</button>}
      navItems={[
        { label: 'Overview', active: true, icon: '◈' },
        { label: 'Members', icon: '◎' },
        { label: 'Activity', icon: '◷' },
        { label: 'System Logs', icon: '◷' },
        { label: 'Settings', icon: '⚙' },
      ]}
    >
      <SystemLogTaskbar />

      <div className="dashboard-grid dashboard-grid-4">
        {widgets.map((item) => (
          <AdminStatWidget key={item.label} {...item} />
        ))}
      </div>

      <div className="dashboard-grid dashboard-grid-2">
        <AdminActivityFeedPanel title="Recent Activity" items={feed} />
        <AdminSystemStatusPanel title="System Status" score="98.4" subtitle="/ 100" metrics={metrics} />
      </div>

      <div className="dashboard-grid dashboard-grid-2">
        <ActivityLogPanel title="Activity Log" items={activityLogEntries} />
        <SystemLogPanel title="System Log" items={systemLogEntries} />
      </div>
    </DashboardPage>
  );
}
