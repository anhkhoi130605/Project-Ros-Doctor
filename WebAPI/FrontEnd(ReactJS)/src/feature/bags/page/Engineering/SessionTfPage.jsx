import React, { useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useApp, formatDuration } from '../../../../stored/appStore';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  FormField,
  Notice,
  PageHeader,
} from '../../../../components/common/UIComponents';
import SessionNavigationTabs from './components/SessionNavigationTabs';
import TfTreeViewer from './components/TfTreeViewer';

const TF_FRAMES = ['map', 'odom', 'base_link', 'laser', 'camera_link', 'imu_link'];

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

export default function SessionTfPage() {
  const { id } = useParams();
  const { state, notify } = useApp();
  const [selectedFrame, setSelectedFrame] = useState('map');
  const [resetToken, setResetToken] = useState(0);
  const [time, setTime] = useState(135.2);

  const session = (state.sessions || []).find((item) => item.id === id);
  const bag = (state.bags || []).find((item) => item.id === session?.bagId);
  const findings = useMemo(
    () => (state.findings || []).filter((finding) => finding.sessionId === session?.id),
    [state.findings, session?.id],
  );
  const hasTfFinding = findings.some((finding) => finding.kind === 'tf');
  const anomaly = hasTfFinding && time >= 134 && time <= 138;
  const handleFrameSelect = useCallback((frame) => setSelectedFrame(frame), []);

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

  const milliseconds = String(Math.round((time % 1) * 1000)).padStart(3, '0');

  return (
    <div className="session-tf-page">
      <PageHeader
        title={`${session.name} · phiên #${session.id}`}
        subtitle={`${bag?.name || 'Rosbag'} / ${formatSessionDate(session.createdAt)}`}
      >
        <Button to="/reviews" variant="secondary" icon="check">Xem hàng đợi duyệt</Button>
      </PageHeader>

      <SessionNavigationTabs sessionId={session.id} activeTab="tf" notify={notify} />

      <div className="two-column wide-left">
        <Card
          className="tf-card"
          title="Không gian TF"
          subtitle="Bố cục 3D minh họa · Kéo để xoay góc nhìn"
          action={(
            <Button
              variant="secondary"
              icon="reset"
              onClick={() => {
                setResetToken((value) => value + 1);
                setSelectedFrame('map');
              }}
            >
              Đặt lại góc nhìn
            </Button>
          )}
        >
          <TfTreeViewer
            onSelect={handleFrameSelect}
            selectedNode={selectedFrame}
            resetToken={resetToken}
            anomaly={anomaly}
          />

          <div className="tf-time">
            <span>
              THỜI ĐIỂM
              <strong>{formatDuration(time)}.{milliseconds}</strong>
            </span>
            <FormField label="Frame đang chọn">
              <select value={selectedFrame} onChange={(event) => setSelectedFrame(event.target.value)}>
                {TF_FRAMES.map((frame) => <option key={frame}>{frame}</option>)}
              </select>
            </FormField>
          </div>

          <input
            type="range"
            className="tf-range"
            aria-label="Thời điểm kiểm tra TF"
            min="130"
            max="145"
            step="0.1"
            value={time}
            onChange={(event) => setTime(Number(event.target.value))}
          />
        </Card>

        <Card title="Chi tiết kết nối">
          <Badge tone={anomaly ? 'red' : 'green'}>
            {anomaly ? 'Cần kiểm tra' : 'Có kết nối trong mẫu'}
          </Badge>
          <h3 className="connection-title">map → odom</h3>
          <dl className="detail-list">
            <dt>Frame đang chọn</dt>
            <dd><code>{selectedFrame}</code></dd>

            <dt>Khoảng bất thường trong mẫu</dt>
            <dd>{hasTfFinding ? '02:14 – 02:18' : 'Không có'}</dd>

            <dt>Quan sát tại thời điểm chọn</dt>
            <dd>
              {anomaly
                ? 'Không tìm thấy biến đổi phù hợp trong dữ liệu mẫu.'
                : 'Có biến đổi trong dữ liệu mẫu tại thời điểm đã chọn.'}
            </dd>

            <dt>Bước kiểm tra tiếp</dt>
            <dd>
              Đối chiếu <code>/tf</code>, <code>/tf_static</code>, nguồn phát và phạm vi ghi.
              Kiểm tra timestamp của phép biến đổi.
            </dd>
          </dl>
        </Card>
      </div>

      <Notice>
        Bố cục 3D chỉ thể hiện quan hệ giữa các frame. Vị trí hiển thị không phải tọa độ robot thực tế.
      </Notice>
    </div>
  );
}
