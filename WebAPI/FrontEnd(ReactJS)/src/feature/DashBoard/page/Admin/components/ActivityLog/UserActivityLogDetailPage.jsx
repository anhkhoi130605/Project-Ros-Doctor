import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:7149';

export default function UserActivityLogDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const initialLog = useMemo(() => location.state?.log || null, [location.state]);
  const [log, setLog] = useState(initialLog);
  const [loading, setLoading] = useState(!initialLog && !!id);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialLog) {
      setLog(initialLog);
      setLoading(false);
      setError(null);
      return;
    }

    if (!id) {
      setLog(null);
      setLoading(false);
      return;
    }

    let active = true;
    const fetchLog = async () => {
      const token = localStorage.getItem('accessToken');

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_URL}/api/user-activity/${encodeURIComponent(id)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || 'Không thể tải chi tiết user activity.');
        }

        const data = await response.json();
        const found = data ?? null;

        if (!active) return;
        setLog(found);
      } catch (err) {
        if (!active) return;
        setError(err.message || 'Không thể tải dữ liệu.');
        setLog(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchLog();
    return () => {
      active = false;
    };
  }, [id, initialLog]);

  const fields = log ? [
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
  ] : [];

  return (
    <div style={{ padding: 32, maxWidth: 980, margin: '0 auto' }}>
      <button type="button" onClick={() => navigate('/admin-dashboard')} style={{ marginBottom: 20 }}>
        ← Quay lại Dashboard
      </button>

      <h2 style={{ marginBottom: 12 }}>User Activity Log Detail</h2>

      {loading ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: 24 }}>Đang tải dữ liệu user activity...</div>
      ) : error ? (
        <div style={{ background: '#fff1f2', color: '#9f1239', borderRadius: 12, padding: 24 }}>{error}</div>
      ) : !log ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: 24 }}>
          Không có dữ liệu user activity cho bản ghi này.
        </div>
      ) : (
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
      )}
    </div>
  );
}
