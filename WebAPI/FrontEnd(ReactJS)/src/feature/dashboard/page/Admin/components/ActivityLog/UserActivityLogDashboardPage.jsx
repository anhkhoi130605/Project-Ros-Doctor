import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardPage from '../../../DashboardPage';

const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:7149';

export default function UserActivityLogDashboardPage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      const token = localStorage.getItem('accessToken');

      try {
        setLoading(true);
        setError('');

        const response = await fetch(`${API_URL}/api/user-activity?take=100`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || 'Không thể tải user activity log.');
        }

        const data = await response.json();
        setLogs(Array.isArray(data) ? data : []);
      } catch (err) {
        setLogs([]);
        setError(err.message || 'Có lỗi khi tải user activity log.');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const rows = useMemo(
    () =>
      (logs || []).map((log) => ({
        id: log.id ?? log.Id,
        title: log.action || 'User activity',
        user: log.userName || log.email || log.userId || 'Unknown',
        detail: `${log.requestPath || 'N/A'}${log.httpMethod ? ` • ${log.httpMethod}` : ''}`,
        time: log.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN') : 'N/A',
      })),
    [logs]
  );

  return (
    <DashboardPage
      title="User Activity Log"
      subtitle="Xem toàn bộ lịch sử hoạt động người dùng"
      sidebarTitle="ADMIN CONSOLE"
      navItems={[
        { label: 'Overview', path: '/admin-dashboard/overview', active: false },
        { label: 'Members', path: '/admin-dashboard/members', active: false },
        { label: 'Activity', path: '/admin-dashboard/activity', active: false },
        { label: 'System Logs', path: '/admin-dashboard/system-logs', active: false },
        { label: 'User Activity Logs', path: '/admin-dashboard/user-activity', active: true },
        { label: 'Settings', path: '/admin-dashboard/settings', active: false },
      ]}
      actions={<button type="button" className="dashboard-ghost-button" onClick={() => navigate('/admin-dashboard')}>← Back</button>}
    >
      <section className="panel-card" style={{ padding: 20 }}>
        <div className="panel-header" style={{ marginBottom: 16 }}>
          <h3>Activity log</h3>
        </div>

        {loading ? (
          <div>Đang tải dữ liệu...</div>
        ) : error ? (
          <div style={{ color: '#b91c1c' }}>{error}</div>
        ) : rows.length === 0 ? (
          <div>Không có dữ liệu user activity.</div>
        ) : (
          <div className="log-list">
            {rows.map((item) => (
              <div
                key={item.id}
                className="log-row"
                onClick={() => navigate(`/admin-dashboard/activity/${item.id}`, { state: { log: logs.find((x) => (x.id ?? x.Id) === item.id) } })}
                style={{ cursor: 'pointer' }}
              >
                <div className="log-dot" />
                <div className="log-copy">
                  <strong>{item.title}</strong>
                  <span>{item.user}</span>
                  <span>{item.detail}</span>
                </div>
                <time>{item.time}</time>
              </div>
            ))}
          </div>
        )}
      </section>
    </DashboardPage>
  );
}
