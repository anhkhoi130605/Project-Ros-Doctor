import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../stored/appStore';
import {
  NotificationType,
  AdminNotificationType,
  EngineerNotificationType,
  UserNotificationType,
  NOTIFICATION_TYPE_LABELS,
} from '../../domain/appTypes';
import {
  getNotificationsApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
  getReviewsApi,
  getBagsApi,
  getReportsApi,
  getChatMessagesByRoleApi,
} from '../../service';
import {
  fetchAdminMembersApi,
  fetchAdminActivityLogsApi,
  fetchSystemLogsApi,
} from '../../feature/dashboard/api/dashboardApi';

export default function HeaderNotificationDropdown() {
  const { state } = useApp();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Xác định vai trò hiện tại của người dùng
  const rawRole = (state.role || state.profile?.role || localStorage.getItem('user_role') || 'User').toLowerCase();
  const isAdmin = rawRole.includes('admin');
  const isEngineer = rawRole.includes('engineer');
  const isUser = !isAdmin && !isEngineer;

  // Cấu hình các Tabs lọc thông báo theo từng vai trò
  const tabs = useMemo(() => {
    if (isAdmin) {
      return [
        { key: 'ALL', label: 'Tất cả' },
        { key: 'REQUESTS', label: 'Yêu cầu' },
        { key: 'SYSTEM_LOGS', label: 'Log hệ thống' },
        { key: 'MESSAGES', label: 'Tin nhắn' },
      ];
    }
    if (isEngineer) {
      return [
        { key: 'ALL', label: 'Tất cả' },
        { key: 'TASKS', label: 'Đánh giá & Bags' },
        { key: 'MESSAGES', label: 'Tin nhắn' },
      ];
    }
    return [
      { key: 'ALL', label: 'Tất cả' },
      { key: 'REPORTS', label: 'Báo cáo & Xe' },
      { key: 'MESSAGES', label: 'Tin nhắn' },
    ];
  }, [isAdmin, isEngineer]);

  // Đóng dropdown khi click ra ngoài
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

  // Tải dữ liệu thông báo thực tế theo vai trò từ Backend API & hệ thống
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    const notifs = [];

    try {
      // 0. Gọi API thông báo chính từ Backend (/api/notifications) theo vai trò
      try {
        const res = await getNotificationsApi(50);
        const backendList = Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : Array.isArray(res?.data) ? res.data : [];
        
        backendList.forEach((item) => {
          const nType = item.type || 'Other';
          let category = 'MESSAGES';
          let icon = '🔔';
          let iconBg = '#f1f5f9';
          let to = null;
          let chatRole = null;

          if (isAdmin) {
            switch (nType) {
              case AdminNotificationType.ReceivedRequest:
              case AdminNotificationType.UserRegistered:
                category = 'REQUESTS';
                icon = nType === AdminNotificationType.UserRegistered ? '👤' : '📝';
                iconBg = '#ffedd5';
                to = '/admin/overview?tab=members';
                break;
              case AdminNotificationType.SystemError:
                category = 'SYSTEM_LOGS';
                icon = '🚨';
                iconBg = '#fee2e2';
                to = '/admin/system-logs';
                break;
              case AdminNotificationType.AccountBan:
              case AdminNotificationType.AccountUnban:
                category = 'REQUESTS';
                icon = nType === AdminNotificationType.AccountBan ? '🚫' : '✅';
                iconBg = '#fee2e2';
                to = '/admin/overview?tab=members';
                break;
              case AdminNotificationType.ReceivedMessage:
              case AdminNotificationType.NewChatMessage:
                category = 'MESSAGES';
                icon = '💬';
                iconBg = '#dbeafe';
                chatRole = 'Admin';
                break;
              case AdminNotificationType.SystemBroadcast:
              default:
                category = 'REQUESTS';
                icon = '📢';
                iconBg = '#ede9fe';
                to = '/admin/overview';
                break;
            }
          } else if (isEngineer) {
            switch (nType) {
              case EngineerNotificationType.ReviewRequired:
              case EngineerNotificationType.DiagnosticAnomalyDetected:
                category = 'TASKS';
                icon = nType === EngineerNotificationType.ReviewRequired ? '📝' : '⚠️';
                iconBg = '#fef3c7';
                to = '/reviews';
                break;
              case EngineerNotificationType.RosbagUploaded:
              case EngineerNotificationType.AnalysisCompleted:
                category = 'TASKS';
                icon = nType === EngineerNotificationType.AnalysisCompleted ? '✅' : '📁';
                iconBg = nType === EngineerNotificationType.AnalysisCompleted ? '#d1fae5' : '#e0f2fe';
                to = '/bags';
                break;
              case EngineerNotificationType.SystemError:
                category = 'TASKS';
                icon = '🚨';
                iconBg = '#fee2e2';
                to = '/admin/system-logs';
                break;
              case EngineerNotificationType.AccountApproved:
                category = 'TASKS';
                icon = '🛡️';
                iconBg = '#dcfce7';
                to = '/profile';
                break;
              case EngineerNotificationType.NewChatMessage:
                category = 'MESSAGES';
                icon = '💬';
                iconBg = '#dbeafe';
                chatRole = 'Engineering';
                break;
              case EngineerNotificationType.SystemBroadcast:
              default:
                category = 'TASKS';
                icon = '📢';
                iconBg = '#ede9fe';
                to = '/reviews';
                break;
            }
          } else {
            // Role User
            switch (nType) {
              case UserNotificationType.ReportReady:
                category = 'REPORTS';
                icon = '📋';
                iconBg = '#dcfce7';
                to = '/reports';
                break;
              case UserNotificationType.RosbagProcessed:
                category = 'REPORTS';
                icon = '📁';
                iconBg = '#e0f2fe';
                to = '/bags';
                break;
              case UserNotificationType.VehicleAlert:
                category = 'REPORTS';
                icon = '🚨';
                iconBg = '#fee2e2';
                to = '/reports';
                break;
              case UserNotificationType.AccountApproved:
              case UserNotificationType.AccountUnban:
                category = 'REPORTS';
                icon = '✅';
                iconBg = '#dcfce7';
                to = '/profile';
                break;
              case UserNotificationType.AccountBan:
                category = 'REPORTS';
                icon = '🚫';
                iconBg = '#fee2e2';
                to = '/profile';
                break;
              case UserNotificationType.NewChatMessage:
                category = 'MESSAGES';
                icon = '💬';
                iconBg = '#dbeafe';
                chatRole = 'User';
                break;
              case UserNotificationType.SystemBroadcast:
              default:
                category = 'REPORTS';
                icon = '📢';
                iconBg = '#ede9fe';
                to = '/reports';
                break;
            }
          }

          notifs.push({
            id: item.id,
            category,
            title: item.title || 'Thông báo hệ thống',
            message: item.message || '',
            time: item.createdAt
              ? new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
              : 'Vừa xong',
            icon,
            iconBg,
            to,
            chatRole,
            unread: !item.isRead,
            rawTime: item.createdAt ? new Date(item.createdAt).getTime() : Date.now(),
            backendId: item.id,
          });
        });
      } catch (e) {
        console.warn('getNotificationsApi warning:', e);
      }

      // Nếu API thông báo trả về rỗng, fallback sang tổng hợp dữ liệu thực tế trực tiếp từ hệ thống
      if (notifs.length === 0) {
        if (isAdmin) {
        // ==============================================================
        // VAI TRÒ ADMIN: Xem toàn bộ request người dùng + log hệ thống
        // ==============================================================
        const [membersRes, userLogsRes, sysLogsRes, reviewsRes, bagsRes, chatRes] = await Promise.allSettled([
          fetchAdminMembersApi({ noCache: true }),
          fetchAdminActivityLogsApi(15),
          fetchSystemLogsApi({ pageSize: 8 }),
          getReviewsApi(),
          getBagsApi(),
          getChatMessagesByRoleApi('Admin'),
        ]);

        // 1. Yêu cầu đăng ký / duyệt thành viên Engineer chờ duyệt
        if (membersRes.status === 'fulfilled' && Array.isArray(membersRes.value)) {
          const pendingMembers = membersRes.value.filter(
            (m) =>
              (m.accountStatus || '').toUpperCase() === 'PENDING' ||
              (m.status || '').toUpperCase() === 'PENDING'
          );
          pendingMembers.slice(0, 5).forEach((m) => {
            notifs.push({
              id: `notif_mbr_${m.id || m.email}`,
              category: 'REQUESTS',
              title: 'Yêu cầu duyệt tài khoản',
              message: `${m.fullName || m.email} đăng ký vai trò ${m.role || 'Kỹ sư'} đang chờ phê duyệt.`,
              time: 'Chờ duyệt',
              icon: '👤',
              iconBg: '#fef3c7',
              to: '/admin/overview?tab=members',
              unread: true,
              rawTime: m.createdAt ? new Date(m.createdAt).getTime() : Date.now(),
            });
          });
        }

        // 2. Yêu cầu & hoạt động của người dùng (User Activity Logs)
        if (userLogsRes.status === 'fulfilled' && Array.isArray(userLogsRes.value)) {
          userLogsRes.value.slice(0, 8).forEach((log) => {
            const userName = log.fullName || log.userName || 'Người dùng';
            notifs.push({
              id: `notif_act_${log.id || Math.random()}`,
              category: 'REQUESTS',
              title: `Yêu cầu: ${userName}`,
              message: log.description || `Đã gửi thao tác ${log.action || ''}.`,
              time: log.createdAt
                ? new Date(log.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                : 'Gần đây',
              icon: '📝',
              iconBg: '#e0f2fe',
              to: '/admin/overview?tab=activity',
              unread: false,
              rawTime: log.createdAt ? new Date(log.createdAt).getTime() : 0,
            });
          });
        }

        // 3. Log hệ thống (System Error/Warning Logs)
        if (sysLogsRes.status === 'fulfilled') {
          const sysData = sysLogsRes.value;
          const sysList = Array.isArray(sysData) ? sysData : sysData?.items || sysData?.Items || [];
          sysList.slice(0, 6).forEach((sys) => {
            const isError =
              (sys.logLevel || '').toUpperCase() === 'ERROR' ||
              (sys.logLevel || '').toUpperCase() === 'FATAL';
            notifs.push({
              id: `notif_sys_${sys.id || Math.random()}`,
              category: 'SYSTEM_LOGS',
              title: `Log hệ thống [${sys.logLevel || 'WARN'}]`,
              message: sys.errorMessage || sys.translatedMessage || sys.exceptionType || 'Cảnh báo từ hệ thống máy chủ.',
              time: sys.createdAt
                ? new Date(sys.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                : 'Hệ thống',
              icon: isError ? '🚨' : '⚠️',
              iconBg: isError ? '#fee2e2' : '#fef3c7',
              to: '/admin/system-logs',
              unread: isError,
              rawTime: sys.createdAt ? new Date(sys.createdAt).getTime() : 0,
            });
          });
        }

        // 4. Kết luận chẩn đoán chờ duyệt
        if (reviewsRes.status === 'fulfilled' && Array.isArray(reviewsRes.value)) {
          const pendingReviews = reviewsRes.value.filter((r) => r.status === 'pending');
          pendingReviews.slice(0, 4).forEach((r) => {
            notifs.push({
              id: `notif_rev_${r.id || r.findingId}`,
              category: 'REQUESTS',
              title: 'Kết luận chẩn đoán chờ duyệt',
              message: `Phát hiện ${r.ruleId || 'sự cố'} trên topic ${r.topic || '/telemetry'} cần phê duyệt.`,
              time: 'Chờ duyệt',
              icon: '⚠️',
              iconBg: '#fef3c7',
              to: `/reviews/${r.findingId || r.id}`,
              unread: true,
              rawTime: r.createdAt ? new Date(r.createdAt).getTime() : 0,
            });
          });
        }

        // 5. Bản ghi Rosbags tải lên
        if (bagsRes.status === 'fulfilled' && Array.isArray(bagsRes.value)) {
          bagsRes.value.slice(0, 3).forEach((bag) => {
            notifs.push({
              id: `notif_bag_${bag.id}`,
              category: 'REQUESTS',
              title: 'Bản ghi Rosbag mới',
              message: `Tệp ${bag.name} (${bag.size || 'đầy đủ'}) đã tải lên thành công.`,
              time: bag.date || 'Hôm nay',
              icon: '📁',
              iconBg: '#e0f2fe',
              to: `/bags/${bag.id}`,
              unread: false,
              rawTime: bag.createdAt ? new Date(bag.createdAt).getTime() : 0,
            });
          });
        }

        // 6. Tin nhắn gửi tới Admin
        if (chatRes.status === 'fulfilled' && Array.isArray(chatRes.value)) {
          const myEmail = (state.profile?.email || localStorage.getItem('email') || '').toLowerCase().trim();
          const msgs = chatRes.value.filter((m) => (m.senderEmail || '').toLowerCase().trim() !== myEmail);
          msgs.slice(-4).reverse().forEach((msg) => {
            notifs.push({
              id: `notif_chat_${msg.id || Math.random()}`,
              category: 'MESSAGES',
              title: `Tin nhắn từ ${msg.sender || 'Người gửi'}`,
              message: msg.content || 'Nội dung tin nhắn...',
              time: msg.time || 'Tin nhắn mới',
              icon: '💬',
              iconBg: '#dbeafe',
              to: null,
              chatRole: 'Admin',
              unread: true,
              rawTime: msg.rawTime || 0,
            });
          });
        }
      } else if (isEngineer) {
        // ==============================================================
        // VAI TRÒ KỸ SƯ (ENGINEERING): Đánh giá, Rosbags & Tin nhắn
        // ==============================================================
        const [reviewsRes, bagsRes, chatRes] = await Promise.allSettled([
          getReviewsApi(),
          getBagsApi(),
          getChatMessagesByRoleApi('Engineering'),
        ]);

        // 1. Kết luận chẩn đoán chờ kỹ sư xác nhận
        if (reviewsRes.status === 'fulfilled' && Array.isArray(reviewsRes.value)) {
          const pendingReviews = reviewsRes.value.filter((r) => r.status === 'pending');
          pendingReviews.slice(0, 6).forEach((item) => {
            notifs.push({
              id: `notif_rev_${item.id || item.findingId}`,
              category: 'TASKS',
              title: 'Cần kỹ sư xác nhận kết luận',
              message: `Phát hiện ${item.ruleId || 'bất thường'} trên topic ${item.topic || '/system'} cần xác minh.`,
              time: 'Cần xử lý',
              icon: '⚠️',
              iconBg: '#fef3c7',
              to: `/reviews/${item.findingId || item.id}`,
              unread: true,
              rawTime: item.createdAt ? new Date(item.createdAt).getTime() : 0,
            });
          });
        }

        // 2. Rosbags cần phân tích kỹ thuật
        if (bagsRes.status === 'fulfilled' && Array.isArray(bagsRes.value)) {
          bagsRes.value.slice(0, 4).forEach((bag) => {
            notifs.push({
              id: `notif_bag_${bag.id}`,
              category: 'TASKS',
              title: 'Rosbag sẵn sàng phân tích',
              message: `Bản ghi ${bag.name} (${bag.size || 'dữ liệu đầy đủ'}) đang chờ phân tích telemetry.`,
              time: bag.date || 'Hôm nay',
              icon: '📁',
              iconBg: '#e0f2fe',
              to: `/bags/${bag.id}`,
              unread: false,
              rawTime: bag.createdAt ? new Date(bag.createdAt).getTime() : 0,
            });
          });
        }

        // 3. Tin nhắn gửi tới Kỹ sư
        if (chatRes.status === 'fulfilled' && Array.isArray(chatRes.value)) {
          const myEmail = (state.profile?.email || localStorage.getItem('email') || '').toLowerCase().trim();
          const msgs = chatRes.value.filter((m) => (m.senderEmail || '').toLowerCase().trim() !== myEmail);
          msgs.slice(-5).reverse().forEach((msg) => {
            notifs.push({
              id: `notif_chat_${msg.id || Math.random()}`,
              category: 'MESSAGES',
              title: `Tin nhắn kỹ thuật: ${msg.sender || 'Đồng nghiệp'}`,
              message: msg.content || 'Nội dung tin nhắn...',
              time: msg.time || 'Tin nhắn mới',
              icon: '💬',
              iconBg: '#dbeafe',
              to: null,
              chatRole: 'Engineering',
              unread: true,
              rawTime: msg.rawTime || 0,
            });
          });
        }
      } else {
        // ==============================================================
        // VAI TRÒ VẬN HÀNH (USER): Báo cáo chẩn đoán, Xe & Tin nhắn
        // ==============================================================
        const [reportsRes, bagsRes, chatRes] = await Promise.allSettled([
          getReportsApi(),
          getBagsApi(),
          getChatMessagesByRoleApi('User'),
        ]);

        // 1. Báo cáo chẩn đoán sự cố hoàn tất
        if (reportsRes.status === 'fulfilled' && Array.isArray(reportsRes.value)) {
          reportsRes.value.slice(0, 5).forEach((rpt) => {
            notifs.push({
              id: `notif_rpt_${rpt.id}`,
              category: 'REPORTS',
              title: 'Báo cáo chẩn đoán hoàn tất',
              message: `Báo cáo #${rpt.id} về sự cố xe đã có kết luận và khuyến nghị xử lý.`,
              time: rpt.createdAt ? new Date(rpt.createdAt).toLocaleDateString('vi-VN') : 'Mới',
              icon: '📋',
              iconBg: '#dcfce7',
              to: `/reports/${rpt.id}`,
              unread: true,
              rawTime: rpt.createdAt ? new Date(rpt.createdAt).getTime() : 0,
            });
          });
        }

        // 2. Trạng thái bản ghi xe / telemetry đã sẵn sàng
        if (bagsRes.status === 'fulfilled' && Array.isArray(bagsRes.value)) {
          bagsRes.value.slice(0, 4).forEach((bag) => {
            notifs.push({
              id: `notif_bag_${bag.id}`,
              category: 'REPORTS',
              title: 'Dữ liệu xe sẵn sàng',
              message: `Bản ghi ${bag.name} đã được đồng bộ với hệ thống chẩn đoán.`,
              time: bag.date || 'Hôm nay',
              icon: '📁',
              iconBg: '#e0f2fe',
              to: `/bags/${bag.id}`,
              unread: false,
              rawTime: bag.createdAt ? new Date(bag.createdAt).getTime() : 0,
            });
          });
        }

        // 3. Tin nhắn phản hồi từ Admin hoặc Kỹ sư
        if (chatRes.status === 'fulfilled' && Array.isArray(chatRes.value)) {
          const myEmail = (state.profile?.email || localStorage.getItem('email') || '').toLowerCase().trim();
          const msgs = chatRes.value.filter((m) => (m.senderEmail || '').toLowerCase().trim() !== myEmail);
          msgs.slice(-5).reverse().forEach((msg) => {
            notifs.push({
              id: `notif_chat_${msg.id || Math.random()}`,
              category: 'MESSAGES',
              title: `Tin nhắn từ ${msg.sender || 'Kỹ sư / Admin'}`,
              message: msg.content || 'Nội dung tin nhắn...',
              time: msg.time || 'Tin nhắn mới',
              icon: '💬',
              iconBg: '#dbeafe',
              to: null,
              chatRole: 'User',
              unread: true,
              rawTime: msg.rawTime || 0,
            });
          });
        }
      }
    }

      // Sắp xếp ưu tiên: unread lên trước, sau đó theo thời gian mới nhất
      notifs.sort((a, b) => {
        if (a.unread !== b.unread) return a.unread ? -1 : 1;
        return (b.rawTime || 0) - (a.rawTime || 0);
      });

      setNotifications(notifs);
    } catch (err) {
      console.warn('Lỗi tải thông báo:', err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isEngineer, isUser, state.profile]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Lắng nghe tin nhắn mới thời gian thực từ SignalR Hub qua custom event
  useEffect(() => {
    const handleNewChatMessage = (e) => {
      const msg = e.detail;
      if (!msg) return;
      setNotifications((prev) => [
        {
          id: `notif_chat_${msg.id || Date.now()}`,
          category: 'MESSAGES',
          title: `Tin nhắn mới từ ${msg.sender || 'Người gửi'}`,
          message: msg.content || 'Nội dung...',
          time: msg.time || 'Vừa xong',
          icon: '💬',
          iconBg: '#dbeafe',
          to: null,
          chatRole: msg.role,
          unread: true,
          rawTime: msg.rawTime || Date.now(),
        },
        ...prev,
      ]);
    };

    window.addEventListener('app_new_chat_message', handleNewChatMessage);
    return () => window.removeEventListener('app_new_chat_message', handleNewChatMessage);
  }, []);

  // Xử lý click vào item thông báo
  const handleItemClick = async (n) => {
    setIsOpen(false);
    // Đánh dấu mục này là đã đọc trên giao diện
    setNotifications((prev) =>
      prev.map((item) => (item.id === n.id ? { ...item, unread: false } : item))
    );

    // Đồng bộ trạng thái đã đọc về Backend nếu có ID
    if (n.backendId && !String(n.backendId).startsWith('notif_')) {
      try {
        await markNotificationReadApi(n.backendId);
      } catch (err) {
        console.warn('Lỗi cập nhật đã đọc:', err);
      }
    }

    if (n.chatRole) {
      // Mở hộp chat tương ứng với Role qua event
      window.dispatchEvent(
        new CustomEvent('app_open_chat_conversation', { detail: { role: n.chatRole } })
      );
    } else if (n.to) {
      navigate(n.to);
    }
  };

  // Đánh dấu tất cả là đã đọc
  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    try {
      await markAllNotificationsReadApi();
    } catch (err) {
      console.warn('Lỗi đánh dấu tất cả đã đọc:', err);
    }
  };

  // Lọc thông báo theo tab đang chọn
  const filteredNotifications = useMemo(() => {
    if (activeTab === 'ALL') return notifications;
    return notifications.filter((n) => n.category === activeTab);
  }, [notifications, activeTab]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  // Cấu hình link Footer theo vai trò
  const footerInfo = useMemo(() => {
    if (isAdmin) {
      return {
        to: '/admin/overview',
        label: 'Xem toàn bộ yêu cầu & hoạt động hệ thống →',
      };
    }
    if (isEngineer) {
      return {
        to: '/reviews',
        label: 'Xem tất cả đánh giá & phát hiện →',
      };
    }
    return {
      to: '/reports',
      label: 'Xem tất cả báo cáo & phiên chẩn đoán →',
    };
  }, [isAdmin, isEngineer]);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Nút Chuông thông báo trên Header */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) loadNotifications();
        }}
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
        title={`Thông báo (${isAdmin ? 'Admin' : isEngineer ? 'Kỹ sư' : 'Vận hành'})`}
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
            width: '380px',
            maxWidth: 'calc(100vw - 32px)',
            maxHeight: '520px',
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
              padding: '14px 16px 10px 16px',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  Thông báo
                </h3>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    background: isAdmin ? '#fef3c7' : isEngineer ? '#e0e7ff' : '#e0f2fe',
                    color: isAdmin ? '#b45309' : isEngineer ? '#4338ca' : '#0369a1',
                    padding: '2px 8px',
                    borderRadius: '8px',
                  }}
                >
                  {isAdmin ? 'Quản trị viên' : isEngineer ? 'Kỹ sư Robotics' : 'Vận hành'}
                </span>
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

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    fontSize: '11px',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                  }}
                >
                  Đã đọc tất cả
                </button>
              )}
            </div>

            {/* Tabs lọc thông báo theo vai trò */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
              {tabs.map((tab) => {
                const isSelected = activeTab === tab.key;
                const tabCount =
                  tab.key === 'ALL'
                    ? notifications.length
                    : notifications.filter((n) => n.category === tab.key).length;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '16px',
                      fontSize: '11px',
                      fontWeight: isSelected ? 700 : 500,
                      background: isSelected ? '#0284c7' : '#f1f5f9',
                      color: isSelected ? '#ffffff' : '#475569',
                      border: 'none',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{tab.label}</span>
                    {tabCount > 0 && (
                      <span
                        style={{
                          fontSize: '9px',
                          background: isSelected ? 'rgba(255,255,255,0.3)' : '#e2e8f0',
                          color: isSelected ? '#ffffff' : '#64748b',
                          padding: '0 4px',
                          borderRadius: '8px',
                          fontWeight: 700,
                        }}
                      >
                        {tabCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Danh sách thông báo */}
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '340px', padding: '6px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '28px', fontSize: '12px', color: '#94a3b8' }}>
                Đang tải thông báo...
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '36px 16px',
                  color: '#94a3b8',
                  fontSize: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ fontSize: '30px' }}>🔔</span>
                <strong style={{ color: '#475569' }}>Không có thông báo mới</strong>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {activeTab === 'ALL'
                    ? 'Hệ thống đang vận hành ổn định.'
                    : 'Không có thông báo nào trong danh mục này.'}
                </span>
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    background: n.unread ? '#f8fafc' : '#ffffff',
                    borderLeft: n.unread ? '3px solid #0284c7' : '3px solid transparent',
                    transition: 'background 0.15s ease',
                    marginBottom: '4px',
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

          {/* Footer liên kết theo vai trò */}
          <div
            style={{
              padding: '10px 16px',
              borderTop: '1px solid #f1f5f9',
              textAlign: 'center',
              background: '#f8fafc',
            }}
          >
            <Link
              to={footerInfo.to}
              onClick={() => setIsOpen(false)}
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#0284c7',
                textDecoration: 'none',
              }}
            >
              {footerInfo.label}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
