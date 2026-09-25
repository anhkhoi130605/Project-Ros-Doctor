import React, { useState } from 'react';
import { formatTimelineTime } from './TopicTimeline';

const VIEW_WIDTH = 800;
const PLOT_LEFT = 48;
const PLOT_RIGHT = 775;
const PLOT_TOP = 18;
const PLOT_BOTTOM = 188;
const CHART_SECONDS = 60;

export default function TopicFrequencyChart({ topic, time, onTimeChange, showSelection = true }) {
  const [hoverTime, setHoverTime] = useState(null);
  const expected = topic.hz || 1;
  const yMax = expected * 1.2;
  const x = (seconds) => PLOT_LEFT + (seconds / CHART_SECONDS) * (PLOT_RIGHT - PLOT_LEFT);
  const y = (value) => PLOT_BOTTOM - (value / yMax) * (PLOT_BOTTOM - PLOT_TOP);
  const displayTime = hoverTime ?? Math.min(time, CHART_SECONDS);
  const isScan = topic.id === '/scan';
  const observedPoints = isScan
    ? [[0, expected], [34.9, expected], [35, 2], [40, 2], [40.1, expected], [60, expected]]
    : [[0, topic.observed ?? expected], [60, topic.observed ?? expected]];

  const updatePointerTime = (event, commit = false) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const viewX = ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH;
    const seconds = Math.round(((viewX - PLOT_LEFT) / (PLOT_RIGHT - PLOT_LEFT)) * CHART_SECONDS);
    const nextTime = Math.max(0, Math.min(CHART_SECONDS, seconds));
    setHoverTime(nextTime);
    if (commit) onTimeChange?.(nextTime);
  };

  return (
    <div className="chart">
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} 235`}
        role="img"
        aria-label={`Biểu đồ tần số ghi nhận của ${topic.name}`}
        tabIndex="0"
        onPointerMove={(event) => updatePointerTime(event)}
        onPointerLeave={() => setHoverTime(null)}
        onClick={(event) => updatePointerTime(event, true)}
      >
        {[0, 0.4, 0.8, 1.2].map((ratio) => {
          const value = expected * ratio;
          return (
            <g key={ratio}>
              <line x1={PLOT_LEFT} y1={y(value)} x2={PLOT_RIGHT} y2={y(value)} stroke="#27405b" strokeWidth="1" />
              <text x="39" y={y(value) + 4} textAnchor="end">{Math.round(value)}</text>
            </g>
          );
        })}

        {Array.from({ length: 7 }, (_, index) => index * 10).map((seconds) => (
          <g key={seconds}>
            <line x1={x(seconds)} y1={PLOT_TOP} x2={x(seconds)} y2={PLOT_BOTTOM} stroke="#1b3047" strokeWidth="1" />
            <text x={x(seconds)} y="209" textAnchor="middle">{formatTimelineTime(seconds)}</text>
          </g>
        ))}

        {isScan && (
          <rect
            x={x(35)}
            y={PLOT_TOP}
            width={x(40) - x(35)}
            height={PLOT_BOTTOM - PLOT_TOP}
            fill="#ff7183"
            opacity="0.13"
          />
        )}

        <line
          x1={PLOT_LEFT}
          y1={y(expected)}
          x2={PLOT_RIGHT}
          y2={y(expected)}
          stroke="#ff9b2b"
          strokeWidth="2"
          strokeDasharray="7 6"
        />
        <polyline
          points={observedPoints.map(([seconds, value]) => `${x(seconds)},${y(value)}`).join(' ')}
          fill="none"
          stroke="#51dcf8"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {(showSelection || hoverTime !== null) && (
          <>
            <line
              x1={x(displayTime)}
              y1={PLOT_TOP}
              x2={x(displayTime)}
              y2={PLOT_BOTTOM}
              stroke="#eaf3ff"
              strokeWidth="1"
              opacity="0.8"
            />
            <circle
              cx={x(displayTime)}
              cy={y(isScan && displayTime >= 35 && displayTime <= 40 ? 2 : (topic.observed ?? expected))}
              r="4"
              fill="#51dcf8"
              stroke="#07101e"
              strokeWidth="2"
            />
            <text className="chart-tooltip" x={Math.min(x(displayTime) + 8, 730)} y="31">
              {formatTimelineTime(displayTime)}
            </text>
          </>
        )}
      </svg>

      <div className="chart-legend" aria-label="Chú thích biểu đồ">
        <span><i className="cyan-dot" />Tần số quan sát</span>
        <span><i className="orange-dot" />Tần số kỳ vọng</span>
        {isScan && <span><i className="red-dot" />Khoảng cần kiểm tra</span>}
      </div>
    </div>
  );
}
