import React, { useState } from 'react';
import DashboardPage from '../../../DashboardPage';
import useSystemLogs from '../../hook/useSystemLogs';
import '../../../dashboard.css';

const navItems = [
  { label: 'Overview', path: '/admin-dashboard/overview', active: false },
  { label: 'Members', path: '/admin-dashboard/members', active: false },
  { label: 'Activity', path: '/admin-dashboard/activity', active: false },
  { label: 'System Logs', path: '/admin-dashboard/system-logs', active: true },
  { label: 'User Activity Logs', path: '/admin-dashboard/user-activity', active: false },
  { label: 'Settings', path: '/admin-dashboard/settings', active: false },
];

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

export default function SystemLogsDashboardPage() {
  const {
    logs,
    totalCount,
    pageIndex,
    setPageIndex,
    pageSize,
    search,
    setSearch,
    logLevel,
    setLogLevel,
    loading,
    error,
    refresh,
    triggerTestError,
    triggering,
    triggerSuccess,
  } = useSystemLogs(20);

  const [copiedId, setCopiedId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [selectedTestError, setSelectedTestError] = useState('NullReferenceException');
  const [customTestMessage, setCustomTestMessage] = useState('');

  const handleCopy = (text, id, type = 'type') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    const key = `${id}-${type}`;
    setCopiedId(key);
    setTimeout(() => {
      setCopiedId((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <DashboardPage
      title="System Error Logs"
      subtitle="Giám sát sự cố, ngoại lệ hệ thống và tự động dịch lỗi tiếng Việt"
      sidebarTitle="ADMIN CONSOLE"
      navItems={navItems}
      actions={
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            className="dashboard-ghost-button"
            onClick={refresh}
            disabled={loading}
            title="Tải lại nhật ký mới nhất"
          >
            {loading ? 'Đang tải...' : '🔄 Làm mới'}
          </button>
        </div>
      }
    >
      <div className="system-log-container">
        {/* Test Simulator Panel */}
        <section className="syslog-simulator-card">
          <div className="syslog-sim-header">
            <div className="syslog-sim-title">
              <span className="sim-icon">⚡</span>
              <div>
                <h4>Thử nghiệm tạo lỗi hệ thống (Test Exception Trigger)</h4>
                <p>Kích hoạt ngoại lệ mẫu để kiểm tra cơ chế bắt lỗi tự động, dịch nghĩa tiếng Việt và chức năng sao chép loại lỗi.</p>
              </div>
            </div>
            <div className="syslog-sim-controls">
              <select
                className="syslog-select"
                value={selectedTestError}
                onChange={(e) => setSelectedTestError(e.target.value)}
              >
                {testErrorOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                className="syslog-input"
                placeholder="Ghi chú lỗi tùy chỉnh (tùy chọn)..."
                value={customTestMessage}
                onChange={(e) => setCustomTestMessage(e.target.value)}
                style={{ minWidth: 260 }}
              />
              <button
                type="button"
                className="syslog-trigger-btn"
                onClick={() => triggerTestError(selectedTestError, customTestMessage)}
                disabled={triggering}
              >
                {triggering ? 'Đang kích hoạt...' : '⚠️ Kích hoạt lỗi thử nghiệm'}
              </button>
            </div>
          </div>
          {triggerSuccess && (
            <div className="syslog-alert-banner">
              <span>{triggerSuccess}</span>
            </div>
          )}
        </section>

        {/* Filters and Stats Bar */}
        <div className="syslog-filter-bar">
          <div className="syslog-search-group">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="syslog-search-input"
              placeholder="Tìm theo loại Exception, đường dẫn API hoặc nội dung lỗi..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPageIndex(1);
              }}
            />
          </div>

          <div className="syslog-filter-group">
            <label>Mức độ:</label>
            <select
              className="syslog-select"
              value={logLevel}
              onChange={(e) => {
                setLogLevel(e.target.value);
                setPageIndex(1);
              }}
            >
              <option value="">Tất cả mức độ</option>
              <option value="Critical">Critical (Nghiêm trọng)</option>
              <option value="Error">Error (Lỗi)</option>
              <option value="Warning">Warning (Cảnh báo)</option>
              <option value="Info">Info (Thông tin)</option>
            </select>
          </div>

          <div className="syslog-stats-badge">
            Tổng cộng: <strong>{totalCount}</strong> sự kiện
          </div>
        </div>

        {/* Error / Loading Messages */}
        {error && (
          <div className="syslog-error-banner">
            <span>⚠️ {error}</span>
            <button type="button" onClick={refresh}>Thử lại</button>
          </div>
        )}

        {/* Logs List */}
        <div className="syslog-list">
          {loading && logs.length === 0 ? (
            <div className="syslog-loading">
              <div className="syslog-spinner" />
              <span>Đang kiểm tra và tải nhật ký lỗi hệ thống...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="syslog-empty">
              <span style={{ fontSize: 36 }}>✅</span>
              <h4>Hệ thống hoạt động ổn định</h4>
              <p>Chưa có lỗi nào được ghi nhận phù hợp với điều kiện tìm kiếm hiện tại.</p>
            </div>
          ) : (
            logs.map((log) => {
              const isExpanded = expandedId === log.id;
              const isTypeCopied = copiedId === `${log.id}-type`;
              const isMsgCopied = copiedId === `${log.id}-msg`;

              const statusColor =
                log.statusCode >= 500
                  ? '#ef4444'
                  : log.statusCode >= 400
                  ? '#f59e0b'
                  : '#10b981';

              const levelBadgeClass =
                log.logLevel === 'Critical'
                  ? 'badge-critical'
                  : log.logLevel === 'Warning'
                  ? 'badge-warning'
                  : 'badge-error';

              return (
                <div key={log.id} className="syslog-card">
                  {/* Card Header */}
                  <div className="syslog-card-header">
                    <div className="syslog-meta-left">
                      <span className={`syslog-level-badge ${levelBadgeClass}`}>
                        {log.logLevel}
                      </span>
                      {log.httpMethod && (
                        <span className="syslog-method-badge">{log.httpMethod}</span>
                      )}
                      <span
                        className="syslog-status-badge"
                        style={{ backgroundColor: `${statusColor}18`, color: statusColor, borderColor: statusColor }}
                      >
                        {log.statusCode}
                      </span>
                      <span className="syslog-path" title={log.requestPath || 'System internal'}>
                        {log.requestPath || 'System internal'}
                      </span>
                    </div>

                    <div className="syslog-meta-right">
                      <time className="syslog-time">
                        {new Date(log.createdAt).toLocaleString('vi-VN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </time>
                    </div>
                  </div>

                  {/* Translated Error Explanation (Dịch ra lỗi) */}
                  <div className="syslog-translated-box">
                    <div className="syslog-translated-header">
                      <span className="syslog-section-icon">🌐</span>
                      <strong>Giải thích lỗi (Dịch tiếng Việt):</strong>
                    </div>
                    <p className="syslog-translated-text">
                      {log.translatedMessage || 'Chưa có thông tin giải nghĩa cho loại lỗi này.'}
                    </p>
                  </div>

                  {/* Specific Raw Error & Copy Button (Lỗi cụ thể & Nút Copy) */}
                  <div className="syslog-specific-error-box">
                    <div className="syslog-specific-header">
                      <div className="syslog-specific-label">
                        <span className="syslog-section-icon">⚠️</span>
                        <span>Loại ngoại lệ (Exception Type):</span>
                      </div>
                      <button
                        type="button"
                        className={`syslog-copy-btn ${isTypeCopied ? 'copied' : ''}`}
                        onClick={() => handleCopy(log.ExceptionType || log.exceptionType, log.id, 'type')}
                        title="Sao chép tên loại lỗi này vào clipboard"
                      >
                        {isTypeCopied ? '✓ Đã sao chép!' : '📋 Sao chép loại lỗi'}
                      </button>
                    </div>

                    <div className="syslog-type-code">
                      <code>{log.ExceptionType || log.exceptionType || 'UnknownException'}</code>
                    </div>

                    {/* Raw Error Message */}
                    <div className="syslog-raw-message-wrap">
                      <div className="syslog-raw-header">
                        <small>Thông điệp lỗi gốc (Raw Message):</small>
                        <button
                          type="button"
                          className="syslog-copy-mini-btn"
                          onClick={() => handleCopy(log.ErrorMessage || log.errorMessage, log.id, 'msg')}
                          title="Sao chép thông điệp chi tiết"
                        >
                          {isMsgCopied ? '✓ Đã chép' : 'Sao chép thông điệp'}
                        </button>
                      </div>
                      <div className="syslog-raw-message">
                        {log.ErrorMessage || log.errorMessage}
                      </div>
                    </div>
                  </div>

                  {/* Technical Meta & Expand StackTrace */}
                  <div className="syslog-card-footer">
                    <div className="syslog-context-pills">
                      {log.userId && (
                        <span className="syslog-pill">User ID: {log.userId}</span>
                      )}
                      {log.ipAddress && (
                        <span className="syslog-pill">IP: {log.ipAddress}</span>
                      )}
                    </div>

                    <button
                      type="button"
                      className="syslog-toggle-trace-btn"
                      onClick={() => toggleExpand(log.id)}
                    >
                      {isExpanded ? '▲ Thu gọn chi tiết' : '▼ Xem chi tiết & Stack Trace'}
                    </button>
                  </div>

                  {/* Expanded Stack Trace & Metadata */}
                  {isExpanded && (
                    <div className="syslog-expanded-details">
                      {log.userAgent && (
                        <div className="syslog-detail-row">
                          <strong>User Agent:</strong> <code>{log.userAgent}</code>
                        </div>
                      )}
                      <div className="syslog-trace-header">
                        <strong>Stack Trace kỹ thuật:</strong>
                        <button
                          type="button"
                          className="syslog-copy-mini-btn"
                          onClick={() => handleCopy(log.stackTrace || '', log.id, 'trace')}
                        >
                          Sao chép Stack Trace
                        </button>
                      </div>
                      <pre className="syslog-stacktrace">
                        {log.stackTrace || 'Không có thông tin Stack Trace.'}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="syslog-pagination">
            <button
              type="button"
              className="syslog-page-btn"
              disabled={pageIndex <= 1}
              onClick={() => setPageIndex((p) => Math.max(p - 1, 1))}
            >
              ← Trang trước
            </button>
            <span className="syslog-page-info">
              Trang <strong>{pageIndex}</strong> / <strong>{totalPages}</strong> (Tổng {totalCount} sự kiện)
            </span>
            <button
              type="button"
              className="syslog-page-btn"
              disabled={pageIndex >= totalPages}
              onClick={() => setPageIndex((p) => Math.min(p + 1, totalPages))}
            >
              Trang sau →
            </button>
          </div>
        )}
      </div>
    </DashboardPage>
  );
}
