import React from 'react';

export default function SystemStatusPanel({
  title = 'Trạng thái hệ thống',
  score = '98.4',
  subtitle = '/ 100',
  metrics = [],
}) {
  return (
    <section className="panel-card">
      <div className="panel-header">
        <h3>{title}</h3>
        <span className="status-pill">Ổn định</span>
      </div>    

      <div className="system-score">
        <strong>{score}</strong>
        <span>{subtitle}</span>
      </div>
      <div className="score-bar"><span /></div>
      <div className="metric-list">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <span>{metric.label}</span>
            <strong className={metric.ok ? 'metric-ok' : ''}>{metric.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
