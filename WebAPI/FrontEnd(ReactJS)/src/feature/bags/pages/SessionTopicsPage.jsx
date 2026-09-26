import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../../../stored/appStore';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  Notice,
  PageHeader,
} from '../../../components/common/UIComponents';
import SessionNavigationTabs from '../components/SessionNavigationTabs';
import TopicFrequencyChart from '../components/TopicFrequencyChart';
import TopicTimeline, { formatTimelineTime } from '../components/TopicTimeline';
import { BAG_TOPIC_PREVIEW } from '../constants/bagTopics';

function formatSessionDate(value) {
  if (!value) return '';
  const date = new Date(value);
  const timePart = new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  const datePart = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
  return `${timePart} ${datePart}`;
}

export default function SessionTopicsPage() {
  const { id } = useParams();
  const { state, notify } = useApp();
  const [search, setSearch] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('/scan');
  const [time, setTime] = useState(35);

  const session = (state.sessions || []).find((item) => item.id === id);
  const bag = (state.bags || []).find((item) => item.id === session?.bagId);
  const findings = useMemo(
    () => (state.findings || []).filter((finding) => finding.sessionId === session?.id),
    [state.findings, session?.id],
  );
  const filteredTopics = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return BAG_TOPIC_PREVIEW.filter((topic) => `${topic.name} ${topic.type}`.toLowerCase().includes(keyword));
  }, [search]);
  const activeTopic = BAG_TOPIC_PREVIEW.find((topic) => topic.id === selectedTopic) || BAG_TOPIC_PREVIEW[0];

  if (!session) {
    return (
      <EmptyState title="Không tìm thấy phiên" description="Phiên chẩn đoán không tồn tại hoặc đã bị xóa.">
        <Button to="/bags" icon="arrow">Về danh sách rosbag</Button>
      </EmptyState>
    );
  }

  const frequencyFinding = findings.find(
    (finding) => finding.kind === 'frequency' && finding.topic === activeTopic.id,
  );

  return (
    <div className="session-topics-page">
      <PageHeader
        title={`${session.name} · phiên #${session.id}`}
        subtitle={`${bag?.name || 'Rosbag'} / ${formatSessionDate(session.createdAt)}`}
      >
        <Button to="/reviews" variant="secondary" icon="check">Xem hàng đợi duyệt</Button>
      </PageHeader>

      <SessionNavigationTabs sessionId={session.id} activeTab="topics" notify={notify} />

      <div className="topics-layout">
        <Card
          title="Danh sách topic"
          subtitle={`${BAG_TOPIC_PREVIEW.length} topic đại diện / ${session.topics || bag?.topics || 0} topic trong bag`}
        >
          <label className="search-field">
            <span className="visually-hidden">Tìm topic</span>
            <Icon name="search" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm topic…"
            />
          </label>

          <div className="topic-list">
            {filteredTopics.map((topic) => (
              <button
                key={topic.id}
                type="button"
                className={selectedTopic === topic.id ? 'active' : ''}
                aria-pressed={selectedTopic === topic.id}
                onClick={() => setSelectedTopic(topic.id)}
              >
                <span>
                  <i className={`${topic.color || 'muted'}-dot`} />
                  <strong>{topic.name}</strong>
                </span>
                <small>{topic.hz ? `${topic.hz} Hz` : 'Theo sự kiện'}</small>
              </button>
            ))}
          </div>

          {filteredTopics.length === 0 && (
            <p className="small-note">Không tìm thấy topic phù hợp.</p>
          )}

          <Notice>
            Không áp ngưỡng tần số của topic định kỳ cho <code>/tf_static</code>.
          </Notice>
        </Card>

        <div className="stack">
          <Card
            title="Timeline hoạt động"
            subtitle="Bấm một ô tín hiệu hoặc kéo thanh thời gian để đối chiếu."
          >
            <TopicTimeline
              topics={BAG_TOPIC_PREVIEW}
              findings={findings}
              duration={session.duration || bag?.duration}
              selectedTopic={selectedTopic}
              time={time}
              onSelectTopic={setSelectedTopic}
              onTimeChange={setTime}
            />
          </Card>

          <Card
            title={`Tần số ghi nhận · ${activeTopic.name}`}
            subtitle={`${activeTopic.type} · ${activeTopic.count.toLocaleString('vi-VN')} message mẫu`}
            action={<Badge tone="cyan">{formatTimelineTime(time)}</Badge>}
          >
            {activeTopic.hz ? (
              <TopicFrequencyChart topic={activeTopic} time={time} onTimeChange={setTime} />
            ) : (
              <EmptyState
                icon="activity"
                title="Topic theo sự kiện"
                description="Topic này không có tần số kỳ vọng định kỳ. Hãy đối chiếu số message và vùng hoạt động trên timeline."
              />
            )}

            {frequencyFinding ? (
              <Notice tone="red" icon="alert">
                Bộ mẫu: 00:35–00:40 ghi nhận 2 Hz so với kỳ vọng 10 Hz; thiếu khoảng 80% message kỳ vọng.
                Chỉ là ước tính từ tốc độ ghi, chưa xác nhận mất gói trên mạng.
              </Notice>
            ) : (
              <Notice>
                Đã ghi nhận {activeTopic.count.toLocaleString('vi-VN')} message mẫu trong phiên. Chọn một thời điểm để đối chiếu với timeline.
              </Notice>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
