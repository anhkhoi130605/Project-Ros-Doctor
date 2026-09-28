import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../../../../stored/appStore';
import {
  Button,
  Card,
  EmptyState,
  FormField,
  Notice,
  PageHeader,
} from '../../../../components/common/UIComponents';
import SessionNavigationTabs from './components/SessionNavigationTabs';
import SessionStatCard from './components/SessionStatCard';
import TimestampSkewChart from './components/TimestampSkewChart';
import { BAG_TOPIC_PREVIEW } from '../../constants/bagTopics';

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

export default function SessionSyncPage() {
  const { id } = useParams();
  const { state, notify } = useApp();
  const availableTopics = useMemo(() => BAG_TOPIC_PREVIEW.filter((topic) => topic.hz), []);
  const [topicA, setTopicA] = useState('/camera/image');
  const [topicB, setTopicB] = useState('/imu');
  const initialThreshold = state.settings?.clockThresholdMs ?? 30;
  const [thresholdInput, setThresholdInput] = useState(initialThreshold);
  const [appliedThreshold, setAppliedThreshold] = useState(initialThreshold);

  const session = (state.sessions || []).find((item) => item.id === id);
  const bag = (state.bags || []).find((item) => item.id === session?.bagId);
  const findings = useMemo(
    () => (state.findings || []).filter((finding) => finding.sessionId === session?.id),
    [state.findings, session?.id],
  );
  const hasClockFinding = findings.some((finding) => finding.kind === 'clock');
  const normal = !hasClockFinding;
  const isPreparedPair = (
    (topicA === '/camera/image' && topicB === '/imu')
    || (topicA === '/imu' && topicB === '/camera/image')
  );
  const maxOffset = normal ? 12 : 82;

  if (!session) {
    return (
      <EmptyState
        icon="search"
        title="Không tìm thấy phiên"
        description="Phiên chẩn đoán không tồn tại hoặc đã bị xóa."
      >
        <Button to="/bags" icon="arrow">Về danh sách rosbag</Button>
      </EmptyState>
    );
  }

  const applyThreshold = () => {
    const nextThreshold = Number(thresholdInput);
    if (!Number.isFinite(nextThreshold) || nextThreshold <= 0) {
      notify('Ngưỡng phải là số lớn hơn 0.', 'warning');
      return;
    }
    setAppliedThreshold(nextThreshold);
    notify('Đã áp dụng ngưỡng hiển thị cho bộ mẫu.', 'info');
  };

  return (
    <div className="session-sync-page">
      <PageHeader
        title={`${session.name} · phiên #${session.id}`}
        subtitle={`${bag?.name || 'Rosbag'} / ${formatSessionDate(session.createdAt)}`}
      >
        <Button to="/reviews" variant="secondary" icon="check">Xem hàng đợi duyệt</Button>
      </PageHeader>

      <SessionNavigationTabs sessionId={session.id} activeTab="sync" notify={notify} />

      <Card className="sync-controls">
        <div className="form-grid four">
          <FormField label="Topic A">
            <select value={topicA} onChange={(event) => setTopicA(event.target.value)}>
              {availableTopics.map((topic) => (
                <option key={topic.id} value={topic.id}>{topic.name}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Topic B">
            <select value={topicB} onChange={(event) => setTopicB(event.target.value)}>
              {availableTopics.map((topic) => (
                <option key={topic.id} value={topic.id}>{topic.name}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Ngưỡng cho phép (ms)">
            <input
              type="number"
              min="1"
              max="10000"
              value={thresholdInput}
              onChange={(event) => setThresholdInput(event.target.value)}
            />
          </FormField>

          <Button onClick={applyThreshold}>Áp dụng</Button>
        </div>
      </Card>

      {topicA === topicB ? (
        <Notice tone="red" icon="alert">
          Hãy chọn hai topic khác nhau để đối chiếu thời gian.
        </Notice>
      ) : isPreparedPair ? (
        <>
          <div className="stats-grid three">
            <SessionStatCard
              title="Độ lệch lớn nhất"
              value={`${maxOffset} ms`}
              note={maxOffset > appliedThreshold
                ? `Vượt ngưỡng ${appliedThreshold} ms`
                : `Trong ngưỡng ${appliedThreshold} ms`}
              tone={maxOffset > appliedThreshold ? 'red' : 'green'}
              icon="alert"
            />
            <SessionStatCard
              title="Độ lệch trung vị"
              value="12 ms"
              note="Trên các cặp message mẫu"
              tone="blue"
              icon="clock"
            />
            <SessionStatCard
              title="Khoảng vượt ngưỡng"
              value={normal || appliedThreshold >= 82 ? '—' : '01:18–01:22'}
              note={`Phiên #${session.id}`}
              tone="orange"
              icon="activity"
            />
          </div>

          <Card
            title="Độ lệch timestamp camera – IMU"
            subtitle="Bộ mẫu dùng cùng miền thời gian để minh họa phép đối chiếu."
          >
            <TimestampSkewChart threshold={appliedThreshold} normal={normal} />
          </Card>
        </>
      ) : (
        <Card>
          <EmptyState
            icon="clock"
            title="Chưa có dữ liệu mẫu cho cặp topic này"
            description="Chọn /camera/image và /imu để xem kịch bản đồng bộ đã chuẩn bị."
          />
        </Card>
      )}

      <Card
        title="Header stamp ↔ thời điểm ghi bag"
        subtitle="UC-08 · Đối chiếu mẫu trên cùng miền thời gian"
      >
        <div className="ctrn-log">{`Topic: /camera/image
header.stamp:   00:01:18.100
bag timestamp:  00:01:18.${normal ? '112' : '182'}
Độ trễ ghi:     ${normal ? '12' : '82'} ms
Ngưỡng:         ${appliedThreshold} ms`}</div>
      </Card>

      <Notice>
        Cần xác minh nguồn đồng hồ. Phân biệt timestamp trong message với thời điểm ghi vào bag trước khi kết luận lệch thời gian.
      </Notice>
    </div>
  );
}
