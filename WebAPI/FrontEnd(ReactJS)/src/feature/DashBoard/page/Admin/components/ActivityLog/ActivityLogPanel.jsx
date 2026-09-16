import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function ActivityLogPanel({ title, items = [], id, showViewAll = true }) {
  const navigate = useNavigate();

  return (
    <section id={id} className="panel-card">
      <div className="panel-header">
        <h3>{title}</h3>
        {showViewAll && (
          <button type="button" onClick={() => navigate('/admin-dashboard/user-activity')}>
            View all
          </button>
        )}
      </div>

      <div className="log-list">
        {items.map((item) => (
          <div
            key={`${item.id || item.title}-${item.time}`}
            className="log-row"
            onClick={() => item.id && navigate(`/admin-dashboard/activity/${item.id}`, { state: { log: item } })}
            style={{ cursor: item.id ? 'pointer' : 'default' }}
          >
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
