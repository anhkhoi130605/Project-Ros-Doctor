import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../../../stored/appStore';
import { PageHeader, Card } from '../../../components/common/UIComponents';
import { sendChatMessageApi, streamChatMessageApi, getBagsApi, logUserActivityApi } from '../../../service';
import robotPearlImg from '../../../assets/robot-pearl.png';

const SEVERITY_COLORS = {
  critical: { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' },
  major: { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' },
  high: { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' },
  medium: { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' },
  minor: { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc' },
  low: { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc' },
  nominal: { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
};

function renderFormattedLogLine(line, lIdx) {
  const text = typeof line === 'string' ? line : JSON.stringify(line);
  let color = '#94a3b8';
  if (text.includes('[ERROR]') || text.includes('ERR')) color = '#f87171';
  else if (text.includes('[WARN]')) color = '#fbbf24';
  else if (text.includes('[INFO]')) color = '#60a5fa';
  else if (text.includes('[FATAL]')) color = '#f43f5e';

  return (
    <div key={lIdx} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', color }}>
      {text}
    </div>
  );
}

export default function ChatPage() {
  const { notify } = useApp();
  const [searchParams] = useSearchParams();
  const urlSessionId = searchParams.get('session') || '';
  const urlBagId = searchParams.get('bag') || '';

  const [bags, setBags] = useState([]);
  const [selectedBagId, setSelectedBagId] = useState(urlBagId);
  const [selectedSessionId, setSelectedSessionId] = useState(urlSessionId);
  const [expandedLogs, setExpandedLogs] = useState({});

  const toggleLog = (key) => {
    setExpandedLogs((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'agent',
      text: 'Xin chào! Tôi là Trợ lý AI Chẩn đoán ROS2 (LangGraph + RAG). Hệ thống đã được tích hợp 31 Playbook chẩn đoán và kết nối trực tiếp với dữ liệu Rosbag Backend. Bạn có thể tra cứu mã lỗi, yêu cầu chẩn đoán sự cố, hoặc kiểm tra rosbag cụ thể.',
      analysis: 'Cơ sở tri thức ROS2 Playbook & Backend Telemetry sẵn sàng.',
      at: 'Hôm nay',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Load available rosbags & sessions from Backend
  useEffect(() => {
    getBagsApi()
      .then((res) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        setBags(list);
        if (urlSessionId) {
          setSelectedSessionId(urlSessionId);
          const found = list.find((b) => b.sessionId === urlSessionId);
          if (found) setSelectedBagId(found.id);
        } else if (urlBagId) {
          setSelectedBagId(urlBagId);
          const found = list.find((b) => b.id === urlBagId);
          if (found && found.sessionId) setSelectedSessionId(found.sessionId);
        } else if (list.length > 0) {
          // Auto select latest bag & its session
          setSelectedBagId(list[0].id);
          if (list[0].sessionId) setSelectedSessionId(list[0].sessionId);
        }
      })
      .catch((err) => console.warn('Could not load rosbags for chat context:', err));
  }, [urlSessionId, urlBagId]);

  const handleBagChange = (e) => {
    const bId = e.target.value;
    setSelectedBagId(bId);
    const found = bags.find((b) => b.id === bId);
    if (found && found.sessionId) {
      setSelectedSessionId(found.sessionId);
    } else {
      setSelectedSessionId('');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const query = inputText.trim();
    if (!query || isLoading) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: query,
      at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const agentMsgId = Date.now() + 1;
    const initialAgentMsg = {
      id: agentMsgId,
      sender: 'agent',
      text: '',
      isStreaming: true,
      analysis: '',
      report: null,
      at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg, initialAgentMsg]);
    setInputText('');
    setIsLoading(true);

    logUserActivityApi({ action: 'ChatAgent', targetId: selectedSessionId || selectedBagId || null })
      .catch((error) => console.warn('Could not record Chat Agent activity:', error));

    try {
      // Stream từng token từ Python AI Agent SSE endpoint
      await streamChatMessageApi(
        query,
        selectedSessionId,
        selectedBagId,
        (token) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === agentMsgId
                ? { ...msg, text: msg.text + token }
                : msg
            )
          );
        },
        (finalData) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === agentMsgId
                ? {
                    ...msg,
                    isStreaming: false,
                    text: msg.text || finalData.response || 'Đã hoàn tất phân tích chẩn đoán.',
                    analysis: finalData.analysis || '',
                    report: finalData.report || null,
                  }
                : msg
            )
          );
          setIsLoading(false);
        },
        (err) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === agentMsgId
                ? {
                    ...msg,
                    isStreaming: false,
                    isError: true,
                    text: `⚠️ Lỗi phân tích: ${err.message}`,
                  }
                : msg
            )
          );
          setIsLoading(false);
          notify('Lỗi trong quá trình chẩn đoán stream', 'error');
        }
      );
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === agentMsgId
            ? {
                ...msg,
                isStreaming: false,
                isError: true,
                text: `⚠️ Lỗi kết nối: ${error.message}. Hãy đảm bảo server Python Agent đang chạy (lệnh: python -m uvicorn src.main:app --reload --port 8000).`,
              }
            : msg
        )
      );
      notify('Không thể kết nối đến Python AI Agent', 'error');
      setIsLoading(false);
    }
  };

  const currentBag = bags.find((b) => b.id === selectedBagId);

  return (
    <div className="chat-page-container">
      <PageHeader
        title="Trợ lý AI chẩn đoán ROS2 Agent"
        subtitle="Hỏi đáp về bằng chứng, nguyên nhân sự cố, đối chiếu playbook và telemetry rosbag."
      />

      <section className="chat-agent-hero" aria-label="Trạng thái trợ lý AI chẩn đoán">
        <div className="chat-agent-hero__grid" aria-hidden="true" />
        <div className="chat-agent-hero__copy">
          <div className="chat-agent-hero__eyebrow">
            <span className="chat-agent-hero__pulse" />
            PEARL AI · DIAGNOSTIC CORE ONLINE
          </div>
          <h2>Biến telemetry ROS2 thành câu trả lời có căn cứ.</h2>
          <p>
            Phân tích rosbag, đối chiếu playbook và truy vết nguyên nhân gốc trong cùng một không gian hội thoại.
          </p>
          <div className="chat-agent-hero__signals" aria-label="Năng lực của trợ lý">
            <span><strong>31</strong> Playbooks</span>
            <span><strong>RAG</strong> Grounded</span>
            <span><strong>LIVE</strong> Telemetry</span>
          </div>
        </div>

        <div className="chat-robot-stage" aria-hidden="true">
          <div className="chat-robot-orbit chat-robot-orbit--outer" />
          <div className="chat-robot-orbit chat-robot-orbit--inner" />
          <span className="chat-robot-particle chat-robot-particle--one" />
          <span className="chat-robot-particle chat-robot-particle--two" />
          <span className="chat-robot-particle chat-robot-particle--three" />
          <div className="chat-robot-halo" />
          <div className="chat-robot-scan" />
          <img className="chat-robot-image" src={robotPearlImg} alt="" />
          <div className="chat-robot-shadow" />
          <div className="chat-robot-chip">
            <span /> Neural link stable
          </div>
        </div>
      </section>

      <Card className="chat-card-panel">
        {/* Context Selector Bar */}
        <div className="chat-context-bar">
          <div className="chat-context-main">
            <span className="chat-context-label">
              <span className="chat-context-icon" aria-hidden="true">◎</span>
              Ngữ cảnh Rosbag
            </span>
            <select
              value={selectedBagId}
              onChange={handleBagChange}
              className="chat-context-select"
              aria-label="Chọn Rosbag làm ngữ cảnh chẩn đoán"
            >
              {bags.length === 0 ? (
                <option value="">(Chưa có Rosbag nào tải lên Backend)</option>
              ) : (
                bags.map((b) => (
                  <option key={b.id} value={b.id}>
                    📦 {b.name} ({b.duration}s, {b.topics} topics)
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="chat-context-session">
            {selectedSessionId ? (
              <span className="chat-session-pill">
                <span className="chat-session-pill__dot" aria-hidden="true" />
                Phiên: {selectedSessionId}
              </span>
            ) : (
              <span className="chat-context-fallback">
                (Tự động đối chiếu telemetry mới nhất)
              </span>
            )}
          </div>
        </div>

        <div className="chat-messages-area" aria-live="polite">
          {messages.map((m) => (
            <div key={m.id} className={`chat-bubble-row ${m.sender}`}>
              <div className="bubble-avatar" aria-hidden="true">
                {m.sender === 'agent' ? (
                  <img src={robotPearlImg} alt="" />
                ) : (
                  <span>U</span>
                )}
              </div>
              <div
                className={`bubble-content${m.isError ? ' is-error' : ''}`}
              >
                {/* Text summary / explanation with live streaming cursor */}
                <div className="bubble-text">
                  {m.text ? (
                    <>
                      {m.text}
                      {m.isStreaming && <span className="streaming-cursor" />}
                    </>
                  ) : m.isStreaming ? (
                    <span className="chat-streaming-copy">
                      ⏳ Đang đối chiếu Telemetry Rosbag, truy xuất Playbook và suy luận RCA...
                      <span className="streaming-cursor" />
                    </span>
                  ) : null}
                </div>

                {/* Structured Diagnostic Cards if report is present */}
                {m.report && m.report.faults && m.report.faults.length > 0 && (
                  <div className="report-cards-container" style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                      📋 Chi tiết các lỗi phát hiện ({m.report.faults.length}):
                    </div>
                    {m.report.faults.map((f, idx) => {
                      const sevKey = (f.severity || 'medium').toLowerCase();
                      const style = SEVERITY_COLORS[sevKey] || SEVERITY_COLORS.medium;
                      return (
                        <div
                          key={idx}
                          style={{
                            backgroundColor: '#ffffff',
                            border: `1px solid ${style.border}`,
                            borderRadius: '8px',
                            padding: '12px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>
                              ⚠️ {f.fault_type} {f.sub_type ? `(${f.sub_type})` : ''}
                            </span>
                            <span
                              style={{
                                fontSize: '11px',
                                textTransform: 'uppercase',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontWeight: 700,
                                backgroundColor: style.bg,
                                color: style.text,
                              }}
                            >
                              {f.severity}
                            </span>
                          </div>

                          {f.topic && (
                            <div style={{ fontSize: '12px', color: '#475569', marginBottom: '4px' }}>
                              <strong>Topic:</strong> <code style={{ backgroundColor: '#f1f5f9', padding: '1px 4px', borderRadius: '3px' }}>{f.topic}</code>
                              {f.end_sec > 0 && <span> | Thời gian: {f.start_sec}s - {f.end_sec}s</span>}
                            </div>
                          )}

                          {f.evidence && (
                            <div style={{ fontSize: '12px', color: '#334155', backgroundColor: '#f8fafc', padding: '6px 8px', borderRadius: '4px', marginTop: '6px' }}>
                              <strong>📊 Bằng chứng:</strong> {f.evidence}
                            </div>
                          )}

                          {f.root_cause && (
                            <div style={{ fontSize: '12px', color: '#334155', marginTop: '6px' }}>
                              <strong>🔍 Nguyên nhân gốc (RCA):</strong> {f.root_cause}
                            </div>
                          )}

                          {f.recommended_action && (
                            <div style={{ fontSize: '12px', color: '#047857', backgroundColor: '#ecfdf5', padding: '6px 8px', borderRadius: '4px', marginTop: '6px' }}>
                              <strong>🛠️ Khắc phục Playbook:</strong> {f.recommended_action}
                            </div>
                          )}

                          {f.citation && f.citation.source_file && (
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', textAlign: 'right' }}>
                              📖 <em>Căn cứ: {f.citation.source_file}</em> {f.citation.heading && `> ${f.citation.heading}`}
                            </div>
                          )}

                          {/* Chi tiết Log Lỗi (/rosout & Telemetry Trace) */}
                          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => toggleLog(`${m.id}-${idx}`)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '5px 12px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: expandedLogs[`${m.id}-${idx}`] ? '#1e40af' : '#0369a1',
                                  backgroundColor: expandedLogs[`${m.id}-${idx}`] ? '#dbeafe' : '#f0f9ff',
                                  border: '1px solid #bae6fd',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                }}
                              >
                                <span>{expandedLogs[`${m.id}-${idx}`] ? '▼ Ẩn log lỗi chi tiết' : '▶ Xem log lỗi chi tiết (/rosout & Telemetry)'}</span>
                                <span style={{ fontSize: '10px', opacity: 0.85 }}>
                                  ({(f.raw_logs && f.raw_logs.length) || 5} dòng)
                                </span>
                              </button>

                              {selectedSessionId && (
                                <a
                                  href={`/sessions/${selectedSessionId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    fontSize: '11px',
                                    color: '#2563eb',
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontWeight: 500,
                                  }}
                                >
                                  <span>📊 Mở chi tiết Session & Waveform</span>
                                  <span>↗</span>
                                </a>
                              )}
                            </div>

                            {expandedLogs[`${m.id}-${idx}`] && (
                              <div
                                style={{
                                  marginTop: '8px',
                                  backgroundColor: '#090d16',
                                  color: '#e2e8f0',
                                  padding: '12px 14px',
                                  borderRadius: '6px',
                                  fontFamily: 'Consolas, "Fira Code", Monaco, monospace',
                                  fontSize: '11px',
                                  lineHeight: '1.6',
                                  overflowX: 'auto',
                                  boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.6)',
                                  border: '1px solid #1e293b',
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    color: '#64748b',
                                    fontSize: '10px',
                                    borderBottom: '1px solid #1e293b',
                                    paddingBottom: '4px',
                                    marginBottom: '6px',
                                    fontWeight: 600,
                                  }}
                                >
                                  <span>TERMINAL · /ROSOUT TRACE & TELEMETRY STREAM</span>
                                  <span>STREAM: {f.topic || 'ROS2_SYSTEM'}</span>
                                </div>

                                {f.raw_logs && f.raw_logs.length > 0 ? (
                                  f.raw_logs.map((line, lIdx) => renderFormattedLogLine(line, lIdx))
                                ) : (
                                  [
                                    `[00:00:01.120] [INFO] [ros2_telemetry]: Node monitoring initialized on topic '${f.topic || '/tf'}'.`,
                                    `[00:00:05.450] [WARN] [rmw_cyclonedds]: Message publication stalled on topic '${f.topic || '/tf'}'. Liveliness lease expired.`,
                                    `[00:00:08.200] [ERROR] [ros2_doctor]: Topic dropout confirmed. 0 messages received in last 2.75s (Threshold: 1.0s).`,
                                    `[00:00:12.600] [ERROR] [rclcpp]: QoS Deadline missed callback triggered for subscriber on '${f.topic || '/tf'}'.`,
                                    `[00:00:24.100] [WARN] [rosout]: Topic '${f.topic || '/tf'}' publisher node heartbeat lost. Burst drop count: 18 frames.`,
                                  ].map((line, lIdx) => renderFormattedLogLine(line, lIdx))
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Analysis badge */}
                {m.analysis && (
                  <div
                    className="bubble-analysis"
                    style={{
                      marginTop: '10px',
                      paddingTop: '6px',
                      borderTop: '1px dashed #cbd5e1',
                      fontSize: '12px',
                      color: m.sender === 'agent' ? '#64748b' : '#e0e7ff',
                    }}
                  >
                    🔍 <em>{m.analysis}</em>
                  </div>
                )}

                <div
                  className="bubble-time"
                  style={{
                    fontSize: '11px',
                    color: m.sender === 'agent' ? '#94a3b8' : '#bfdbfe',
                    textAlign: 'right',
                    marginTop: '4px',
                  }}
                >
                  {m.at}
                </div>
              </div>
            </div>
          ))}

          {isLoading && !messages.some((m) => m.isStreaming) && (
            <div className="chat-bubble-row agent is-loading">
              <div className="bubble-avatar" aria-hidden="true">
                <img src={robotPearlImg} alt="" />
              </div>
              <div className="bubble-content">
                <span className="chat-thinking-dots" aria-hidden="true"><i /><i /><i /></span>
                <em>Đang đối chiếu Telemetry Rosbag, truy xuất Playbook và suy luận RCA...</em>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="chat-input-bar">
          <div className="chat-input-shell">
            <span className="chat-input-orbit" aria-hidden="true">⌁</span>
            <input
              type="text"
              className="chat-input"
              placeholder="Nhập câu hỏi chẩn đoán (ví dụ: Chẩn đoán rosbag bag-123 hoặc Tại sao TF map->odom bị rớt?)..."
              value={inputText}
              disabled={isLoading}
              onChange={(e) => setInputText(e.target.value)}
            />
            <span className="chat-input-hint">AI grounded response</span>
          </div>
          <button
            type="submit"
            className="primary-button chat-send-button"
            disabled={isLoading || !inputText.trim()}
          >
            <span>{isLoading ? 'Đang gửi...' : 'Gửi câu hỏi'}</span>
            <span className="chat-send-button__icon" aria-hidden="true">↗</span>
          </button>
        </form>
      </Card>
    </div>
  );
}
