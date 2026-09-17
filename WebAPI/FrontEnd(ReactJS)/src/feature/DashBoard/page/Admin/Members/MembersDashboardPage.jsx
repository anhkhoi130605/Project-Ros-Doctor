import React, { useState, useMemo } from 'react';
import DashboardPage from '../../DashBoard';
import useAdminMembers from '../hook/useAdminMembers';

const navItems = [
  { label: 'Overview', path: '/admin-dashboard/overview', active: false },
  { label: 'Members', path: '/admin-dashboard/members', active: true },
  { label: 'Activity', path: '/admin-dashboard/activity', active: false },
  { label: 'System Logs', path: '/admin-dashboard/system-logs', active: false },
  { label: 'User Activity Logs', path: '/admin-dashboard/user-activity', active: false },
  { label: 'Settings', path: '/admin-dashboard/settings', active: false },
];

function formatRelativeTime(dateString) {
  if (!dateString) return 'Chưa có hoạt động';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Chưa có hoạt động';

  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Vừa xong';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} giờ trước`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} ngày trước`;

  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const roleColors = {
  admin: { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' },
  manager: { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  user: { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' },
};

export default function MembersDashboardPage() {
  const { members, loading, error, refetch } = useAdminMembers();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchSearch =
        (m.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.role || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        statusFilter === 'ALL' ||
        (m.status || '').toUpperCase() === statusFilter.toUpperCase();

      return matchSearch && matchStatus;
    });
  }, [members, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = members.length;
    const online = members.filter((m) => (m.status || '').toLowerCase() === 'online').length;
    const adminCount = members.filter((m) => (m.role || '').toLowerCase() === 'admin').length;
    return { total, online, adminCount };
  }, [members]);

  return (
    <DashboardPage
      title="Members"
      subtitle="Danh sách thành viên thực tế và trạng thái hoạt động từ hệ thống"
      sidebarTitle="ADMIN CONSOLE"
      navItems={navItems}
      actions={
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="dashboard-ghost-button"
            onClick={refetch}
            disabled={loading}
            title="Làm mới dữ liệu"
          >
            {loading ? 'Đang tải...' : '↻ Làm mới'}
          </button>
        </div>
      }
    >
      {/* Stat summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="panel-card" style={{ padding: '16px 20px', borderLeft: '4px solid #1c5c43' }}>
          <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Tổng thành viên</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
            {loading ? '...' : stats.total}
          </div>
        </div>
        <div className="panel-card" style={{ padding: '16px 20px', borderLeft: '4px solid #16a34a' }}>
          <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Đang hoạt động (Online)</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#16a34a', marginTop: '4px' }}>
            {loading ? '...' : stats.online}
          </div>
        </div>
        <div className="panel-card" style={{ padding: '16px 20px', borderLeft: '4px solid #0284c7' }}>
          <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Quản trị viên (Admin)</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#0284c7', marginTop: '4px' }}>
            {loading ? '...' : stats.adminCount}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="panel-card"
        style={{
          padding: '14px 20px',
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ flex: '1 1 260px', position: 'relative' }}>
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, email, vai trò..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Lọc:</span>
          {['ALL', 'ONLINE', 'AWAY', 'OFFLINE'].map((statusKey) => (
            <button
              key={statusKey}
              type="button"
              onClick={() => setStatusFilter(statusKey)}
              style={{
                background: statusFilter === statusKey ? '#1c5c43' : '#f1f5f9',
                color: statusFilter === statusKey ? '#ffffff' : '#475569',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {statusKey === 'ALL'
                ? 'Tất cả'
                : statusKey === 'ONLINE'
                ? 'Online'
                : statusKey === 'AWAY'
                ? 'Vắng mặt'
                : 'Offline'}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
          <div
            style={{
              display: 'inline-block',
              width: '36px',
              height: '36px',
              border: '3px solid #e2e8f0',
              borderTopColor: '#1c5c43',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <p style={{ marginTop: '12px', fontSize: '14px' }}>Đang tải danh sách thành viên từ cơ sở dữ liệu...</p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div
          className="panel-card"
          style={{
            padding: '24px',
            textAlign: 'center',
            borderLeft: '4px solid #ef4444',
            background: '#fef2f2',
          }}
        >
          <p style={{ color: '#b91c1c', margin: 0, fontWeight: 600 }}>{error}</p>
          <button
            type="button"
            className="primary-button"
            style={{ marginTop: '16px', display: 'inline-block', width: 'auto', padding: '8px 20px' }}
            onClick={refetch}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filteredMembers.length === 0 && (
        <div className="panel-card" style={{ padding: '48px 24px', textAlign: 'center', color: '#64748b' }}>
          <p style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Không tìm thấy thành viên phù hợp</p>
          <p style={{ fontSize: '13px', marginTop: '6px' }}>Hãy thử điều chỉnh từ khóa tìm kiếm hoặc bộ lọc.</p>
        </div>
      )}

      {/* Member Cards Grid */}
      {!loading && !error && filteredMembers.length > 0 && (
        <div className="dashboard-grid dashboard-grid-2">
          {filteredMembers.map((member) => {
            const isOnline = (member.status || '').toLowerCase() === 'online';
            const isAway = (member.status || '').toLowerCase() === 'away';
            const isBanned = (member.status || '').toLowerCase() === 'banned';

            const statusBadgeStyle = isOnline
              ? { bg: '#dcfce7', color: '#15803d', dot: '#22c55e' }
              : isAway
              ? { bg: '#fef3c7', color: '#b45309', dot: '#f59e0b' }
              : isBanned
              ? { bg: '#fee2e2', color: '#b91c1c', dot: '#ef4444' }
              : { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8' };

            const roleKey = (member.role || 'user').toLowerCase();
            const currentRoleColor = roleColors[roleKey] || roleColors.user;

            return (
              <section
                key={member.id || member.email}
                className="panel-card"
                style={{
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                      {member.avatarUrl ? (
                        <img
                          src={member.avatarUrl}
                          alt={member.fullName}
                          style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '2px solid #e2e8f0',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '50%',
                            background: '#1c5c43',
                            color: '#d7f36b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '16px',
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(member.fullName)}
                        </div>
                      )}

                      <div>
                        <strong style={{ fontSize: '15px', color: '#0f172a', display: 'block' }}>
                          {member.fullName}
                        </strong>
                        <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                          {member.email}
                        </span>
                      </div>
                    </div>

                    <span
                      style={{
                        background: statusBadgeStyle.bg,
                        color: statusBadgeStyle.color,
                        borderRadius: 999,
                        padding: '4px 10px',
                        fontSize: 12,
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          backgroundColor: statusBadgeStyle.dot,
                        }}
                      />
                      {member.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '10px 0' }}>
                    <span
                      style={{
                        background: currentRoleColor.bg,
                        color: currentRoleColor.color,
                        border: `1px solid ${currentRoleColor.border}`,
                        borderRadius: '4px',
                        padding: '2px 8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {member.role}
                    </span>
                    {member.phone && (
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        📞 {member.phone}
                      </span>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '12px',
                    marginTop: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12px',
                    color: '#64748b',
                  }}
                >
                  <span>
                    Hoạt động gần nhất: <strong style={{ color: '#334155' }}>{formatRelativeTime(member.lastActiveAt)}</strong>
                  </span>
                  {member.lastAction && (
                    <span
                      style={{
                        background: '#f8fafc',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                      }}
                      title={`Hành động: ${member.lastAction}`}
                    >
                      {member.lastAction}
                    </span>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </DashboardPage>
  );
}
