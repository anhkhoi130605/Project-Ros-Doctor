import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useApp, formatBytes, formatDateTime, formatDuration } from '../../../../stored/appStore';
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Icon,
  Notice,
  PageHeader,
  StatWidget,
} from '../../../../components/common/UIComponents';
import { BAG_SAMPLE_METADATA, BAG_TOPIC_PREVIEW } from '../../constants/bagTopics';

function getBagSize(bag) {
  if (Number.isFinite(bag.size)) return formatBytes(bag.size);
  if (Number.isFinite(bag.sizeMb)) return `${bag.sizeMb} MB`;
  return '—';
}

function getBagDuration(bag) {
  const duration = bag.duration ?? bag.durationSec;
  return Number.isFinite(duration) ? formatDuration(duration) : '—';
}

export default function UserBagDetailPage() {
  const { bagId } = useParams();
  const { state } = useApp();
  const bag = (state.bags || []).find((item) => item.id === bagId);
  const session = (state.sessions || []).find((item) => item.id === bag?.sessionId);

  const metadata = useMemo(() => {
    const sample = BAG_SAMPLE_METADATA[bagId] || {};
    return {
      startedAt: sample.startedAt || formatDateTime(bag?.date),
      endedAt: sample.endedAt || 'Chưa có dữ liệu',
      messageCount: session?.messages
        ? `${new Intl.NumberFormat('vi-VN').format(session.messages)} (mẫu)`
        : 'Chưa có dữ liệu',
    };
  }, [bag?.date, bagId, session?.messages]);

  if (!bag) {
    return (
      <EmptyState
        icon="database"
        title="Không tìm thấy rosbag"
        description="Rosbag không tồn tại hoặc bạn chưa được cấp quyền truy cập."
      >
        <Button to="/bags" icon="right">Về danh sách rosbag</Button>
      </EmptyState>
    );
  }

  const topicCount = bag.topics ?? bag.topicCount ?? '—';

  return (
    <div className="bag-detail-page user-bag-detail-page">
      <PageHeader
        eyebrow="USER · CHỈ XEM"
        title={bag.name}
        subtitle="Thông tin bản ghi ROS2 chia sẻ · Dữ liệu đã xác thực"
      >
        <Badge tone="blue">• Quyền Người xem (Chỉ đọc)</Badge>
        <Button to="/bags" variant="secondary" icon="right">
          Danh sách rosbag
        </Button>
      </PageHeader>

      <div className="stats-grid">
        <StatWidget title="Dung lượng" value={getBagSize(bag)} note={bag.format || 'ROS2 bag'} icon="database" />
        <StatWidget title="Thời lượng" value={getBagDuration(bag)} note="Theo bản ghi mẫu" icon="clock" />
        <StatWidget title="Topic" value={topicCount} note="Metadata rosbag2" icon="activity" />
        <StatWidget
          title="Trạng thái"
          value="Đã công bố"
          note="Dữ liệu quan sát"
          icon="check"
          tone="green"
        />
      </div>

      <div className="two-column">
        <Card title="Metadata bản ghi">
          <dl className="detail-list">
            <dt>Mã lưu trữ</dt>
            <dd>{String(bag.format || '').toUpperCase() === 'MCAP' ? 'mcap' : 'sqlite3'}</dd>
            <dt>Thời điểm bắt đầu</dt>
            <dd>{metadata.startedAt}</dd>
            <dt>Thời điểm kết thúc</dt>
            <dd>{metadata.endedAt}</dd>
            <dt>Số message ghi nhận</dt>
            <dd>{metadata.messageCount}</dd>
            <dt>Phiên phân tích</dt>
            <dd>{bag.sessionId ? `#${bag.sessionId}` : 'Chưa có phiên phân tích'}</dd>
          </dl>

          <div className="button-row">
            {bag.sessionId && (
              <Button to={`/sessions/${bag.sessionId}/overview`} icon="arrow">
                Mở phiên chẩn đoán
              </Button>
            )}
          </div>
        </Card>

        <Card title="Thành phần rosbag">
          <div className="ctrn-file-row">
            <Icon name="file-text" />
            <span>metadata.yaml</span>
            <Badge tone="green">Đã kiểm tra</Badge>
          </div>
          <div className="ctrn-file-row">
            <Icon name="database" />
            <span>{bag.files?.length ? `${bag.files.length} tệp dữ liệu` : bag.name}</span>
          </div>
          <Notice tone="blue">
            Bản ghi này đã được kỹ sư kiểm tra tính toàn vẹn và công bố cho người dùng quan sát.
          </Notice>
        </Card>
      </div>

      <Card title="Topic & kiểu message ghi nhận">
        <DataTable
          label="Metadata topic"
          rows={BAG_TOPIC_PREVIEW}
          columns={[
            { key: 'name', label: 'TOPIC' },
            { key: 'type', label: 'MESSAGE TYPE' },
            {
              key: 'hz',
              label: 'TẦN SỐ MẪU',
              render: (topic) => (topic.hz ? `${topic.hz} Hz` : 'Theo sự kiện'),
            },
          ]}
        />
      </Card>
    </div>
  );
}
