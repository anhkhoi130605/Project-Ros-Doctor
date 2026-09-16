import React from 'react';

export default function InfoCard({ title, detail }) {
  return (
    <section className="panel-card compact-card">
      <div className="panel-header">
        <h3>{title}</h3>
      </div>
      <p className="card-detail">{detail}</p>
    </section>
  );
}
