import React from 'react';

export default function ActivityLogPanel({ title, items = [] }) {
  return (
    <section className="panel-card">
      <div className="panel-header">
        <h3>{title}</h3>
        <button type="button">View all</button>
      </div>

      <div className="log-list">
        {items.map((item) => (
          <div key={`${item.title}-${item.time}`} className="log-row">
            <div className="log-dot" />
            <div className="log-copy">
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
            </div>
            <time>{item.time}</time>
          </div>
        ))}
      </div>
    </section>
  );
}
