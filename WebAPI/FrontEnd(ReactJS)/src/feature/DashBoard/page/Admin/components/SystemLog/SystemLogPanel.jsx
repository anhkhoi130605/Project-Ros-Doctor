import React from 'react';

export default function SystemLogPanel({ title, items = [] }) {
  return (
    <section className="panel-card">
      <div className="panel-header">
        <h3>{title}</h3>
        <span className="status-pill">Live</span>
      </div>

      <div className="log-list">
        {items.map((item) => (
          <div key={`${item.title}-${item.status}`} className="log-row">
            <div className="log-dot system" />
            <div className="log-copy">
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
            </div>
            <span className="log-status">{item.status}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
