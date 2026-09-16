import React from 'react';

export default function UserStatWidget({ label, value, tone = 'green', detail = 'Cập nhật mới' }) {
  return (
    <article className={`mini-widget mini-widget-${tone}`}>
      <div className="mini-widget-header">
        <span>{label}</span>
        <span className="mini-widget-trend">↗</span>
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
