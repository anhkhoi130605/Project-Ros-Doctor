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

export function readHistory(storage, userId) {
  if (!userId) return [];
  try {
    const parsed = JSON.parse(storage.getItem(historyKey(userId)) || '[]');
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
