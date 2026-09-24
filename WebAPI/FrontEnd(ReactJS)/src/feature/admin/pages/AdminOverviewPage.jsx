import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../../stored/appStore';
import { PageHeader, Card } from '../../../components/common/UIComponents';
import {
  fetchAdminActivityLogsApi,
  fetchAdminMembersApi,
  fetchSystemLogsApi,
  triggerTestErrorApi,
} from '../../DashBoard/api/dashboardApi';
import '../../DashBoard/page/dashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:7149';

const testErrorOptions = [
  { label: 'System.ArgumentException (Lỗi đối số không hợp lệ)', value: 'ArgumentException' },
  { label: 'System.NullReferenceException (Lỗi tham chiếu Null)', value: 'NullReferenceException' },
  { label: 'System.UnauthorizedAccessException (Lỗi phân quyền truy cập)', value: 'UnauthorizedAccessException' },
  { label: 'System.Collections.Generic.KeyNotFoundException (Lỗi không tìm thấy bản ghi)', value: 'KeyNotFoundException' },
  { label: 'System.InvalidOperationException (Lỗi thao tác không hợp lệ)', value: 'InvalidOperationException' },
  { label: 'System.FormatException (Lỗi sai định dạng dữ liệu)', value: 'FormatException' },
  { label: 'System.TimeoutException (Lỗi quá thời gian chờ)', value: 'TimeoutException' },
  { label: 'System.NotImplementedException (Lỗi tính năng chưa hoàn thiện)', value: 'NotImplementedException' },
];

function formatRelativeTime(dateString) {
  if (!dateString) return 'Chưa có hoạt động';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Chưa có hoạt động';

  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Vừa xong';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} giờ trước`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} ngày trước`;

  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const roleColors = {
  admin: { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' },
  manager: { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  user: { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' },
};

export default function AdminOverviewPage() {
  const { state, dispatch, notify } = useApp();
  const { tab = 'overview', id: detailId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab = (!tab || tab === 'overview') ? 'members' : tab;

  // Members state
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberStatusFilter, setMemberStatusFilter] = useState('ALL');
  const [bannedUserIds, setBannedUserIds] = useState([]);
  const [editingMember, setEditingMember] = useState(null);

  const handleUpdateRole = (memberId, newRole) => {
    setMembers((prev) =>
      prev.map((m) => ((m.id || m.email) === memberId ? { ...m, role: newRole } : m))
    );
    notify(`Đã cập nhật vai trò thành [${newRole}]`, 'success');
  };

  const handleToggleBan = (memberId) => {
    const isBanned = bannedUserIds.includes(memberId);
    if (isBanned) {
      setBannedUserIds((prev) => prev.filter((id) => id !== memberId));
      notify('Đã mở khóa tài khoản thành công!', 'success');
    } else {
      setBannedUserIds((prev) => [...prev, memberId]);
      notify('Đã khóa tài khoản người dùng này!', 'warning');
    }
  };

  const handleDeleteMember = (memberId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tài khoản này khỏi hệ thống?')) {
      setMembers((prev) => prev.filter((m) => (m.id || m.email) !== memberId));
      notify('Đã xóa tài khoản khỏi hệ thống.', 'info');
    }
  };

  const handleSaveEditMember = () => {
    if (!editingMember) return;
    setMembers((prev) =>
      prev.map((m) =>
        (m.id || m.email) === (editingMember.id || editingMember.email) ? editingMember : m
      )
    );
    setEditingMember(null);
    notify('Đã cập nhật thông tin thành viên thành công!', 'success');
  };

  // System logs state
  const [sysLogs, setSysLogs] = useState([]);
  const [sysTotalCount, setSysTotalCount] = useState(0);
  const [sysPageIndex, setSysPageIndex] = useState(1);
  const [sysPageSize] = useState(15);
  const [sysSearch, setSysSearch] = useState('');
  const [sysLogLevel, setSysLogLevel] = useState('');
  const [sysLoading, setSysLoading] = useState(false);
  const [sysError, setSysError] = useState(null);
  const [selectedTestError, setSelectedTestError] = useState('NullReferenceException');
  const [customTestMessage, setCustomTestMessage] = useState('');
  const [triggering, setTriggering] = useState(false);
  const [triggerSuccess, setTriggerSuccess] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [showTestSim, setShowTestSim] = useState(false);

  // User Activity Logs state
  const [userLogs, setUserLogs] = useState([]);
  const [userLogsLoading, setUserLogsLoading] = useState(false);
  const [userLogsError, setUserLogsError] = useState(null);
  const [selectedUserLog, setSelectedUserLog] = useState(null);

  // General settings state
  const [settingsForm, setSettingsForm] = useState(() => ({
    siteName: 'CTRN SHIFT N / AGV-Lab',
    sessionTimeoutMs: 3600,
    maxDailyAiRequests: state.aiSettings?.dailyRequests || 100,
    enableSystemLogAlerts: true,
  }));

  // Fetch Members Data
  const loadMembers = useCallback(async () => {
    try {
      setMembersLoading(true);
      setMembersError(null);
      const data = await fetchAdminMembersApi();
      setMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      setMembers([]);
      setMembersError(err.message || 'Không thể tải dữ liệu thành viên.');
    } finally {
      setMembersLoading(false);
    }
  }, []);

  // Fetch System Logs Data
  const loadSystemLogs = useCallback(async () => {
    try {
      setSysLoading(true);
      setSysError(null);
      const data = await fetchSystemLogsApi({
        search: sysSearch,
        logLevel: sysLogLevel,
        pageIndex: sysPageIndex,
        pageSize: sysPageSize,
      });
      setSysLogs(data.items || []);
      setSysTotalCount(data.totalCount || 0);
    } catch (err) {
      setSysError(err.message || 'Không thể tải danh sách nhật ký hệ thống.');
    } finally {
      setSysLoading(false);
    }
  }, [sysSearch, sysLogLevel, sysPageIndex, sysPageSize]);

  // Fetch User Activity Logs
  const loadUserLogs = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    try {
      setUserLogsLoading(true);
      setUserLogsError(null);
      const response = await fetch(`${API_URL}/api/user-activity?take=100`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        throw new Error('Không thể tải nhật ký hoạt động người dùng.');
      }
      const data = await response.json();
      setUserLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      setUserLogs([]);
      setUserLogsError(err.message);
    } finally {
      setUserLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
    loadSystemLogs();
    loadUserLogs();
  }, [loadMembers, loadSystemLogs, loadUserLogs]);

  // Handle Triggering Test Error
  const handleTriggerTestError = async () => {
    try {
      setTriggering(true);
      setTriggerSuccess(null);
      await triggerTestErrorApi({ errorType: selectedTestError, message: customTestMessage });
      setTriggerSuccess(`Đã kích hoạt lỗi [${selectedTestError}] thành công! Hệ thống đã tự động bắt và dịch sang tiếng Việt.`);
      setTimeout(() => loadSystemLogs(), 600);
    } catch (err) {
      setTriggerSuccess(`Kích hoạt lỗi thất bại: ${err.message}`);
    } finally {
      setTriggering(false);
    }
  };

  const handleCopy = (text, id, type = 'type') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    const key = `${id}-${type}`;
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered members calculation
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchSearch =
        (m.fullName || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
        (m.email || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
        (m.role || '').toLowerCase().includes(memberSearch.toLowerCase());

      const isBanned = bannedUserIds.includes(m.id || m.email);

      let matchStatus = true;
      if (memberStatusFilter === 'BANNED') {
        matchStatus = isBanned;
      } else if (memberStatusFilter !== 'ALL') {
        matchStatus = !isBanned && (m.status || '').toUpperCase() === memberStatusFilter.toUpperCase();
      }

      return matchSearch && matchStatus;
    });
  }, [members, memberSearch, memberStatusFilter, bannedUserIds]);

  const memberStats = useMemo(() => {
    const total = members.length;
    const online = members.filter((m) => (m.status || '').toLowerCase() === 'online').length;
    const adminCount = members.filter((m) => (m.role || '').toLowerCase() === 'admin').length;
    return { total, online, adminCount };
  }, [members]);

  // AI Config state
  const [aiConfig, setAiConfig] = useState({
    dailyCalls: 100,
    maxTokens: 4000,
    rpm: 10,
    monthlyBudget: 25,
    modelName: 'Chưa kết nối',
    vectorDbUrl: 'http://localhost:8333',
    prompt: 'Phân tích log ROS2 dựa trên bằng chứng. Phân biệt quan sát với giả thuyết. Kỹ sư duyệt mọi kết luận.',
  });

  // Analysis Config state
  const [analysisConfig, setAnalysisConfig] = useState({
    freqDrift: 0.5,
    latencyMs: 500,
    packetLossPct: 5,
    maxMemoryMb: 2048,
    autoDiagnostic: true,
    strictCorrelation: true,
    autoFlagHigh: true,
    emailAlerts: false,
  });

  const totalSysPages = Math.ceil(sysTotalCount / sysPageSize) || 1;

  const headerInfoMap = {
    overview: {
      title: 'Quản trị Hệ thống',
      subtitle: 'Tổng quan các chỉ số, hoạt động và sự cố trong toàn hệ thống.',
    },
    members: {
      title: 'Tài khoản & Phân quyền',
      subtitle: 'Danh sách thành viên thực tế và trạng thái hoạt động từ hệ thống.',
    },
    'ai-config': {
      title: 'Cấu hình AI & hệ thống',
      subtitle: 'Thiết lập giới hạn và ngữ cảnh cho Agent chẩn đoán.',
      actionLabel: '✓ Lưu cấu hình AI',
      onAction: () => notify('Đã lưu cấu hình AI & hệ thống thành công!', 'success'),
    },
    cost: {
      title: 'Chi phí & hiệu suất',
      subtitle: 'Theo dõi tài nguyên tiêu thụ, chi phí API và hiệu năng Agent.',
      actionLabel: 'Xuất báo cáo chi phí',
      onAction: () => notify('Đã tải xuống báo cáo chi phí dạng PDF!', 'info'),
    },
    'system-logs': {
      title: 'Nhật ký hệ thống',
      subtitle: 'Dấu vết thay đổi tài khoản và quyết định chẩn đoán trong phiên demo.',
    },
    'analysis-config': {
      title: 'Cấu hình Phân tích & Quy tắc Chẩn đoán',
      subtitle: 'Tùy chỉnh các ngưỡng cảnh báo, loại tín hiệu và quy tắc phân tích ROS2.',
      actionLabel: '✓ Lưu cấu hình phân tích',
      onAction: () => notify('Đã lưu quy tắc phân tích ROS2 thành công!', 'success'),
    },
    activity: {
      title: 'Hoạt động gần đây',
      subtitle: 'Theo dõi các hành động và nhật ký thao tác gần đây trong hệ thống.',
    },
    'user-activity': {
      title: 'Lịch sử Người dùng',
      subtitle: 'Xem toàn bộ lịch sử hoạt động người dùng và thông tin truy cập.',
    },
    settings: {
      title: 'Cài đặt Hệ thống Quản trị',
      subtitle: 'Cấu hình chung và các tùy chọn phân quyền hệ thống.',
    },
  };

  const currentHeader = headerInfoMap[activeTab] || headerInfoMap.overview;

  return (
    <div className="admin-page-container">
      <PageHeader
        title={currentHeader.title}
        subtitle={currentHeader.subtitle}
      >
        {currentHeader.actionLabel && (
          <button
            type="button"
            className="button primary"
            onClick={currentHeader.onAction}
            style={{ minHeight: 40 }}
          >
            {currentHeader.actionLabel}
          </button>
        )}
      </PageHeader>

      {/* Overview Tab Content */}
      {activeTab === 'overview' && (
        <div>
          <div className="stats-grid">
            <div className="card stat green">
              <span className="stat-label">TỔNG THÀNH VIÊN</span>
              <strong>{memberStats.total || state.users.length}</strong>
              <small>Online: {memberStats.online} · Admin: {memberStats.adminCount}</small>
            </div>
            <div className="card stat blue">
              <span className="stat-label">SỰ CỐ LỖI HỆ THỐNG</span>
              <strong>{sysTotalCount}</strong>
              <small>Tự động bắt & dịch tiếng Việt</small>
            </div>
            <div className="card stat orange">
              <span className="stat-label">LỊCH SỬ HOẠT ĐỘNG</span>
              <strong>{userLogs.length}</strong>
              <small>Ghi nhận nhật ký thao tác</small>
            </div>
            <div className="card stat green">
              <span className="stat-label">CẤU HÌNH AI AGENT</span>
              <strong>{state.aiSettings?.dailyRequests || 100}</strong>
              <small>Requests / ngày</small>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginTop: 24 }}>
            <Card title="Sự cố Lỗi Hệ thống Mới nhất (Realtime Logs)">
              <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="status-pill">Giám sát trực tiếp</span>
                <button type="button" className="text-link" onClick={() => navigate('/admin/system-logs')}>
                  Xem toàn bộ ({sysTotalCount}) →
                </button>
              </div>

              {sysLogs.length === 0 ? (
                <div style={{ color: '#64748b', padding: '20px 0', textAlign: 'center' }}>Chưa ghi nhận lỗi nào.</div>
              ) : (
                <div className="log-list">
                  {sysLogs.slice(0, 4).map((log) => (
                    <div
                      key={log.id}
                      className="log-row"
                      style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                      onClick={() => navigate('/admin/system-logs')}
                    >
                      <div
                        className="log-dot"
                        style={{
                          backgroundColor: log.logLevel === 'Critical' ? '#ef4444' : log.logLevel === 'Warning' ? '#f59e0b' : '#10b981',
                        }}
                      />
                      <div className="log-copy" style={{ flex: 1 }}>
                        <strong style={{ fontSize: '13px' }}>{log.ExceptionType || log.exceptionType || 'Exception'}</strong>
                        <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>
                          {log.translatedMessage || log.errorMessage}
                        </span>
                      </div>
                      <span className="log-status">{log.logLevel}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Danh sách thành viên nổi bật">
              <div style={{ marginBottom: 12, textAlign: 'right' }}>
                <button type="button" className="text-link" onClick={() => navigate('/admin/members')}>
                  Quản lý thành viên →
                </button>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                {members.slice(0, 4).map((m) => (
                  <div key={m.id || m.email} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: '#1c5c43',
                        color: '#d7f36b',
                        display: 'grid',
                        placeItems: 'center',
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      {getInitials(m.fullName)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: 13, display: 'block' }}>{m.fullName}</strong>
                      <small style={{ color: '#64748b' }}>{m.email}</small>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: (m.role || '').toLowerCase() === 'admin' ? '#e0f2fe' : '#f1f5f9',
                        color: (m.role || '').toLowerCase() === 'admin' ? '#0369a1' : '#475569',
                        fontWeight: 700,
                      }}
                    >
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Members Tab Content */}
      {activeTab === 'members' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
            <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #1c5c43' }}>
              <div style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>Tổng thành viên</div>
              <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>{membersLoading ? '...' : memberStats.total}</div>
            </div>
            <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #16a34a' }}>
              <div style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>Hoạt động (Online)</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#16a34a', marginTop: 4 }}>
                {membersLoading ? '...' : memberStats.online}
              </div>
            </div>
            <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #0284c7' }}>
              <div style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>Quản trị viên (Admin)</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#0284c7', marginTop: 4 }}>
                {membersLoading ? '...' : memberStats.adminCount}
              </div>
            </div>
          </div>

          <Card title="Danh sách Thành viên Hệ thống">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <input
                type="text"
                placeholder="Tìm theo tên, email, vai trò..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                style={{ flex: '1 1 260px', padding: '9px 14px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14 }}
              />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Lọc:</span>
                {['ALL', 'ONLINE', 'AWAY', 'OFFLINE', 'BANNED'].map((sk) => (
                  <button
                    key={sk}
                    type="button"
                    onClick={() => setMemberStatusFilter(sk)}
                    style={{
                      background: memberStatusFilter === sk ? '#1c5c43' : '#f1f5f9',
                      color: memberStatusFilter === sk ? '#ffffff' : '#475569',
                      border: 'none',
                      borderRadius: 6,
                      padding: '6px 12px',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {sk === 'ALL' ? 'Tất cả' : sk === 'BANNED' ? 'Đã khóa' : sk}
                  </button>
                ))}
                <button type="button" className="button secondary" onClick={loadMembers} disabled={membersLoading} style={{ minHeight: 34 }}>
                  ↻ Làm mới
                </button>
              </div>
            </div>

            {membersLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>Đang tải danh sách thành viên...</div>
            ) : membersError ? (
              <div style={{ color: '#b91c1c', padding: 16, background: '#fef2f2', borderRadius: 8 }}>{membersError}</div>
            ) : filteredMembers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>Không tìm thấy thành viên phù hợp.</div>
            ) : (
              <div className="table-scroll" tabIndex={0} role="region" aria-label="Danh sách thành viên">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'var(--panel)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: '600', color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase' }}>Thành viên</th>
                      <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: '600', color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase' }}>Vai trò</th>
                      <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: '600', color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase' }}>Trạng thái</th>
                      <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: '600', color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase' }}>Hoạt động gần nhất</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '600', color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((m) => {
                      const isBanned = bannedUserIds.includes(m.id || m.email);
                      const roleKey = (m.role || 'user').toLowerCase();
                      const roleStyle = roleColors[roleKey] || roleColors.user;

                      return (
                        <tr key={m.id || m.email} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div
                                style={{
                                  width: 38,
                                  height: 38,
                                  borderRadius: '50%',
                                  background: isBanned ? '#ef4444' : '#1c5c43',
                                  color: '#ffffff',
                                  display: 'grid',
                                  placeItems: 'center',
                                  fontWeight: 700,
                                  fontSize: 14,
                                  flexShrink: 0,
                                }}
                              >
                                {getInitials(m.fullName)}
                              </div>
                              <div>
                                <strong style={{ fontSize: '13px', color: 'var(--text)', display: 'block' }}>
                                  {m.fullName}
                                </strong>
                                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{m.email}</span>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '12px 14px' }}>
                            <select
                              value={m.role || 'User'}
                              onChange={(e) => handleUpdateRole(m.id || m.email, e.target.value)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                border: `1px solid ${roleStyle.border}`,
                                background: roleStyle.bg,
                                color: roleStyle.color,
                                fontWeight: '700',
                                fontSize: '12px',
                                cursor: 'pointer',
                              }}
                            >
                              <option value="Admin">Admin</option>
                              <option value="Engineering">Engineering</option>
                              <option value="User">User</option>
                            </select>
                          </td>

                          <td style={{ padding: '12px 14px' }}>
                            {isBanned ? (
                              <span className="badge red" style={{ fontSize: '11px' }}>
                                <i /> Đã khóa
                              </span>
                            ) : (
                              <span className={`badge ${ (m.status || '').toLowerCase() === 'online' ? 'green' : 'muted'}`} style={{ fontSize: '11px' }}>
                                <i /> {m.status || 'Offline'}
                              </span>
                            )}
                          </td>

                          <td style={{ padding: '12px 14px', color: 'var(--muted)', fontSize: '12px' }}>
                            {formatRelativeTime(m.lastActiveAt)}
                          </td>

                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                              <button
                                type="button"
                                className="button ghost"
                                onClick={() => setEditingMember(m)}
                                style={{ padding: '5px 10px', fontSize: '11px', minHeight: '32px' }}
                              >
                                ✏️ Sửa
                              </button>
                              
                              <button
                                type="button"
                                className={`button ${isBanned ? 'secondary' : 'danger'}`}
                                onClick={() => handleToggleBan(m.id || m.email)}
                                style={{ padding: '5px 10px', fontSize: '11px', minHeight: '32px' }}
                              >
                                {isBanned ? '✅ Mở khóa' : '🚫 Khóa'}
                              </button>

                              <button
                                type="button"
                                className="button ghost"
                                onClick={() => handleDeleteMember(m.id || m.email)}
                                style={{ padding: '5px 10px', fontSize: '11px', minHeight: '32px', color: 'var(--red)' }}
                              >
                                🗑️ Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Edit Member Modal */}
          {editingMember && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '20px',
              }}
            >
              <div style={{ background: '#ffffff', width: '100%', maxWidth: '480px', borderRadius: '12px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>Chỉnh sửa thông tin thành viên</h3>
                  <button type="button" onClick={() => setEditingMember(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}>
                    ✕
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveEditMember();
                  }}
                  style={{ display: 'grid', gap: '14px' }}
                >
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#334155' }}>Họ & Tên</label>
                    <input
                      type="text"
                      value={editingMember.fullName || ''}
                      onChange={(e) => setEditingMember({ ...editingMember, fullName: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#334155' }}>Email</label>
                    <input
                      type="email"
                      value={editingMember.email || ''}
                      onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#334155' }}>Phân quyền vai trò</label>
                    <select
                      value={editingMember.role || 'User'}
                      onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    >
                      <option value="Admin">Admin (Quản trị viên)</option>
                      <option value="Engineering">Engineering (Kỹ sư Robotics)</option>
                      <option value="User">User (Người dùng)</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                    <button type="button" className="button secondary" onClick={() => setEditingMember(null)} style={{ minHeight: '38px' }}>
                      Hủy
                    </button>
                    <button type="submit" className="button primary" style={{ minHeight: '38px' }}>
                      ✓ Lưu thay đổi
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Activity Tab Content */}
      {activeTab === 'activity' && (
        <Card title="Hoạt động gần đây trong hệ thống">
          <div style={{ display: 'grid', gap: 14 }}>
            {userLogs.slice(0, 15).map((item) => (
              <div
                key={item.id ?? item.Id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '12px 14px',
                  background: '#f8fafc',
                  borderRadius: 8,
                  border: '1px solid #f1f5f9',
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1c5c43' }} />
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: 13, color: '#0f172a', display: 'block' }}>{item.action || 'Thao tác hệ thống'}</strong>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    {item.userName || item.email || 'Người dùng'} · {item.requestPath || 'System'} {item.httpMethod ? `[${item.httpMethod}]` : ''}
                  </span>
                </div>
                <time style={{ fontSize: 12, color: '#94a3b8' }}>
                  {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : 'N/A'}
                </time>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* System Logs Tab Content */}
      {activeTab === 'system-logs' && (
        <div style={{ display: 'grid', gap: 20 }}>
          {/* Collapsible Test Exception Simulator */}
          <Card>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setShowTestSim(!showTestSim)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 20, background: '#e6f4ea', color: '#1c5c43', padding: '6px 10px', borderRadius: 8 }}>⚡</span>
                <div>
                  <strong style={{ fontSize: 14, color: '#0f172a', display: 'block' }}>Thử nghiệm tạo lỗi hệ thống (Test Exception Trigger)</strong>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Kích hoạt ngoại lệ mẫu để kiểm tra cơ chế bắt lỗi tự động và dịch nghĩa tiếng Việt.</span>
                </div>
              </div>
              <button type="button" className="button ghost" style={{ fontSize: 12, padding: '4px 10px' }}>
                {showTestSim ? '▲ Thu gọn' : '⚡ Mở công cụ thử nghiệm'}
              </button>
            </div>

            {showTestSim && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <select
                  value={selectedTestError}
                  onChange={(e) => setSelectedTestError(e.target.value)}
                  style={{ padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, minWidth: 260 }}
                >
                  {testErrorOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Ghi chú lỗi tùy chỉnh..."
                  value={customTestMessage}
                  onChange={(e) => setCustomTestMessage(e.target.value)}
                  style={{ padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, flex: 1, minWidth: 200 }}
                />
                <button
                  type="button"
                  className="button primary"
                  onClick={handleTriggerTestError}
                  disabled={triggering}
                  style={{ minHeight: 38 }}
                >
                  {triggering ? 'Đang kích hoạt...' : '⚠️ Kích hoạt lỗi thử nghiệm'}
                </button>
                {triggerSuccess && (
                  <div style={{ width: '100%', marginTop: 8, padding: '8px 12px', background: '#dcfce7', color: '#15803d', borderRadius: 6, fontSize: 12.5 }}>
                    {triggerSuccess}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Main Card Container */}
          <Card>
            {/* Search & Filter Header Bar matching screenshot pill design */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ flex: 1, position: 'relative', minWidth: 280 }}>
                <input
                  type="text"
                  placeholder="Người thực hiện, tài khoản hoặc mã kết luận..."
                  value={sysSearch}
                  onChange={(e) => {
                    setSysSearch(e.target.value);
                    setSysPageIndex(1);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 16px 10px 38px',
                    borderRadius: 30,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    outline: 'none',
                    background: '#ffffff',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)',
                  }}
                />
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 14 }}>
                  🔍
                </span>
              </div>

              <select
                value={sysLogLevel}
                onChange={(e) => {
                  setSysLogLevel(e.target.value);
                  setSysPageIndex(1);
                }}
                style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
              >
                <option value="">Tất cả mức độ</option>
                <option value="Critical">Critical (Nghiêm trọng)</option>
                <option value="Error">Error (Lỗi)</option>
                <option value="Warning">Warning (Cảnh báo)</option>
                <option value="Info">Info (Thông tin)</option>
              </select>

              <button
                type="button"
                className="button secondary"
                onClick={() => setExpandedId(expandedId === 'ALL' ? null : 'ALL')}
                style={{ minHeight: 36, fontSize: 12, padding: '4px 12px' }}
              >
                {expandedId === 'ALL' ? '📁 Thu gọn tất cả' : '📂 Mở rộng tất cả'}
              </button>

              <span style={{ fontSize: 13, color: '#64748b' }}>
                Tổng cộng: <strong>{sysTotalCount}</strong> sự kiện
              </span>
            </div>

            {/* Error Message if any */}
            {sysError && <div style={{ color: '#b91c1c', padding: 12, background: '#fef2f2', borderRadius: 6, marginBottom: 16 }}>{sysError}</div>}

            {/* Full-width Table matching user screenshot */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '12px 14px', width: '180px' }}>THỜI ĐIỂM</th>
                    <th style={{ padding: '12px 14px', width: '220px' }}>NGƯỜI THỰC HIỆN</th>
                    <th style={{ padding: '12px 14px' }}>ĐỐI TƯỢNG</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right', width: '160px' }}>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {sysLoading && sysLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                        Đang tải nhật ký lỗi...
                      </td>
                    </tr>
                  ) : sysLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                        ✅ Chưa ghi nhận lỗi nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    sysLogs.map((log) => {
                      const isExpanded = expandedId === 'ALL' || expandedId === log.id;
                      const isTypeCopied = copiedId === `${log.id}-type`;
                      const isMsgCopied = copiedId === `${log.id}-msg`;
                      const isTraceCopied = copiedId === `${log.id}-trace`;

                      return (
                        <React.Fragment key={log.id}>
                          <tr style={{ borderBottom: '1px solid #f1f5f9', background: isExpanded ? '#f8fafc' : 'transparent', transition: 'background 0.15s ease' }}>
                            {/* Column 1: THỜI ĐIỂM */}
                            <td style={{ padding: '14px', color: '#475569', fontWeight: 500, whiteSpace: 'nowrap' }}>
                              {new Date(log.createdAt).toLocaleString('vi-VN')}
                            </td>

                            {/* Column 2: NGƯỜI THỰC HIỆN */}
                            <td style={{ padding: '14px' }}>
                              <div style={{ fontWeight: 600, color: '#1e293b' }}>{log.userId || 'Hệ thống (System)'}</div>
                              <div style={{ fontSize: 11, color: '#94a3b8' }}>IP: {log.ipAddress || '::1'}</div>
                            </td>

                            {/* Column 3: ĐỐI TƯỢNG */}
                            <td style={{ padding: '14px' }}>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                                <span
                                  style={{
                                    background: log.logLevel === 'Critical' ? '#fee2e2' : log.logLevel === 'Warning' ? '#fef3c7' : '#ffedd5',
                                    color: log.logLevel === 'Critical' ? '#991b1b' : log.logLevel === 'Warning' ? '#92400e' : '#c2410c',
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                  }}
                                >
                                  {log.logLevel || 'Error'}
                                </span>
                                {log.httpMethod && (
                                  <span style={{ background: '#f1f5f9', color: '#334155', padding: '2px 6px', borderRadius: 4, fontSize: 10.5, fontWeight: 700 }}>
                                    {log.httpMethod}
                                  </span>
                                )}
                                <code style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>
                                  {log.requestPath || 'System Internal'}
                                </code>
                                <code style={{ fontSize: 11, color: '#b91c1c', background: '#fee2e2', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                                  {log.ExceptionType || log.exceptionType || 'Exception'}
                                </code>
                              </div>
                              <div style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '480px' }}>
                                💡 {log.translatedMessage || log.ErrorMessage || log.errorMessage || 'Không có chi tiết'}
                              </div>
                            </td>

                            {/* Column 4: THAO TÁC */}
                            <td style={{ padding: '14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <button
                                type="button"
                                onClick={() => setExpandedId(isExpanded ? null : log.id)}
                                style={{
                                  background: isExpanded ? '#e0f2fe' : '#ffffff',
                                  color: isExpanded ? '#0369a1' : '#475569',
                                  border: '1px solid',
                                  borderColor: isExpanded ? '#7dd3fc' : '#cbd5e1',
                                  borderRadius: 6,
                                  padding: '4px 10px',
                                  fontSize: 11.5,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                {isExpanded ? '▲ Thu gọn' : '🔍 Chi tiết'}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Detail Sub-row */}
                          {isExpanded && (
                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                              <td colSpan={4} style={{ padding: '16px 20px' }}>
                                <div style={{ display: 'grid', gap: 12 }}>
                                  {/* Translated Error */}
                                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderLeft: '4px solid #16a34a', padding: '12px 14px', borderRadius: 8 }}>
                                    <strong style={{ color: '#15803d', fontSize: 13 }}>🌐 Giải thích lỗi (Dịch tiếng Việt):</strong>
                                    <p style={{ margin: '4px 0 0', color: '#166534', fontSize: 13, lineHeight: 1.5 }}>
                                      {log.translatedMessage || 'Chưa có thông tin giải nghĩa cho loại lỗi này.'}
                                    </p>
                                  </div>

                                  {/* Exception & Raw Message */}
                                  <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: 14, borderRadius: 8, display: 'grid', gap: 10 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                                        Loại ngoại lệ (Exception Type):
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleCopy(log.ExceptionType || log.exceptionType, log.id, 'type')}
                                        style={{
                                          background: isTypeCopied ? '#16a34a' : '#0f172a',
                                          color: '#ffffff',
                                          border: 'none',
                                          borderRadius: 4,
                                          padding: '3px 10px',
                                          fontSize: 11,
                                          fontWeight: 600,
                                          cursor: 'pointer',
                                        }}
                                      >
                                        {isTypeCopied ? '✓ Đã sao chép!' : '📋 Sao chép loại lỗi'}
                                      </button>
                                    </div>
                                    <code style={{ fontSize: 13, color: '#b91c1c', fontWeight: 700, wordBreak: 'break-all' }}>
                                      {log.ExceptionType || log.exceptionType || 'UnknownException'}
                                    </code>

                                    <div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                        <small style={{ color: '#64748b', fontWeight: 600 }}>Thông điệp gốc (Raw Message):</small>
                                        <button
                                          type="button"
                                          onClick={() => handleCopy(log.ErrorMessage || log.errorMessage, log.id, 'msg')}
                                          style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                                        >
                                          {isMsgCopied ? '✓ Đã chép' : 'Sao chép thông điệp'}
                                        </button>
                                      </div>
                                      <div style={{ fontSize: 12.5, color: '#334155', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 12px', borderRadius: 6, fontFamily: 'monospace', maxHeight: 90, overflowY: 'auto' }}>
                                        {log.ErrorMessage || log.errorMessage}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Stack Trace */}
                                  <div style={{ background: '#0f172a', borderRadius: 8, padding: 14, color: '#f8fafc' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                      <strong style={{ fontSize: 12, color: '#cbd5e1' }}>💻 Stack Trace kỹ thuật:</strong>
                                      <button
                                        type="button"
                                        onClick={() => handleCopy(log.stackTrace || '', log.id, 'trace')}
                                        style={{ background: '#1e293b', border: '1px solid #475569', color: isTraceCopied ? '#4ade80' : '#94a3b8', borderRadius: 4, padding: '2px 8px', fontSize: 11, cursor: 'pointer' }}
                                      >
                                        {isTraceCopied ? '✓ Đã chép Stack Trace!' : 'Sao chép Stack Trace'}
                                      </button>
                                    </div>
                                    <pre
                                      style={{
                                        margin: 0,
                                        fontFamily: 'Consolas, Monaco, monospace',
                                        fontSize: 11.5,
                                        lineHeight: 1.5,
                                        color: '#f87171',
                                        background: '#090d16',
                                        borderRadius: 6,
                                        padding: 12,
                                        maxHeight: 220,
                                        overflowY: 'auto',
                                        overflowX: 'auto',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-all',
                                        border: '1px solid #1e293b',
                                      }}
                                    >
                                      {log.stackTrace || 'Không có thông tin Stack Trace.'}
                                    </pre>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalSysPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, alignItems: 'center', marginTop: 24, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  className="button secondary"
                  disabled={sysPageIndex <= 1}
                  onClick={() => setSysPageIndex((p) => Math.max(p - 1, 1))}
                  style={{ minHeight: 34, fontSize: 12 }}
                >
                  ← Trang trước
                </button>
                <span style={{ fontSize: 13, color: '#475569' }}>
                  Trang <strong>{sysPageIndex}</strong> / {totalSysPages}
                </span>
                <button
                  type="button"
                  className="button secondary"
                  disabled={sysPageIndex >= totalSysPages}
                  onClick={() => setSysPageIndex((p) => Math.min(p + 1, totalSysPages))}
                  style={{ minHeight: 34, fontSize: 12 }}
                >
                  Trang sau →
                </button>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* User Activity Logs Tab Content */}
      {activeTab === 'user-activity' && (
        <Card title="Nhật ký Hoạt động Người dùng (User Activity Logs)">
          {userLogsLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>Đang tải nhật ký...</div>
          ) : userLogsError ? (
            <div style={{ color: '#b91c1c', padding: 12, background: '#fef2f2', borderRadius: 6 }}>{userLogsError}</div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {userLogs.map((item) => (
                <div
                  key={item.id ?? item.Id}
                  onClick={() => setSelectedUserLog(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 13, color: '#0f172a', display: 'block' }}>{item.action || 'User activity'}</strong>
                    <span style={{ fontSize: 12, color: '#64748b' }}>
                      {item.userName || item.email || item.userId} · {item.requestPath} {item.httpMethod ? `[${item.httpMethod}]` : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <time style={{ fontSize: 12, color: '#94a3b8' }}>
                      {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : 'N/A'}
                    </time>
                    <span style={{ color: '#0284c7', fontSize: 12 }}>Chi tiết →</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Log Detail Modal */}
          {selectedUserLog && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: 20,
              }}
            >
              <div style={{ background: '#ffffff', width: '100%', maxWidth: 640, borderRadius: 12, padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 18 }}>Chi tiết Lịch sử Hoạt động</h3>
                  <button type="button" onClick={() => setSelectedUserLog(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>
                    ✕
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px 16px', fontSize: 13 }}>
                  <div style={{ color: '#64748b', fontWeight: 600 }}>Action:</div>
                  <div><strong>{selectedUserLog.action}</strong></div>
                  <div style={{ color: '#64748b', fontWeight: 600 }}>User Name:</div>
                  <div>{selectedUserLog.userName || '—'}</div>
                  <div style={{ color: '#64748b', fontWeight: 600 }}>Email:</div>
                  <div>{selectedUserLog.email || '—'}</div>
                  <div style={{ color: '#64748b', fontWeight: 600 }}>User ID:</div>
                  <div><code>{selectedUserLog.userId || '—'}</code></div>
                  <div style={{ color: '#64748b', fontWeight: 600 }}>Request Path:</div>
                  <div><code>{selectedUserLog.requestPath || '—'}</code></div>
                  <div style={{ color: '#64748b', fontWeight: 600 }}>HTTP Method:</div>
                  <div>{selectedUserLog.httpMethod || '—'}</div>
                  <div style={{ color: '#64748b', fontWeight: 600 }}>IP Address:</div>
                  <div>{selectedUserLog.ipAddress || '—'}</div>
                  <div style={{ color: '#64748b', fontWeight: 600 }}>Created At:</div>
                  <div>{selectedUserLog.createdAt ? new Date(selectedUserLog.createdAt).toLocaleString('vi-VN') : 'N/A'}</div>
                </div>
                <div style={{ marginTop: 20, textAlign: 'right' }}>
                  <button type="button" className="button primary" onClick={() => setSelectedUserLog(null)}>
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* AI Config Tab Content */}
      {activeTab === 'ai-config' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          <Card title="Ngân sách & hạn mức">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: 'var(--text)' }}>
                  Số lượt gọi mỗi ngày
                </label>
                <input
                  type="number"
                  value={aiConfig.dailyCalls}
                  onChange={(e) => setAiConfig({ ...aiConfig, dailyCalls: Number(e.target.value) })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: 'var(--text)' }}>
                  Token tối đa mỗi lần
                </label>
                <input
                  type="number"
                  value={aiConfig.maxTokens}
                  onChange={(e) => setAiConfig({ ...aiConfig, maxTokens: Number(e.target.value) })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: 'var(--text)' }}>
                  Lượt gọi mỗi phút
                </label>
                <input
                  type="number"
                  value={aiConfig.rpm}
                  onChange={(e) => setAiConfig({ ...aiConfig, rpm: Number(e.target.value) })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: 'var(--text)' }}>
                  Ngân sách tháng (USD)
                </label>
                <input
                  type="number"
                  value={aiConfig.monthlyBudget}
                  onChange={(e) => setAiConfig({ ...aiConfig, monthlyBudget: Number(e.target.value) })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
                />
              </div>
            </div>

            <div style={{ marginTop: '20px', padding: '12px 14px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--cyan)', marginTop: '1px', flexShrink: 0, fontWeight: 'bold' }}>(i)</span>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6 }}>
                Các giá trị được lưu cho bản demo. Hạn mức thực tế cần được API xác thực và thực thi.
              </p>
            </div>
          </Card>

          <Card title="Kết nối & prompt" action={<Badge tone="muted">• Chưa kết nối dịch vụ AI</Badge>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: 'var(--text)' }}>
                  Mô hình dự kiến
                </label>
                <input
                  type="text"
                  value={aiConfig.modelName}
                  onChange={(e) => setAiConfig({ ...aiConfig, modelName: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: 'var(--text)' }}>
                  Địa chỉ Vector DB
                </label>
                <input
                  type="text"
                  value={aiConfig.vectorDbUrl}
                  onChange={(e) => setAiConfig({ ...aiConfig, vectorDbUrl: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: 'var(--text)' }}>
                  Prompt chẩn đoán
                </label>
                <textarea
                  rows={4}
                  value={aiConfig.prompt}
                  onChange={(e) => setAiConfig({ ...aiConfig, prompt: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px', lineHeight: 1.6, resize: 'vertical' }}
                />
              </div>

              <small style={{ color: 'var(--muted)', fontSize: '11px' }}>
                Cấu hình kết nối được lưu làm bản nháp; giao diện không gửi yêu cầu đến địa chỉ này.
              </small>
            </div>
          </Card>
        </div>
      )}

      {/* Cost & Performance Tab Content */}
      {activeTab === 'cost' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="stats-grid">
            <div className="card stat blue">
              <span className="stat-label">TỔNG CHI PHÍ THÁNG NÀY</span>
              <strong>$25.40</strong>
              <small>Hạn mức ngân sách: $50.00 / tháng</small>
            </div>
            <div className="card stat green">
              <span className="stat-label">TOKENS ĐÃ TIÊU THỤ</span>
              <strong>1,245.8K</strong>
              <small>GPT-4o & Text Embedding 3</small>
            </div>
            <div className="card stat orange">
              <span className="stat-label">ĐỘ TRỄ TRUNG BÌNH</span>
              <strong>1.42s</strong>
              <small>Thời gian phản hồi Agent</small>
            </div>
            <div className="card stat green">
              <span className="stat-label">ĐỘ CHÍNH XÁC AGENT</span>
              <strong>98.4%</strong>
              <small>Được Kỹ sư xác nhận</small>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            <Card title="Phân bổ chi phí API theo Mô hình">
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text)', fontWeight: 500 }}>GPT-4o (Reasoning & Diagnostics)</span>
                    <strong>$18.20 (71.6%)</strong>
                  </div>
                  <div style={{ height: '8px', background: 'var(--panel)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <div style={{ width: '71.6%', height: '100%', background: 'var(--cyan)' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text)', fontWeight: 500 }}>Text Embedding 3 (Vector Retrieval)</span>
                    <strong>$4.80 (18.9%)</strong>
                  </div>
                  <div style={{ height: '8px', background: 'var(--panel)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <div style={{ width: '18.9%', height: '100%', background: 'var(--green)' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text)', fontWeight: 500 }}>Dịch vụ OCR & Parse Log</span>
                    <strong>$2.40 (9.5%)</strong>
                  </div>
                  <div style={{ height: '8px', background: 'var(--panel)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <div style={{ width: '9.5%', height: '100%', background: 'var(--orange)' }} />
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Nhật ký sử dụng tài nguyên AI">
              <div className="table-scroll" tabIndex={0} role="region" aria-label="Nhật ký sử dụng tài nguyên">
                <table>
                  <thead>
                    <tr>
                      <th>Phiên làm việc</th>
                      <th>Model</th>
                      <th>Tokens</th>
                      <th>Chi phí</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>AGV-Lab / ROSBag #142</strong></td>
                      <td>GPT-4o</td>
                      <td>42.5K tokens</td>
                      <td>$0.42</td>
                    </tr>
                    <tr>
                      <td><strong>Warehouse / Route #03</strong></td>
                      <td>GPT-4o</td>
                      <td>28.1K tokens</td>
                      <td>$0.28</td>
                    </tr>
                    <tr>
                      <td><strong>Sensor Test / ROS2 db3</strong></td>
                      <td>Embedding-3</td>
                      <td>12.4K tokens</td>
                      <td>$0.05</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Analysis Config Tab Content */}
      {activeTab === 'analysis-config' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          <Card title="Ngưỡng chẩn đoán ROS2">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: 'var(--text)' }}>
                  Độ lệch tần số (Hz)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={analysisConfig.freqDrift}
                  onChange={(e) => setAnalysisConfig({ ...analysisConfig, freqDrift: Number(e.target.value) })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
                />
                <small style={{ color: 'var(--muted)', fontSize: '10px', marginTop: '4px', display: 'block' }}>Ngưỡng cảnh báo trôi tần số Topic</small>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: 'var(--text)' }}>
                  Độ trễ tối đa (ms)
                </label>
                <input
                  type="number"
                  value={analysisConfig.latencyMs}
                  onChange={(e) => setAnalysisConfig({ ...analysisConfig, latencyMs: Number(e.target.value) })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
                />
                <small style={{ color: 'var(--muted)', fontSize: '10px', marginTop: '4px', display: 'block' }}>Thời gian trễ chấp nhận được</small>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: 'var(--text)' }}>
                  Mất gói tin (%)
                </label>
                <input
                  type="number"
                  value={analysisConfig.packetLossPct}
                  onChange={(e) => setAnalysisConfig({ ...analysisConfig, packetLossPct: Number(e.target.value) })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
                />
                <small style={{ color: 'var(--muted)', fontSize: '10px', marginTop: '4px', display: 'block' }}>Tỷ lệ rớt gói tin mạng ROS2</small>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: 'var(--text)' }}>
                  Giới hạn bộ nhớ (MB)
                </label>
                <input
                  type="number"
                  value={analysisConfig.maxMemoryMb}
                  onChange={(e) => setAnalysisConfig({ ...analysisConfig, maxMemoryMb: Number(e.target.value) })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
                />
                <small style={{ color: 'var(--muted)', fontSize: '10px', marginTop: '4px', display: 'block' }}>Hạn mức RAM khả dụng khi đọc bag</small>
              </div>
            </div>
          </Card>

          <Card title="Quy tắc phân tích Agent">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--panel)', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'pointer' }}>
                <div>
                  <strong style={{ fontSize: '13px', display: 'block', color: 'var(--text)' }}>Tự động chẩn đoán khi nạp ROSBag</strong>
                  <small style={{ color: 'var(--muted)', fontSize: '11px' }}>Kích hoạt Agent chẩn đoán ngay sau khi upload thành công</small>
                </div>
                <input
                  type="checkbox"
                  checked={analysisConfig.autoDiagnostic}
                  onChange={(e) => setAnalysisConfig({ ...analysisConfig, autoDiagnostic: e.target.checked })}
                />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--panel)', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'pointer' }}>
                <div>
                  <strong style={{ fontSize: '13px', display: 'block', color: 'var(--text)' }}>Đối chiếu bằng chứng nghiêm ngặt</strong>
                  <small style={{ color: 'var(--muted)', fontSize: '11px' }}>Yêu cầu tối thiểu 2 nguồn dữ liệu trước khi kết luận lỗi</small>
                </div>
                <input
                  type="checkbox"
                  checked={analysisConfig.strictCorrelation}
                  onChange={(e) => setAnalysisConfig({ ...analysisConfig, strictCorrelation: e.target.checked })}
                />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--panel)', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'pointer' }}>
                <div>
                  <strong style={{ fontSize: '13px', display: 'block', color: 'var(--text)' }}>Tự động đánh dấu sự cố mức độ cao</strong>
                  <small style={{ color: 'var(--muted)', fontSize: '11px' }}>Gắn nhãn High Severity cho sự cố liên quan đến an toàn robot</small>
                </div>
                <input
                  type="checkbox"
                  checked={analysisConfig.autoFlagHigh}
                  onChange={(e) => setAnalysisConfig({ ...analysisConfig, autoFlagHigh: e.target.checked })}
                />
              </label>
            </div>
          </Card>
        </div>
      )}

      {/* Settings Tab Content */}
      {activeTab === 'settings' && (
        <Card title="Cài đặt Hệ thống Quản trị">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              dispatch({ type: 'SETTINGS', settings: settingsForm });
              notify('Đã lưu cấu hình hệ thống quản trị thành công.', 'success');
            }}
            style={{ display: 'grid', gap: 16, maxWidth: 640 }}
          >
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>Tên Không gian Làm việc</label>
              <input
                type="text"
                value={settingsForm.siteName}
                onChange={(e) => setSettingsForm({ ...settingsForm, siteName: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>Giới hạn AI Requests / ngày</label>
              <input
                type="number"
                value={settingsForm.maxDailyAiRequests}
                onChange={(e) => setSettingsForm({ ...settingsForm, maxDailyAiRequests: Number(e.target.value) })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </div>

            <div>
              <button type="submit" className="button primary" style={{ minHeight: 40, marginTop: 10 }}>
                ✓ Lưu thiết lập quản trị
              </button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
