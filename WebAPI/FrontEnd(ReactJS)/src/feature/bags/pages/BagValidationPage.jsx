import React from 'react';
import { useApp, formatBytes, formatDuration } from '../../../stored/appStore';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  Notice,
  PageHeader,
} from '../../../components/common/UIComponents';
import AnalysisStepper from '../components/AnalysisStepper';
import { BAG_VALIDATION_CHECKS, REDACTED_LOG_PREVIEW } from '../constants/bagValidation';

function ValidationStat({ title, value, note, icon, tone = '' }) {
  return (
    <div className={`card stat ${tone}`}>
      <span className="stat-label">{title}</span>
      <span className="stat-icon"><Icon name={icon} /></span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

export default function BagValidationPage() {
  const { state, notify } = useApp();
  const bag = (state.bags || []).find((item) => item.id === state.selectedBagId);

  if (!bag) {
    return (
      <EmptyState
        icon="database"
        title="Chưa chọn dữ liệu"
        description="Chọn một rosbag trước khi kiểm tra metadata và dữ liệu bảo mật."
      >
        <Button to="/bags">Về danh sách rosbag</Button>
      </EmptyState>
    );
  }

  const session = (state.sessions || []).find((item) => item.bagId === bag.id);
  const formattedSize = Number.isFinite(bag.size)
    ? formatBytes(bag.size)
    : Number.isFinite(bag.sizeMb)
      ? `${bag.sizeMb} MB`
      : '—';
  const duration = bag.duration ?? bag.durationSec;
  const topicCount = bag.topics ?? bag.topicCount ?? '—';
  const messageCount = session?.messages ?? 387284;

  return (
    <div className="bag-validation-page">
      <PageHeader
        title="Tạo phiên phân tích"
        subtitle="Đối chiếu thông tin tệp trước khi cấu hình kiểm tra."
      />

      <AnalysisStepper currentStep={2} />

      <Card
        className="upload-card"
        title="Dữ liệu mẫu đã sẵn sàng"
        subtitle={bag.name}
        action={<Badge tone="green">Bước 2 / 3</Badge>}
      >
        <div className="stats-grid three">
          <ValidationStat
            title="Dung lượng tệp"
            value={formattedSize}
            note={String(bag.format || 'Không xác định').toUpperCase()}
            icon="database"
          />
          <ValidationStat
            title="Thời lượng mẫu"
            value={Number.isFinite(duration) ? formatDuration(duration) : '—'}
            note="Không đọc từ nội dung tệp"
            icon="clock"
            tone="blue"
          />
          <ValidationStat
            title="Số topic mẫu"
            value={topicCount}
            note={`${new Intl.NumberFormat('vi-VN').format(messageCount)} message minh họa`}
            icon="activity"
            tone="green"
          />
        </div>

        <ul className="validation-list">
          {BAG_VALIDATION_CHECKS.map((check) => (
            <li key={check.id}>
              <Icon
                name={check.verified ? 'success' : 'info'}
                className={check.verified ? 'green-text' : 'cyan-text'}
              />
              <span>
                <strong>{check.title}</strong>
                <small>
                  {check.getDescription
                    ? check.getDescription(bag, { formattedSize })
                    : check.description}
                </small>
              </span>
            </li>
          ))}
        </ul>

        <Notice tone="orange" icon="warning">
          Thông tin thời lượng, topic và chẩn đoán trong phiên này là mô phỏng, kể cả khi bạn chọn tệp riêng.
        </Notice>

        <section className="ctrn-preprocess" aria-labelledby="preprocess-title">
          <h3 id="preprocess-title">Lọc bảo mật &amp; nén ngữ cảnh</h3>
          <p className="small-note">UC-06 · Bản xem trước dữ liệu mẫu chuẩn bị cho Agent.</p>

          <div className="stats-grid three">
            <ValidationStat
              title="IP nội bộ"
              value="Đã che"
              note="Ví dụ: [IP_REDACTED]"
              icon="shield"
            />
            <ValidationStat
              title="Tọa độ GPS"
              value="Đã che"
              note="Ví dụ: [GPS_REDACTED]"
              icon="shield"
            />
            <ValidationStat
              title="Ngữ cảnh thống kê"
              value="2.000 token"
              note="Ước tính minh họa sau nén"
              icon="file-text"
            />
          </div>

          <pre className="ctrn-log">{REDACTED_LOG_PREVIEW}</pre>

          <Notice>
            Chỉ thống kê và bằng chứng đã lọc được đưa vào ngữ cảnh chẩn đoán. Cấu hình mặc định do Admin quản lý.
          </Notice>
        </section>

        <div className="card-actions between">
          <Button to="/upload" variant="secondary">Quay lại</Button>
          <Button
            icon="arrow"
            onClick={() => notify('Bước cấu hình phân tích sẽ được nối khi triển khai màn hình E06.', 'info')}
          >
            Tiếp tục cấu hình
          </Button>
        </div>
      </Card>
    </div>
  );
}
