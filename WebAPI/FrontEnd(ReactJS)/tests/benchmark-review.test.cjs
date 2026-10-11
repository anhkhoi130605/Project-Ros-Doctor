const { test } = require('node:test');
const assert = require('node:assert/strict');
const helpers = import('../src/feature/benchmark/domain/benchmarkReview.js');

test('new proposal is unpublished create at version zero', async () => {
  const { proposalFrom } = await helpers;
  const draft = proposalFrom(null);
  assert.equal(draft.requestType, 'Create');
  assert.equal(draft.baseVersion, 0);
  assert.equal(draft.proposedData.testCases.length, 1);
});
test('editing an existing benchmark clones official data and carries revision', async () => {
  const { proposalFrom } = await helpers;
  const source = { code: 'A', isPublished: true, version: 3, name: 'Official', testCases: [{ code: 'C1' }],
    changeRequest: { status: 'Rejected', proposedData: { name: 'Rejected' } } };
  const draft = proposalFrom(source);
  assert.equal(draft.requestType, 'Update');
  assert.equal(draft.baseVersion, 3);
  assert.equal(draft.proposedData.name, 'Official');
  draft.proposedData.testCases[0].code = 'CHANGED';
  assert.equal(source.testCases[0].code, 'C1');
});
test('unpublished rejected request can be corrected without publishing it', async () => {
  const { proposalFrom } = await helpers;
  const draft = proposalFrom({ code: 'A', isPublished: false, version: 0,
    changeRequest: { status: 'Rejected', proposedData: { name: 'Proposed', testCases: [{ code: 'C1' }] } } });
  assert.equal(draft.requestType, 'Create');
  assert.equal(draft.proposedData.name, 'Proposed');
});
test('review comparison identifies additions, removals and ground truth changes by code', async () => {
  const { compareCases } = await helpers;
  const rows = compareCases([{ code: 'A', groundTruth: 'old' }, { code: 'B' }, { code: 'C' }],
    [{ code: 'A', groundTruth: 'new' }, { code: 'C' }, { code: 'D' }]);
  assert.deepEqual(rows.map(x => x.status), ['changed', 'removed', 'unchanged', 'added']);
});
