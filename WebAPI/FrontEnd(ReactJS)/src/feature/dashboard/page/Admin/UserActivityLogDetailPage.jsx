import React, { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function UserActivityLogDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const log = useMemo(() => location.state?.log || null, [location.state]);

  if (!log) {
    return (
      <div style={{ padding: 32 }}>
        <button type="button" onClick={() => navigate('/admin-dashboard')}>
          ← Quay lại Dashboard
        </button>
        <h2>Không có dữ liệu user activity</h2>
      </div>
    );
  }

  const fields = [
    ['User ID', log.userId],
    ['User name', log.userName],
    ['Email', log.email],
    ['Action', log.action],
    ['Entity type', log.entityType],
    ['Entity ID', log.entityId],
    ['Request path', log.requestPath],
    ['HTTP method', log.httpMethod],
    ['IP address', log.ipAddress],
    ['User agent', log.userAgent],
    ['Created at', log.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN') : 'N/A'],
  ];

  return (
    <div style={{ padding: 32, maxWidth: 980, margin: '0 auto' }}>
      <button type="button" onClick={() => navigate('/admin-dashboard')} style={{ marginBottom: 20 }}>
        ← Quay lại Dashboard
      </button>

      <h2 style={{ marginBottom: 12 }}>User Activity Log Detail</h2>

      <div style={{ background: '#111827', color: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 8px 30px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', rowGap: 12, columnGap: 16 }}>
          {fields.map(([label, value]) => (
            <React.Fragment key={label}>
              <div style={{ color: '#9ca3af', fontWeight: 600 }}>{label}</div>
              <div style={{ wordBreak: 'break-word', color: '#f3f4f6' }}>{value || '—'}</div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
