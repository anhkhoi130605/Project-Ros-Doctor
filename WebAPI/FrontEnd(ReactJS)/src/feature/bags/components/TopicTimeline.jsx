import React from 'react';

const CELL_COUNT = 42;

export function formatTimelineTime(seconds) {
  const safeSeconds = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function findingMatchesTopic(finding, topicName) {
  if (finding.topic === topicName) return true;
  if (finding.kind === 'tf' && topicName === '/tf') return true;
  if (finding.kind === 'clock' && ['/camera/image', '/imu'].includes(topicName)) return true;
  return false;
}

export default function TopicTimeline({ topics, findings, duration, selectedTopic, time, onSelectTopic, onTimeChange }) {
  const safeDuration = Math.max(1, duration || 272);
  const activeCell = Math.min(CELL_COUNT - 1, Math.floor((time / safeDuration) * CELL_COUNT));

  const isRiskCell = (topic, index) => {
    const cellStart = (index / CELL_COUNT) * safeDuration;
    const cellEnd = ((index + 1) / CELL_COUNT) * safeDuration;
    return findings.some(
      (finding) => findingMatchesTopic(finding, topic.name)
        && finding.start < cellEnd
        && finding.end >= cellStart,
    );
  };

  return (
    <div className="timeline">
      <div className="timeline-scale" aria-hidden="true">
        <span>00:00</span>
        <span>{formatTimelineTime(safeDuration / 2)}</span>
        <span>{formatTimelineTime(safeDuration)}</span>
      </div>

      {topics.slice(0, 5).map((topic) => (
        <div key={topic.id} className={`timeline-row ${selectedTopic === topic.id ? 'selected' : ''}`}>
          <button type="button" className="timeline-topic" onClick={() => onSelectTopic(topic.id)}>
            {topic.name}
          </button>
          <div className="timeline-cells">
            {Array.from({ length: CELL_COUNT }, (_, index) => {
              const cellTime = Math.round((index / (CELL_COUNT - 1)) * safeDuration);
              const classNames = [topic.color];
              if (isRiskCell(topic, index)) classNames.push('risk');
              if (selectedTopic === topic.id && activeCell === index) classNames.push('at-time');

              return (
                <button
                  key={`${topic.id}-${index}`}
                  type="button"
                  className={classNames.filter(Boolean).join(' ')}
                  aria-label={`${topic.name} tại ${formatTimelineTime(cellTime)}`}
                  title={`${topic.name} · ${formatTimelineTime(cellTime)}`}
                  onClick={() => {
                    onSelectTopic(topic.id);
                    onTimeChange(cellTime);
                  }}
                />
              );
            })}
          </div>
        </div>
      ))}

      <label className="timeline-scrubber">
        <span>Thời điểm</span>
        <input
          type="range"
          min="0"
          max={safeDuration}
          step="1"
          value={time}
          onChange={(event) => onTimeChange(Number(event.target.value))}
          aria-label="Chọn thời điểm trên timeline"
        />
        <strong>{formatTimelineTime(time)}</strong>
      </label>
    </div>
  );
}
