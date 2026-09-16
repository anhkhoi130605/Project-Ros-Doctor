import React from 'react';

export default function StatWidget({ label, value, tone = 'green', detail = 'So với tháng trước' }) {
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
