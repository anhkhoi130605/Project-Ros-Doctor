import { useEffect, useRef, useState } from 'react';
import { createConversation, conversationTitle, readHistory, writeHistory } from './chatHistory';

export function useChatHistory(userId, bagId, sessionId) {
  const [history, setHistory] = useState(() => {
    let saved = [];
    try { saved = readHistory(window.localStorage, userId); } catch { /* Storage may be blocked. */ }
    const active = bagId || sessionId || !saved.length ? createConversation(bagId, sessionId) : saved[0];
    return { activeId: active.id, items: saved.some((item) => item.id === active.id) ? saved : [active, ...saved] };
  });
  const [storageFailed, setStorageFailed] = useState(false);
  const latest = useRef(history.items);
  latest.current = history.items;
  const active = history.items.find((item) => item.id === history.activeId);

  useEffect(() => {
    const timer = setTimeout(() => {
      try { setStorageFailed(!writeHistory(window.localStorage, userId, history.items)); }
      catch { setStorageFailed(true); }
    }, 300);
    return () => clearTimeout(timer);
  }, [history.items, userId]);

  useEffect(() => {
    const flush = () => {
      try { writeHistory(window.localStorage, userId, latest.current); } catch { /* Already shown in the UI. */ }
    };
    window.addEventListener('pagehide', flush);
    return () => { window.removeEventListener('pagehide', flush); flush(); };
  }, [userId]);

  // Capture the conversation ID: a late response must never modify a different chat.
  const updateActive = (update) => setHistory((previous) => ({
    ...previous,
    items: previous.items.map((item) => item.id === active.id ? update(item) : item),
  }));
  return {
    conversations: history.items, active, storageFailed,
    setMessages: (update) => updateActive((item) => {
      const messages = typeof update === 'function' ? update(item.messages) : update;
      return { ...item, messages, title: conversationTitle(messages), updatedAt: new Date().toISOString() };
    }),
    setContext: (nextBagId, nextSessionId) => updateActive((item) => ({ ...item, bagId: nextBagId, sessionId: nextSessionId })),
    openConversation: (id) => setHistory((previous) => previous.items.some((item) => item.id === id)
      ? { ...previous, activeId: id } : previous),
    newConversation: () => {
      const draft = createConversation();
      setHistory((previous) => ({ activeId: draft.id, items: [draft, ...previous.items.filter((item) => item.messages.length)] }));
    },
  };
}
