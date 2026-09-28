import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApp, formatDuration } from '../../../../stored/appStore';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  Notice,
  PageHeader,
} from '../../../../components/common/UIComponents';
import SessionNavigationTabs from './components/SessionNavigationTabs';
import SessionStatCard from './components/SessionStatCard';

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

function SeverityBadge({ level }) {
  return <Badge status={level}>{level === 'high' ? 'Cao' : 'Trung bình'}</Badge>;
}

export default function SessionOverviewPage() {
  const { id } = useParams();
  const { state, notify } = useApp();
  const session = (state.sessions || []).find((item) => item.id === id);
  const findings = (state.findings || []).filter((finding) => finding.sessionId === id);
  const bag = (state.bags || []).find((item) => item.id === session?.bagId);
  const highSeverityCount = findings.filter((finding) => finding.severity === 'high').length;
  const firstFindingId = findings[0]?.id;

  if (!session) {
    return (
      <EmptyState
        icon="search"
        title="Không tìm thấy phiên"
        description="Phiên này không có trong dữ liệu đang lưu trên trình duyệt."
      >
        <Button to="/bags">Về danh sách rosbag</Button>
      </EmptyState>
    );
  }

  return (
    <div className="session-overview-page">
      <PageHeader
        title={`${session.name} · phiên #${session.id}`}
        subtitle={`${bag?.name || 'Rosbag mẫu'} / ${formatSessionDate(session.createdAt)}`}
      >
        <Button to="/reviews" variant="secondary" icon="check">Xem hàng đợi duyệt</Button>
      </PageHeader>

      <SessionNavigationTabs sessionId={session.id} activeTab="overview" notify={notify} />

      <div className="stats-grid">
        <SessionStatCard
          title="Thời lượng ghi"
          value={formatDuration(session.duration)}
          note={`${Number(session.messages || 0).toLocaleString('vi-VN')} message mẫu`}
          icon="clock"
        />
        <SessionStatCard
          title="Topic trong bag"
          value={session.topics}
          note="Theo metadata của bộ mẫu"
          icon="database"
          tone="blue"
        />
        <SessionStatCard
          title="Bất thường phát hiện"
          value={findings.length}
          note={`${highSeverityCount} cao · cần kiểm tra`}
          icon="alert"
          tone="red"
        />
        <SessionStatCard
          title="Thời gian phân tích"
          value={`${session.processingSeconds ?? 0} giây`}
          note="Số liệu minh họa"
          icon="chart"
          tone="green"
        />
      </div>

      {findings.length ? (
        <div className="two-column">
          <Card
            title="Bất thường cần kiểm tra"
            subtitle="Chọn một sự cố để xem bằng chứng và giả thuyết nguyên nhân."
          >
            <div className="finding-list">
              {findings.map((finding) => (
                <Link
                  key={finding.id}
                  to={`/sessions/${session.id}/issues?finding=${finding.id}`}
                  aria-label={`Mở sự cố ${finding.title}`}
                >
                  <i className={finding.severity === 'high' ? 'red-dot' : 'orange-dot'} />
                  <span>
                    <strong>{finding.title}</strong>
                    <small>{finding.interval} · {finding.topic}</small>
                  </span>
                  <SeverityBadge level={finding.severity} />
                  <Icon name="chevron" size={16} />
                </Link>
              ))}
            </div>
          </Card>

          <Card title="Tóm tắt chẩn đoán" className="diagnosis-summary">
            <Badge tone="orange">Cần kỹ sư kiểm tra</Badge>
            <h3>Ưu tiên kiểm tra /scan và TF.</h3>
            <p>
              Các điểm giảm tần số ghi nhận và thiếu biến đổi có thể liên quan đến phạm vi ghi hoặc nguồn phát.
              Chưa đủ bằng chứng để khẳng định lỗi phần cứng.
            </p>
            <div className="summary-boundary">
              <strong>Giới hạn kết luận</strong>
              <span>Phân tích dựa trên log ghi sẵn. Không suy diễn trực tiếp trạng thái robot hiện tại.</span>
            </div>
            <Button to={`/sessions/${session.id}/issues?finding=${firstFindingId}`} icon="arrow">
              Mở chi tiết sự cố
            </Button>
          </Card>
        </div>
      ) : (
        <Card>
          <EmptyState
            icon="success"
            title="Chưa phát hiện bất thường"
            description="Các quy tắc trong phiên mẫu này không phát hiện vấn đề. Kết quả không khẳng định toàn bộ hệ thống không có lỗi."
          >
            <Button to={`/sessions/${session.id}/topics`} variant="secondary" icon="activity">Kiểm tra topic</Button>
          </EmptyState>
        </Card>
      )}

      <Notice>
        Đây là bộ kết quả mô phỏng để thử giao diện. Mọi nhận định phải được người duyệt kiểm tra trước khi đưa vào báo cáo.
      </Notice>
    </div>
  );
}
