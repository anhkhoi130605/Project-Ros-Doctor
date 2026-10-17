const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { buildSync } = require('esbuild');
const built = buildSync({
  entryPoints: [path.join(__dirname, '../src/feature/chat/chatHistory.js')],
  bundle: true, write: false, format: 'cjs', platform: 'node',
});
const loaded = { exports: {} };
new Function('module', 'exports', built.outputFiles[0].text)(loaded, loaded.exports);
const { createConversation, conversationTitle, readHistory, writeHistory, historyKey, historyGroup, recentConversations, mergeHistory, fetchRemoteHistory, syncRemoteHistory } = loaded.exports;
const memoryStorage = () => {
  const items = new Map();
  return { getItem: (key) => items.get(key) ?? null, setItem: (key, value) => items.set(key, value) };
};
const conversation = (question = 'Kiểm tra /tf') => ({
  ...createConversation('bag-1', 'session-1'),
  messages: [{ id: 1, sender: 'user', text: question }, { id: 2, sender: 'agent', text: 'Kết quả', report: { faults: [] } }],
});

test('conversation IDs are separate from analysis session and rosbag IDs', () => {
  const first = createConversation('bag-1', 'session-1');
  const second = createConversation('bag-1', 'session-1');
  assert.notEqual(first.id, second.id);
  assert.notEqual(first.id, first.sessionId);
});

test('history restores messages, diagnostic reports and the original context', () => {
  const storage = memoryStorage();
  const item = conversation();
  assert.equal(writeHistory(storage, 'alice', [item]), true);
  const restored = readHistory(storage, 'alice')[0];
  assert.deepEqual(restored.messages, item.messages);
  assert.equal(restored.bagId, item.bagId);
  assert.equal(restored.sessionId, item.sessionId);
  assert.equal(restored.title, 'Kiểm tra /tf');
});

test('accounts have isolated histories; anonymous users never persist data', () => {
  const storage = memoryStorage();
  writeHistory(storage, 'alice', [conversation()]);
  assert.deepEqual(readHistory(storage, 'bob'), []);
  assert.deepEqual(readHistory(storage, ''), []);
  assert.equal(writeHistory(storage, '', [conversation()]), false);
  assert.equal(readHistory(storage, 'alice').length, 1);
});

test('empty drafts are excluded, newest chats come first, retain 50 recent chats', () => {
  const items = Array.from({ length: 60 }, (_, index) => ({
    ...conversation(`Question ${index}`), updatedAt: new Date(2026, 0, index + 1).toISOString(),
  }));
  const recent = recentConversations([createConversation(), ...items]);
  assert.equal(recent.length, 50);
  assert.equal(recent[0].messages[0].text, 'Question 59');
  assert.equal(recent.at(-1).messages[0].text, 'Question 10');
});

test('title uses first question, normalizes whitespace and bounds length', () => {
  assert.equal(conversationTitle([{ sender: 'agent', text: 'Welcome' }, { sender: 'user', text: '  lỗi\n /tf  ' }]), 'lỗi /tf');
  assert.equal(conversationTitle([{ sender: 'user', text: 'a'.repeat(100) }]).length, 80);
});

test('corrupt storage, invalid records and duplicates do not break chat', () => {
  const storage = memoryStorage();
  storage.setItem(historyKey('alice'), 'invalid json');
  assert.deepEqual(readHistory(storage, 'alice'), []);
  const valid = conversation();
  storage.setItem(historyKey('alice'), JSON.stringify([null, {}, { ...valid, id: 'invalid', messages: [null] }, valid, valid]));
  assert.equal(readHistory(storage, 'alice').length, 1);
});

test('unavailable storage and quota errors are reported without throwing', () => {
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); } };
  assert.deepEqual(readHistory(blocked, 'alice'), []);
  assert.equal(writeHistory(blocked, 'alice', [conversation()]), false);
});

test('reload marks unfinished responses as interrupted, not streaming forever', () => {
  const storage = memoryStorage();
  const item = conversation();
  item.messages[1].isStreaming = true;
  writeHistory(storage, 'alice', [item]);
  const restored = readHistory(storage, 'alice')[0];
  assert.equal(restored.messages[1].isStreaming, false);
  assert.equal(restored.messages[1].interrupted, true);
  assert.equal(restored.messages[1].text, 'Kết quả');
});

test('recent date groups use local calendar days', () => {
  const now = new Date(2026, 9, 12, 10);
  assert.equal(historyGroup(new Date(2026, 9, 12, 0).toISOString(), now), 'today');
  assert.equal(historyGroup(new Date(2026, 9, 11, 23).toISOString(), now), 'yesterday');
  assert.equal(historyGroup(new Date(2026, 9, 8).toISOString(), now), 'week');
  assert.equal(historyGroup(new Date(2026, 8, 1).toISOString(), now), 'older');
});

// Minimal hook runner: exercise state transitions without a browser or API calls.
function historyHook() {
  let cursor = 0;
  const slots = [];
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], (update) => { slots[index] = typeof update === 'function' ? update(slots[index]) : update; }];
    },
    useRef(value) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: value };
      return slots[index];
    },
    useEffect() {},
  };
  const bundle = buildSync({
    entryPoints: [path.join(__dirname, '../src/feature/chat/useChatHistory.js')],
    bundle: true, write: false, format: 'cjs', platform: 'node', external: ['react'],
  });
  const hookModule = { exports: {} };
  new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(() => react, hookModule, hookModule.exports);
  return () => { cursor = 0; return hookModule.exports.useChatHistory('test-user', 'bag-a', 'session-a'); };
}

test('opening chats restores their own messages and rosbag context', () => {
  const render = historyHook();
  let hook = render();
  const firstId = hook.active.id;
  hook.setMessages([{ id: 1, sender: 'user', text: 'First question' }]);
  hook = render();
  hook.newConversation();
  hook = render();
  assert.equal(hook.active.bagId, '');
  assert.deepEqual(hook.active.messages, []);
  hook.setContext('bag-b', 'session-b');
  hook.setMessages([{ id: 2, sender: 'user', text: 'Second question' }]);
  hook = render();
  hook.openConversation(firstId);
  hook = render();
  assert.equal(hook.active.bagId, 'bag-a');
  assert.equal(hook.active.sessionId, 'session-a');
  assert.equal(hook.active.messages[0].text, 'First question');
});

test('a late streaming response updates its original chat, never the newly active chat', () => {
  const render = historyHook();
  let hook = render();
  const firstId = hook.active.id;
  const updateOriginal = hook.setMessages;
  hook.setMessages([{ id: 1, sender: 'user', text: 'First question' }]);
  hook = render();
  hook.newConversation();
  hook = render();
  updateOriginal((messages) => [...messages, { id: 2, sender: 'agent', text: 'Late answer' }]);
  hook = render();
  assert.deepEqual(hook.active.messages, []);
  assert.equal(hook.conversations.find((item) => item.id === firstId).messages[1].text, 'Late answer');
});

test('repeated new-chat clicks do not create saved empty conversations', () => {
  const render = historyHook();
  for (let index = 0; index < 5; index++) render().newConversation();
  assert.equal(render().conversations.length, 1);
});

test('cross-device merge keeps newer updates and combines conversations from multiple machines', async () => {
  const machineA = { ...conversation('Phân tích lỗi /tf'), id: 'conv-shared', updatedAt: '2026-10-17T10:00:00.000Z' };
  const machineBUpdated = {
    ...machineA,
    updatedAt: '2026-10-17T11:00:00.000Z',
    messages: [...machineA.messages, { id: 3, sender: 'user', text: 'Chi tiết thêm' }],
  };
  const machineAOnly = { ...conversation('Kiểm tra /scan'), id: 'conv-a-only', updatedAt: '2026-10-17T09:00:00.000Z' };

  const merged = mergeHistory([machineA, machineAOnly], [machineBUpdated]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].id, 'conv-shared');
  assert.equal(merged[0].messages.length, 3);
  assert.equal(merged[1].id, 'conv-a-only');

  const serverStore = new Map();
  const prevFetch = global.fetch;
  global.fetch = async (url, options = {}) => {
    if (options.method === 'PUT') {
      const body = JSON.parse(options.body);
      serverStore.set(body.userKey, body.conversations);
      return new Response(JSON.stringify({ conversations: body.conversations }), { status: 200 });
    }
    const key = new URL(url, 'http://localhost').searchParams.get('userKey');
    return new Response(JSON.stringify({ conversations: serverStore.get(key) || [] }), { status: 200 });
  };
  try {
    await syncRemoteHistory('admin', merged, 'admin@ctrlshiftn.local');
    const fetchedOnOtherDevice = await fetchRemoteHistory('admin', 'admin@ctrlshiftn.local');
    assert.equal(fetchedOnOtherDevice.length, 2);
    assert.equal(fetchedOnOtherDevice[0].title, 'Phân tích lỗi /tf');
    assert.equal(fetchedOnOtherDevice[0].messages.length, 3);
  } finally {
    global.fetch = prevFetch;
  }
});
