const { test } = require('node:test');
const assert = require('node:assert/strict');

const load = () => import('../src/feature/admin/utils/costReport.js');
const data = {
  metrics: [{ label: 'Chi phí', value: '$25.40', note: 'Tiếng Việt' }],
  models: [['<script>alert(1)</script>', '$18.20']],
  columns: ['Phiên', 'Model', 'Tokens', 'USD'],
  rows: [['<img src=x onerror=alert(1)>', 'GPT-4o', '100', '$0.01']],
};

test('report preserves Vietnamese, escapes content and labels sample data', async () => {
  const { buildCostReportHtml } = await load();
  const html = buildCostReportHtml(data);
  assert.match(html, /Báo cáo chi phí theo Model/);
  assert.match(html, /DỮ LIỆU MINH HỌA/);
  assert.match(html, /\$25\.40/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>|<img src=x/);
  assert.match(html, /@page \{ size: A4/);
});

test('empty English report does not invent figures', async () => {
  const { buildCostReportHtml } = await load();
  const html = buildCostReportHtml({ metrics: [], models: [], columns: [], rows: [] }, { isEnglish: true });
  assert.match(html, /No data available/);
  assert.match(html, /ILLUSTRATIVE DATA/);
  assert.doesNotMatch(html, /25\.40/);
});

test('popup blocking is reported, not treated as a successful download', async () => {
  const { printCostReport } = await load();
  global.window = { open: () => null };
  try { await assert.rejects(printCostReport(data), /POPUP_BLOCKED/); }
  finally { delete global.window; }
});

test('export waits for fonts then opens print and keeps preview available', async () => {
  const { printCostReport } = await load();
  const calls = [];
  const popup = {
    closed: false,
    document: { open() {}, write(html) { assert.match(html, /Tiếng Việt/); }, close() {}, fonts: { ready: Promise.resolve() } },
    focus() { calls.push('focus'); }, print() { calls.push('print'); }, close() { calls.push('close'); },
  };
  global.window = { open: () => popup };
  try {
    await printCostReport(data);
    assert.deepEqual(calls, ['focus', 'print']);
    assert.equal(popup.opener, null);
  } finally { delete global.window; }
});
