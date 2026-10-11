const { test } = require('node:test');
const assert = require('node:assert/strict');
const helper = import('../src/feature/bags/utils/submissionSessions.js');

test('approved submission links by rosbag ID, not a duplicate filename', async () => {
  const { attachSubmissionSessions } = await helper;
  const entries = [{ id: 'own-bag', fileName: 'same.db3', reviewStatus: 'Approved' }];
  const result = attachSubmissionSessions(entries, [
    { id: 'other-bag', fileName: 'same.db3', sessionId: 'other-session' },
    { id: 'own-bag', fileName: 'same.db3', sessionId: 'latest-session' },
  ]);
  assert.equal(result[0].sessionId, 'latest-session');
  assert.equal(entries[0].sessionId, undefined);
});

test('approved submission without a session has no fabricated link', async () => {
  const { attachSubmissionSessions } = await helper;
  const entries = [{ id: 'bag', reviewStatus: 'Approved', sessionId: 'stale-session' }];
  assert.equal(attachSubmissionSessions(entries, [])[0].sessionId, null);
  assert.equal(attachSubmissionSessions(entries, [{ id: 'bag', sessionId: null }])[0].sessionId, null);
});

test('pending, rejected and draft submissions never expose a session link', async () => {
  const { attachSubmissionSessions } = await helper;
  for (const reviewStatus of ['Submitted', 'Rejected', 'Draft']) {
    const result = attachSubmissionSessions([{ id: 'bag', reviewStatus }], [{ id: 'bag', sessionId: 'session' }]);
    assert.equal(result[0].sessionId, null);
  }
});

test('refresh picks up a newly created session and removes an obsolete link', async () => {
  const { attachSubmissionSessions } = await helper;
  const entries = [{ id: 'bag', reviewStatus: 'Approved' }];
  const first = attachSubmissionSessions(entries, []);
  const second = attachSubmissionSessions(first, [{ id: 'bag', sessionId: 'new-session' }]);
  assert.equal(second[0].sessionId, 'new-session');
  assert.equal(attachSubmissionSessions(second, [])[0].sessionId, null);
});
