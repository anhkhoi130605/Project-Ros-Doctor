import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../../stored/appStore';
import { PageHeader, Card } from '../../../components/common/UIComponents';
import { sendChatMessageApi } from '../../../service';

const SEVERITY_COLORS = {
  critical: { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' },
  major: { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' },
  medium: { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' },
  minor: { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc' },
  nominal: { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
};

export default function ChatPage() {
  const { notify } = useApp();
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

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      // Gọi trực tiếp đến Python AI Agent RAG API
      const result = await sendChatMessageApi(query);

      const agentMsg = {
        id: Date.now() + 1,
        sender: 'agent',
        text: result.response || 'Đã hoàn tất phân tích chẩn đoán.',
        analysis: result.analysis || '',
        report: result.report || null,
        at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, agentMsg]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg = {
        id: Date.now() + 1,
        sender: 'agent',
        text: `⚠️ Lỗi kết nối: ${error.message}. Hãy đảm bảo server Python Agent đang chạy (lệnh: uvicorn src.main:app --reload --port 8000).`,
        at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
      notify('Không thể kết nối đến Python AI Agent', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-page-container">
      <PageHeader
        title="Trợ lý AI chẩn đoán ROS2 Agent"
        subtitle="Hỏi đáp về bằng chứng, nguyên nhân sự cố, đối chiếu playbook và telemetry rosbag."
      />

      <Card className="chat-card-panel">
        <div className="chat-messages-area" style={{ maxHeight: '640px', overflowY: 'auto', padding: '16px' }}>
          {messages.map((m) => (
            <div key={m.id} className={`chat-bubble-row ${m.sender}`} style={{ marginBottom: '20px' }}>
              <div className="bubble-avatar" style={{ fontSize: '20px', marginRight: '8px' }}>
                {m.sender === 'agent' ? '🤖' : '👤'}
              </div>
              <div
                className="bubble-content"
                style={{
                  maxWidth: '88%',
                  backgroundColor: m.sender === 'agent' ? (m.isError ? '#fee2e2' : '#f8fafc') : '#2563eb',
                  color: m.sender === 'agent' ? (m.isError ? '#991b1b' : '#0f172a') : '#ffffff',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  border: m.sender === 'agent' ? '1px solid #e2e8f0' : 'none',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                {/* Text summary / explanation */}
                <div className="bubble-text" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '14px' }}>
                  {m.text}
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

          {isLoading && (
            <div className="chat-bubble-row agent" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center' }}>
              <div className="bubble-avatar" style={{ fontSize: '20px', marginRight: '8px' }}>
                🤖
              </div>
              <div
                className="bubble-content"
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  padding: '10px 16px',
                  borderRadius: '12px',
                  fontSize: '13px',
                }}
              >
                ⏳ <em>Đang đối chiếu Telemetry Rosbag, truy xuất Playbook và suy luận RCA...</em>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="chat-input-bar" style={{ display: 'flex', gap: '8px', padding: '12px' }}>
          <input
            type="text"
            className="chat-input"
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              outline: 'none',
            }}
            placeholder="Nhập câu hỏi chẩn đoán (ví dụ: Chẩn đoán rosbag bag-123 hoặc Tại sao TF map->odom bị rớt?)..."
            value={inputText}
            disabled={isLoading}
            onChange={(e) => setInputText(e.target.value)}
          />
          <button
            type="submit"
            className="primary-button"
            disabled={isLoading || !inputText.trim()}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              backgroundColor: isLoading || !inputText.trim() ? '#94a3b8' : '#2563eb',
              color: '#ffffff',
              border: 'none',
              fontWeight: 500,
              cursor: isLoading || !inputText.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? 'Đang gửi...' : 'Gửi câu hỏi'}
          </button>
        </form>
      </Card>
    </div>
  );
}
