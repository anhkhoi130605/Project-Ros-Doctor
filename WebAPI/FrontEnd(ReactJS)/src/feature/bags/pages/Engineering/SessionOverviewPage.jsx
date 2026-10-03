import React, { useEffect, useCallback, useRef } from 'react';
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
import { runAgentDiagnosticApi } from '../../../../service';

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
  const norm = String(level || '').toLowerCase();
  return <Badge status={norm === 'high' || norm === 'critical' ? 'high' : 'medium'}>{norm.toUpperCase()}</Badge>;
}

export default function SessionOverviewPage() {
  const { id } = useParams();
  const { state, dispatch, notify } = useApp();
  let session = (state.sessions || []).find((item) => item.id === id);
  let bag = (state.bags || []).find((item) => item.id === session?.bagId || item.sessionId === id || item.id === id);

  if (!session && bag) {
    session = {
      id: id,
      bagId: bag.id,
      name: (bag.name || 'Rosbag').replace(/\.[^/.]+$/, ''),
      duration: bag.duration ?? bag.durationSec ?? 0,
      topics: bag.topics ?? bag.topicCount ?? 0,
      messages: bag.totalMessages ?? 0,
      status: bag.status || 'complete',
      createdAt: bag.date || new Date().toISOString(),
      processingSeconds: bag.processingSeconds || 0,
      isDemo: false,
      healthScore: bag.healthScore ?? 100,
      realTopics: bag.realTopics || [],
      realTimeline: bag.realTimeline || null,
    };
  }

  const findings = (state.findings || []).filter((finding) => finding.sessionId === session?.id);
  const highSeverityCount = findings.filter((finding) => finding.severity === 'high' || finding.severity === 'critical').length;
  const firstFindingId = findings[0]?.id;

  // Dùng ref để giữ stable reference, tránh vòng lặp vô hạn trong useEffect
  const sessionRef = useRef(session);
  const findingsRef = useRef(findings);
  const bagRef = useRef(bag);
  sessionRef.current = session;
  findingsRef.current = findings;
  bagRef.current = bag;

  const triggerAgentAnalysis = useCallback(async () => {
    const s = sessionRef.current;
    if (!s) return;
    dispatch({ type: 'SET_AGENT_ANALYSIS', sessionId: s.id, status: 'analyzing' });
    try {
      const res = await runAgentDiagnosticApi({
        session: s,
        findings: findingsRef.current,
        topics: s.realTopics || bagRef.current?.realTopics || [],
      });
      dispatch({
        type: 'SET_AGENT_ANALYSIS',
        sessionId: s.id,
        status: 'completed',
        report: res.report || null,
        response: res.response || '',
      });
      notify('AI Agent đã hoàn thành phân tích Root Cause Analysis (RCA)!', 'success');
    } catch (err) {
      console.error('Agent analysis error:', err);
      dispatch({
        type: 'SET_AGENT_ANALYSIS',
        sessionId: s.id,
        status: 'error',
        error: err.message || 'Không thể kết nối Python AI Agent (port 8000)',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, notify]);

  const triggeredSessionsRef = useRef(new Set());

  // Tự động kích hoạt AI Agent phân tích khi mở phiên nếu chưa có báo cáo.
  // Chỉ chạy một lần duy nhất cho mỗi session.id.
  useEffect(() => {
    const s = sessionRef.current;
    if (!s || !s.id) return;
    if (!s.agentReport && (!s.agentStatus || s.agentStatus === 'idle')) {
      if (!triggeredSessionsRef.current.has(s.id)) {
        triggeredSessionsRef.current.add(s.id);
        triggerAgentAnalysis();
      }
    }
  }, [session?.id, triggerAgentAnalysis]);

  if (!session) {
    return (
      <EmptyState
        icon="search"
        title="Không tìm thấy phiên"
        description="Phiên này không có trong dữ liệu hệ thống."
      >
        <Button to="/bags">Về danh sách rosbag</Button>
      </EmptyState>
    );
  }

  const agentReport = session.agentReport;
  const agentStatus = session.agentStatus || 'idle';
  const primaryFault = agentReport?.faults?.[0];

  return (
    <div className="session-overview-page">
      <PageHeader
        title={`${session.name} · phiên #${session.id}`}
        subtitle={`${bag?.name || session.name} / ${formatSessionDate(session.createdAt)}`}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button onClick={triggerAgentAnalysis} variant="secondary" icon="refresh">
            {agentStatus === 'analyzing' ? 'Đang phân tích...' : 'Chạy lại AI Agent'}
          </Button>
          <Button to="/reviews" variant="secondary" icon="check">Xem hàng đợi duyệt</Button>
        </div>
      </PageHeader>

      <SessionNavigationTabs sessionId={session.id} activeTab="overview" notify={notify} />

      <div className="stats-grid">
        <SessionStatCard
          title="Thời lượng ghi"
          value={formatDuration(session.duration)}
          note={`${Number(session.messages || 0).toLocaleString('vi-VN')} message`}
          icon="clock"
        />
        <SessionStatCard
          title="Topic trong bag"
          value={session.topics}
          note="Từ tệp .db3 thực tế"
          icon="database"
          tone="blue"
        />
        <SessionStatCard
          title="Bất thường đo đạc"
          value={findings.length}
          note={`${highSeverityCount} mức cao / nghiêm trọng`}
          icon="alert"
          tone={findings.length > 0 ? 'red' : 'green'}
        />
        <SessionStatCard
          title="Thời gian xử lý"
          value={`${session.processingSeconds ?? 0}s`}
          note="Thời gian thực thi trích xuất"
          icon="chart"
          tone="green"
        />
      </div>

      <div className="two-column">
        <Card
          title="Bất thường đo đạc (Telemetry Findings)"
          subtitle={findings.length ? "Chọn một sự cố để xem số liệu chi tiết và đối chiếu." : "Chưa phát hiện bất thường đo đạc."}
        >
          {findings.length ? (
            <div className="finding-list">
              {findings.map((finding) => (
                <Link
                  key={finding.id}
                  to={`/sessions/${session.id}/issues?finding=${finding.id}`}
                  aria-label={`Mở sự cố ${finding.title}`}
                >
                  <i className={finding.severity === 'high' || finding.severity === 'critical' ? 'red-dot' : 'orange-dot'} />
                  <span>
                    <strong>{finding.title}</strong>
                    <small>{finding.interval} · {finding.topic}</small>
                  </span>
                  <SeverityBadge level={finding.severity} />
                  <Icon name="chevron" size={16} />
                </Link>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--muted)', margin: '16px 0' }}>
              Thuật toán thống kê không ghi nhận mất gói hay lệch timestamp bất thường.
            </p>
          )}
        </Card>

        {/* Dynamic AI Agent Diagnosis Card */}
        <Card title="Chẩn đoán AI Agent (RAG RCA)" className="diagnosis-summary">
          {agentStatus === 'analyzing' && (
            <div style={{ padding: '16px 0', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>🤖 ⚙️</div>
              <strong style={{ fontSize: '15px', display: 'block', color: 'var(--text)' }}>
                AI Agent đang phân tích Root Cause Analysis...
              </strong>
              <small style={{ color: 'var(--muted)', display: 'block', marginTop: '6px' }}>
                Đang truy xuất kiến thức 6 miền lỗi từ ChromaDB & lập giả thuyết nguyên nhân gốc rễ.
              </small>
            </div>
          )}

          {agentStatus === 'error' && (
            <div style={{ padding: '12px 0' }}>
              <Badge tone="red">Lỗi kết nối Agent</Badge>
              <p style={{ color: '#ef4444', margin: '8px 0', fontSize: '13px' }}>
                {session.agentError || 'Không thể liên lạc với Python Agent.'}
              </p>
              <small style={{ color: 'var(--muted)', display: 'block', marginBottom: '12px' }}>
                Kiểm tra server Python Agent: <code>uvicorn src.main:app --port 8000</code>
              </small>
              <Button onClick={triggerAgentAnalysis} variant="secondary" icon="refresh">
                Thử kết nối lại
              </Button>
            </div>
          )}

          {agentStatus !== 'analyzing' && agentStatus !== 'error' && (
            <div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                <Badge tone={agentReport?.has_fault || findings.length > 0 ? 'red' : 'green'}>
                  {agentReport?.has_fault || findings.length > 0 ? 'Phát hiện sự cố' : 'Nominal Clean'}
                </Badge>
                {primaryFault?.fault_type && (
                  <Badge tone="purple">{primaryFault.fault_type.toUpperCase()}</Badge>
                )}
                {primaryFault?.severity && (
                  <Badge tone="orange">{primaryFault.severity.toUpperCase()}</Badge>
                )}
              </div>

              <h3 style={{ margin: '8px 0', fontSize: '16px', lineHeight: '1.4' }}>
                {primaryFault?.topic
                  ? `Sự cố tại topic ${primaryFault.topic}: ${primaryFault.sub_type || primaryFault.fault_type}`
                  : (agentReport?.summary || 'Kết luận phân tích từ AI Agent')}
              </h3>

              <div style={{
                maxHeight: '180px',
                overflowY: 'auto',
                fontSize: '13px',
                lineHeight: '1.6',
                color: 'var(--text)',
                margin: '10px 0',
                padding: '8px 12px',
                background: 'var(--bg-subtle, #f8fafc)',
                borderRadius: '6px',
                border: '1px solid var(--border)'
              }}>
                <strong>Phân tích nguyên nhân (RCA):</strong>
                <p style={{ margin: '4px 0 8px', whiteSpace: 'pre-line' }}>
                  {primaryFault?.root_cause || agentReport?.summary || session.agentResponse || 'Agent đã tổng hợp dữ liệu.'}
                </p>
                {primaryFault?.evidence && (
                  <div>
                    <strong>Bằng chứng số liệu:</strong>
                    <p style={{ margin: '4px 0', color: 'var(--muted)' }}>{primaryFault.evidence}</p>
                  </div>
                )}
              </div>

              {primaryFault?.recommended_action && (
                <div style={{
                  padding: '10px 12px',
                  background: '#eff6ff',
                  borderRadius: '6px',
                  borderLeft: '3px solid #2563eb',
                  marginBottom: '12px'
                }}>
                  <strong style={{ fontSize: '12px', color: '#1e40af', display: 'block' }}>Khuyến nghị khắc phục:</strong>
                  <span style={{ fontSize: '12px', color: '#1e3a8a' }}>{primaryFault.recommended_action}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <Button to={`/sessions/${session.id}/agent`} icon="arrow">
                  Xem toàn bộ Playbook & Đồ thị RCA →
                </Button>
                {firstFindingId && (
                  <Button to={`/sessions/${session.id}/issues?finding=${firstFindingId}`} variant="secondary">
                    Xem chi tiết sự cố
                  </Button>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>

      <Notice>
        Báo cáo phân tích tự động từ Python AI Agent (LangGraph + RAG Playbook). Mọi hành động kỹ thuật cần được kỹ sư phê duyệt.
      </Notice>
    </div>
  );
}
