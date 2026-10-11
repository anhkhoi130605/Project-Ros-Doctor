const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
let server, render, React, Card;
before(async () => {
  const { createServer } = await import('vite');
  server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  Card = (await server.ssrLoadModule('/src/feature/benchmark/pages/BenchmarkRequestCard.jsx')).default;
  React = (await import('react')).default;
  render = (await import('react-dom/server')).renderToStaticMarkup;
});
after(async () => { await server?.close(); });
const request = {
  status: 'Approved', requestType: 'Update', requestedBy: 'raw-requester-id', reviewedBy: 'raw-reviewer-id',
  requestedByName: 'Đạt Engineer', reviewedByName: 'Nguyễn Admin',
  requestedAt: '2026-10-11T15:38:05Z', reviewedAt: '2026-10-11T15:39:00Z', reviewNote: 'Đã kiểm tra',
};
const html = (data, en = false) => render(React.createElement(Card, { request: data, en }));
test('approved request displays names, decision and note, never raw IDs', () => {
  const output = html(request);
  for (const text of ['Đạt Engineer', 'Nguyễn Admin', 'Đã duyệt', 'Đã kiểm tra', 'Người gửi', 'Người duyệt']) assert.ok(output.includes(text));
  assert.ok(!output.includes('raw-requester-id') && !output.includes('raw-reviewer-id'));
});
test('pending request clearly indicates that no review has happened', () => {
  const output = html({ ...request, status: 'Pending', reviewedBy: null, reviewedByName: null, reviewNote: null });
  assert.ok(output.includes('Chờ duyệt') && output.includes('Chưa có người duyệt'));
  assert.ok(!output.includes('benchmark-request-note'));
});
test('missing names and invalid dates have readable fallbacks', () => {
  const output = html({ ...request, requestedByName: null, reviewedByName: ' ', requestedAt: 'invalid', reviewedAt: null });
  assert.ok(output.includes('Chưa có thông tin tên'));
  assert.ok(!output.includes('Invalid Date') && !output.includes('raw-reviewer-id'));
});
test('English rejected request escapes names and review notes', () => {
  const output = html({ ...request, status: 'Rejected', requestedByName: '<script>name</script>', reviewNote: '<img src=x>' }, true);
  assert.ok(output.includes('Rejected') && output.includes('Requested by'));
  assert.ok(output.includes('&lt;script&gt;') && output.includes('&lt;img'));
  assert.ok(!output.includes('<script>') && !output.includes('<img'));
});
