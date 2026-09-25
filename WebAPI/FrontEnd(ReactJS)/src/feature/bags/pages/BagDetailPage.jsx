import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp, formatBytes, formatDateTime, formatDuration } from '../../../stored/appStore';
import { ROLES } from '../../../domain/appTypes';
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  FormField,
  Icon,
  Notice,
  PageHeader,
  StatWidget,
} from '../../../components/common/UIComponents';
import BagActionDialog from '../components/BagActionDialog';
import { BAG_SAMPLE_METADATA, BAG_TOPIC_PREVIEW } from '../constants/bagTopics';

function getBagSize(bag) {
  if (Number.isFinite(bag.size)) return formatBytes(bag.size);
  if (Number.isFinite(bag.sizeMb)) return `${bag.sizeMb} MB`;
  return '—';
}

function getBagDuration(bag) {
  const duration = bag.duration ?? bag.durationSec;
  return Number.isFinite(duration) ? formatDuration(duration) : '—';
}

function getStorageId(format) {
  return String(format || '').toUpperCase() === 'MCAP' ? 'mcap' : 'sqlite3';
}

export default function BagDetailPage() {
  const { bagId } = useParams();
  const navigate = useNavigate();
  const { state, dispatch, notify } = useApp();
  const bag = (state.bags || []).find((item) => item.id === bagId);
  const session = (state.sessions || []).find((item) => item.id === bag?.sessionId);
  const isEngineer = state.role === ROLES.ENGINEERING;

  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [bagName, setBagName] = useState(bag?.name || '');

  useEffect(() => {
    setBagName(bag?.name || '');
  }, [bag?.name]);

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

  const isInvalid = bag.status === 'invalid';
  const topicCount = bag.topics ?? bag.topicCount ?? '—';

  const handleRename = (event) => {
    event.preventDefault();
    const nextName = bagName.trim();
    if (!nextName) return;

    dispatch({ type: 'RENAME_BAG', id: bag.id, name: nextName });
    setRenameOpen(false);
    notify('Đã lưu tên rosbag.', 'success');
  };

  const handleDelete = () => {
    dispatch({ type: 'DELETE_BAG', id: bag.id });
    setDeleteOpen(false);
    navigate('/bags');
    notify('Đã xóa rosbag mẫu.', 'info');
  };

  return (
    <div className="bag-detail-page">
      <PageHeader title={bag.name} subtitle="Thông tin rosbag / Metadata & phiên làm việc">
        <Button to="/bags" variant="secondary" icon="right">Danh sách rosbag</Button>
        {isEngineer && (
          <>
            <Button variant="secondary" onClick={() => setRenameOpen(true)}>Đổi tên</Button>
            <Button variant="ghost" icon="x" onClick={() => setDeleteOpen(true)}>Xóa rosbag</Button>
          </>
        )}
      </PageHeader>

      <div className="stats-grid">
        <StatWidget title="Dung lượng" value={getBagSize(bag)} note={bag.format || 'ROS2 bag'} icon="database" />
        <StatWidget title="Thời lượng" value={getBagDuration(bag)} note="Theo bản ghi mẫu" icon="clock" />
        <StatWidget title="Topic" value={topicCount} note="Metadata rosbag2" icon="activity" />
        <StatWidget
          title="Trạng thái"
          value={isInvalid ? 'Thiếu tệp' : 'Sẵn sàng'}
          note="Dữ liệu preview"
          icon="file"
          tone={isInvalid ? 'red' : 'green'}
        />
      </div>

      <div className="two-column">
        <Card title="Metadata bản ghi">
          <dl className="detail-list">
            <dt>Storage ID</dt>
            <dd>{getStorageId(bag.format)}</dd>
            <dt>Thời điểm bắt đầu mẫu</dt>
            <dd>{metadata.startedAt}</dd>
            <dt>Thời điểm kết thúc mẫu</dt>
            <dd>{metadata.endedAt}</dd>
            <dt>Message count</dt>
            <dd>{metadata.messageCount}</dd>
            <dt>Phiên phân tích</dt>
            <dd>{bag.sessionId ? `#${bag.sessionId}` : 'Chưa phân tích'}</dd>
          </dl>

          <div className="button-row">
            {bag.sessionId && (
              <Button to={`/sessions/${bag.sessionId}`} icon="arrow">Mở phiên phân tích</Button>
            )}
            {isEngineer && (
              <Button
                variant="secondary"
                onClick={() => notify('Luồng kiểm tra dữ liệu sẽ được nối khi triển khai màn hình E05.', 'info')}
              >
                Kiểm tra & phân tích
              </Button>
            )}
          </div>
        </Card>

        <Card title="Thành phần rosbag">
          <div className="ctrn-file-row">
            <Icon name="file-text" />
            <span>metadata.yaml</span>
            <Badge tone={isInvalid ? 'orange' : 'green'}>
              {isInvalid ? 'Cần kiểm tra' : 'Mẫu sẵn có'}
            </Badge>
          </div>
          <div className="ctrn-file-row">
            <Icon name="database" />
            <span>{bag.files?.length ? `${bag.files.length} tệp đã chọn` : bag.name}</span>
          </div>
          <Notice tone={isInvalid ? 'orange' : 'blue'}>
            {isInvalid
              ? 'Thiếu một phần bản ghi. Chọn lại đủ metadata.yaml và các tệp dữ liệu trước khi phân tích.'
              : 'Preview trình bày metadata mẫu; việc trích xuất nội dung rosbag do backend rosbag2 đảm nhiệm.'}
          </Notice>
        </Card>
      </div>

      <Card title="Topic & kiểu message">
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

      <BagActionDialog
        open={renameOpen}
        title="Đổi tên rosbag"
        onClose={() => {
          setBagName(bag.name);
          setRenameOpen(false);
        }}
        actions={
          <>
            <Button variant="ghost" onClick={() => setRenameOpen(false)}>Hủy</Button>
            <Button type="submit" form="rename-bag-form">Lưu tên</Button>
          </>
        }
      >
        <form id="rename-bag-form" onSubmit={handleRename}>
          <FormField label="Tên rosbag">
            <input value={bagName} onChange={(event) => setBagName(event.target.value)} required />
          </FormField>
        </form>
      </BagActionDialog>

      <BagActionDialog
        open={deleteOpen}
        title="Xóa rosbag này?"
        onClose={() => setDeleteOpen(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Hủy</Button>
            <Button variant="danger" onClick={handleDelete}>Xác nhận xóa</Button>
          </>
        }
      >
        <p>Xóa rosbag cùng phiên phân tích, kết luận và báo cáo liên quan trong dữ liệu preview.</p>
      </BagActionDialog>
    </div>
  );
}
