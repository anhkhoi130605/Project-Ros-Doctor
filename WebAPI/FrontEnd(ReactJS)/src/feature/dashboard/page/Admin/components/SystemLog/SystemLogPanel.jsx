import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SystemLogPanel({ title = 'System Error Logs', items = [] }) {
  const navigate = useNavigate();
  const [copiedKey, setCopiedKey] = useState(null);

  const handleCopy = (e, text, key) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  return (
    <section className="panel-card">
      <div className="panel-header">
        <h3>{title}</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="status-pill">Live Monitoring</span>
          <button
            type="button"
            className="dashboard-ghost-button"
            style={{ fontSize: 11, padding: '3px 8px' }}
            onClick={() => navigate('/admin-dashboard/system-logs')}
          >
            Xem tất cả →
          </button>
        </div>
      </div>

      <div className="log-list">
        {items.length === 0 ? (
          <div style={{ padding: '20px 10px', textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
            Chưa có lỗi hệ thống nào được ghi nhận.
          </div>
        ) : (
          items.map((item, idx) => {
            const key = item.id || `syslog-${idx}`;
            const isCopied = copiedKey === key;
            return (
              <div
                key={key}
                className="log-row"
                style={{ cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                onClick={() => navigate('/admin-dashboard/system-logs')}
                title="Nhấn để mở trang chi tiết System Logs"
              >
                <div
                  className="log-dot system"
                  style={{
                    backgroundColor: item.status === 'Critical' ? '#ef4444' : item.status === 'Warning' ? '#f59e0b' : '#10b981'
                  }}
                />
                <div className="log-copy" style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 13 }}>{item.title}</strong>
                    {item.exceptionType && (
                      <code
                        style={{
                          fontSize: 11,
                          backgroundColor: '#fee2e2',
                          color: '#991b1b',
                          padding: '1px 5px',
                          borderRadius: 4,
                        }}
                      >
                        {item.exceptionType}
                      </code>
                    )}
                  </div>
                  <span style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>{item.detail}</span>
                </div>

                {item.exceptionType && (
                  <button
                    type="button"
                    style={{
                      background: isCopied ? '#16a34a' : '#1f2937',
                      color: '#ffffff',
                      border: 0,
                      borderRadius: 4,
                      padding: '3px 7px',
                      fontSize: 10.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease',
                    }}
                    onClick={(e) => handleCopy(e, item.exceptionType, key)}
                    title="Sao chép loại ngoại lệ này"
                  >
                    {isCopied ? '✓ Đã chép!' : '📋 Chép lỗi'}
                  </button>
                )}

                <span className="log-status">{item.status}</span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
