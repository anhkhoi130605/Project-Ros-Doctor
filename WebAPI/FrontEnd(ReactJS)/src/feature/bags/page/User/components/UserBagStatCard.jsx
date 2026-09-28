import React from 'react';
import { Card, Icon } from '../../../../components/common/UIComponents';

export default function UserBagStatCard({ title, value, note, icon = 'database', tone = 'blue' }) {
  return (
    <Card className={`stat ${tone}`}>
      <span className="stat-label">{title}</span>
      <span className="stat-icon"><Icon name={icon} /></span>
      <strong>{value}</strong>
      <small>{note}</small>
    </Card>
  );
}
