import React, { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../../../stored/appStore';
import { PageHeader, Badge, Card, Button, Notice, FormField, Icon } from '../../../components/common/UIComponents';

export default function SessionDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { state, dispatch, notify } = useApp();

  const session = (state.sessions || []).find((s) => s.id === id) || state.sessions[0];
  const findings = (state.findings || []).filter((f) => f.sessionId === session?.id);
  const bag = (state.bags || []).find((b) => b.id === session?.bagId);

  const [reviewNote, setReviewNote] = useState('');
  const [selectedFindingId, setSelectedFindingId] = useState(searchParams.get('finding') || findings[0]?.id || null);
  const [checks, setChecks] = useState([false, false, false]);

  const activeFinding = findings.find((f) => f.id === selectedFindingId) || findings[0];

  const handleDecision = (decision) => {
    if (!activeFinding) return;
    if (decision === 'approved' && !checks.every(Boolean)) {
      notify('Vui lòng xác nhận đủ 3 mục trong danh sách kiểm tra trước khi phê duyệt.', 'warning');
      return;
    }
    if (!reviewNote.trim()) {
      notify('Vui lòng nhập nhận xét/ghi chú trước khi lưu quyết định.', 'warning');
      return;
    }

    dispatch({
      type: 'REVIEW',
      id: activeFinding.id,
      decision,
      note: reviewNote.trim(),
    });
    notify(`Đã lưu quyết định (${decision}) cho kết luận ${activeFinding.id}`, 'success');
  };

  if (!session) {
    return (
      <div>
        <PageHeader title="Không tìm thấy phiên" />
        <Notice tone="red">Phiên chẩn đoán không tồn tại hoặc đã bị xóa.</Notice>
        <Button to="/bags" icon="arrow">Về danh sách</Button>
      </div>
    );
  }

  return (
    <div className="session-detail">
      <PageHeader
        eyebrow={`PHIÊN CHẨN ĐOÁN / ${session.id}`}
        title={session.name || 'Phiên chẩn đoán ROS2'}
        subtitle={`Phần mềm chẩn đoán: ${session.robot || 'RAV-13 AGV'} · Dữ liệu rosbag: ${bag?.name || 'Log file'}`}
      >
        <Badge status={session.status || 'complete'} />
      </PageHeader>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>
        {/* Left Side: Findings Checklist */}
        <Card title="Các kết luận phát hiện">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
            {findings.map((f) => (
              <div
                key={f.id}
                onClick={() => setSelectedFindingId(f.id)}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: activeFinding?.id === f.id ? '1px solid var(--cyan)' : '1px solid var(--border)',
                  background: activeFinding?.id === f.id ? 'var(--panel-2)' : 'var(--panel)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <strong style={{ fontSize: '13px' }}>{f.title}</strong>
                  <Badge status={f.review?.status || 'pending'} />
                </div>
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                  Topic: <code>{f.topic}</code>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Right Side: Active Finding Detail & Review Panel */}
        <div>
          {activeFinding ? (
            <Card
              title={activeFinding.title}
              subtitle={`Bằng chứng: ${activeFinding.topic} [${activeFinding.interval?.[0]}s - ${activeFinding.interval?.[1]}s]`}
              action={<Badge status={activeFinding.review?.status || 'pending'} />}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                <Notice tone="blue" icon="info">
                  <strong>Quan sát:</strong> {activeFinding.observation}
                </Notice>

                <div>
                  <h4 style={{ marginBottom: '8px', color: 'var(--text)' }}>Giả thuyết nguyên nhân (AI đề xuất):</h4>
                  <p style={{ background: 'var(--panel)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    {activeFinding.analystNote || 'Phát hiện tần số truyền tín hiệu sụt giảm nghiêm trọng trong khoảng thời gian diễn ra sự cố.'}
                  </p>
                </div>

                {state.role === 'engineer' && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                    <h4 style={{ marginBottom: '12px', color: 'var(--cyan)' }}>Xác nhận của Kỹ sư Robotics (Human-in-the-Loop):</h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                      {[
                        'Đã kiểm tra biểu đồ tần số topic',
                        'Đã đối chiếu thời gian xảy ra cảnh báo',
                        'Đồng ý với giả thuyết nguyên nhân sự cố',
                      ].map((chk, i) => (
                        <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={checks[i]}
                            onChange={(e) => {
                              const next = [...checks];
                              next[i] = e.target.checked;
                              setChecks(next);
                            }}
                          />
                          <span>{chk}</span>
                        </label>
                      ))}
                    </div>

                    <FormField label="Ghi chú nhận xét của kỹ sư">
                      <textarea
                        rows={3}
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        placeholder="Nhập lý do phê duyệt hoặc yêu cầu bổ sung thông tin..."
                      />
                    </FormField>

                    <div className="button-row" style={{ marginTop: '16px' }}>
                      <Button onClick={() => handleDecision('approved')} icon="check">
                        Phê duyệt kết luận
                      </Button>
                      <Button variant="ghost" onClick={() => handleDecision('changes')} icon="alert">
                        Yêu cầu làm rõ
                      </Button>
                      <Button variant="danger" onClick={() => handleDecision('rejected')} icon="close">
                        Bác bỏ
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Notice tone="blue">Chọn một kết luận bên trái để xem chi tiết.</Notice>
          )}
        </div>
      </div>
    </div>
  );
}
