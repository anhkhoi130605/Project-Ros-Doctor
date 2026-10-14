import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../stored/appStore';
import { getReviewsApi, getBagsApi } from '../../service';

export default function HeaderNotificationDropdown() {
  const { state } = useApp();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Đóng khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Tải thông báo thực tế từ Findings, Reviews và Bags
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.allSettled([
      getReviewsApi(),
      getBagsApi(),
    ])
      .then(([reviewRes, bagsRes]) => {
        if (!isMounted) return;
        const realNotifs = [];

        // 1. Thông báo từ các kết luận chờ duyệt và cảnh báo mức cao
        if (reviewRes.status === 'fulfilled' && Array.isArray(reviewRes.value)) {
          const pendingReviews = reviewRes.value.filter((r) => r.status === 'pending');
          pendingReviews.slice(0, 5).forEach((item) => {
            realNotifs.push({
              id: `notif_rev_${item.id || item.findingId}`,
              title: 'Kết luận chờ duyệt',
              message: `Phát hiện ${item.ruleId || 'bất thường'} trên topic ${item.topic || '/system'} cần kỹ sư xác nhận.`,
              time: 'Cần xử lý',
              icon: '⚠️',
              iconBg: '#fef3c7',
              to: `/reviews/${item.findingId || item.id}`,
              unread: true,
            });
          });
        }

        // 2. Thông báo từ Rosbag vừa tải lên
        if (bagsRes.status === 'fulfilled' && Array.isArray(bagsRes.value)) {
          bagsRes.value.slice(0, 3).forEach((bag) => {
            realNotifs.push({
              id: `notif_bag_${bag.id}`,
              title: 'Bản ghi Rosbag đã nạp',
              message: `File ${bag.name} (${bag.size || 'dữ liệu đầy đủ'}) đã sẵn sàng phân tích.`,
              time: bag.date || 'Hôm nay',
              icon: '📁',
              iconBg: '#e0f2fe',
              to: `/bags/${bag.id}`,
              unread: false,
            });
          });
        }

        setNotifications(realNotifs);
        setLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Nút Chuông thông báo */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          background: isOpen ? '#e0f2fe' : '#f1f5f9',
          color: isOpen ? '#0284c7' : '#334155',
          border: '1px solid #e2e8f0',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          if (!isOpen) e.currentTarget.style.background = '#e2e8f0';
        }}
        onMouseLeave={(e) => {
          if (!isOpen) e.currentTarget.style.background = '#f1f5f9';
        }}
        title="Thông báo"
        aria-label="Thông báo"
      >
        {/* SVG Bell Icon */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* Badge số thông báo chưa đọc */}
        {unreadCount > 0 && (
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
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Thông báo */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '360px',
            maxWidth: 'calc(100vw - 32px)',
            maxHeight: '480px',
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 12px 35px rgba(0, 0, 0, 0.15), 0 2px 10px rgba(0, 0, 0, 0.05)',
            border: '1px solid #e2e8f0',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header Thông báo */}
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                Thông báo
              </h3>
              {unreadCount > 0 && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    background: '#fee2e2',
                    color: '#dc2626',
                    padding: '2px 6px',
                    borderRadius: '10px',
                  }}
                >
                  {unreadCount} mới
                </span>
              )}
            </div>

            <Link
              to="/reviews"
              onClick={() => setIsOpen(false)}
              style={{
                fontSize: '11px',
                color: '#2563eb',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Xem tất cả
            </Link>
          </div>

          {/* Danh sách thông báo */}
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '340px', padding: '6px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '24px', fontSize: '12px', color: '#94a3b8' }}>
                Đang tải thông báo...
              </div>
            ) : notifications.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '32px 16px',
                  color: '#94a3b8',
                  fontSize: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ fontSize: '28px' }}>🔔</span>
                <strong>Không có thông báo mới</strong>
                <span style={{ fontSize: '11px', color: '#cbd5e1' }}>
                  Hệ thống đang vận hành ổn định.
                </span>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    setIsOpen(false);
                    navigate(n.to);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    background: n.unread ? '#f8fafc' : '#ffffff',
                    borderLeft: n.unread ? '3px solid #3b82f6' : '3px solid transparent',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = n.unread ? '#f8fafc' : '#ffffff')}
                >
                  {/* Icon */}
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      background: n.iconBg || '#e0f2fe',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      flexShrink: 0,
                    }}
                  >
                    {n.icon}
                  </div>

                  {/* Body */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <strong style={{ fontSize: '12px', color: '#0f172a' }}>
                        {n.title}
                      </strong>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                        {n.time}
                      </span>
                    </div>

                    <p style={{ margin: 0, fontSize: '11px', color: '#64748b', lineHeight: '1.4' }}>
                      {n.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '10px 16px',
              borderTop: '1px solid #f1f5f9',
              textAlign: 'center',
              background: '#ffffff',
            }}
          >
            <Link
              to="/reviews"
              onClick={() => setIsOpen(false)}
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#2563eb',
                textDecoration: 'none',
              }}
            >
              Xem tất cả đánh giá & báo cáo →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
