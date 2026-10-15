import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../stored/appStore';
import { ROLES, ROLE_NAMES } from '../../domain/appTypes';
import {
  getChatRolesFromDbApi,
  getChatMessagesByRoleApi,
  sendChatMessageRestApi,
  createSignalRChatConnection,
} from '../../service';

const FILTER_TABS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'UNREAD', label: 'Chưa đọc' },
  { key: ROLES.ENGINEER, label: 'Kỹ sư' },
  { key: ROLES.ADMIN, label: 'Admin' },
  { key: ROLES.USER, label: 'Vận hành' },
];

export default function HeaderMessengerDropdown() {
  const { state } = useApp();
  const navigate = useNavigate();

  // Trạng thái Dropdown "Đoạn chat" từ nút Header
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Trạng thái Khung chat nhỏ (Popup Chat Box) và Ô tròn tròn thu nhỏ
  const [activeChat, setActiveChat] = useState(null);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [showNewChatMenu, setShowNewChatMenu] = useState(false);

  // Tin nhắn và hội thoại thực tế lấy từ Database
  const [conversations, setConversations] = useState([]);
  const [chatMessages, setChatMessages] = useState({});
  const [loading, setLoading] = useState(false);
  const [signalrConnected, setSignalrConnected] = useState(false);

  // Ô nhập tin nhắn trong khung chat
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  const dropdownRef = useRef(null);
  const chatMessagesEndRef = useRef(null);
  const signalrRef = useRef(null);

  // Tự động cuộn xuống cuối khi có tin nhắn mới trong khung chat
  useEffect(() => {
    if (activeChat && !isChatMinimized && chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeChat, isChatMinimized, chatMessages]);

  // Đóng Dropdown khi nhấp ra ngoài
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const profileRef = useRef(state.profile);
  useEffect(() => {
    profileRef.current = state.profile;
  }, [state.profile]);

  // Khởi tạo kết nối SignalR Hub để chat thời gian thực
  useEffect(() => {
    let isMounted = true;
    const connection = createSignalRChatConnection();
    signalrRef.current = connection;

    // Lắng nghe sự kiện nhận tin nhắn từ SignalR Hub
    connection.on('ReceiveRoleMessage', (msg) => {
      if (!isMounted || !msg) return;
      const roleKey = msg.role;
      const myProfile = profileRef.current || state.profile || {};
      const myEmail = (myProfile.email || localStorage.getItem('email') || '').toLowerCase().trim();
      const myName = (myProfile.name || localStorage.getItem('fullName') || '').trim();
      const msgEmail = (msg.senderEmail || '').toLowerCase().trim();
      const msgSender = (msg.sender || '').trim();

      const isSelf =
        Boolean(myEmail && msgEmail && myEmail === msgEmail) ||
        Boolean(myName && msgSender && myName === msgSender);

      const msgId =
        msg.id ||
        (typeof window !== 'undefined' && window.crypto?.randomUUID
          ? `msg_${window.crypto.randomUUID()}`
          : `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);
      const newMsgObj = {
        id: msgId,
        role: roleKey,
        sender: msg.sender,
        content: msg.content,
        time: msg.time || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        rawTime: msg.rawTime || Date.now(),
        isSelf,
      };

      setChatMessages((prev) => {
        const existingList = prev[roleKey] || [];
        // Chống duplicate: kiểm tra theo ID hoặc trùng nội dung + người gửi gửi trong 3 giây
        const isDuplicate = existingList.some(
          (m) =>
            (m.id && newMsgObj.id && String(m.id) === String(newMsgObj.id)) ||
            (m.content === newMsgObj.content &&
              m.sender === newMsgObj.sender &&
              Math.abs((m.rawTime || 0) - (newMsgObj.rawTime || 0)) < 3000)
        );
        if (isDuplicate) {
          return prev;
        }

        return {
          ...prev,
          [roleKey]: [...existingList, newMsgObj],
        };
      });

      setConversations((prev) =>
        prev.map((c) =>
          c.role === roleKey || c.id === roleKey
            ? {
                ...c,
                lastMessage: newMsgObj.content,
                lastTime: newMsgObj.time,
                rawTime: newMsgObj.rawTime,
                unread: !isSelf,
              }
            : c
        )
      );
    });

    connection
      .start()
      .then(async () => {
        if (!isMounted) return;
        setSignalrConnected(true);
        // Tham gia các nhóm role thời gian thực
        try {
          await connection.invoke('JoinRoleGroup', 'Engineering');
          await connection.invoke('JoinRoleGroup', 'Admin');
          await connection.invoke('JoinRoleGroup', 'User');
        } catch (err) {
          console.warn('SignalR join groups:', err);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setSignalrConnected(false);
        console.warn('SignalR chat connection fallback:', err);
      });

    return () => {
      isMounted = false;
      try {
        connection.off('ReceiveRoleMessage');
        connection.stop();
      } catch {
        // ignore
      }
    };
  }, []);

  // Tải các vai trò và tin nhắn thực tế từ Database
  const loadChatData = async () => {
    setLoading(true);
    try {
      // 1. Gọi API lấy roles và thành viên trực tiếp từ Database
      const rolesRes = await getChatRolesFromDbApi();

      let roleList = [];
      if (Array.isArray(rolesRes)) {
        roleList = rolesRes.map((r) => ({
          ...r,
          online: true,
          unread: false,
        }));
      }

      // 2. Tải tin nhắn thực tế từ Database cho từng Role
      const messagesMap = {};
      await Promise.allSettled(
        roleList.map(async (r) => {
          try {
            const dbMsgs = await getChatMessagesByRoleApi(r.role);
            const list = Array.isArray(dbMsgs)
              ? dbMsgs.map((m) => ({
                  ...m,
                  isSelf:
                    m.sender === state.profile?.name ||
                    m.senderEmail === state.profile?.email,
                }))
              : [];

            list.sort((a, b) => (a.rawTime || 0) - (b.rawTime || 0));
            messagesMap[r.role] = list;

            if (list.length > 0) {
              const last = list[list.length - 1];
              r.lastMessage = last.content;
              r.lastTime = last.time;
              r.rawTime = last.rawTime;
            }
          } catch {
            messagesMap[r.role] = [];
          }
        })
      );

      roleList.sort((a, b) => (b.rawTime || 0) - (a.rawTime || 0));
      setConversations(roleList);
      setChatMessages(messagesMap);
    } catch (err) {
      console.warn('Lỗi tải dữ liệu chat từ database:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChatData();
  }, []);

  // Khi người dùng bấm vào một cuộc trò chuyện trong danh sách Đoạn chat
  const handleSelectConversation = (conv) => {
    setActiveChat(conv);
    setIsChatMinimized(false);
    setIsDropdownOpen(false);
    setShowNewChatMenu(false);
  };

  // Bắt đầu cuộc trò chuyện mới với một vai trò
  const handleStartNewChat = (roleKey) => {
    const existing = conversations.find((c) => c.role === roleKey);
    if (existing) {
      handleSelectConversation(existing);
      return;
    }

    const roleDisplayName =
      roleKey === ROLES.ENGINEER
        ? 'Kỹ sư Robotics'
        : roleKey === ROLES.ADMIN
        ? 'Quản trị viên (Admin)'
        : 'Vận hành hệ thống';

    const avatarShort =
      roleKey === ROLES.ENGINEER ? 'KS' : roleKey === ROLES.ADMIN ? 'AD' : 'VH';

    const newChatObj = {
      id: roleKey,
      role: roleKey,
      roleName: roleDisplayName,
      avatarText: avatarShort,
      online: true,
      members: [],
    };

    setActiveChat(newChatObj);
    setIsChatMinimized(false);
    setIsDropdownOpen(false);
    setShowNewChatMenu(false);
  };

  // Gửi tin nhắn qua SignalR Real-time (Fallback qua REST API)
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChat || sending) return;

    const currentUserName = state.profile?.name || 'Tôi';
    const currentUserEmail = state.profile?.email || '';
    const currentRole = state.profile?.role || ROLES.ENGINEER;
    const textContent = inputText.trim();
    const targetRole = activeChat.role || activeChat.id;

    setInputText('');
    setSending(true);

    try {
      const connection = signalrRef.current;
      if (connection && connection.state === 'Connected') {
        // Gửi qua SignalR Hub thời gian thực
        await connection.invoke(
          'SendMessageToRole',
          targetRole,
          textContent,
          currentUserName,
          currentUserEmail,
          currentRole
        );
      } else {
        // Fallback gửi qua REST API
        await sendChatMessageRestApi({
          role: targetRole,
          content: textContent,
          senderName: currentUserName,
          senderEmail: currentUserEmail,
          senderRole: currentRole,
        });

        const timeFormatted = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const localMsg = {
          id:
            typeof window !== 'undefined' && window.crypto?.randomUUID
              ? `local_${window.crypto.randomUUID()}`
              : `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          role: targetRole,
          sender: currentUserName,
          content: textContent,
          time: timeFormatted,
          rawTime: Date.now(),
          isSelf: true,
        };

        setChatMessages((prev) => ({
          ...prev,
          [targetRole]: [...(prev[targetRole] || []), localMsg],
        }));

        setConversations((prev) =>
          prev.map((c) =>
            c.role === targetRole || c.id === targetRole
              ? { ...c, lastMessage: textContent, lastTime: timeFormatted, rawTime: Date.now() }
              : c
          )
        );
      }
    } catch (err) {
      console.warn('Lỗi khi gửi tin nhắn:', err);
    } finally {
      setSending(false);
    }
  };

  // Lọc danh sách hội thoại theo Tab và Tìm kiếm
  const filteredConversations = conversations.filter((c) => {
    const matchTab =
      selectedTab === 'ALL' ||
      (selectedTab === 'UNREAD' && c.unread) ||
      c.role === selectedTab;

    const matchSearch =
      !searchQuery.trim() ||
      c.roleName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.lastMessage && c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.members && c.members.some((m) => m.fullName.toLowerCase().includes(searchQuery.toLowerCase())));

    return matchTab && matchSearch;
  });

  const totalUnread = conversations.filter((c) => c.unread).length;
  const currentActiveMessages = activeChat ? chatMessages[activeChat.role || activeChat.id] || [] : [];

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* ============================================================== */}
      {/* 1. NÚT BIỂU TƯỢNG MESSENGER TRÊN THANH HEADER (TOPBAR)          */}
      {/* ============================================================== */}
      <button
        type="button"
        onClick={() => {
          setIsDropdownOpen(!isDropdownOpen);
          if (!isDropdownOpen) loadChatData();
        }}
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          background: isDropdownOpen ? '#e0f2fe' : '#f1f5f9',
          color: isDropdownOpen ? '#0084ff' : '#334155',
          border: '1px solid #e2e8f0',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          if (!isDropdownOpen) e.currentTarget.style.background = '#e2e8f0';
        }}
        onMouseLeave={(e) => {
          if (!isDropdownOpen) e.currentTarget.style.background = '#f1f5f9';
        }}
        title={`Đoạn chat (Messenger)${signalrConnected ? ' • SignalR Realtime' : ''}`}
        aria-label="Messenger"
      >
        {/* SVG Messenger Icon */}
        <svg width="20" height="20" viewBox="0 0 28 28" fill="currentColor">
          <path d="M14 2C7.37 2 2 6.97 2 13.1c0 3.49 1.74 6.6 4.46 8.65-.2 1.34-1.02 3.8-1.06 3.93-.07.24.03.5.24.63.1.06.22.1.34.1.14 0 .28-.05.39-.14l4.58-3.75c.99.27 2.02.41 3.05.41 6.63 0 12-4.97 12-11.1S20.63 2 14 2zm1.2 15.1l-3.2-3.4-6.2 3.4 6.8-7.2 3.3 3.4 6.1-3.4-6.8 7.2z" />
        </svg>

        {/* Chấm trạng thái kết nối SignalR (xanh lá nếu online) */}
        <span
          style={{
            position: 'absolute',
            bottom: '1px',
            right: '1px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: signalrConnected ? '#22c55e' : '#f59e0b',
            border: '1.5px solid #ffffff',
          }}
          title={signalrConnected ? 'SignalR đã kết nối' : 'Đang kết nối SignalR'}
        />

        {/* Badge số tin nhắn chưa đọc */}
        {totalUnread > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 800,
              minWidth: '18px',
              height: '18px',
              borderRadius: '9px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              border: '2px solid #ffffff',
            }}
          >
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>

      {/* ============================================================== */}
      {/* 2. POPOVER DROPDOWN "ĐOẠN CHAT"                                */}
      {/* ============================================================== */}
      {isDropdownOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '360px',
            maxWidth: 'calc(100vw - 32px)',
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 12px 35px rgba(0, 0, 0, 0.18), 0 2px 10px rgba(0, 0, 0, 0.05)',
            border: '1px solid #e2e8f0',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'fadeInSlide 0.18s ease-out',
          }}
        >
          {/* Header Đoạn chat */}
          <div
            style={{
              padding: '14px 16px 10px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                Đoạn chat
              </h3>
              {signalrConnected && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#15803d',
                    background: '#dcfce7',
                    padding: '1px 6px',
                    borderRadius: '10px',
                  }}
                >
                  ⚡ SignalR
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* Nút Tạo tin nhắn mới (Compose) */}
              <button
                type="button"
                onClick={() => setShowNewChatMenu(!showNewChatMenu)}
                style={{
                  background: showNewChatMenu ? '#e0f2fe' : '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: showNewChatMenu ? '#0084ff' : '#475569',
                }}
                title="Soạn tin nhắn mới"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  navigate('/chat');
                }}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#475569',
                }}
                title="Mở toàn màn hình"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Menu chọn vai trò khi soạn tin nhắn mới */}
          {showNewChatMenu && (
            <div
              style={{
                padding: '10px 14px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>
                Chọn vai trò từ Database:
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {conversations.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleStartNewChat(c.role)}
                    style={{
                      fontSize: '11px',
                      padding: '5px 10px',
                      borderRadius: '8px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      cursor: 'pointer',
                      fontWeight: 600,
                      color: '#0f172a',
                    }}
                  >
                    {c.avatarText === 'KS' ? '🛠️' : c.avatarText === 'AD' ? '🛡️' : '👤'} {c.roleName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Ô tìm kiếm trên Messenger */}
          <div style={{ padding: '0 16px 10px 16px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#f1f5f9',
                borderRadius: '20px',
                padding: '6px 12px',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Tìm kiếm vai trò & thành viên..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: '12px',
                  width: '100%',
                  color: '#0f172a',
                }}
              />
            </div>
          </div>

          {/* Các thẻ bộ lọc (Filter Pills: Tất cả, Chưa đọc, Kỹ sư, Admin, Vận hành) */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              padding: '0 16px 10px 16px',
              borderBottom: '1px solid #f1f5f9',
              overflowX: 'auto',
            }}
          >
            {FILTER_TABS.map((tab) => {
              const active = selectedTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedTab(tab.key)}
                  style={{
                    fontSize: '12px',
                    padding: '4px 12px',
                    borderRadius: '16px',
                    border: 'none',
                    background: active ? '#e0f2fe' : '#f1f5f9',
                    color: active ? '#0369a1' : '#475569',
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Danh sách các vai trò thực tế từ Database */}
          <div
            style={{
              maxHeight: '340px',
              overflowY: 'auto',
              padding: '6px',
            }}
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: '24px', fontSize: '12px', color: '#94a3b8' }}>
                Đang tải dữ liệu từ Database...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '36px 16px',
                  color: '#94a3b8',
                  fontSize: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div style={{ fontSize: '32px' }}>💬</div>
                <strong style={{ color: '#64748b' }}>Chưa có cuộc trò chuyện nào</strong>
                <span style={{ fontSize: '11px', color: '#94a3b8', maxWidth: '240px' }}>
                  Các vai trò và thành viên trong cơ sở dữ liệu sẽ hiển thị tại đây.
                </span>
                <button
                  type="button"
                  onClick={() => setShowNewChatMenu(true)}
                  style={{
                    marginTop: '6px',
                    background: '#0084ff',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '16px',
                    padding: '6px 16px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0, 132, 255, 0.3)',
                  }}
                >
                  + Soạn tin nhắn mới
                </button>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Avatar tròn kèm chấm xanh online */}
                  <div
                    style={{
                      position: 'relative',
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #0084ff 0%, #00c6ff 100%)',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {conv.avatarText}
                    {conv.online && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '1px',
                          right: '1px',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: '#22c55e',
                          border: '2px solid #ffffff',
                        }}
                      />
                    )}
                  </div>

                  {/* Tên và bản xem trước tin nhắn */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <strong
                        style={{
                          fontSize: '13px',
                          color: '#0f172a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {conv.roleName}
                      </strong>

                      {conv.memberCount !== undefined && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            color: '#64748b',
                            background: '#f1f5f9',
                            padding: '1px 6px',
                            borderRadius: '10px',
                          }}
                        >
                          {conv.memberCount} users
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        color: '#64748b',
                        marginTop: '2px',
                      }}
                    >
                      <span
                        style={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '190px',
                        }}
                      >
                        {conv.lastMessage || `${conv.members?.length || 0} thành viên trong Database`}
                      </span>
                      {conv.lastTime && <span>·</span>}
                      {conv.lastTime && <span style={{ whiteSpace: 'nowrap' }}>{conv.lastTime}</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Chân Dropdown: Xem tất cả trong Messenger */}
          <div
            style={{
              padding: '10px',
              borderTop: '1px solid #f1f5f9',
              textAlign: 'center',
              background: '#ffffff',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setIsDropdownOpen(false);
                navigate('/chat');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#0084ff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Xem tất cả trong Messenger
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. KHUNG CHAT NHỎ & Ô TRÒN TRÒN THU NHỎ (Render bằng Portal)    */}
      {/* ============================================================== */}
      {createPortal(
        <>
          {/* A. BONG BÓNG TRÒN MESSENGER KHI THU NHỎ (CÓ CHẤM XANH ONLINE) */}
          {activeChat && isChatMinimized && (
            <div
              style={{
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Nút đóng hoàn toàn */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveChat(null);
                  setIsChatMinimized(false);
                }}
                style={{
                  position: 'absolute',
                  top: '-6px',
                  left: '-6px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#64748b',
                  color: '#ffffff',
                  border: '2px solid #ffffff',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 2,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }}
                title="Đóng chat"
              >
                ✕
              </button>

              {/* Ô tròn tròn Messenger */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setIsChatMinimized(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setIsChatMinimized(false);
                }}
                style={{
                  width: '58px',
                  height: '58px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0084ff 0%, #00c6ff 100%)',
                  boxShadow: '0 10px 25px -4px rgba(0, 132, 255, 0.45), 0 4px 10px rgba(0, 0, 0, 0.15)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  userSelect: 'none',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                title={`Nhấp để mở chat với ${activeChat.roleName || activeChat.name}`}
              >
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
                  {activeChat.avatarText}
                </span>

                {/* Chấm tròn xanh lá online */}
                <span
                  style={{
                    position: 'absolute',
                    bottom: '2px',
                    right: '2px',
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: '#22c55e',
                    border: '2.5px solid #ffffff',
                  }}
                />
              </div>
            </div>
          )}

          {/* B. KHUNG CHAT NHỎ Ở GÓC DƯỚI (SignalR Realtime) */}
          {activeChat && !isChatMinimized && (
            <div
              style={{
                position: 'fixed',
                bottom: 0,
                right: '80px',
                width: '330px',
                maxWidth: 'calc(100vw - 32px)',
                height: '460px',
                background: '#ffffff',
                borderRadius: '12px 12px 0 0',
                boxShadow: '0 -4px 30px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.08)',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                animation: 'slideUpChat 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <style>{`
                @keyframes slideUpChat {
                  from { opacity: 0; transform: translateY(20px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              `}</style>

              {/* 1. Header Khung Chat: Avatar, Tên Role, Đang hoạt động, Thu nhỏ (-), Đóng (✕) */}
              <div
                style={{
                  padding: '8px 12px',
                  background: '#ffffff',
                  borderBottom: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                }}
              >
                {/* Thông tin vai trò người nhận */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <div
                    style={{
                      position: 'relative',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #0084ff 0%, #00c6ff 100%)',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {activeChat.avatarText}
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '0',
                        right: '0',
                        width: '9px',
                        height: '9px',
                        borderRadius: '50%',
                        background: '#22c55e',
                        border: '1.5px solid #ffffff',
                      }}
                    />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#0f172a',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '130px',
                      }}
                      title={
                        activeChat.members && activeChat.members.length > 0
                          ? `${activeChat.roleName || activeChat.name} (${activeChat.members.map((m) => m.fullName).join(', ')})`
                          : (activeChat.roleName || activeChat.name)
                      }
                    >
                      {activeChat.roleName || activeChat.name}
                    </div>
                    <div style={{ fontSize: '10px', color: '#22c55e', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>Đang hoạt động</span>
                      {signalrConnected && <span style={{ color: '#15803d' }}>• Realtime</span>}
                    </div>
                  </div>
                </div>

                {/* Các nút hành động trên Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {/* Nút Thu nhỏ (-) */}
                  <button
                    type="button"
                    onClick={() => setIsChatMinimized(true)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      color: '#475569',
                      fontSize: '15px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    title="Thu nhỏ"
                  >
                    —
                  </button>

                  {/* Nút Đóng (✕) */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveChat(null);
                      setIsChatMinimized(false);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      color: '#475569',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    title="Đóng"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* 2. Thân Khung Chat: Các bong bóng tin nhắn */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '12px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  background: '#f8fafc',
                }}
              >

                {currentActiveMessages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8', fontSize: '11px' }}>
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>👋</div>
                    Bắt đầu trao đổi thời gian thực với {activeChat.roleName || activeChat.name}!
                  </div>
                ) : (
                  currentActiveMessages.map((msg) => {
                    const isSelf = msg.isSelf;
                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: 'flex',
                          flexDirection: isSelf ? 'row-reverse' : 'row',
                          alignItems: 'flex-end',
                          gap: '6px',
                        }}
                      >
                        {/* Avatar nhỏ người gửi đối diện */}
                        {!isSelf && (
                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: '#0084ff',
                              color: '#ffffff',
                              fontSize: '10px',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {activeChat.avatarText}
                          </div>
                        )}

                        <div style={{ maxWidth: '75%' }}>
                          {!isSelf && (
                            <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px', paddingLeft: '4px' }}>
                              {msg.sender}
                            </div>
                          )}
                          <div
                            style={{
                              padding: '8px 12px',
                              borderRadius: isSelf ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                              background: isSelf ? '#0084ff' : '#e2e8f0',
                              color: isSelf ? '#ffffff' : '#0f172a',
                              fontSize: '12px',
                              lineHeight: 1.4,
                              wordBreak: 'break-word',
                            }}
                          >
                            {msg.content}
                          </div>
                          <span
                            style={{
                              fontSize: '9px',
                              color: '#94a3b8',
                              marginTop: '2px',
                              display: 'block',
                              textAlign: isSelf ? 'right' : 'left',
                              padding: '0 4px',
                            }}
                          >
                            {msg.time}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatMessagesEndRef} />
              </div>

              {/* 3. Khung nhập tin nhắn SignalR */}
              <form
                onSubmit={handleSendMessage}
                style={{
                  padding: '8px 10px',
                  background: '#ffffff',
                  borderTop: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <input
                  type="text"
                  placeholder="Aa"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  style={{
                    flex: 1,
                    fontSize: '12px',
                    border: 'none',
                    borderRadius: '18px',
                    padding: '8px 12px',
                    outline: 'none',
                    background: '#f1f5f9',
                    color: '#0f172a',
                  }}
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  style={{
                    background: inputText.trim() ? '#0084ff' : 'transparent',
                    color: inputText.trim() ? '#ffffff' : '#0084ff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: inputText.trim() ? 'pointer' : 'default',
                    transition: 'all 0.15s ease',
                  }}
                  title="Gửi"
                >
                  {inputText.trim() ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  ) : (
                    <span>👍</span>
                  )}
                </button>
              </form>
            </div>
          )}
        </>,
        document.body
      )}
    </div>
  );
}
