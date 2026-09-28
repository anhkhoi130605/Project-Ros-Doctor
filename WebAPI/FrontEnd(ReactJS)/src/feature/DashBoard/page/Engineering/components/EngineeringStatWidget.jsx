import React from 'react';
import { Icon } from '../../../../../components/common/UIComponents';

export default function EngineeringStatWidget({
  label,
  value,
  sublabel,
  icon = 'activity',
  tone = 'blue',
  detailTone,
}) {
  const toneBgMap = {
    blue: { bg: '#f0f9ff', color: '#0284c7' },
    red: { bg: '#fef2f2', color: '#dc2626' },
    amber: { bg: '#fffbeb', color: '#d97706' },
    green: { bg: '#f0fdf4', color: '#16a34a' },
  };

  const currentTone = toneBgMap[tone] || toneBgMap.blue;

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}
    >
      <div>
        <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '8px' }}>
          {label}
        </span>
        <strong style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
          {value}
        </strong>
        {sublabel && (
          <small
            style={{
              fontSize: '11px',
              color: detailTone || '#94a3b8',
              display: 'block',
              marginTop: '8px',
            }}
          >
            {sublabel}
          </small>
        )}
      </div>
      <div
        style={{
          background: currentTone.bg,
          color: currentTone.color,
          padding: '10px',
          borderRadius: '10px',
        }}
      >
        <Icon name={icon} size={20} />
      </div>
    </div>
  );
}
