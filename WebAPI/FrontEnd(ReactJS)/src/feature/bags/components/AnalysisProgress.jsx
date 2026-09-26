import React from 'react';

export default function AnalysisProgress({ value, label }) {
  const normalizedValue = Math.max(0, Math.min(value, 100));
  const roundedValue = Math.round(normalizedValue);

  return (
    <div className="progress-wrap">
      <div className="progress-label">
        <span>{label}</span>
        <strong>{roundedValue}%</strong>
      </div>
      <div
        className="progress"
        role="progressbar"
        aria-label={label}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={roundedValue}
      >
        <span style={{ width: `${normalizedValue}%` }} />
      </div>
    </div>
  );
}
