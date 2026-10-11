import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../../stored/appStore';
import { PageHeader, Icon } from '../../../components/common/UIComponents';
import { getAiUsageApi, getBagsApi } from '../../../service';
import './CostPerformancePage.css';

// Missing ledger entries remain unknown instead of generating usage numbers.
function getSessionMetric(session, sessionMetricsMap) {
  const direct = sessionMetricsMap[session.id] || sessionMetricsMap[session.bagId];
  if (direct) return direct;

  return {
    tokens: null,
    cost: null,
    model: null,
    latencyMs: null,
  };
}

export default function CostPerformancePage() {
  const { state, dispatch } = useApp();
  const [filterSessionId, setFilterSessionId] = useState('all');
  const [aiUsage, setAiUsage] = useState(null);

  useEffect(() => {
    getAiUsageApi()
      .then((data) => {
        if (data) setAiUsage(data);
      })
      .catch(() => {});

    // Ensure bags and session telemetry are loaded if directly accessing this page
    if (!state.bags || state.bags.length === 0) {
      getBagsApi()
        .then((bags) => {
          if (Array.isArray(bags)) {
            dispatch({ type: 'SET_BAGS', bags });
          }
        })
        .catch(() => {});
    }
  }, [dispatch]);

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
            latencyMs: log.latencyMs,
          };
        }
      }
    }
    return map;
  }, [aiUsage]);

  // Deduplicate and sanitize sessions from store to prevent duplicate rows & UI overflow
  const allSessions = useMemo(() => {
    const rawSessions = state.sessions || [];

    const seen = new Set();
    const result = [];

    for (const s of rawSessions) {
      const nameStr = (s.name || s.id || '').trim();
      const normKey = nameStr.toLowerCase().replace(/[\s_-]+/g, '_');
      if (!normKey || seen.has(normKey)) continue;
      seen.add(normKey);

      // Clean display name (strip extension like .db3/.mcap if present)
      const cleanDisplayName = nameStr.replace(/\.[^/.]+$/, '');

      const procSec = s.processingSeconds ?? s.executionTimeSec ?? null;

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
    if (filteredSessions.some((session) => session.processingSeconds == null)) return null;
    return filteredSessions.reduce((acc, cur) => acc + (cur.processingSeconds || 0), 0);
  }, [filteredSessions]);

  // Total cost and token calculations from TiDB ledger with session metric summation fallback
  const totalCostDisplay = useMemo(() => {
    if (filterSessionId === 'all' && aiUsage?.totalCostUsd != null) {
      return `$${Number(aiUsage.totalCostUsd).toFixed(4)}`;
    }
    if (!aiUsage || filteredSessions.some((s) => getSessionMetric(s, sessionMetricsMap).cost == null)) return '—';
    const sum = filteredSessions.reduce((acc, s) => {
      const m = getSessionMetric(s, sessionMetricsMap);
      return acc + (m.cost || 0);
    }, 0);
    return `$${sum.toFixed(4)}`;
  }, [aiUsage, filteredSessions, sessionMetricsMap, filterSessionId]);

  const totalTokensDisplay = useMemo(() => {
    if (filterSessionId === 'all' && aiUsage?.totalTokens != null) {
      return Number(aiUsage.totalTokens);
    }
    if (!aiUsage || filteredSessions.some((s) => getSessionMetric(s, sessionMetricsMap).tokens == null)) return null;
    return filteredSessions.reduce((acc, s) => {
      const m = getSessionMetric(s, sessionMetricsMap);
      return acc + (m.tokens || 0);
    }, 0);
  }, [aiUsage, filteredSessions, sessionMetricsMap, filterSessionId]);

  // Dynamic scale limit for visual bars (at least 30s)
  const maxProcessingSeconds = useMemo(() => {
    const maxVal = Math.max(...allSessions.map((s) => s.processingSeconds || 0), 0);
    return Math.max(maxVal, 30);
  }, [allSessions]);

  return (
    <div className="cost-performance-page">
      {/* Page Title matching Figma E24 1 */}
      <PageHeader
        title="Chi phí & hiệu suất"
        subtitle="Theo dõi tài nguyên và thời gian xử lý thực tế của các phiên phân tích."
      />

      {/* Top Notice: Connected & mapped to live TiDB ledger */}
      <div className="notice blue" style={{ marginBottom: '24px' }}>
        <Icon name="check-circle" />
        <div>
          Chỉ hiển thị số liệu đã ghi nhận từ máy chủ. Dấu “—” thể hiện số liệu chưa có.
        </div>
      </div>

      {/* 3 Stats Grid Cards */}
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

        {/* Stat 2: Tổng thời gian xử lý */}
        <section className="card stat blue">
          <span className="stat-label">Tổng thời gian xử lý AI</span>
          <span className="stat-icon">
            <Icon name="clock" size={16} />
          </span>
          <strong>{totalProcessingSeconds == null ? '—' : `${totalProcessingSeconds}s`}</strong>
          <small>Thời gian suy luận & chẩn đoán thực tế</small>
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
          <strong>{totalCostDisplay}</strong>
          <small>{totalTokensDisplay == null ? 'Chưa có dữ liệu token' : `${totalTokensDisplay.toLocaleString()} tokens đã tiêu thụ`}</small>
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

      {/* Main Card: Chi tiết theo phiên */}
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

        {/* Table */}
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
                <th scope="col" style={{ width: '38%' }}>PHIÊN PHÂN TÍCH</th>
                <th scope="col" style={{ width: '22%' }}>THỜI GIAN XỬ LÝ</th>
                <th scope="col" style={{ width: '20%' }}>MÔ HÌNH & TOKEN</th>
                <th scope="col" style={{ width: '20%' }}>CHI PHÍ</th>
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
                  const logMetric = getSessionMetric(session, sessionMetricsMap);

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
                          <span className="time-metric-value">{session.processingSeconds == null ? '—' : `${val} giây`}</span>
                          <div className="time-metric-bar">
                            <div
                              className="time-metric-fill"
                              style={{ width: `${val === 0 ? 0 : Math.max(percent, 10)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span className="status-pill blue">
                            {logMetric.tokens == null ? 'Chưa có dữ liệu' : `${logMetric.tokens.toLocaleString()} tokens`}
                          </span>
                          {logMetric.model && (
                            <span style={{ fontSize: '10px', color: '#64748b', paddingLeft: '4px' }}>
                              {logMetric.model}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="status-pill green">
                          {logMetric.cost == null ? '—' : `$${Number(logMetric.cost).toFixed(4)}`}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Visual Usage Bars */}
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
                    <span>{session.processingSeconds == null ? '—' : val}</span>
                    <small>giây</small>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom Notice */}
      <div className="notice blue">
        <Icon name="info" />
        <div>
          Báo cáo chi phí được đối soát trực tiếp từ các lượt gọi LLM trong quá trình suy luận và phân tích log ROS2.
        </div>
      </div>
    </div>
  );
}
