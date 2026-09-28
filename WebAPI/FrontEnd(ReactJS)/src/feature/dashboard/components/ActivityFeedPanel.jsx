import React from 'react';

export default function ActivityFeedPanel({ title = 'Hoạt động gần đây', items = [] }) {
  return (
    <section className="panel-card">
      <div className="panel-header">
        <h3>{title}</h3>
        <button type="button">Xem tất cả</button>
      </div>

      <div className="list-stack">
        {items.map((item) => (
          <div key={item.name} className="feed-row">
            <div className="avatar-pill">{(item.name || 'N').split(' ').slice(-2).map((x) => x[0]).join('').slice(0, 2)}</div>
            <div className="feed-copy">
              <strong>{item.name}</strong>
              <span>{item.action}</span>
            </div>
            <time>{item.time}</time>
          </div>
        ))}
      </div>
    </section>
  );
}
