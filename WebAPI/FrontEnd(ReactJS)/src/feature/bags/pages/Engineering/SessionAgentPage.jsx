import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApp } from '../../../../stored/appStore';
import {
  Button,
  Card,
  EmptyState,
  Notice,
  PageHeader,
} from '../../../../components/common/UIComponents';
import AgentDiagnosticGraph from './components/AgentDiagnosticGraph';
import SessionNavigationTabs from './components/SessionNavigationTabs';

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

export default function SessionAgentPage() {
  const { id } = useParams();
  const { state, notify } = useApp();
  const session = (state.sessions || []).find((item) => item.id === id);
  const bag = (state.bags || []).find((item) => item.id === session?.bagId);
  const findings = useMemo(
    () => (state.findings || []).filter((finding) => finding.sessionId === session?.id),
    [state.findings, session?.id],
  );
  const suggestedSteps = findings[0]?.steps || [
    'Đối chiếu phạm vi ghi với kịch bản vận hành.',
  ];
  const isEngineer = String(state.role || '').toLowerCase().includes('engineer');

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
    <div className="session-agent-page">
      <PageHeader
        title={`${session.name} · phiên #${session.id}`}
        subtitle={`${bag?.name || 'Rosbag'} / ${formatSessionDate(session.createdAt)}`}
      >
        <Button to="/reviews" variant="secondary" icon="check">Xem hàng đợi duyệt</Button>
      </PageHeader>

      <SessionNavigationTabs sessionId={session.id} activeTab="agent" notify={notify} />

      <AgentDiagnosticGraph />

      <div className="two-column">
        <Card title="Nguyên nhân & bằng chứng">
          {findings.length ? (
            findings.slice(0, 3).map((finding) => (
              <div className="ctrn-evidence" key={finding.id}>
                <strong>{finding.title}</strong>
                <p>{finding.hypothesis}</p>
                <Link to={`/sessions/${session.id}/issues?finding=${finding.id}`}>
                  Mở bằng chứng {finding.id} →
                </Link>
              </div>
            ))
          ) : (
            <p>Chưa có bất thường để đưa ra giả thuyết nguyên nhân.</p>
          )}
        </Card>

        <Card title="Hướng khắc phục đề xuất">
          <ol className="steps-list">
            {suggestedSteps.map((step) => <li key={step}>{step}</li>)}
          </ol>

          <Notice>
            Agent chỉ phân tích log và đề xuất. Không tự gửi lệnh điều khiển hoặc chỉnh cấu hình robot.
          </Notice>

          {isEngineer && (
            <div className="button-row">
              <Button to={`/chat?session=${session.id}`} icon="send">Hỏi Agent</Button>
              <Button to="/reviews" variant="secondary">Duyệt kết luận</Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
