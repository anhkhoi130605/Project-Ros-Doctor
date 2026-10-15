// Imports only into the proposal; never writes to Mongo or approves a request.
const localized = new Set(['description', 'injected_mechanism', 'plausible_root_causes',
  'required_evidence', 'remediation_playbook', 'academic_reference']);
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
function canonical(x) {
  if (Array.isArray(x)) return x.map(canonical);
  return object(x) ? Object.fromEntries(Object.keys(x).sort().map(k => [k, canonical(x[k])])) : x;
}
export const stableJson = x => JSON.stringify(canonical(x));
function validateTree(x, depth = 0) {
  if (depth > 16) throw new Error('Ground truth quá nhiều tầng / Maximum nesting depth exceeded.');
  if (typeof x === 'number' && !Number.isFinite(x)) throw new Error('Invalid numeric value.');
  if (x && typeof x === 'object') for (const [key, child] of Object.entries(x)) {
    if (['__proto__', 'prototype', 'constructor'].includes(key) || /[.$\x00]/.test(key)) throw new Error('Invalid ground truth field.');
    validateTree(child, depth + 1);
  }
}
function splitSymptoms(vi, en, path) {
  if (stableJson(vi) === stableJson(en)) return { shared: en };
  if (typeof vi === 'string' && typeof en === 'string') return { vi, en };
  if (object(vi) && object(en) && stableJson(Object.keys(vi).sort()) === stableJson(Object.keys(en).sort())) {
    const out = { shared: {}, vi: {}, en: {} };
    for (const key of Object.keys(en)) {
      const part = splitSymptoms(vi[key], en[key], `${path}.${key}`);
      for (const kind of ['shared', 'vi', 'en']) if (part[kind] !== undefined) out[kind][key] = part[kind];
    }
    return out;
  }
  throw new Error(`VI/EN khác dữ liệu đo / Measurement mismatch: ${path}`);
}

export function importGroundTruthPair(vi, en, existing = []) {
  if (!object(vi) || !object(en)) throw new Error('Hai file phải là JSON object / Both files must be JSON objects.');
  validateTree(vi); validateTree(en);
  const ids = Object.keys(en).sort();
  if (!ids.length || ids.length > 5000 || stableJson(ids) !== stableJson(Object.keys(vi).sort()))
    throw new Error('Hai file phải có cùng danh sách case / Case IDs must match.');
  const rows = existing.filter(x => x.code || x.rosbagName || x.groundTruth || x.groundTruthDetail).map(x => structuredClone(x));
  const matched = new Set();
  for (const id of ids) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(id) || !object(vi[id]) || !object(en[id])) throw new Error(`Invalid case: ${id}`);
    const a = vi[id], b = en[id];
    if (stableJson(Object.keys(a).sort()) !== stableJson(Object.keys(b).sort())) throw new Error(`VI/EN khác trường / Field mismatch: ${id}`);
    if (typeof b.has_fault !== 'boolean' || typeof b.fault_type !== 'string' || !b.fault_type.trim() ||
        b.has_fault === (b.fault_type === 'none')) throw new Error(`Invalid has_fault/fault_type: ${id}`);
    const detail = { schema_version: 1, i18n: { vi: {}, en: {} } };
    for (const key of Object.keys(b)) {
      if (localized.has(key)) {
        detail.i18n.vi[key] = a[key]; detail.i18n.en[key] = b[key];
      } else if (key === 'observed_symptom') {
        const parts = splitSymptoms(a[key], b[key], `${id}.${key}`);
        detail[key] = parts.shared ?? {};
        for (const lang of ['vi', 'en']) if (parts[lang] && Object.keys(parts[lang]).length) detail.i18n[lang][key] = parts[lang];
      } else {
        if (stableJson(a[key]) !== stableJson(b[key])) throw new Error(`VI/EN không khớp / Mismatch: ${id}.${key}`);
        detail[key] = b[key];
      }
    }
    for (const lang of ['vi', 'en']) for (const key of ['required_evidence', 'remediation_playbook']) {
      const entries = detail.i18n[lang][key];
      if (!Array.isArray(entries) || !entries.length || entries.some(x => typeof x !== 'string' || !x.trim())) throw new Error(`Invalid ${id}.${lang}.${key}`);
    }
    if (JSON.stringify(detail).length > 120000) throw new Error(`Ground truth quá lớn / Too large: ${id}`);
    const matches = rows.map((row, index) => ({ row, index })).filter(({ row }) =>
      row.caseId === id || row.code === id || (!row.caseId && row.rosbagName?.replace(/\.(db3|mcap|bag)$/i, '') === id));
    if (matches.length > 1 || (matches.length && matched.has(matches[0].index))) throw new Error(`Ánh xạ không duy nhất / Ambiguous mapping: ${id}`);
    if (matches.length) {
      const { row, index } = matches[0];
      if (row.caseId && row.caseId !== id) throw new Error(`case_id conflict: ${id}`);
      rows[index] = { ...row, caseId: id, groundTruthDetail: detail };
      matched.add(index);
    } else {
      const start = b.start_sec ?? 0;
      rows.push({ code: id, caseId: id, rosbagName: `${id}.db3`, topic: b.topic ?? '',
        startSec: start, endSec: b.end_sec ?? start, label: b.fault_type, groundTruth: '', groundTruthDetail: detail });
      matched.add(rows.length - 1);
    }
  }
  if (rows.length > 5000) throw new Error('Tối đa 5000 cases / Maximum 5000 cases.');
  return rows;
}
