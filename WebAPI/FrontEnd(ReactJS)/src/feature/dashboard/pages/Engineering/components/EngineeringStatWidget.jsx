import React from 'react';
import { Icon } from '../../../../../components/common/UIComponents';

export default function EngineeringStatWidget({
  label,
  value,
  sublabel,
  icon = 'activity',
  tone = 'blue',
  detailTone,
  chartType = 'bar',
}) {
  const toneBgMap = {
    blue: { bg: '#f0f9ff', color: '#0284c7', stroke: '#0284c7', fill: '#bae6fd' },
    red: { bg: '#fef2f2', color: '#dc2626', stroke: '#dc2626', fill: '#fecaca' },
    amber: { bg: '#fffbeb', color: '#d97706', stroke: '#d97706', fill: '#fde68a' },
    green: { bg: '#f0fdf4', color: '#16a34a', stroke: '#16a34a', fill: '#bbf7d0' },
  };

  const currentTone = toneBgMap[tone] || toneBgMap.blue;

  // Mini Chart Renderers
  const renderMiniChart = () => {
    if (chartType === 'sparkline') {
      // Smooth area sparkline curve
      return (
        <svg width="68" height="34" viewBox="0 0 68 34" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id={`sparkGrad-${tone}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={currentTone.stroke} stopOpacity="0.4" />
              <stop offset="100%" stopColor={currentTone.stroke} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path
            d="M 2 28 Q 14 18, 26 22 T 50 10 T 66 4 L 66 32 L 2 32 Z"
            fill={`url(#sparkGrad-${tone})`}
          />
          <path
            d="M 2 28 Q 14 18, 26 22 T 50 10 T 66 4"
            fill="none"
            stroke={currentTone.stroke}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <circle cx="66" cy="4" r="3" fill={currentTone.stroke} />
        </svg>
      );
    }

    if (chartType === 'ring') {
      // Circular progress ring (e.g. 72% pending)
      const r = 13;
      const c = 2 * Math.PI * r;
      const p = 0.72;
      return (
        <svg width="34" height="34" viewBox="0 0 34 34">
          <circle cx="17" cy="17" r={r} fill="none" stroke="#f1f5f9" strokeWidth="3.5" />
          <circle
            cx="17"
            cy="17"
            r={r}
            fill="none"
            stroke={currentTone.stroke}
            strokeWidth="3.5"
            strokeDasharray={`${p * c} ${c * (1 - p)}`}
            strokeDashoffset={-c / 4}
            strokeLinecap="round"
          />
          <text
            x="17"
            y="20.5"
            textAnchor="middle"
            fontSize="9"
            fontWeight="800"
            fill={currentTone.stroke}
          >
            72%
          </text>
        </svg>
      );
    }

    if (chartType === 'alert-bar') {
      // Alert bars with highlighted peak
      const heights = [12, 20, 30, 24, 16];
      return (
        <svg width="60" height="34" viewBox="0 0 60 34">
          {heights.map((h, i) => (
            <rect
              key={i}
              x={i * 12 + 2}
              y={32 - h}
              width="7"
              height={h}
              rx="2"
              fill={i === 2 ? '#dc2626' : '#fca5a5'}
            />
          ))}
        </svg>
      );
    }

    // Default: Mini Bar chart
    const bars = [10, 16, 22, 19, 28];
    return (
      <svg width="60" height="34" viewBox="0 0 60 34">
        {bars.map((h, i) => (
          <rect
            key={i}
            x={i * 12 + 2}
            y={32 - h}
            width="7"
            height={h}
            rx="2"
            fill={i === bars.length - 1 ? currentTone.stroke : '#bae6fd'}
          />
        ))}
      </svg>
    );
  };

  return (
    <div
      className="dash-stat"
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '136px',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Top Header: Label & Icon */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
          {label}
        </span>
        <div
          className="dash-stat-icon"
          style={{
            background: currentTone.bg,
            color: currentTone.color,
            padding: '7px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon} size={16} />
        </div>
      </div>

      {/* Center Row: Big Value & Mini Chart */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', margin: '8px 0 4px 0' }}>
        <strong style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
          {value}
        </strong>
        <div className="dash-stat-spark" aria-hidden="true">
          {renderMiniChart()}
        </div>
      </div>

      {/* Bottom Sublabel */}
      {sublabel && (
        <small
          style={{
            fontSize: '11px',
            color: detailTone || '#94a3b8',
            display: 'block',
            marginTop: '4px',
            fontWeight: 500,
          }}
        >
          {sublabel}
        </small>
      )}
    </div>
  );
}
