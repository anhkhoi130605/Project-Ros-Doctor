export const HISTORY_LIMIT = 50;
export const historyKey = (userId) => `ros2_chat_history_v1:${encodeURIComponent(userId)}`;

export function createConversation(bagId = '', sessionId = '') {
  return {
    id: crypto.randomUUID(), title: '', bagId, sessionId,
    updatedAt: new Date().toISOString(), messages: [],
  };
}

export function conversationTitle(messages) {
  return (messages.find((message) => message.sender === 'user')?.text || '')
    .replace(/\s+/g, ' ').trim().slice(0, 80);
}

export function recentConversations(conversations) {
  return conversations.filter((item) => conversationTitle(item.messages))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, HISTORY_LIMIT);
}

export function normalizeConversations(parsed) {
  if (!Array.isArray(parsed)) return [];
  const seen = new Set();
  return recentConversations(parsed.filter((item) => {
    if (!item || typeof item.id !== 'string' || seen.has(item.id)
      || !Number.isFinite(Date.parse(item.updatedAt)) || !Array.isArray(item.messages)
      || typeof item.bagId !== 'string' || typeof item.sessionId !== 'string') return false;
    seen.add(item.id);
    return item.messages.every((message) => message && typeof message.text === 'string'
      && ['agent', 'user'].includes(message.sender));
  }).map((item) => ({
    ...item, title: conversationTitle(item.messages),
    // A reloaded page cannot resume the previous network stream.
    messages: item.messages.map((message) => message.isStreaming
      ? { ...message, isStreaming: false, interrupted: true }
      : message),
  })));
}

export function mergeHistory(localConversations = [], remoteConversations = []) {
  const byId = new Map();
  const ingest = (list) => {
    for (const item of normalizeConversations(list)) {
      const existing = byId.get(item.id);
      if (!existing) {
        byId.set(item.id, item);
        continue;
      }
      const itemTime = Date.parse(item.updatedAt);
      const existingTime = Date.parse(existing.updatedAt);
      if (itemTime > existingTime || (itemTime === existingTime && item.messages.length >= existing.messages.length)) {
        byId.set(item.id, item);
      }
    }
  };
  ingest(remoteConversations);
  ingest(localConversations);
  return recentConversations(Array.from(byId.values()));
}

export function readHistory(storage, userId) {
  if (!userId) return [];
  try {
    const parsed = JSON.parse(storage.getItem(historyKey(userId)) || '[]');
    return normalizeConversations(parsed);
  } catch {
    return [];
  }
}

export function writeHistory(storage, userId, conversations) {
  if (!userId) return false;
  try {
    storage.setItem(historyKey(userId), JSON.stringify(recentConversations(conversations)));
    return true;
  } catch {
    return false;
  }
}

function getHistoryEndpoints() {
  const endpoints = [];
  const apiBase = typeof window !== 'undefined' && typeof window.__ROS2_API_BASE_URL__ === 'string'
    ? window.__ROS2_API_BASE_URL__.replace(/\/$/, '')
    : '';
  endpoints.push(`${apiBase}/api/chat/history`);
  if (apiBase) {
    endpoints.push('/api/chat/history');
  }
  const agentBase = typeof window !== 'undefined' && typeof window.__ROS2_AI_AGENT_URL__ === 'string'
    ? window.__ROS2_AI_AGENT_URL__.replace(/\/$/, '')
    : '/ai-agent';
  endpoints.push(`${agentBase}/api/v1/chat/history`);
  return Array.from(new Set(endpoints));
}

function getAuthHeaders(includeJson = false) {
  const headers = {};
  if (includeJson) headers['Content-Type'] = 'application/json';
  try {
    const token = typeof window !== 'undefined' && window.localStorage
      ? window.localStorage.getItem('accessToken')
      : null;
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    // Ignore blocked storage
  }
  return headers;
}

export async function fetchRemoteHistory(userId, email = '') {
  if (!userId || typeof fetch !== 'function') return null;
  const query = `userKey=${encodeURIComponent(userId)}${email ? `&email=${encodeURIComponent(email)}` : ''}`;
  for (const endpoint of getHistoryEndpoints()) {
    try {
      const response = await fetch(`${endpoint}?${query}`, {
        method: 'GET',
        headers: getAuthHeaders(false),
        cache: 'no-store',
      });
      if (!response.ok) continue;
      const data = await response.json();
      const rawList = Array.isArray(data?.conversations) ? data.conversations : (Array.isArray(data) ? data : null);
      if (Array.isArray(rawList)) {
        return normalizeConversations(rawList);
      }
    } catch {
      // Try next endpoint fallback
    }
  }
  return null;
}

export async function syncRemoteHistory(userId, conversations, email = '') {
  if (!userId || typeof fetch !== 'function') return null;
  const payload = recentConversations(Array.isArray(conversations) ? conversations : []);
  if (!payload.length) return [];
  const body = JSON.stringify({
    userKey: userId,
    email: email || '',
    conversations: payload,
  });

  for (const endpoint of getHistoryEndpoints()) {
    try {
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: getAuthHeaders(true),
        body,
        keepalive: true,
      });
      if (!response.ok) continue;
      const data = await response.json().catch(() => null);
      const rawList = Array.isArray(data?.conversations) ? data.conversations : null;
      return rawList ? normalizeConversations(rawList) : payload;
    } catch {
      // Try next endpoint fallback
    }
  }
  return null;
}

export function historyGroup(timestamp, now = new Date()) {
  const date = new Date(timestamp);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const week = new Date(today);
  week.setDate(week.getDate() - 7);
  if (date >= today) return 'today';
  if (date >= yesterday) return 'yesterday';
  return date >= week ? 'week' : 'older';
}
