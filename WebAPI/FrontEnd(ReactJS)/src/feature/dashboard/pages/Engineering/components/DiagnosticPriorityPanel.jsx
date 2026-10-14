import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../../../../components/common/UIComponents';

const ROLES_LIST = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'Engineering', label: '🛠️ Kỹ sư', color: '#d97706' },
  { key: 'Admin', label: '🛡️ Admin', color: '#dc2626' },
  { key: 'User', label: '👤 Vận hành', color: '#2563eb' },
];

export default function DiagnosticPriorityPanel({ pendingCount = 0, highWarningsCount = 0, incompleteCount = 0 }) {
  const total = pendingCount + highWarningsCount + incompleteCount;

  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
  const [targetRole, setTargetRole] = useState('Engineering');
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('ros2_role_dashboard_messages');
      return saved ? JSON.parse(saved) : DEFAULT_ROLE_MESSAGES;
    } catch {
      return DEFAULT_ROLE_MESSAGES;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ros2_role_dashboard_messages', JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages]);

  // SVG Donut calculation
  const radius = 38;
  const circumference = 2 * Math.PI * radius; // ~238.76

  const pPending = total ? pendingCount / total : 0;
  const pHigh = total ? highWarningsCount / total : 0;
  const pIncomplete = total ? incompleteCount / total : 0;

  const priorities = [
    {
      to: '/reviews',
      dotColor: '#d97706',
      title: `${pendingCount} kết luận chờ duyệt`,
      subtitle: 'Kỹ sư kiểm tra trước khi xuất',
      percent: Math.round(pPending * 100),
      count: pendingCount,
      role: 'Engineering',
      roleLabel: 'Kỹ sư',
      roleBadgeColor: '#fef3c7',
      roleTextColor: '#b45309',
      strokeDasharray: `${pPending * circumference} ${circumference * (1 - pPending)}`,
      strokeDashoffset: 0,
    },
    {
      to: '/reviews',
      dotColor: '#dc2626',
      title: `${highWarningsCount} cảnh báo mức cao`,
      subtitle: 'Đối chiếu bằng chứng của phiên',
      percent: Math.round(pHigh * 100),
      count: highWarningsCount,
      role: 'Admin',
      roleLabel: 'Admin',
      roleBadgeColor: '#fee2e2',
      roleTextColor: '#b91c1c',
      strokeDasharray: `${pHigh * circumference} ${circumference * (1 - pHigh)}`,
      strokeDashoffset: -(pPending * circumference),
    },
    {
      to: '/bags',
      dotColor: '#2563eb',
      title: `${incompleteCount} bag chưa đủ dữ liệu`,
      subtitle: 'Kiểm tra các phần đã ghi',
      percent: Math.round(pIncomplete * 100),
      count: incompleteCount,
      role: 'User',
      roleLabel: 'Vận hành',
      roleBadgeColor: '#e0f2fe',
      roleTextColor: '#0369a1',
      strokeDasharray: `${pIncomplete * circumference} ${circumference * (1 - pIncomplete)}`,
      strokeDashoffset: -((pPending + pHigh) * circumference),
    },
  ];

  const handleSendMessage = (e) => {
    e?.preventDefault();
    const trimmed = messageInput.trim();
    if (!trimmed) return;

    const roleMeta = {
      Engineering: { name: 'Kỹ sư Robotics', badgeBg: '#fef3c7', badgeColor: '#b45309', avatarBg: '#dbeafe', avatarColor: '#1d4ed8' },
      Admin: { name: 'Quản trị viên', badgeBg: '#fee2e2', badgeColor: '#b91c1c', avatarBg: '#fee2e2', avatarColor: '#b91c1c' },
      User: { name: 'Người vận hành', badgeBg: '#e0f2fe', badgeColor: '#0369a1', avatarBg: '#e0f2fe', avatarColor: '#0369a1' },
    }[targetRole] || { name: targetRole, badgeBg: '#f1f5f9', badgeColor: '#475569', avatarBg: '#e2e8f0', avatarColor: '#334155' };

    const newMsg = {
      id: `msg_${Date.now()}`,
      role: targetRole,
      roleName: roleMeta.name,
      sender: 'Tôi (Hiện tại)',
      avatar: 'ME',
      avatarBg: roleMeta.avatarBg,
      avatarColor: roleMeta.avatarColor,
      badgeBg: roleMeta.badgeBg,
      badgeColor: roleMeta.badgeColor,
      content: trimmed,
      time: 'Vừa xong',
      tag: `Gửi đến ${roleMeta.name}`,
    };

    setMessages((prev) => [newMsg, ...prev]);
    setMessageInput('');
  };

  const filteredMessages = selectedRoleFilter === 'ALL'
    ? messages
    : messages.filter((m) => m.role === selectedRoleFilter);

  return (
    <div
      className="dash-priority"
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '22px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
      }}
    >
      {/* Header */}
      <div
        className="dash-priority-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <strong style={{ fontSize: '16px', color: '#0f172a', fontWeight: 700 }}>
            Ưu tiên hôm nay
          </strong>
        </div>
        <span
          style={{
            background: '#e0f2fe',
            color: '#0369a1',
            fontSize: '11px',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: '12px',
          }}
        >
          ● {priorities.length} nhóm
        </span>
      </div>

      {/* Mini Donut Chart combined with Priority list */}
      <div className="dash-priority-summary" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* SVG Donut */}
        <div style={{ position: 'relative', width: '92px', height: '92px', flexShrink: 0 }}>
          <svg
            width="92"
            height="92"
            viewBox="0 0 100 100"
            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
          >
            {/* Background ring */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="11"
            />
            {/* Slices */}
            {priorities.map((item, idx) => {
              const isHov = hoveredIdx === idx;
              return (
                <circle
                  key={idx}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke={item.dotColor}
                  strokeWidth={isHov ? '14' : '11'}
                  strokeDasharray={item.strokeDasharray}
                  strokeDashoffset={item.strokeDashoffset}
                  style={{
                    transition: 'all 0.25s ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              );
            })}
          </svg>
          {/* Donut Center Count */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <strong style={{ fontSize: '18px', fontWeight: 800, color: hoveredIdx !== null ? priorities[hoveredIdx].dotColor : '#0f172a' }}>
              {hoveredIdx !== null ? priorities[hoveredIdx].count : total}
            </strong>
            <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 600 }}>
              {hoveredIdx !== null ? `${priorities[hoveredIdx].percent}%` : 'Mục'}
            </span>
          </div>
        </div>

        {/* Short Summary Text */}
        <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
          <div>
            Tổng <strong>{total} sự kiện ưu tiên</strong> phát hiện trên toàn hệ thống cần kỹ sư can thiệp.
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Rê chuột vào cung tròn để xem chi tiết.
          </div>
        </div>
      </div>

      {/* Priority Links với nút nhắn tin nhanh theo Role */}
      <div style={{ display: 'grid', gap: '8px' }}>
        {priorities.map((item, index) => {
          const isHov = hoveredIdx === index;
          return (
            <div
              key={index}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                background: isHov ? '#ffffff' : '#fafbfd',
                border: `1px solid ${isHov ? item.dotColor : '#f1f5f9'}`,
                borderRadius: '10px',
                padding: '10px 12px',
                boxShadow: isHov ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={() => setHoveredIdx(index)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Link
                  to={item.to}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    textDecoration: 'none',
                    flex: 1,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: item.dotColor,
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <strong style={{ fontSize: '12px', color: '#0f172a', display: 'block' }}>
                      {item.title}
                    </strong>
                    <small style={{ fontSize: '11px', color: '#64748b' }}>{item.subtitle}</small>
                  </div>
                </Link>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: item.dotColor }}>
                    {item.percent}%
                  </span>
                  <Link to={item.to} style={{ color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                    <Icon name="chevron" size={14} />
                  </Link>
                </div>
              </div>

              {/* Action nhấp để kích hoạt nhắn tin nhanh cho Role liên quan */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '6px',
                  marginTop: '4px',
                  borderTop: '1px dashed #f1f5f9',
                  fontSize: '11px',
                }}
              >
                <span
                  style={{
                    background: item.roleBadgeColor,
                    color: item.roleTextColor,
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                  }}
                >
                  Role: {item.roleLabel}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTargetRole(item.role);
                    setSelectedRoleFilter(item.role);
                    setMessageInput(`[Về ${item.title}] `);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: item.dotColor,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  title={`Nhắn tin trực tiếp với ${item.roleLabel}`}
                >
                  <span>💬 Nhắn tin</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* KHU VỰC UI TIN NHẮN THEO CÁC ROLE (Role Messaging & Dispatch)            */}
      {/* ========================================================================= */}
      <div
        className="dash-role-chat-box"
        style={{
          borderTop: '1px solid #f1f5f9',
          paddingTop: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {/* Header & Role Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
              💬 Trao đổi theo Role
            </span>
            <span style={{ fontSize: '10px', color: '#64748b', background: '#f1f5f9', padding: '1px 6px', borderRadius: '10px' }}>
              {filteredMessages.length}
            </span>
          </div>

          <Link
            to="/chat"
            style={{
              fontSize: '11px',
              color: '#2563eb',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Mở Chat đầy đủ →
          </Link>
        </div>

        {/* Role Pills Filter */}
        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
          {ROLES_LIST.map((r) => {
            const isActive = selectedRoleFilter === r.key;
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => setSelectedRoleFilter(r.key)}
                style={{
                  fontSize: '11px',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  border: isActive ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  background: isActive ? '#eff6ff' : '#ffffff',
                  color: isActive ? '#1d4ed8' : '#64748b',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                {r.label}
              </button>
            );
          })}
        </div>

        {/* Messages List (Scrollable) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxHeight: '180px',
            overflowY: 'auto',
            paddingRight: '4px',
          }}
        >
          {filteredMessages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px', fontSize: '11px', color: '#94a3b8' }}>
              Chưa có tin nhắn nào cho vai trò này.
            </div>
          ) : (
            filteredMessages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '8px 10px',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-start',
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: msg.avatarBg || '#e2e8f0',
                    color: msg.avatarColor || '#334155',
                    fontSize: '10px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {msg.avatar}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', marginBottom: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong style={{ fontSize: '11px', color: '#0f172a' }}>
                        {msg.sender}
                      </strong>
                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          background: msg.badgeBg,
                          color: msg.badgeColor,
                          padding: '1px 5px',
                          borderRadius: '4px',
                        }}
                      >
                        {msg.roleName}
                      </span>
                    </div>
                    <span style={{ fontSize: '10px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {msg.time}
                    </span>
                  </div>

                  <p style={{ margin: 0, fontSize: '11px', color: '#334155', lineHeight: '1.4' }}>
                    {msg.content}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick Send Input Form */}
        <form
          onSubmit={handleSendMessage}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            background: '#fafbfd',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
            <span style={{ color: '#64748b' }}>Gửi tới:</span>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              style={{
                fontSize: '11px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '2px 6px',
                background: '#ffffff',
                color: '#0f172a',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <option value="Engineering">🛠️ Kỹ sư Robotics (Engineering)</option>
              <option value="Admin">🛡️ Quản trị viên (Admin)</option>
              <option value="User">👤 Người vận hành (Operator)</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder={`Nhắn cho ${targetRole}...`}
              style={{
                flex: 1,
                fontSize: '11px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '6px 10px',
                outline: 'none',
                background: '#ffffff',
              }}
            />
            <button
              type="submit"
              disabled={!messageInput.trim()}
              style={{
                background: messageInput.trim() ? '#2563eb' : '#94a3b8',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '0 12px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: messageInput.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'background 0.15s ease',
              }}
            >
              <span>Gửi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

