import React from 'react';
import { Card, Icon } from '../../../../../components/common/UIComponents';

export default function SessionStatCard({ title, value, note, icon = 'activity', tone = 'cyan' }) {
  return (
    <Card className={`stat ${tone}`}>
      <span className="stat-label">{title}</span>
      <span className="stat-icon"><Icon name={icon} /></span>
      <strong>{value}</strong>
      <small>{note}</small>
      <svg className="spark" viewBox="0 0 88 35" aria-hidden="true">
        <path
          d="M1 30L12 23L21 26L32 12L43 16L56 7L66 11L78 4L87 5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
      </svg>
    </Card>
  );
}
