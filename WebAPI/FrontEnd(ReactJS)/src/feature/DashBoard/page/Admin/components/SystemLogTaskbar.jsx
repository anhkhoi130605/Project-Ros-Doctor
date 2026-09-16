import React from 'react';

export default function AdminLogTaskbar({ title, score = '98.4', subtitle = '/ 100', metrics = [] }) {
  return (
    <section className="panel-card">
      <div className="panel-header">
        <h3>{title}</h3>
        <span className="status-pill">Stable</span>
      </div>

      <div className="system-score">
        <strong>{score}</strong>
        <span>{subtitle}</span>
      </div>
      <div className="score-bar"><span /></div>

      <div className="metric-list">
        {metrics.map((item) => (
          <div key={item.label}>
            <span>{item.label}</span>
            <strong className={item.ok ? 'metric-ok' : ''}>{item.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
