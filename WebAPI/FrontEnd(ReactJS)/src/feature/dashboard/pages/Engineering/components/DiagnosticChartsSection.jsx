import React, { useState } from 'react';

export default function DiagnosticChartsSection({
  sessionsCount = 39,
  bagsCount = 39,
  highWarningsCount = 110,
  pendingCount = 149,
}) {
  const [activeTab, setActiveTab] = useState('topics');
  const [hoveredSlice, setHoveredSlice] = useState(null);
  const [hoveredBar, setHoveredBar] = useState(null);

  // 1. Data cho Biểu đồ hình tròn (Donut Chart)
  const donutSegments = [
    {
      id: 'high',
      label: 'Cảnh báo mức cao',
      value: highWarningsCount || 110,
      color: '#ef4444',
      lightColor: '#fee2e2',
      desc: 'Cần đối chiếu bằng chứng ngay',
    },
    {
      id: 'pending',
      label: 'Kết luận chờ duyệt',
      value: pendingCount || 149,
      color: '#f59e0b',
      lightColor: '#fef3c7',
      desc: 'Kỹ sư kiểm tra trước khi xuất',
    },
    {
      id: 'sessions',
      label: 'Phiên hoạt động',
      value: sessionsCount || 39,
      color: '#10b981',
      lightColor: '#d1fae5',
      desc: 'Tổng phiên ghi nhận',
    },
    {
      id: 'bags',
      label: 'Rosbag đã phân tích',
      value: bagsCount || 39,
      color: '#3b82f6',
      lightColor: '#dbeafe',
      desc: 'Dữ liệu rosbag hoàn chỉnh',
    },
  ];

  const totalDonut = donutSegments.reduce((acc, curr) => acc + curr.value, 0);

  // Tính toán stroke-dasharray & stroke-dashoffset cho Donut SVG
  const radius = 72;
  const circumference = 2 * Math.PI * radius; // ~452.39
  let accumulatedPercent = 0;

  const donutSlices = donutSegments.map((seg) => {
    const percent = seg.value / (totalDonut || 1);
    const strokeDasharray = `${percent * circumference} ${circumference * (1 - percent)}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += percent;
    return {
      ...seg,
      percent: Math.round(percent * 100),
      strokeDasharray,
      strokeDashoffset,
    };
  });

  // 2. Data cho Biểu đồ cột (Bar Chart)
  const topicData = [
    { name: '/scan', label: 'LiDAR Scan', count: 48, rate: '30 Hz', color: '#ef4444', note: 'Dropout & Jitter cao' },
    { name: '/imu', label: 'IMU Data', count: 34, rate: '100 Hz', color: '#f59e0b', note: 'Bias drift gia tốc' },
    { name: '/tf', label: 'TF Tree', count: 28, rate: '50 Hz', color: '#3b82f6', note: 'Buffer timeout frame' },
    { name: '/odom', label: 'Odometry', count: 19, rate: '30 Hz', color: '#6366f1', note: 'Covariance lệch nhẹ' },
    { name: '/camera', label: 'Camera RGB', count: 12, rate: '30 Hz', color: '#06b6d4', note: 'Drop frame ngắt quãng' },
    { name: '/cmd_vel', label: 'Command Vel', count: 7, rate: '10 Hz', color: '#10b981', note: 'Ổn định danh định' },
  ];

  const sessionTrendData = [
    { name: '#fb47cf31', label: 'Phiên 1', count: 12, warnings: 4, color: '#ef4444' },
    { name: '#736dabd1', label: 'Phiên 2', count: 12, warnings: 2, color: '#f59e0b' },
    { name: '#91332c3b', label: 'Phiên 3', count: 12, warnings: 3, color: '#f59e0b' },
    { name: '#05355333', label: 'Phiên 4', count: 12, warnings: 1, color: '#3b82f6' },
    { name: '#SESS-5064', label: 'Phiên 5', count: 12, warnings: 0, color: '#10b981' },
  ];

  const currentBarData = activeTab === 'topics' ? topicData : sessionTrendData;
  const maxBarValue = Math.max(...currentBarData.map((d) => d.count), 50);

  // SVG dimensions for Bar Chart
  const svgWidth = 460;
  const svgHeight = 220;
  const chartBottom = 175;
  const chartTop = 25;
  const usableHeight = chartBottom - chartTop;
  const barSpacing = svgWidth / currentBarData.length;
  const barWidth = Math.min(36, barSpacing - 18);

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* Header bar with controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>📊</span>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
              Trực quan hóa Dữ liệu Chẩn đoán & Telemetry
            </h3>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
            Tương quan phân bổ mức độ sự cố kết hợp mật độ cảnh báo theo cụm Topic ROS2.
          </p>
        </div>

        {/* Tab switcher for Bar Chart */}
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
            onClick={() => setActiveTab('topics')}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeTab === 'topics' ? '#ffffff' : 'transparent',
              color: activeTab === 'topics' ? '#0f172a' : '#64748b',
              boxShadow: activeTab === 'topics' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            🎯 Phân bổ theo Topic
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sessions')}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeTab === 'sessions' ? '#ffffff' : 'transparent',
              color: activeTab === 'sessions' ? '#0f172a' : '#64748b',
              boxShadow: activeTab === 'sessions' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            ⏱️ 5 Phiên gần đây
          </button>
        </div>
      </div>

      {/* Main Grid: Biểu đồ tròn (Trái) & Biểu đồ cột (Phải) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1fr) minmax(380px, 1.35fr)',
          gap: '24px',
          alignItems: 'center',
        }}
      >
        {/* ================= CỘT 1: BIỂU ĐỒ HÌNH TRÒN (DONUT CHART) ================= */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
              🍩 Phân bổ Mức độ & Trạng thái
            </span>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
              Tổng: <strong>{totalDonut}</strong> mục
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <svg
              width="210"
              height="210"
              viewBox="0 0 210 210"
              style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
            >
              {/* Background circle track */}
              <circle
                cx="105"
                cy="105"
                r={radius}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="20"
              />

              {/* Segments */}
              {donutSlices.map((slice) => {
                const isHovered = hoveredSlice?.id === slice.id;
                return (
                  <circle
                    key={slice.id}
                    cx="105"
                    cy="105"
                    r={radius}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={isHovered ? '24' : '20'}
                    strokeDasharray={slice.strokeDasharray}
                    strokeDashoffset={slice.strokeDashoffset}
                    style={{
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                      filter: isHovered ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.2))' : 'none',
                    }}
                    onMouseEnter={() => setHoveredSlice(slice)}
                    onMouseLeave={() => setHoveredSlice(null)}
                  />
                );
              })}
            </svg>

            {/* Inner Center Content */}
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
              <span style={{ fontSize: '24px', fontWeight: 800, color: hoveredSlice ? hoveredSlice.color : '#0f172a' }}>
                {hoveredSlice ? hoveredSlice.value : totalDonut}
              </span>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                {hoveredSlice ? `${hoveredSlice.percent}%` : 'Chẩn đoán'}
              </span>
            </div>
          </div>

          {/* Donut Legend */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
            {donutSlices.map((slice) => {
              const isHovered = hoveredSlice?.id === slice.id;
              return (
                <div
                  key={slice.id}
                  onMouseEnter={() => setHoveredSlice(slice)}
                  onMouseLeave={() => setHoveredSlice(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    backgroundColor: isHovered ? '#ffffff' : 'transparent',
                    boxShadow: isHovered ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: slice.color,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '11px', color: '#334155', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {slice.label}
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>
                      <strong>{slice.value}</strong> ({slice.percent}%)
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= CỘT 2: BIỂU ĐỒ CỘT (BAR CHART) ================= */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
              📊 {activeTab === 'topics' ? 'Mật độ Sự cố theo Cụm Topic' : 'Tổng số Topic & Cảnh báo theo Phiên'}
            </span>
            <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600 }}>
              Đỉnh: {maxBarValue} {activeTab === 'topics' ? 'lỗi' : 'topics'}
            </span>
          </div>

          {/* SVG Bar Chart */}
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            >
              <defs>
                {currentBarData.map((bar, idx) => (
                  <linearGradient key={idx} id={`barGrad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={bar.color} stopOpacity="0.9" />
                    <stop offset="100%" stopColor={bar.color} stopOpacity="0.45" />
                  </linearGradient>
                ))}
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = chartBottom - ratio * usableHeight;
                const val = Math.round(ratio * maxBarValue);
                return (
                  <g key={ratio}>
                    <line
                      x1="36"
                      y1={y}
                      x2={svgWidth - 10}
                      y2={y}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                      strokeDasharray={ratio === 0 ? 'none' : '3 3'}
                    />
                    <text
                      x="30"
                      y={y + 3}
                      textAnchor="end"
                      fontSize="9"
                      fill="#94a3b8"
                      fontFamily="sans-serif"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Bars */}
              {currentBarData.map((bar, idx) => {
                const barHeight = (bar.count / maxBarValue) * usableHeight;
                const x = 45 + idx * barSpacing;
                const y = chartBottom - barHeight;
                const isHovered = hoveredBar?.name === bar.name;

                return (
                  <g
                    key={idx}
                    onMouseEnter={() => setHoveredBar(bar)}
                    onMouseLeave={() => setHoveredBar(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Bar background hover column */}
                    {isHovered && (
                      <rect
                        x={x - 4}
                        y={chartTop}
                        width={barWidth + 8}
                        height={usableHeight}
                        fill="#f8fafc"
                        rx="4"
                      />
                    )}

                    {/* Bar Rect */}
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(4, barHeight)}
                      fill={`url(#barGrad-${idx})`}
                      stroke={bar.color}
                      strokeWidth={isHovered ? '2' : '1'}
                      rx="4"
                      ry="4"
                      style={{
                        transition: 'all 0.25s ease',
                        filter: isHovered ? 'drop-shadow(0 2px 5px rgba(0,0,0,0.15))' : 'none',
                      }}
                    />

                    {/* Count Label on top of bar */}
                    <text
                      x={x + barWidth / 2}
                      y={y - 6}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="700"
                      fill={isHovered ? bar.color : '#475569'}
                    >
                      {bar.count}
                    </text>

                    {/* X-axis Label */}
                    <text
                      x={x + barWidth / 2}
                      y={chartBottom + 16}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="600"
                      fill={isHovered ? '#0f172a' : '#64748b'}
                    >
                      {bar.name}
                    </text>

                    {/* Sub-label under X-axis */}
                    <text
                      x={x + barWidth / 2}
                      y={chartBottom + 28}
                      textAnchor="middle"
                      fontSize="8"
                      fill="#94a3b8"
                    >
                      {bar.label || bar.rate}
                    </text>
                  </g>
                );
              })}

              {/* X Axis baseline */}
              <line
                x1="36"
                y1={chartBottom}
                x2={svgWidth - 10}
                y2={chartBottom}
                stroke="#cbd5e1"
                strokeWidth="1.5"
              />
            </svg>
          </div>

          {/* Bar Detail Footnote */}
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
            {hoveredBar ? (
              <>
                <span>
                  Đang chọn: <strong>{hoveredBar.name}</strong> ({hoveredBar.label})
                </span>
                <span style={{ color: hoveredBar.color, fontWeight: 700 }}>
                  {hoveredBar.count} sự cố ({hoveredBar.note || `${hoveredBar.warnings || 0} cảnh báo`})
                </span>
              </>
            ) : (
              <>
                <span>💡 <em>Rê chuột vào từng cột để xem chi tiết bằng chứng và tần suất topic.</em></span>
                <span style={{ color: '#0369a1', fontWeight: 600 }}>Cập nhật theo Telemetry mới nhất</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
