const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
let server, render, React, Preview;
before(async () => {
  const { createServer } = await import('vite');
  server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  Preview = (await server.ssrLoadModule('/src/feature/benchmark/pages/GroundTruthPreview.jsx')).GroundTruthPreview;
  React = (await import('react')).default;
  render = (await import('react-dom/server')).renderToStaticMarkup;
});
after(async () => { await server?.close(); });
const detail = { has_fault: true, fault_type: 'timestamp_shift', i18n: {
  vi: { required_evidence: ['Độ lệch 150 ms'], remediation_playbook: ['Kiểm tra đồng hồ'] },
  en: { required_evidence: ['Measured offset 150 ms'], remediation_playbook: ['<script>unsafe()</script>'] },
} };
test('ground truth view switches languages and escapes imported text', () => {
  const html = en => render(React.createElement(Preview, { detail, en })).split('<pre')[0];
  assert.ok(html(false).includes('Độ lệch 150 ms'));
  assert.ok(!html(false).includes('Measured offset'));
  assert.ok(html(true).includes('Measured offset 150 ms'));
  assert.ok(!html(true).includes('Độ lệch 150 ms'));
  assert.ok(html(true).includes('&lt;script&gt;'));
  assert.ok(!html(true).includes('<script>'));
});
test('legacy cases without detail render without errors', () => {
  assert.equal(render(React.createElement(Preview, { detail: null, en: false })), '');
});
