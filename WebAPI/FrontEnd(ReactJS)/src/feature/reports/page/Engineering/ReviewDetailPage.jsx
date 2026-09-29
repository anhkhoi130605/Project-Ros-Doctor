import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp, formatDateTime } from '../../../../stored/appStore';
import { PageHeader, Badge, Icon } from '../../../../components/common/UIComponents';
import FindingEvidence from '../../../bags/page/Engineering/components/FindingEvidence';
import { submitDecisionApi } from '../../../../service';

export default function EngineeringReviewDetailPage() {
  const { findingId } = useParams();
  const navigate = useNavigate();
  const { state, dispatch, notify } = useApp();

  // Find finding by ID or default to 'A-001'
  const targetId = findingId || 'A-001';
  const finding =
    (state.findings || []).find((f) => f.id === targetId) ||
    state.findings?.[0] || {
      id: 'A-001',
      sessionId: '024',
      title: 'Tần số /scan giảm',
      kind: 'frequency',
      topic: '/scan',
      severity: 'high',
      interval: '00:35 – 00:40',
      start: 35,
      end: 40,
      observation:
        '/scan ghi nhận khoảng 2 Hz trong khoảng 00:35–00:40. Mức kỳ vọng của hồ sơ AGV-Lab là 10 Hz.',
      hypothesis:
        'Nguồn phát có thể bị gián đoạn hoặc bỏ lỡ khi ghi dữ liệu. Chưa có bằng chứng xác nhận node crash.',
      steps: [
        'Đối chiếu log /rosout trong khoảng bất thường.',
        'Kiểm tra phạm vi ghi và cấu hình QoS.',
        'Xác minh tình trạng cảm biến và node phát.',
      ],
      revision: 1,
      review: { status: 'pending', note: '', by: null, at: null },
    };

  const isApproved = finding.review?.status === 'approved';

  // State for E17 Checklist
  const [checklist, setChecklist] = useState({
    timeframe: false,
    hypothesis: false,
    direction: false,
  });

  // State for review note
  const [note, setNote] = useState('');

  // Sync initial note when finding changes
  useEffect(() => {
    if (finding.review?.note) {
      setNote(finding.review.note);
    } else {
      setNote('');
    }
  }, [finding.id, finding.review?.note]);

  // Handle Approving (Transition from E17 to E18)
  const handleApprove = async () => {
    const finalNote =
      note.trim() ||
      'Đã đối chiếu /scan trong khoảng 00:35–00:40; xác nhận tần số ghi nhận giảm.';
    const at = new Date().toISOString();

    try {
      await submitDecisionApi(finding.id, { decision: 'approved', note: finalNote });
    } catch {}

    dispatch({
      type: 'REVIEW',
      id: finding.id,
      decision: 'approved',
      note: finalNote,
      at,
    });
    notify(`Đã phê duyệt kết luận #${finding.id} thành công.`, 'success');
  };

  // Handle Request Changes
  const handleRequestChanges = async () => {
    const finalNote = note.trim() || 'Yêu cầu kiểm tra bổ sung cấu hình QoS và log /rosout.';
    try {
      await submitDecisionApi(finding.id, { decision: 'changes', note: finalNote });
    } catch {}

    dispatch({
      type: 'REVIEW',
      id: finding.id,
      decision: 'changes',
      note: finalNote,
    });
    notify(`Đã gửi yêu cầu chỉnh sửa cho #${finding.id}.`, 'warning');
  };

  // Handle Reject
  const handleReject = async () => {
    const finalNote = note.trim() || 'Bằng chứng chưa đủ cơ sở để xác nhận bất thường.';
    try {
      await submitDecisionApi(finding.id, { decision: 'rejected', note: finalNote });
    } catch {}

    dispatch({
      type: 'REVIEW',
      id: finding.id,
      decision: 'rejected',
      note: finalNote,
    });
    notify(`Đã bác bỏ kết luận #${finding.id}.`, 'danger');
  };

  // Handle Reset to Pending (Quick test toggle between E17 and E18)
  const handleResetToPending = () => {
    dispatch({
      type: 'REVIEW',
      id: finding.id,
      decision: 'pending',
      note: '',
    });
    setChecklist({ timeframe: false, hypothesis: false, direction: false });
    setNote('');
    notify(`Đã đặt lại #${finding.id} về trạng thái Chờ duyệt (E17).`, 'info');
  };

  // Handle Create Report from Approved Finding (E18 Action)
  const handleCreateReport = () => {
    navigate('/reports');
    notify(`Đang chuyển tới luồng tạo báo cáo cho phiên #${finding.sessionId || '024'}...`, 'info');
  };

  const relatedEvidenceUrl = `/sessions/${finding.sessionId || '024'}/issues?finding=${finding.id}`;

  return (
    <div className="review-detail-page">
      {/* Page Title & Actions matching Figma E17/E18 */}
      <PageHeader
        title={`Duyệt kết luận #${finding.id}`}
        subtitle={`Phiên #${finding.sessionId || '024'} / ${finding.title}`}
      >
        {isApproved ? (
          <Badge tone="green">Đã duyệt</Badge>
        ) : finding.review?.status === 'changes' ? (
          <Badge tone="cyan">Yêu cầu chỉnh sửa</Badge>
        ) : finding.review?.status === 'rejected' ? (
          <Badge tone="red">Bác bỏ</Badge>
        ) : (
          <Badge tone="orange">Chờ duyệt</Badge>
        )}
      </PageHeader>

      {/* Main 2-column layout matching Figma `.two-column.wide-left` */}
      <div className="two-column wide-left">
        {/* Left Column: Evidence & Observations (62% width) */}
        <section className="card">
          <div className="card-heading">
            <div>
              <h2>Bằng chứng & nhận định</h2>
            </div>
          </div>

          <div className="section-label">Quan sát đã ghi nhận</div>
          <p className="body-copy">{finding.observation}</p>

          {/* Interactive Waveform / Frequency Chart from FindingEvidence */}
          <FindingEvidence finding={finding} />

          <div className="section-label">Nhận định người phân tích</div>
          <p className="body-copy">{finding.analystNote || finding.hypothesis}</p>

          <div className="section-label">Đề xuất kiểm tra</div>
          <ol className="steps-list">
            {(
              finding.steps || [
                'Đối chiếu log /rosout trong khoảng bất thường.',
                'Kiểm tra phạm vi ghi và cấu hình QoS.',
                'Xác minh tình trạng cảm biến và node phát.',
              ]
            ).map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ol>

          <Link to={relatedEvidenceUrl} className="button secondary">
            <Icon name="activity" />
            <span>Mở bằng chứng liên quan</span>
          </Link>
        </section>

        {/* Right Column: Reviewer Decision (38% width) */}
        <section className="card">
          <div className="card-heading">
            <div>
              <h2>Quyết định của người duyệt</h2>
            </div>
          </div>

          <p className="small-note">
            Người gửi: <strong>{finding.analyst || 'An Nguyễn'}</strong> · Bản nhận định v
            {finding.revision || 1}
          </p>

          <hr />

          {/* Dynamic Content: E17 (Pending) vs E18 (Approved) */}
          {!isApproved ? (
            /* =================== MÀN E17: CHỜ DUYỆT =================== */
            <>
              <div className="section-label">Danh sách kiểm tra</div>

              <div className="review-checklist">
                <label>
                  <input
                    type="checkbox"
                    checked={checklist.timeframe}
                    onChange={(e) =>
                      setChecklist((prev) => ({ ...prev, timeframe: e.target.checked }))
                    }
                  />
                  <span>Bằng chứng khớp khoảng thời gian</span>
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={checklist.hypothesis}
                    onChange={(e) =>
                      setChecklist((prev) => ({ ...prev, hypothesis: e.target.checked }))
                    }
                  />
                  <span>Giả thuyết có nêu giới hạn dữ liệu</span>
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={checklist.direction}
                    onChange={(e) =>
                      setChecklist((prev) => ({ ...prev, direction: e.target.checked }))
                    }
                  />
                  <span>Hướng kiểm tra phù hợp với log</span>
                </label>
              </div>

              <label className="field">
                <span>Nhận xét</span>
                <textarea
                  rows={4}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Nêu bằng chứng đã kiểm tra, lý do duyệt hoặc yêu cầu bổ sung…"
                />
                <small>Bắt buộc để lưu dấu vết của quyết định.</small>
              </label>

              <div className="review-actions">
                <button
                  type="button"
                  className="button success"
                  onClick={handleApprove}
                >
                  <Icon name="check" />
                  <span>Duyệt kết luận</span>
                </button>

                <button
                  type="button"
                  className="button secondary"
                  onClick={handleRequestChanges}
                >
                  <span>Yêu cầu chỉnh sửa</span>
                </button>

                <button
                  type="button"
                  className="button danger"
                  onClick={handleReject}
                >
                  <span>Bác bỏ kết luận</span>
                </button>
              </div>
            </>
          ) : (
            /* =================== MÀN E18: ĐÃ DUYỆT =================== */
            <>
              <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                <Badge tone="green">Đã duyệt</Badge>
              </div>

              <p className="body-copy">
                {finding.review?.note ||
                  'Đã đối chiếu /scan trong khoảng 00:35–00:40; xác nhận tần số ghi nhận giảm.'}
              </p>

              <p className="small-note">
                {finding.review?.by || 'An Nguyễn'} · {finding.review?.at || '06:47 24/09/2026'}
              </p>

              <button
                type="button"
                className="button primary"
                style={{ width: '100%', marginTop: '24px' }}
                onClick={handleCreateReport}
              >
                <Icon name="file-text" />
                <span>Tạo báo cáo từ kết luận đã duyệt</span>
              </button>

              <div className="card-actions" style={{ marginTop: '16px' }}>
                <Link to="/reviews" className="button ghost">
                  <span>Về hàng đợi</span>
                </Link>

                <button
                  type="button"
                  className="button secondary"
                  onClick={handleResetToPending}
                  style={{ marginLeft: 'auto', fontSize: '11px' }}
                  title="Chuyển về trạng thái chờ duyệt để kiểm tra lại giao diện E17"
                >
                  <span>Mở lại thẩm định (E17)</span>
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
