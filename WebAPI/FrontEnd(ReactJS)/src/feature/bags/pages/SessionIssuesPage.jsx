import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../../../stored/appStore';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  FormField,
  Notice,
  PageHeader,
} from '../../../components/common/UIComponents';
import BagActionDialog from '../components/BagActionDialog';
import FindingEvidence from '../components/FindingEvidence';
import SessionNavigationTabs from '../components/SessionNavigationTabs';

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

function evidencePath(sessionId, kind) {
  if (kind === 'tf') return `/sessions/${sessionId}/tf`;
  if (kind === 'clock') return `/sessions/${sessionId}/sync`;
  return `/sessions/${sessionId}/topics`;
}

export default function SessionIssuesPage() {
  const { id } = useParams();
  const { state, dispatch, notify } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [note, setNote] = useState('');

  const session = (state.sessions || []).find((item) => item.id === id);
  const bag = (state.bags || []).find((item) => item.id === session?.bagId);
  const findings = useMemo(
    () => (state.findings || []).filter((finding) => finding.sessionId === session?.id),
    [state.findings, session?.id],
  );
  const selectedFinding = findings.find((finding) => finding.id === searchParams.get('finding')) || findings[0];
  const isEngineer = String(state.role || '').toLowerCase().includes('engineer');

  useEffect(() => {
    if (!searchParams.get('finding') && selectedFinding) {
      setSearchParams({ finding: selectedFinding.id }, { replace: true });
    }
  }, [searchParams, selectedFinding, setSearchParams]);

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

  return (
    <div className="session-issues-page">
      <PageHeader
        title={`${session.name} · phiên #${session.id}`}
        subtitle={`${bag?.name || 'Rosbag'} / ${formatSessionDate(session.createdAt)}`}
      >
        <Button to="/reviews" variant="secondary" icon="check">Xem hàng đợi duyệt</Button>
      </PageHeader>

      <SessionNavigationTabs sessionId={session.id} activeTab="issues" notify={notify} />

      {selectedFinding ? (
        <>
          <div className="issues-layout">
            <Card
              title="Sự cố phát hiện"
              subtitle={`${findings.length} bất thường trong phiên phân tích`}
            >
              <div className="issue-selector">
                {findings.map((finding) => (
                  <button
                    type="button"
                    key={finding.id}
                    className={selectedFinding.id === finding.id ? 'active' : ''}
                    aria-pressed={selectedFinding.id === finding.id}
                    onClick={() => setSearchParams({ finding: finding.id })}
                  >
                    <strong>{finding.title}</strong>
                    <small>{finding.interval}</small>
                    <SeverityBadge level={finding.severity} />
                  </button>
                ))}
              </div>
            </Card>

            <div className="stack">
              <Card
                title={selectedFinding.title}
                subtitle={`${selectedFinding.id} · ${selectedFinding.interval}`}
                action={<SeverityBadge level={selectedFinding.severity} />}
              >
                <p className="observation">{selectedFinding.observation}</p>
                <Notice>
                  Đây là quan sát từ dữ liệu mẫu; chưa đủ để khẳng định nguyên nhân gốc.
                </Notice>
              </Card>

              <Card title="Bằng chứng">
                <FindingEvidence finding={selectedFinding} />
              </Card>

              <Card
                title="Nhận định AI"
                action={<Badge status={selectedFinding.review?.status || 'pending'} />}
              >
                <p className="body-copy">{selectedFinding.analystNote}</p>
                <div className="section-label">Đề xuất kiểm tra</div>
                <ol className="steps-list">
                  {selectedFinding.steps.map((step) => <li key={step}>{step}</li>)}
                </ol>

                <div className="card-actions between">
                  <Button
                    to={evidencePath(session.id, selectedFinding.kind)}
                    variant="secondary"
                    icon="activity"
                  >
                    Xem bằng chứng liên quan
                  </Button>
                  <Button
                    variant="secondary"
                    icon="review"
                    disabled={!isEngineer}
                    onClick={() => {
                      setNote(selectedFinding.analystNote || '');
                      setDialogOpen(true);
                    }}
                  >
                    Chỉnh sửa nhận định
                  </Button>
                </div>
              </Card>
            </div>
          </div>

          <BagActionDialog
            open={dialogOpen}
            title="Nhận định người phân tích"
            onClose={() => setDialogOpen(false)}
            actions={(
              <>
                <Button variant="ghost" onClick={() => setDialogOpen(false)}>Hủy</Button>
                <Button
                  onClick={() => {
                    if (!note.trim()) {
                      notify('Nhận định không được để trống.', 'warning');
                      return;
                    }
                    dispatch({ type: 'SAVE_NOTE', id: selectedFinding.id, note });
                    setDialogOpen(false);
                    notify('Đã lưu nhận định. Kết luận được đưa về trạng thái chờ duyệt.', 'success');
                  }}
                >
                  Lưu nhận định
                </Button>
              </>
            )}
          >
            <FormField label="Nhận định">
              <textarea
                rows="7"
                maxLength="2000"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </FormField>
            <Notice>
              Sửa nhận định sẽ yêu cầu duyệt lại. Báo cáo đã chứa kết luận này được đánh dấu cần cập nhật.
            </Notice>
          </BagActionDialog>
        </>
      ) : (
        <Card>
          <EmptyState
            icon="success"
            title="Chưa phát hiện bất thường"
            description="Phiên phân tích này chưa có sự cố cần chẩn đoán."
          >
            <Button to={`/sessions/${session.id}/overview`} variant="secondary">Về tổng quan phiên</Button>
          </EmptyState>
        </Card>
      )}
    </div>
  );
}
