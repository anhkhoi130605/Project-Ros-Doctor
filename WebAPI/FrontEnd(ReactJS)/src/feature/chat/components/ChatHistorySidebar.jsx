import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { historyGroup, recentConversations } from '../chatHistory';

export default function ChatHistorySidebar({ conversations, activeId, disabled, onNew, onOpen }) {
  const { i18n } = useTranslation();
  const english = i18n.language?.startsWith('en');
  const [search, setSearch] = useState('');
  const recent = recentConversations(conversations);
  const filtered = recent.filter((item) => item.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const labels = english
    ? { today: 'Today', yesterday: 'Yesterday', week: 'Previous 7 days', older: 'Earlier' }
    : { today: 'Hôm nay', yesterday: 'Hôm qua', week: '7 ngày qua', older: 'Trước đó' };
  return (
    <aside className="chat-history" aria-label={english ? 'Recent conversations' : 'Cuộc trò chuyện gần đây'} translate="no">
      <div className="chat-history-header"><span className="chat-history-mark" aria-hidden="true">◷</span>
        <div><h2>{english ? 'Recent' : 'Gần đây'}</h2><p>{english ? 'Your conversations' : 'Cuộc trò chuyện của bạn'}</p></div>
        <span className="chat-history-count">{recent.length}</span>
      </div>
      <button type="button" className="chat-history-new" disabled={disabled} onClick={() => { setSearch(''); onNew(); }}>
        <span aria-hidden="true">＋</span>{english ? 'New conversation' : 'Cuộc trò chuyện mới'}
      </button>
      <input className="chat-history-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)}
        aria-label={english ? 'Search conversations' : 'Tìm cuộc trò chuyện'} placeholder={english ? 'Search conversations…' : 'Tìm cuộc trò chuyện…'} />
      <nav className="chat-history-list" aria-label={english ? 'Conversation history' : 'Lịch sử trò chuyện'}>
        {!filtered.length && <div className="chat-history-empty"><span aria-hidden="true">☷</span>
          <strong>{search ? (english ? 'No results' : 'Không tìm thấy') : (english ? 'No conversations yet' : 'Chưa có cuộc trò chuyện')}</strong>
          <p>{english ? 'Send a question to start a conversation.' : 'Gửi câu hỏi để bắt đầu một cuộc trò chuyện.'}</p>
        </div>}
        {Object.entries(labels).map(([group, label]) => {
          const items = filtered.filter((item) => historyGroup(item.updatedAt) === group);
          return items.length ? <section key={group} className="chat-history-group"><h3>{label}</h3>
            {items.map((item) => <button key={item.id} type="button" disabled={disabled}
              className={`chat-history-item${item.id === activeId ? ' is-active' : ''}`}
              aria-current={item.id === activeId ? 'true' : undefined} title={item.title} onClick={() => onOpen(item.id)}>
              <span className="chat-history-item-title">{item.title}</span>
              <span className="chat-history-item-meta"><span>{item.bagId ? 'Rosbag' : (english ? 'General chat' : 'Hỏi đáp chung')}</span>
                <time dateTime={item.updatedAt}>{new Date(item.updatedAt).toLocaleDateString(english ? 'en-GB' : 'vi-VN', { day: '2-digit', month: '2-digit' })}</time>
              </span>
            </button>)}
          </section> : null;
        })}
      </nav>
      <p className="chat-history-footnote">{disabled
        ? (english ? 'Please wait for the response before switching chats.' : 'Vui lòng đợi phản hồi trước khi chuyển cuộc trò chuyện.')
        : (english ? 'The 50 most recent chats are saved on this browser, separately for each account.' : 'Lưu 50 cuộc trò chuyện gần nhất trên trình duyệt này, riêng cho từng tài khoản.')}</p>
    </aside>
  );
}
