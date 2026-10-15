const { test } = require('node:test');
const assert = require('node:assert/strict');
const helpers = import('../src/feature/benchmark/domain/groundTruth.js');
const review = import('../src/feature/benchmark/domain/benchmarkReview.js');
function pair() {
  const base = { has_fault: true, fault_type: 'timestamp_shift', topic: '/tf', start_sec: 20,
    offset_ms: 150, observed_symptom: { offset_ms: 150, phenomenon: 'Offset' },
    required_evidence: ['Measured offset'], remediation_playbook: ['Check clock'],
    sub_faults: [{ topic: '/tf', offset_ms: 150 }] };
  const en = { case_07: base }, vi = structuredClone(en);
  vi.case_07.required_evidence = ['Độ lệch đo được'];
  vi.case_07.observed_symptom.phenomenon = 'Lệch thời gian';
  return { vi, en };
}
test('paired import preserves structured facts, both languages and legacy fields', async () => {
  const { importGroundTruthPair } = await helpers;
  const { vi, en } = pair();
  const old = [{ code: 'C07', rosbagName: 'case_07.db3', groundTruth: 'Legacy', endSec: 86 }];
  const rows = importGroundTruthPair(vi, en, old);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].code, 'C07'); assert.equal(rows[0].caseId, 'case_07');
  assert.equal(rows[0].groundTruth, 'Legacy'); assert.equal(rows[0].endSec, 86);
  assert.equal(rows[0].groundTruthDetail.offset_ms, 150);
  assert.equal(rows[0].groundTruthDetail.observed_symptom.offset_ms, 150);
  assert.equal(rows[0].groundTruthDetail.i18n.vi.observed_symptom.phenomenon, 'Lệch thời gian');
  assert.deepEqual(rows[0].groundTruthDetail.sub_faults, en.case_07.sub_faults);
  assert.equal(old[0].caseId, undefined);
  assert.deepEqual(importGroundTruthPair(vi, en, rows), rows);
});
test('rejects mismatched cases, measurements and ambiguous mappings', async () => {
  const { importGroundTruthPair } = await helpers;
  const { vi, en } = pair();
  assert.throws(() => importGroundTruthPair({}, en));
  vi.case_07.offset_ms = 151;
  assert.throws(() => importGroundTruthPair(vi, en));
  vi.case_07.offset_ms = 150;
  vi.case_07.observed_symptom.offset_ms = 151;
  assert.throws(() => importGroundTruthPair(vi, en));
  vi.case_07.observed_symptom.offset_ms = 150;
  assert.throws(() => importGroundTruthPair(vi, en, [{ code: 'case_07' }, { code: 'C07', rosbagName: 'case_07.db3' }]));
});
test('new cases replace empty placeholder, preserve unrelated rows and missing end time', async () => {
  const { importGroundTruthPair } = await helpers;
  const { vi, en } = pair();
  const rows = importGroundTruthPair(vi, en, [{ code: '' }, { code: 'other' }]);
  assert.equal(rows.length, 2); assert.equal(rows[0].code, 'other');
  assert.equal(rows[1].groundTruthDetail.end_sec, undefined);
});
test('review notices nested-only changes and ignores JSON property ordering', async () => {
  const { importGroundTruthPair } = await helpers;
  const { compareCases, proposalFrom } = await review;
  const { vi, en } = pair();
  const rows = importGroundTruthPair(vi, en);
  const draft = proposalFrom({ isPublished: true, testCases: rows });
  assert.equal(compareCases(rows, draft.proposedData.testCases)[0].status, 'unchanged');
  draft.proposedData.testCases[0].groundTruthDetail.offset_ms = 200;
  assert.equal(compareCases(rows, draft.proposedData.testCases)[0].status, 'changed');
  assert.equal(rows[0].groundTruthDetail.offset_ms, 150);
});
test('rejects dangerous JSON keys and contradictory nominal labels', async () => {
  const { importGroundTruthPair } = await helpers;
  assert.throws(() => importGroundTruthPair(JSON.parse('{"__proto__":{}}'), {}));
  const { vi, en } = pair(); vi.case_07.has_fault = en.case_07.has_fault = false;
  assert.throws(() => importGroundTruthPair(vi, en));
});
