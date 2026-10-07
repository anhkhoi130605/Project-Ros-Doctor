import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../../../../components/common/UIComponents';
import { getHealthCondition } from '../../../../../domain/appTypes';

function formatSessionTime(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const datePart = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${timeStr} ${datePart}`;
  } catch {
    return dateStr;
  }
}

export default function RecentAnalysisSessionsTable({ sessions = [] }) {
  const [viewMode, setViewMode] = useState('chart'); // 'chart' | 'table'
  const [hoveredSession, setHoveredSession] = useState(null);
  const [hoveredSlice, setHoveredSlice] = useState(null);

  const displaySessions = sessions.length > 0 ? sessions : [];

  // 1. Data cho Biểu đồ hình tròn theo 3 trường hợp: Bình thường (xanh), Cảnh báo (vàng), Lỗi (đỏ)
  const normalSessions = displaySessions.filter((s) => {
    const wCount = s.warningsCount || 0;
    const highCount = (s.issues || []).filter((i) => i.severity === 'high' || i.severity === 'critical').length;
    return getHealthCondition(s.healthScore, wCount, highCount).type === 'normal';
  }).length;

  const warningSessions = displaySessions.filter((s) => {
    const wCount = s.warningsCount || 0;
    const highCount = (s.issues || []).filter((i) => i.severity === 'high' || i.severity === 'critical').length;
    return getHealthCondition(s.healthScore, wCount, highCount).type === 'warning';
  }).length;

  const errorSessions = displaySessions.filter((s) => {
    const wCount = s.warningsCount || 0;
    const highCount = (s.issues || []).filter((i) => i.severity === 'high' || i.severity === 'critical').length;
    return getHealthCondition(s.healthScore, wCount, highCount).type === 'error';
  }).length;

  const total = displaySessions.length || 1;

  const donutSegments = [
    {
      id: 'normal',
      label: 'Bình thường (Danh định)',
      value: normalSessions,
      color: '#10b981',
      percent: Math.round((normalSessions / total) * 100),
    },
    {
      id: 'warning',
      label: 'Cảnh báo cần lưu ý',
      value: warningSessions,
      color: '#f59e0b',
      percent: Math.round((warningSessions / total) * 100),
    },
    {
      id: 'error',
      label: 'Sự cố lỗi nghiêm trọng',
      value: errorSessions,
      color: '#ef4444',
      percent: Math.round((errorSessions / total) * 100),
    },
  ].filter((s) => s.value > 0);

  // Nếu chưa có phân loại, mặc định danh định
  if (donutSegments.length === 0) {
    donutSegments.push({
      id: 'normal',
      label: 'Bình thường (Danh định)',
      value: total,
      color: '#10b981',
      percent: 100,
    });
  }

  const radius = 54;
  const circumference = 2 * Math.PI * radius; // ~339.29
  let accPercent = 0;
  const donutSlices = donutSegments.map((seg) => {
    const p = seg.value / total;
    const strokeDasharray = `${p * circumference} ${circumference * (1 - p)}`;
    const strokeDashoffset = -accPercent * circumference;
    accPercent += p;
    return { ...seg, strokeDasharray, strokeDashoffset };
  });

  // 2. Data cho Biểu đồ cột (Mỗi phiên gồm số lượng Topic & Cảnh báo từ DB)
  const maxTopic = Math.max(...displaySessions.map((s) => s.topicsCount || s.topics || 2), 6);
  const chartWidth = 520;
  const chartHeight = 190;
  const chartBottom = 150;
  const chartTop = 20;
  const usableHeight = chartBottom - chartTop;
  const colSpacing = displaySessions.length > 0 ? chartWidth / displaySessions.length : 100;
  const barWidth = 26;

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>📈</span>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
              Phiên phân tích gần đây
            </h3>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
            Dữ liệu thật đối chiếu trực tiếp từ Rosbag Database & Telemetry Stream.
          </p>
        </div>

        {/* View mode toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'inline-flex',
              backgroundColor: '#f1f5f9',
              padding: '3px',
              borderRadius: '8px',
              gap: '4px',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('chart')}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                backgroundColor: viewMode === 'chart' ? '#ffffff' : 'transparent',
                color: viewMode === 'chart' ? '#0f172a' : '#64748b',
                boxShadow: viewMode === 'chart' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              📊 Biểu đồ trực quan
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                backgroundColor: viewMode === 'table' ? '#ffffff' : 'transparent',
                color: viewMode === 'table' ? '#0f172a' : '#64748b',
                boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              📋 Danh sách bảng
            </button>
          </div>

          <Link
            to="/analysis"
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#2563eb',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
            }}
          >
            Xem tất cả <Icon name="arrow" size={14} />
          </Link>
        </div>
      </div>

      {/* ================= BIỂU ĐỒ HÌNH TRÒN KẾT HỢP BIỂU ĐỒ CỘT ================= */}
      {viewMode === 'chart' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(280px, 1fr) minmax(380px, 1.6fr)',
            gap: '20px',
            alignItems: 'stretch',
          }}
        >
          {/* 1. Biểu đồ tròn: Tỷ lệ sức khỏe phiên */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                🍩 Tỷ lệ Sức khỏe Phiên
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: warningSessions > 0 ? '#dc2626' : '#16a34a',
                  backgroundColor: warningSessions > 0 ? '#fee2e2' : '#dcfce7',
                  padding: '2px 8px',
                  borderRadius: '10px',
                }}
              >
                ● {warningSessions > 0 ? `${warningSessions} phiên cần xử lý` : '100% An toàn'}
              </span>
            </div>

            {/* Donut SVG */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <svg
                width="160"
                height="160"
                viewBox="0 0 160 160"
                style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
              >
                <circle cx="80" cy="80" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="16" />
                {donutSlices.map((slice) => {
                  const isHov = hoveredSlice?.id === slice.id;
                  return (
                    <circle
                      key={slice.id}
                      cx="80"
                      cy="80"
                      r={radius}
                      fill="none"
                      stroke={slice.color}
                      strokeWidth={isHov ? '20' : '16'}
                      strokeDasharray={slice.strokeDasharray}
                      strokeDashoffset={slice.strokeDashoffset}
                      style={{
                        transition: 'all 0.25s ease',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={() => setHoveredSlice(slice)}
                      onMouseLeave={() => setHoveredSlice(null)}
                    />
                  );
                })}
              </svg>

              {/* Donut Center */}
              <div
                style={{
                  position: 'absolute',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  pointerEvents: 'none',
                }}
              >
                <strong style={{ fontSize: '22px', fontWeight: 800, color: hoveredSlice ? hoveredSlice.color : '#0f172a' }}>
                  {hoveredSlice ? `${hoveredSlice.percent}%` : `${normalSessions}/${displaySessions.length}`}
                </strong>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>
                  {hoveredSlice ? hoveredSlice.label : 'Phiên bình thường'}
                </span>
              </div>
            </div>

            {/* Donut Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {donutSegments.map((seg) => (
                <div
                  key={seg.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '11px',
                    padding: '4px 6px',
                    borderRadius: '6px',
                    backgroundColor: hoveredSlice?.id === seg.id ? '#ffffff' : 'transparent',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={() => setHoveredSlice(seg)}
                  onMouseLeave={() => setHoveredSlice(null)}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155', fontWeight: 600 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: seg.color }} />
                    {seg.label}
                  </span>
                  <strong style={{ color: seg.color }}>{seg.value} phiên ({seg.percent}%)</strong>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Biểu đồ cột: Topics & Cảnh báo của từng phiên thực tế */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                📊 Khối lượng Topic & Mức độ Cảnh báo theo từng Phiên
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#3b82f6', fontWeight: 600 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '2px', backgroundColor: '#3b82f6' }} /> Số Topic
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontWeight: 600 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '2px', backgroundColor: '#16a34a' }} /> Bình thường
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#d97706', fontWeight: 600 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '2px', backgroundColor: '#d97706' }} /> Cảnh báo
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontWeight: 600 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '2px', backgroundColor: '#dc2626' }} /> Lỗi
                </span>
              </div>
            </div>

            {/* SVG Bar Chart */}
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
                <defs>
                  <linearGradient id="sessionTopicGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.5" />
                  </linearGradient>
                </defs>

                {/* Y-axis Grid lines */}
                {[0, 0.33, 0.66, 1].map((ratio) => {
                  const y = chartBottom - ratio * usableHeight;
                  const val = Math.round(ratio * maxTopic);
                  return (
                    <g key={ratio}>
                      <line x1="28" y1={y} x2={chartWidth - 8} y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray={ratio === 0 ? 'none' : '3 3'} />
                      <text x="22" y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8">{val}</text>
                    </g>
                  );
                })}

                {/* Bars per session */}
                {displaySessions.map((session, idx) => {
                  const tCount = session.topicsCount || 2;
                  const wCount = session.warningsCount || 0;
                  const highCount = (session.issues || []).filter((i) => i.severity === 'high' || i.severity === 'critical').length;
                  const cond = getHealthCondition(session.healthScore, wCount, highCount);
                  const barH = (tCount / maxTopic) * usableHeight;
                  const x = 38 + idx * colSpacing;
                  const y = chartBottom - barH;
                  const isHov = hoveredSession?.id === session.id;

                  const shortName = session.id.replace('sess-', '').slice(0, 6);

                  return (
                    <g
                      key={session.id}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredSession(session)}
                      onMouseLeave={() => setHoveredSession(null)}
                    >
                      {/* Hover column backdrop */}
                      {isHov && (
                        <rect x={x - 8} y={chartTop} width={barWidth + 16} height={usableHeight} fill="#f8fafc" rx="4" />
                      )}

                      {/* Main Bar (Topics) */}
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={Math.max(6, barH)}
                        fill="url(#sessionTopicGrad)"
                        stroke="#2563eb"
                        strokeWidth={isHov ? '2' : '1'}
                        rx="4"
                        ry="4"
                        style={{ transition: 'all 0.2s ease' }}
                      />

                      {/* Topic count label on top of bar */}
                      <text x={x + barWidth / 2} y={y - 5} textAnchor="middle" fontSize="10" fontWeight="700" fill="#1e40af">
                        {tCount}
                      </text>

                      {/* Warnings indicator dot on base */}
                      <circle
                        cx={x + barWidth / 2}
                        cy={chartBottom - 8}
                        r="3.5"
                        fill={cond.color}
                      />

                      {/* X label */}
                      <text
                        x={x + barWidth / 2}
                        y={chartBottom + 16}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight={isHov ? '700' : '600'}
                        fill={isHov ? '#0f172a' : '#475569'}
                      >
                        #{shortName}
                      </text>

                      {/* Status indicator text */}
                      <text
                        x={x + barWidth / 2}
                        y={chartBottom + 28}
                        textAnchor="middle"
                        fontSize="8"
                        fill={cond.color}
                        fontWeight="700"
                      >
                        {cond.badgeText.replace('● ', '')}
                      </text>
                    </g>
                  );
                })}

                {/* X axis baseline */}
                <line x1="28" y1={chartBottom} x2={chartWidth - 8} y2={chartBottom} stroke="#cbd5e1" strokeWidth="1.5" />
              </svg>
            </div>

            {/* Bottom session tooltip row */}
            <div
              style={{
                padding: '8px 12px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #f1f5f9',
                fontSize: '11px',
                color: '#475569',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              {hoveredSession ? (
                <>
                  <span>
                    Phiên: <strong>{hoveredSession.title || hoveredSession.id}</strong> ({hoveredSession.bagName})
                  </span>
                  <span style={{
                    color: getHealthCondition(
                      hoveredSession.healthScore,
                      hoveredSession.warningsCount || 0,
                      (hoveredSession.issues || []).filter((i) => i.severity === 'high' || i.severity === 'critical').length
                    ).color,
                    fontWeight: 700
                  }}>
                    {hoveredSession.topicsCount || 2} Topics · {getHealthCondition(
                      hoveredSession.healthScore,
                      hoveredSession.warningsCount || 0,
                      (hoveredSession.issues || []).filter((i) => i.severity === 'high' || i.severity === 'critical').length
                    ).summary} · {formatSessionTime(hoveredSession.timestamp)}
                  </span>
                </>
              ) : (
                <>
                  <span>💡 <em>Rê chuột vào cột để xem chi tiết rosbag & số lượng topic của từng phiên thực tế.</em></span>
                  <span style={{ color: '#2563eb', fontWeight: 600 }}>Dữ liệu đồng bộ trực tiếp từ SQL Database</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= BẢNG DỮ LIỆU CHI TIẾT THỰC TẾ ================= */}
      {viewMode === 'table' && (
        <div className="table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
                  PHIÊN / ROSBAG
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
                  THỜI ĐIỂM
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
                  TOPIC
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
                  TÌNH TRẠNG
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
                  ĐIỂM SỨC KHỎE
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
                  TRẠNG THÁI
                </th>
              </tr>
            </thead>
            <tbody>
              {displaySessions.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '36px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                    Đang đồng bộ dữ liệu phiên phân tích thực tế từ hệ thống...
                  </td>
                </tr>
              ) : (
                displaySessions.map((session) => {
                  const wCount = session.warningsCount || 0;
                  const highCount = (session.issues || []).filter((i) => i.severity === 'high' || i.severity === 'critical').length;
                  const cond = getHealthCondition(session.healthScore, wCount, highCount);

                  return (
                    <tr key={session.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '16px' }}>
                        <Link to={`/sessions/${session.id}`} style={{ textDecoration: 'none' }}>
                          <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block' }}>
                            {session.title || `Phiên #${session.id}`}
                          </strong>
                          <small style={{ fontSize: '12px', color: '#64748b' }}>
                            {session.bagName || session.filename || `rosbag_${session.id}.db3`}
                          </small>
                        </Link>
                      </td>
                      <td style={{ padding: '16px', fontSize: '13px', color: '#334155' }}>
                        {formatSessionTime(session.timestamp)}
                      </td>
                      <td style={{ padding: '16px', fontSize: '13px', color: '#334155' }}>
                        {session.topicsCount || 2}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: cond.color,
                            background: cond.bgColor,
                            border: `1px solid ${cond.borderColor}`,
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 700,
                          }}
                        >
                          {cond.summary}
                        </span>
                      </td>
                      <td style={{ padding: '16px', fontSize: '13px', fontWeight: 800, color: cond.scoreColor }}>
                        {`${cond.effectiveScore}/100`}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: cond.bgColor,
                            color: cond.color,
                            border: `1px solid ${cond.borderColor}`,
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 700,
                          }}
                        >
                          {cond.badgeText}
                        </span>
                      </td>
                    </tr>
                  );
                }))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
