const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildSync } = require('esbuild');

const frontend = path.resolve(__dirname, '..');
const storage = new Map();
global.localStorage = { getItem: (key) => storage.get(key) ?? null };

function loadSource(file, extraExports = '') {
  const fullPath = path.join(frontend, file);
  const built = buildSync({
    stdin: { contents: fs.readFileSync(fullPath, 'utf8') + extraExports, resolveDir: path.dirname(fullPath), loader: 'jsx' },
    bundle: true, write: false, format: 'cjs', platform: 'node',
    define: { 'import.meta.env': '{}' }, logLevel: 'silent',
  });
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', built.outputFiles[0].text)(require, loaded, loaded.exports);
  return loaded.exports;
}

const store = loadSource('src/stored/appStore.jsx', '\nexport { getInitialState, loadSavedState, appReducer };');
const populated = () => ({ ...store.getInitialState(), bags: [{ id: 'bag-old' }], sessions: [{ id: 'session-old', bagId: 'bag-old' }], findings: [{ id: 'finding-old' }], reports: [{ id: 'report-old' }] });

test('reloading never restores persisted database records', () => {
  storage.set('accessToken', 'test-token');
  const state = store.loadSavedState(JSON.stringify(populated()));
  for (const field of ['bags', 'sessions', 'findings', 'reports']) assert.deepEqual(state[field], []);
});

test('logout and another login clear the previous account data', () => {
  for (const action of [{ type: 'LOGOUT' }, { type: 'LOGIN', userId: 'next-user', role: 'User' }]) {
    const state = store.appReducer(populated(), action);
    for (const field of ['bags', 'sessions', 'findings', 'reports']) assert.deepEqual(state[field], []);
  }
});

test('empty server lists remove old records and derived sessions', () => {
  let state = store.appReducer(populated(), { type: 'SET_BAGS', bags: [] });
  assert.deepEqual(state.bags, []);
  assert.deepEqual(state.sessions, []);
  state = store.appReducer(populated(), { type: 'SET_REAL_SESSIONS', sessions: [] });
  assert.deepEqual(state.sessions, []);
});

test('failed reads notify the workspace instead of returning cached success', async () => {
  const { apiClient, subscribeApiFailures } = loadSource('src/service/apiClient/apiClient.js');
  const failures = [];
  subscribeApiFailures((error) => failures.push(error));
  global.fetch = async () => new Response(JSON.stringify([{ id: 'bag-live' }]));
  assert.equal((await apiClient.get('/api/bags'))[0].id, 'bag-live');
  global.fetch = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(apiClient.get('/api/bags', { noCache: true }), /Failed to fetch/);
  assert.equal(failures.length, 1);
  await assert.rejects(apiClient.get('/api/bags'), /Failed to fetch/);
});

test('late responses from a previous account cannot populate the new account', async () => {
  const { apiClient } = loadSource('src/service/apiClient/apiClient.js');
  let resolve;
  global.fetch = () => new Promise((done) => { resolve = done; });
  const oldRequest = apiClient.get('/api/bags');
  apiClient.resetSession();
  storage.set('accessToken', 'new-account-token');
  resolve(new Response(JSON.stringify([{ id: 'private-old-data' }])));
  await assert.rejects(oldRequest, { name: 'AbortError' });
});

test('permission errors remain distinguishable from an offline server', async () => {
  const { apiClient, subscribeApiFailures } = loadSource('src/service/apiClient/apiClient.js');
  let failure;
  subscribeApiFailures((error) => { failure = error; });
  global.fetch = async () => new Response(JSON.stringify({ message: 'Forbidden' }), { status: 403 });
  await assert.rejects(apiClient.get('/api/admin/members'), { status: 403 });
  assert.equal(failure.status, 403);
});

test('invalid JSON cannot be mistaken for a successful empty response', async () => {
  const { apiClient } = loadSource('src/service/apiClient/apiClient.js');
  global.fetch = async () => new Response('<html>Proxy error</html>');
  await assert.rejects(apiClient.get('/api/bags'), { status: 502 });
});

test('analysis POST can display server errors locally without hiding the workspace', async () => {
  const { apiClient, subscribeApiFailures } = loadSource('src/service/apiClient/apiClient.js');
  let failures = 0;
  subscribeApiFailures(() => failures++);
  global.fetch = async (_url, options) => {
    assert.equal(options.handleErrorLocally, undefined);
    return new Response(JSON.stringify({ message: 'Inspection failed' }), { status: 500 });
  };
  await assert.rejects(apiClient.post('/api/bags/inspect', { bagPath: 'test.db3' }, { handleErrorLocally: true }), /Inspection failed/);
  assert.equal(failures, 0);
  await assert.rejects(apiClient.get('/api/bags', { handleErrorLocally: true }), /Inspection failed/);
  assert.equal(failures, 1, 'failed reads still invalidate the workspace');
});

test('a response body arriving after reset is neither exposed nor cached', async () => {
  const { apiClient } = loadSource('src/service/apiClient/apiClient.js');
  let resolveBody;
  global.fetch = async () => ({ ok: true, status: 200, json: () => new Promise((resolve) => { resolveBody = resolve; }) });
  const oldRequest = apiClient.get('/api/bags');
  await new Promise((resolve) => setImmediate(resolve));
  apiClient.resetSession();
  resolveBody([{ id: 'stale' }]);
  await assert.rejects(oldRequest, { name: 'AbortError' });
  global.fetch = async () => new Response('[]');
  assert.deepEqual(await apiClient.get('/api/bags'), []);
});
