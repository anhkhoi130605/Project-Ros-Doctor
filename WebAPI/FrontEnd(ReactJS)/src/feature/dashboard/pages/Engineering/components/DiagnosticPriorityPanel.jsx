import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../../../../components/common/UIComponents';

export default function DiagnosticPriorityPanel({ pendingCount = 5, highWarningsCount = 3 }) {
  const priorities = [
    {
      to: '/reviews',
      dotColor: '#d97706',
      title: `${pendingCount} kết luận chờ duyệt`,
      subtitle: 'Cần người duyệt kiểm tra',
    },
    {
      to: '/reviews',
      dotColor: '#dc2626',
      title: `${highWarningsCount} cảnh báo mức cao`,
      subtitle: 'Đối chiếu bằng chứng của phiên',
    },
    {
      to: '/bags',
      dotColor: '#2563eb',
      title: '1 bag chưa đủ dữ liệu',
      subtitle: 'Kiểm tra các phần đã ghi',
    },
  ];

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <strong style={{ fontSize: '16px', color: '#0f172a', fontWeight: 700 }}>
          Ưu tiên hôm nay
        </strong>
        <span
          style={{
            background: '#e0f2fe',
            color: '#0369a1',
            fontSize: '11px',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: '12px',
          }}
        >
          ● {priorities.length} mục
        </span>
      </div>

      <div style={{ display: 'grid', gap: '14px' }}>
        {priorities.map((item, index) => (
          <Link
            key={index}
            to={item.to}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: '10px',
              background: '#fafbfd',
              border: '1px solid #f1f5f9',
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#f1f5f9')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: item.dotColor,
                }}
              />
              <div>
                <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>
                  {item.title}
                </strong>
                <small style={{ fontSize: '11px', color: '#64748b' }}>{item.subtitle}</small>
              </div>
            </div>
            <Icon name="chevron" size={16} style={{ color: '#94a3b8' }} />
          </Link>
        ))}
      </div>
    </div>
  );
}
