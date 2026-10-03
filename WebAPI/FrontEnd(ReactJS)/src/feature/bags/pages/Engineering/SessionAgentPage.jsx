import React, { useMemo, useEffect, useCallback, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApp } from '../../../../stored/appStore';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Notice,
  PageHeader,
} from '../../../../components/common/UIComponents';
import AgentDiagnosticGraph from './components/AgentDiagnosticGraph';
import SessionNavigationTabs from './components/SessionNavigationTabs';
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

export default function SessionAgentPage() {
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

  const findings = useMemo(
    () => (state.findings || []).filter((finding) => finding.sessionId === session?.id),
    [state.findings, session?.id],
  );

  const isEngineer = String(state.role || '').toLowerCase().includes('engineer') || String(state.role || '').toLowerCase() === 'admin';
  const agentStatus = session?.agentStatus || 'idle';
  const agentReport = session?.agentReport;
  const agentResponse = session?.agentResponse;

  const sessionRef = useRef(session);
  const findingsRef = useRef(findings);
  const bagRef = useRef(bag);
  sessionRef.current = session;
  findingsRef.current = findings;
  bagRef.current = bag;

  const triggeredSessionsRef = useRef(new Set());

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
  }, [dispatch, notify]);

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
        description="Phiên chẩn đoán không tồn tại hoặc đã bị xóa."
      >
        <Button to="/bags" icon="arrow">Về danh sách rosbag</Button>
      </EmptyState>
    );
  }

  const faults = agentReport?.faults || [];

  return (
    <div className="session-agent-page">
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

      <SessionNavigationTabs sessionId={session.id} activeTab="agent" notify={notify} />

      <AgentDiagnosticGraph
        status={agentStatus}
        findingsCount={findings.length}
        hasFault={agentReport?.has_fault || faults.length > 0}
        sourcesCount={faults.length}
      />

      {/* Loading state */}
      {agentStatus === 'analyzing' && (
        <Card style={{ textAlign: 'center', padding: '32px 16px', margin: '20px 0' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🤖 ⚙️ 🔍</div>
          <h3 style={{ margin: '0 0 8px' }}>AI Agent đang thực hiện Root Cause Analysis (RCA)</h3>
          <p style={{ color: 'var(--muted)', margin: 0 }}>
            Đang đối chiếu dữ liệu telemetry với 6 miền lỗi chuẩn và tài liệu kịch bản trong ChromaDB...
          </p>
        </Card>
      )}

      {/* Error state */}
      {agentStatus === 'error' && (
        <Card style={{ margin: '20px 0', borderLeft: '4px solid #ef4444' }}>
          <Badge tone="red">Lỗi kết nối AI Agent</Badge>
          <p style={{ color: '#ef4444', margin: '12px 0' }}>
            {session.agentError || 'Không thể liên lạc với server Python AI Agent.'}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Vui lòng kiểm tra terminal backend Python: <code>uvicorn src.main:app --port 8000</code>
          </p>
          <Button onClick={triggerAgentAnalysis} variant="secondary" icon="refresh">
            Thử lại kết nối
          </Button>
        </Card>
      )}

      {/* Completed state */}
      {agentStatus !== 'analyzing' && agentStatus !== 'error' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', margin: '20px 0' }}>
          {/* Executive RCA Summary */}
          <Card title="Kết luận chẩn đoán tổng quan (RCA Executive Summary)">
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
              <Badge tone={agentReport?.has_fault || faults.length > 0 ? 'red' : 'green'}>
                {agentReport?.has_fault || faults.length > 0 ? 'Phát hiện sự cố' : 'Nominal Clean Baseline (Bình thường)'}
              </Badge>
              <Badge tone="blue">{faults.length} Miền lỗi kích hoạt</Badge>
              <Badge tone="purple">Độ tin cậy cao (RAG Playbook)</Badge>
            </div>

            <p style={{ fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-line', color: 'var(--text)' }}>
              {agentReport?.summary || agentResponse || 'Agent đã hoàn tất phân tích telemetry.'}
            </p>
          </Card>

          {/* Faults breakdown by 6 Domains */}
          {faults.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ margin: '8px 0 0', fontSize: '18px' }}>
                Chi tiết chẩn đoán 6 Miền lỗi & Kịch bản khắc phục
              </h3>
              {faults.map((fault, idx) => (
                <Card
                  key={idx}
                  title={`#${idx + 1}. Miền lỗi: ${fault.fault_type?.toUpperCase()} · Topic: ${fault.topic || 'Hệ thống'}`}
                  action={
                    <Badge tone={fault.severity === 'critical' || fault.severity === 'major' ? 'red' : 'orange'}>
                      {String(fault.severity || 'MEDIUM').toUpperCase()}
                    </Badge>
                  }
                >
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', margin: '8px 0' }}>
                    {/* Root Cause Mechanism */}
                    <div style={{ padding: '12px 14px', background: 'var(--bg-subtle, #f8fafc)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <strong style={{ display: 'block', color: 'var(--text)', marginBottom: '6px' }}>
                        🔍 Cơ chế nguyên nhân gốc rễ (Root Cause):
                      </strong>
                      <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', color: 'var(--text)' }}>
                        {fault.root_cause || 'Đang xác định cơ chế hư hỏng.'}
                      </p>
                      {fault.sub_type && (
                        <small style={{ display: 'block', marginTop: '6px', color: 'var(--muted)' }}>
                          Kiểu lỗi phụ: <code>{fault.sub_type}</code>
                        </small>
                      )}
                    </div>

                    {/* Numerical Evidence */}
                    <div style={{ padding: '12px 14px', background: 'var(--bg-subtle, #f8fafc)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <strong style={{ display: 'block', color: 'var(--text)', marginBottom: '6px' }}>
                        📊 Bằng chứng số liệu đo đạc (Telemetry Evidence):
                      </strong>
                      <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', color: 'var(--text)' }}>
                        {fault.evidence || 'Bất thường ghi nhận trong khoảng thời gian phân tích.'}
                      </p>
                      {(fault.start_sec > 0 || fault.end_sec > 0) && (
                        <small style={{ display: 'block', marginTop: '6px', color: 'var(--muted)' }}>
                          Khoảng thời gian ảnh hưởng: <strong>{fault.start_sec}s - {fault.end_sec}s</strong>
                        </small>
                      )}
                    </div>
                  </div>

                  {/* Remediation Playbook */}
                  {fault.recommended_action && (
                    <div style={{
                      marginTop: '12px',
                      padding: '12px 16px',
                      background: '#eff6ff',
                      borderRadius: '8px',
                      borderLeft: '4px solid #2563eb',
                    }}>
                      <strong style={{ display: 'block', color: '#1e40af', marginBottom: '6px' }}>
                        🛠️ Kịch bản khắc phục đề xuất (Remediation Playbook):
                      </strong>
                      <div style={{ fontSize: '13px', color: '#1e3a8a', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                        {fault.recommended_action}
                      </div>
                      {fault.citation?.source_file && (
                        <small style={{ display: 'block', marginTop: '8px', color: '#3b82f6' }}>
                          Trích dẫn tài liệu Playbook: <code>{fault.citation.source_file}</code> ({fault.citation.heading || 'Quy chuẩn'})
                        </small>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card title="Trạng thái hệ thống">
              <p style={{ color: 'var(--muted)' }}>
                Toàn bộ dữ liệu telemetry nằm trong phạm vi danh nghĩa (Nominal Clean Baseline). Không phát hiện dấu hiệu bất thường về tần số, mất gói hay clock drift.
              </p>
            </Card>
          )}

          {/* Full Markdown explanation from LLM if available */}
          {agentResponse && faults.length === 0 && (
            <Card title="Báo cáo phân tích chuyên sâu từ Agent">
              <div style={{ fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-line', color: 'var(--text)' }}>
                {agentResponse}
              </div>
            </Card>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
            <Notice>
              Agent chẩn đoán và đề xuất playbook dựa trên RAG Knowledge Base. Kỹ sư cần xác nhận trước khi thực thi lệnh lên robot thực.
            </Notice>

            {isEngineer && (
              <div className="button-row" style={{ display: 'flex', gap: '8px' }}>
                <Button to={`/chat?session=${session.id}`} icon="send">
                  Hỏi sâu hơn trong Chat
                </Button>
                <Button to="/reviews" variant="secondary">
                  Duyệt kết luận (HITL)
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
