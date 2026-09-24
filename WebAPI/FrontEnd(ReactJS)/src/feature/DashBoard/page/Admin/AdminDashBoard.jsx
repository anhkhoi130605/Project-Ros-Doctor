import React from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardPage from '../DashBoard';
import AdminStatWidget from './components/AdminStatWidget';
import AdminActivityFeedPanel from './components/AdminActivityFeedPanel';
import AdminSystemStatusPanel from './components/AdminSystemStatusPanel';
import ActivityLogPanel from './components/ActivityLog/ActivityLogPanel';
import SystemLogPanel from './components/SystemLog/SystemLogPanel';
import SystemLogTaskbar from './components/SystemLog/SystemLogTaskbar';
import useAdminActivityLogs from './hook/useAdminActivityLogs';
import useSystemLogs from './hook/useSystemLogs';

const widgets = [
  { label: 'Total Members', value: '1,284', tone: 'green', detail: 'vs last month' },
  { label: 'Active Now', value: '964', tone: 'blue', detail: 'in the last 30 days' },
  { label: 'New Accounts', value: '86', tone: 'amber', detail: 'this month' },
  { label: 'Retention Rate', value: '92.6%', tone: 'purple', detail: 'vs last month' },
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

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { logs, loading, error } = useAdminActivityLogs();
  const { logs: sysLogs } = useSystemLogs(5);

  const scrollToSection = (label, path) => {
    if (label === 'User Activity Logs' && path) {
      navigate(path);
      return false;
    }

    if (label === 'Overview' && path) {
      navigate(path);
      return false;
    }

    const map = {
      Overview: 'overview-section',
      Activity: 'activity-feed-section',
    };

    const sectionId = map[label];
    if (!sectionId) return true;

    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    return false;
  };

  const feed = (logs || []).slice(0, 5).map((item) => ({
    name: item.userName || item.email || 'Unknown user',
    action: item.action || 'performed an action',
    time: item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : 'N/A',
  }));

  const activityLogEntries = (logs || []).slice(0, 5).map((item) => ({
    id: item.id ?? item.Id,
    title: item.action || 'User activity',
    detail: `${item.requestPath || item.entityType || 'System'}${item.httpMethod ? ` • ${item.httpMethod}` : ''}`,
    time: item.createdAt ? new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
    userId: item.userId,
    userName: item.userName,
    email: item.email,
    action: item.action,
    entityType: item.entityType,
    entityId: item.entityId,
    requestPath: item.requestPath,
    httpMethod: item.httpMethod,
    ipAddress: item.ipAddress,
    userAgent: item.userAgent,
    createdAt: item.createdAt,
  }));

  return (
    <DashboardPage
      title="Admin Dashboard"
      subtitle="Administrative operations overview"
      sidebarTitle="ADMIN CONSOLE"
      onNavItemClick={scrollToSection}
      actions={<button type="button" className="dashboard-ghost-button">+ Add new</button>}
      navItems={[
        { label: 'Overview', active: true, icon: '◈', path: '/admin-dashboard/overview' },
        { label: 'Members', icon: '◎', path: '/admin-dashboard/members' },
        { label: 'Activity', icon: '◷', path: '/admin-dashboard/activity' },
        { label: 'System Logs', icon: '◷', path: '/admin-dashboard/system-logs' },
        { label: 'User Activity Logs', icon: '◷', path: '/admin-dashboard/user-activity' },
        { label: 'Settings', icon: '⚙', path: '/admin-dashboard/settings' },
      ]}
    >
      <SystemLogTaskbar />

      <div id="overview-section" className="dashboard-grid dashboard-grid-4">
        {widgets.map((item) => (
          <AdminStatWidget key={item.label} {...item} />
        ))}
      </div>

      <div id="activity-feed-section" className="dashboard-grid dashboard-grid-2">
        <AdminActivityFeedPanel
          title={loading ? 'Loading activity...' : error ? 'Recent Activity (error)' : 'Recent Activity'}
          items={error ? [] : feed}
        />
        <AdminSystemStatusPanel title="System Status" score="98.4" subtitle="/ 100" metrics={metrics} />
      </div>

      <div className="dashboard-grid dashboard-grid-2">
        <ActivityLogPanel
          id="user-activity-panel"
          title={loading ? 'Activity Log' : 'Activity Log'}
          items={error ? [{ title: 'Load error', detail: error, time: 'Now' }] : activityLogEntries}
        />
        <SystemLogPanel
          title="System Error Logs"
          items={
            sysLogs && sysLogs.length > 0
              ? sysLogs.map((l) => ({
                  id: l.id,
                  title: l.requestPath || l.exceptionType,
                  detail: l.translatedMessage || l.errorMessage,
                  exceptionType: l.exceptionType,
                  status: l.logLevel || 'Error',
                }))
              : [
                  { title: 'API heartbeat', detail: 'Tất cả các endpoint đang phản hồi bình thường.', status: 'Healthy' },
                  { title: 'Database backup', detail: 'Backup đã chạy thành công.', status: 'Success' },
                ]
          }
        />
      </div>
    </DashboardPage>
  );
}
