import { useEffect, useRef, useState } from 'react';
import {
  createConversation,
  conversationTitle,
  fetchRemoteHistory,
  mergeHistory,
  readHistory,
  recentConversations,
  syncRemoteHistory,
  writeHistory,
} from './chatHistory';

function readStoredUserEmail() {
  try {
    return (typeof window !== 'undefined' && window.localStorage
      ? window.localStorage.getItem('userEmail')
      : '') || '';
  } catch {
    return '';
  }
}

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
  const syncStateRef = useRef({ lastSyncedJson: '' });
  const active = history.items.find((item) => item.id === history.activeId);

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;

    const pullRemoteHistory = async () => {
      const email = readStoredUserEmail();
      const remote = await fetchRemoteHistory(userId, email);
      if (cancelled || !Array.isArray(remote)) return;

      const localSaved = recentConversations(latest.current);
      const merged = mergeHistory(localSaved, remote);
      const remoteJson = JSON.stringify(remote);
      const mergedJson = JSON.stringify(merged);

      try {
        writeHistory(window.localStorage, userId, merged);
      } catch {
        // Ignore blocked local storage
      }

      if (mergedJson !== remoteJson && merged.length > 0) {
        syncStateRef.current.lastSyncedJson = mergedJson;
        syncRemoteHistory(userId, merged, email);
      } else {
        syncStateRef.current.lastSyncedJson = remoteJson;
      }

      if (!merged.length) return;

      setHistory((previous) => {
        const currentActive = previous.items.find((item) => item.id === previous.activeId);
        const isStreamingNow = previous.items.some((item) => item.messages?.some((m) => m?.isStreaming));
        if (isStreamingNow) {
          const otherRemote = merged.filter((item) => !previous.items.some((p) => p.id === item.id));
          return otherRemote.length ? { ...previous, items: [...previous.items, ...otherRemote] } : previous;
        }

        const isUntouchedDraft = !currentActive || currentActive.messages.length === 0;
        const hadNoSavedConversations = !previous.items.some((item) => item.messages.length > 0);
        if (isUntouchedDraft && hadNoSavedConversations && !bagId && !sessionId) {
          return { activeId: merged[0].id, items: merged };
        }

        if (currentActive && !merged.some((item) => item.id === currentActive.id)) {
          return { activeId: currentActive.id, items: [currentActive, ...merged] };
        }

        return {
          activeId: currentActive ? currentActive.id : merged[0].id,
          items: merged,
        };
      });
    };

    pullRemoteHistory();
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('focus', pullRemoteHistory);
      return () => {
        cancelled = true;
        window.removeEventListener('focus', pullRemoteHistory);
      };
    }
    return () => { cancelled = true; };
  }, [userId, bagId, sessionId]);

  useEffect(() => {
    const isStreamingNow = history.items.some((item) => item.messages?.some((m) => m?.isStreaming));
    const timer = setTimeout(() => {
      try { setStorageFailed(!writeHistory(window.localStorage, userId, history.items)); }
      catch { setStorageFailed(true); }

      if (!isStreamingNow && userId) {
        const recent = recentConversations(history.items);
        if (recent.length > 0) {
          const serialized = JSON.stringify(recent);
          if (serialized !== syncStateRef.current.lastSyncedJson) {
            syncStateRef.current.lastSyncedJson = serialized;
            syncRemoteHistory(userId, recent, readStoredUserEmail());
          }
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [history.items, userId]);

  useEffect(() => {
    const flush = () => {
      try { writeHistory(window.localStorage, userId, latest.current); } catch { /* Already shown in the UI. */ }
      if (userId) {
        const recent = recentConversations(latest.current);
        if (recent.length > 0) {
          const serialized = JSON.stringify(recent);
          if (serialized !== syncStateRef.current.lastSyncedJson) {
            syncStateRef.current.lastSyncedJson = serialized;
            syncRemoteHistory(userId, recent, readStoredUserEmail());
          }
        }
      }
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
