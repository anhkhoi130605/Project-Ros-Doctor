import React from 'react';

export function GroundTruthPreview({ detail, en }) {
  if (!detail) return null;
  const text = detail.i18n?.[en ? 'en' : 'vi'];
  return <details>
    <summary>{en ? 'Structured ground truth (evaluation answer key)' : 'Ground truth có cấu trúc (đáp án đối chiếu)'}</summary>
    <p><strong translate="no">{detail.fault_type}</strong> · {detail.has_fault ? (en ? 'Fault present' : 'Có lỗi') : (en ? 'No fault' : 'Không lỗi')}</p>
    {text?.description && <p translate="no">{text.description}</p>}
    <strong>{en ? 'Required evidence' : 'Bằng chứng yêu cầu'}</strong>
    <ul>{text?.required_evidence?.map((entry, index) => <li translate="no" key={index}>{entry}</li>)}</ul>
    <strong>{en ? 'Remediation' : 'Hướng khắc phục'}</strong>
    <ul>{text?.remediation_playbook?.map((entry, index) => <li translate="no" key={index}>{entry}</li>)}</ul>
    <details><summary>{en ? 'Full JSON for review' : 'JSON đầy đủ để duyệt'}</summary><pre translate="no">{JSON.stringify(detail, null, 2)}</pre></details>
  </details>;
}
