import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../../../../components/common/UIComponents';

export default function DiagnosticPriorityPanel({ pendingCount = 149, highWarningsCount = 110 }) {
  const incompleteCount = 1;
  const total = (pendingCount || 149) + (highWarningsCount || 110) + incompleteCount;

  const [hoveredIdx, setHoveredIdx] = useState(null);

  // SVG Donut calculation
  const radius = 38;
  const circumference = 2 * Math.PI * radius; // ~238.76

  const pPending = (pendingCount || 149) / total;
  const pHigh = (highWarningsCount || 110) / total;
  const pIncomplete = incompleteCount / total;

  const priorities = [
    {
      to: '/reviews',
      dotColor: '#d97706',
      title: `${pendingCount || 149} kết luận chờ duyệt`,
      subtitle: 'Kỹ sư kiểm tra trước khi xuất',
      percent: Math.round(pPending * 100),
      count: pendingCount || 149,
      strokeDasharray: `${pPending * circumference} ${circumference * (1 - pPending)}`,
      strokeDashoffset: 0,
    },
    {
      to: '/reviews',
      dotColor: '#dc2626',
      title: `${highWarningsCount || 110} cảnh báo mức cao`,
      subtitle: 'Đối chiếu bằng chứng của phiên',
      percent: Math.round(pHigh * 100),
      count: highWarningsCount || 110,
      strokeDasharray: `${pHigh * circumference} ${circumference * (1 - pHigh)}`,
      strokeDashoffset: -(pPending * circumference),
    },
    {
      to: '/bags',
      dotColor: '#2563eb',
      title: '1 bag chưa đủ dữ liệu',
      subtitle: 'Kiểm tra các phần đã ghi',
      percent: Math.max(1, Math.round(pIncomplete * 100)),
      count: incompleteCount,
      strokeDasharray: `${pIncomplete * circumference} ${circumference * (1 - pIncomplete)}`,
      strokeDashoffset: -((pPending + pHigh) * circumference),
    },
  ];

  return (
    <div
      className="dash-priority"
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '22px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* Header */}
      <div
        className="dash-priority-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <strong style={{ fontSize: '16px', color: '#0f172a', fontWeight: 700 }}>
            Ưu tiên hôm nay
          </strong>
        </div>
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
          ● {priorities.length} nhóm
        </span>
      </div>

      {/* Mini Donut Chart combined with Priority list */}
      <div className="dash-priority-summary" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px' }}>
        {/* SVG Donut */}
        <div style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0 }}>
          <svg
            width="100"
            height="100"
            viewBox="0 0 100 100"
            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
          >
            {/* Background ring */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="11"
            />
            {/* Slices */}
            {priorities.map((item, idx) => {
              const isHov = hoveredIdx === idx;
              return (
                <circle
                  key={idx}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke={item.dotColor}
                  strokeWidth={isHov ? '14' : '11'}
                  strokeDasharray={item.strokeDasharray}
                  strokeDashoffset={item.strokeDashoffset}
                  style={{
                    transition: 'all 0.25s ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              );
            })}
          </svg>
          {/* Donut Center Count */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <strong style={{ fontSize: '18px', fontWeight: 800, color: hoveredIdx !== null ? priorities[hoveredIdx].dotColor : '#0f172a' }}>
              {hoveredIdx !== null ? priorities[hoveredIdx].count : total}
            </strong>
            <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 600 }}>
              {hoveredIdx !== null ? `${priorities[hoveredIdx].percent}%` : 'Mục'}
            </span>
          </div>
        </div>

        {/* Short Summary Text */}
        <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
          <div>
            Tổng <strong>{total} sự kiện ưu tiên</strong> phát hiện trên toàn hệ thống cần kỹ sư can thiệp.
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Rê chuột vào cung tròn để xem tỷ lệ phân bổ.
          </div>
        </div>
      </div>

      {/* Priority Links */}
      <div style={{ display: 'grid', gap: '8px' }}>
        {priorities.map((item, index) => {
          const isHov = hoveredIdx === index;
          return (
            <Link
              className="dash-priority-item"
              key={index}
              to={item.to}
              onMouseEnter={() => setHoveredIdx(index)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '8px',
                background: isHov ? '#ffffff' : '#fafbfd',
                border: `1px solid ${isHov ? item.dotColor : '#f1f5f9'}`,
                boxShadow: isHov ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: item.dotColor,
                    flexShrink: 0,
                  }}
                />
                <div>
                  <strong style={{ fontSize: '12px', color: '#0f172a', display: 'block' }}>
                    {item.title}
                  </strong>
                  <small style={{ fontSize: '11px', color: '#64748b' }}>{item.subtitle}</small>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: item.dotColor }}>
                  {item.percent}%
                </span>
                <Icon name="chevron" size={14} style={{ color: '#94a3b8' }} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
