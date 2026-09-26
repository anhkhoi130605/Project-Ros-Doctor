import React from 'react';

export default function AnalysisToggleField({ label, description, checked, onChange }) {
  return (
    <label className="toggle-field">
      <span>
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle-track" aria-hidden="true"><i /></span>
    </label>
  );
}
