import React, { useState } from 'react';
import { formatTimelineTime } from './TopicTimeline';

const VIEW_WIDTH = 800;
const CHART_SECONDS = 150;
const PLOT_LEFT = 46;
const PLOT_RIGHT = 780;
const PLOT_TOP = 26;
const PLOT_BOTTOM = 198;
const MAX_OFFSET_MS = 100;

export default function TimestampSkewChart({ threshold = 30, normal = false }) {
  const [hoverTime, setHoverTime] = useState(null);
  const x = (seconds) => PLOT_LEFT + (seconds / CHART_SECONDS) * (PLOT_RIGHT - PLOT_LEFT);
  const y = (milliseconds) => PLOT_TOP + (1 - milliseconds / MAX_OFFSET_MS) * (PLOT_BOTTOM - PLOT_TOP);
  const observedPoints = normal
    ? [[0, 12], [45, 10], [90, 12], [150, 11]]
    : [[0, 12], [45, 12], [77.9, 12], [78, 82], [82, 78], [82.1, 12], [120, 12], [150, 11]];
  const observedPath = observedPoints
    .map(([seconds, milliseconds], index) => `${index ? 'L' : 'M'}${x(seconds)},${y(milliseconds)}`)
    .join(' ');

  const handlePointerMove = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const viewX = ((event.clientX - bounds.left) / bounds.width) * VIEW_WIDTH;
    const seconds = ((viewX - PLOT_LEFT) / (PLOT_RIGHT - PLOT_LEFT)) * CHART_SECONDS;
    setHoverTime(Math.max(0, Math.min(CHART_SECONDS, seconds)));
  };

  return (
    <div className="chart">
      <svg
        viewBox="0 0 800 235"
        role="img"
        aria-label="Độ lệch timestamp camera và IMU trong bộ dữ liệu mẫu"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverTime(null)}
      >
        {[0, 25, 50, 75, 100].map((value) => (
          <g key={value}>
            <line
              x1={PLOT_LEFT}
              x2={PLOT_RIGHT}
              y1={y(value)}
              y2={y(value)}
              stroke="#d5dfeb"
            />
            <text x="34" y={y(value) + 4} textAnchor="end">{value}</text>
          </g>
        ))}

        <text x={PLOT_LEFT} y="13">ms</text>

        {!normal && (
          <rect
            x={x(78)}
            y={PLOT_TOP}
            width={x(82) - x(78)}
            height={PLOT_BOTTOM - PLOT_TOP}
            fill="#ff7183"
            fillOpacity="0.13"
          />
        )}

        {threshold <= MAX_OFFSET_MS && (
          <line
            x1={PLOT_LEFT}
            x2={PLOT_RIGHT}
            y1={y(threshold)}
            y2={y(threshold)}
            stroke="#ffa94d"
            strokeDasharray="5 5"
          />
        )}

        <path
          d={observedPath}
          fill="none"
          stroke="#2775d8"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {Array.from({ length: 7 }, (_, index) => index * 25).map((seconds) => (
          <text key={seconds} x={x(seconds)} y="225" textAnchor="middle">
            {formatTimelineTime(seconds)}
          </text>
        ))}

        {hoverTime !== null && (
          <g>
            <line
              x1={x(hoverTime)}
              x2={x(hoverTime)}
              y1={PLOT_TOP}
              y2={PLOT_BOTTOM}
              stroke="#7c9fc5"
              strokeDasharray="3 4"
            />
            <rect
              x={Math.max(PLOT_LEFT, Math.min(702, x(hoverTime) - 33))}
              y="28"
              width="68"
              height="23"
              rx="5"
              fill="#233c54"
            />
            <text
              x={Math.max(PLOT_LEFT, Math.min(702, x(hoverTime) - 33)) + 34}
              y="44"
              textAnchor="middle"
              className="chart-tooltip"
            >
              {formatTimelineTime(hoverTime)}
            </text>
          </g>
        )}
      </svg>

      <div className="chart-legend" aria-label="Chú thích biểu đồ">
        <span><i className="cyan-dot" />Độ lệch quan sát</span>
        <span><i className="red-dot" />Khoảng cần kiểm tra</span>
        <span>Ngưỡng: {threshold} ms</span>
      </div>
    </div>
  );
}
