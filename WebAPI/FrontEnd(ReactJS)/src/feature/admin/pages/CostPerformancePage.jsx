import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../../stored/appStore';
import { PageHeader, Icon } from '../../../components/common/UIComponents';
import { getAiUsageApi } from '../../../service';
import './CostPerformancePage.css';

export default function CostPerformancePage() {
  const { state } = useApp();
  const [filterSessionId, setFilterSessionId] = useState('all');
  const [aiUsage, setAiUsage] = useState(null);

  useEffect(() => {
    getAiUsageApi()
      .then((data) => {
        if (data) setAiUsage(data);
      })
      .catch(() => {});
  }, []);

  // Deduplicate and sanitize sessions from store to prevent duplicate rows & UI overflow
  const allSessions = useMemo(() => {
    const rawSessions = (state.sessions && state.sessions.length > 0)
      ? state.sessions
      : [
          { id: '024', name: 'AGV-Lab', processingSeconds: 24, duration: 24 },
          { id: '023', name: 'Warehouse', processingSeconds: 19, duration: 19 },
        ];

    const seen = new Set();
    const result = [];

    for (const s of rawSessions) {
      const nameStr = (s.name || s.id || '').trim();
      // Normalize name to deduplicate sessions with varying spaces/underscores
      const normKey = nameStr.toLowerCase().replace(/[\s_-]+/g, '_');
      if (!normKey || seen.has(normKey)) continue;
      seen.add(normKey);

      // Clean display name (strip extension like .db3/.mcap if present)
      const cleanDisplayName = nameStr.replace(/\.[^/.]+$/, '');

      // Processing seconds: use session.processingSeconds, fallback to duration if available
      const procSec = s.processingSeconds || (s.duration && s.duration > 0 ? Math.min(Math.round(s.duration), 60) : 0);

      result.push({
        ...s,
        displayName: cleanDisplayName,
        processingSeconds: procSec,
      });
    }
    return result;
  }, [state.sessions]);

  // Filter sessions based on select toolbar
  const filteredSessions = useMemo(() => {
    if (filterSessionId === 'all') return allSessions;
    return allSessions.filter((s) => s.id === filterSessionId);
  }, [allSessions, filterSessionId]);

  const totalProcessingSeconds = useMemo(() => {
    return filteredSessions.reduce((acc, cur) => acc + (cur.processingSeconds || 0), 0);
  }, [filteredSessions]);

  // Dynamic scale limit for visual bars (at least 30s)
  const maxProcessingSeconds = useMemo(() => {
    const maxVal = Math.max(...allSessions.map((s) => s.processingSeconds || 0), 0);
    return Math.max(maxVal, 30);
  }, [allSessions]);

  // Map AI Usage logs by sessionId if available from backend
  const sessionMetricsMap = useMemo(() => {
    const map = {};
    if (aiUsage?.recentLogs && Array.isArray(aiUsage.recentLogs)) {
      for (const log of aiUsage.recentLogs) {
        if (log.sessionId) {
          map[log.sessionId] = {
            tokens: (log.promptTokens || 0) + (log.completionTokens || 0),
            cost: log.costUsd || 0,
            model: log.modelName,
          };
        }
      }
    }
    return map;
  }, [aiUsage]);

  return (
    <div className="cost-performance-page">
      {/* Page Title matching Figma E24 1 */}
      <PageHeader
        title="Chi phí & hiệu suất"
        subtitle="Theo dõi tài nguyên và thời gian xử lý của các phiên phân tích."
      />

      {/* Top Blue Notice matching Figma E24 1 */}
      <div className="notice blue" style={{ marginBottom: '24px' }}>
        <Icon name="info" />
        <div>
          Thời gian xử lý dưới đây là số liệu mẫu. Chưa kết nối usage hoặc chi phí thực từ nhà cung cấp AI.
        </div>
      </div>

      {/* 3 Stats Grid Cards matching Figma E24 1 `.stats-grid.three` */}
      <div className="stats-grid three" style={{ marginBottom: '24px' }}>
        {/* Stat 1: Phiên phân tích */}
        <section className="card stat cyan">
          <span className="stat-label">Phiên phân tích</span>
          <span className="stat-icon">
            <Icon name="activity" size={16} />
          </span>
          <strong>{filteredSessions.length}</strong>
          <small>Theo bộ lọc đang chọn</small>
          <svg className="spark" viewBox="0 0 64 32" aria-hidden="true">
            <path
              d="M2 18 Q 16 6, 32 16 T 62 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        </section>

        {/* Stat 2: Tổng thời gian mẫu */}
        <section className="card stat blue">
          <span className="stat-label">Tổng thời gian mẫu</span>
          <span className="stat-icon">
            <Icon name="clock" size={16} />
          </span>
          <strong>{totalProcessingSeconds}s</strong>
          <small>Tổng processingSeconds của phiên mẫu</small>
          <svg className="spark" viewBox="0 0 64 32" aria-hidden="true">
            <path
              d="M2 14 Q 18 24, 34 12 T 62 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        </section>

        {/* Stat 3: Chi phí thực tế */}
        <section className="card stat green">
          <span className="stat-label">Chi phí thực tế</span>
          <span className="stat-icon">
            <Icon name="trending-up" size={16} />
          </span>
          <strong>{aiUsage ? `$${Number(aiUsage.totalCostUsd || 0).toFixed(4)}` : '$0.0000'}</strong>
          <small>{aiUsage?.totalTokens ? `${aiUsage.totalTokens.toLocaleString()} tokens đã dùng` : 'Đã kết nối LLM Usage Ledger'}</small>
          <svg className="spark" viewBox="0 0 64 32" aria-hidden="true">
            <path
              d="M2 16 Q 16 16, 32 16 T 62 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        </section>
      </div>

      {/* Main Card: Chi tiết theo phiên matching Figma E24 1 */}
      <section className="card" style={{ marginBottom: '24px' }}>
        <div className="card-heading">
          <div>
            <h2>Chi tiết theo phiên</h2>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="toolbar" style={{ marginBottom: '18px' }}>
          <select
            value={filterSessionId}
            onChange={(e) => setFilterSessionId(e.target.value)}
            aria-label="Lọc phiên chi phí"
            style={{ maxWidth: '280px' }}
          >
            <option value="all">Tất cả phiên ({allSessions.length})</option>
            {allSessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.displayName}
              </option>
            ))}
          </select>
        </div>

        {/* Table matching Figma E24 1 */}
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Hiệu suất phiên phân tích"
          style={{ marginBottom: '24px' }}
        >
          <table>
            <thead>
              <tr>
                <th scope="col" style={{ width: '40%' }}>PHIÊN</th>
                <th scope="col" style={{ width: '25%' }}>THỜI GIAN MẪU</th>
                <th scope="col" style={{ width: '18%' }}>TOKEN</th>
                <th scope="col" style={{ width: '17%' }}>CHI PHÍ</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="table-empty">
                    Không tìm thấy phiên phân tích nào.
                  </td>
                </tr>
              ) : (
                filteredSessions.map((session) => {
                  const val = session.processingSeconds || 0;
                  const percent = maxProcessingSeconds > 0
                    ? Math.min(100, Math.round((val / maxProcessingSeconds) * 100))
                    : 0;
                  const logMetric = sessionMetricsMap[session.id] || sessionMetricsMap[session.bagId];

                  return (
                    <tr key={session.id}>
                      <td>
                        <div className="session-cell-wrapper">
                          <strong className="session-cell-title" title={session.displayName}>
                            {session.displayName}
                          </strong>
                          <div className="session-cell-meta">
                            <span className="session-badge-id">ID: #{session.id}</span>
                            {session.duration ? <span>{Math.round(session.duration)}s log</span> : null}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="time-metric-cell">
                          <span className="time-metric-value">{val} giây</span>
                          <div className="time-metric-bar">
                            <div
                              className="time-metric-fill"
                              style={{ width: `${val === 0 ? 0 : Math.max(percent, 8)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        {logMetric ? (
                          <span className="status-pill blue">
                            {logMetric.tokens.toLocaleString()} tokens
                          </span>
                        ) : (
                          <span className="status-pill muted">Chưa đo</span>
                        )}
                      </td>
                      <td>
                        {logMetric ? (
                          <span className="status-pill green">
                            ${Number(logMetric.cost).toFixed(4)}
                          </span>
                        ) : (
                          <span className="status-pill muted">Chưa đo</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Visual Usage Bars matching Figma E24 1 `.usage-bars` with polished layout */}
        <div className="usage-bars-section">
          <div className="usage-bars-header">
            <div className="usage-bars-title">
              <Icon name="bar-chart-2" size={16} />
              <span>Phân bổ thời gian thực thi theo phiên</span>
            </div>
            <span className="usage-bars-scale">Tối đa: {maxProcessingSeconds}s</span>
          </div>

          <div className="usage-bars">
            {filteredSessions.map((session) => {
              const val = session.processingSeconds || 0;
              const percent = maxProcessingSeconds > 0
                ? Math.min(100, Math.round((val / maxProcessingSeconds) * 100))
                : 0;

              return (
                <div key={session.id} className="usage-bar-row">
                  <div className="usage-bar-label" title={session.displayName}>
                    <span className="usage-bar-dot" />
                    <strong>{session.displayName}</strong>
                  </div>
                  <div
                    className="usage-bar-track"
                    role="progressbar"
                    aria-valuenow={val}
                    aria-valuemin={0}
                    aria-valuemax={maxProcessingSeconds}
                    aria-label={`${session.displayName} ${val} giây`}
                  >
                    <div
                      className={`usage-bar-fill ${val === 0 ? 'is-zero' : ''}`}
                      style={{ width: `${val === 0 ? 0 : Math.max(percent, 4)}%` }}
                    />
                  </div>
                  <div className="usage-bar-value">
                    <span>{val}</span>
                    <small>giây</small>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom Blue Notice matching Figma E24 1 */}
      <div className="notice blue">
        <Icon name="info" />
        <div>
          Chỉ tính thời gian tiết kiệm khi có kết quả đo thủ công làm đối chứng.
        </div>
      </div>
    </div>
  );
}
