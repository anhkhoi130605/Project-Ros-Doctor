import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp, formatDateTime } from '../../../../stored/appStore';
import { PageHeader, Badge, Icon, Button, Card } from '../../../../components/common/UIComponents';
import FindingEvidence from '../../../bags/pages/Engineering/components/FindingEvidence';
import { submitDecisionApi, getReviewByIdApi, normalizeReviewStatus } from '../../../../service';

export default function EngineeringReviewDetailPage() {
  const { findingId } = useParams();
  const navigate = useNavigate();
  const { state, dispatch, notify } = useApp();

  const targetId = findingId || (state.findings?.[0]?.id ?? '');
  const existingFinding = (state.findings || []).find((f) => f.id === targetId);
  const [localFinding, setLocalFinding] = useState(existingFinding || null);
  const [loading, setLoading] = useState(!existingFinding && !!targetId);

  useEffect(() => {
    if (existingFinding) {
      setLocalFinding(existingFinding);
      setLoading(false);
      return;
    }
    if (targetId) {
      setLoading(true);
      getReviewByIdApi(targetId)
        .then((res) => {
          if (res) {
            const mapped = {
              ...res,
              review: { status: normalizeReviewStatus(res.status), note: res.note || '', by: res.reviewedBy, at: res.reviewedAt },
            };
            setLocalFinding(mapped);
          }
        })
        .catch((err) => {
          console.error('Không tìm thấy sự cố trong DB:', err);
        })
        .finally(() => setLoading(false));
    }
  }, [targetId, existingFinding]);

  const finding = existingFinding || localFinding;

  const isApproved = finding?.review?.status === 'approved';

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
    if (finding?.review?.note) {
      setNote(finding.review.note);
    } else {
      setNote('');
    }
  }, [finding?.id, finding?.review?.note]);

  // Handle Approving (Transition from E17 to E18)
  const handleApprove = async () => {
    const finalNote =
      note.trim() ||
      `Đã đối chiếu dữ liệu ${finding.topic || ''} trong khoảng ${finding.interval || ''}; xác nhận kết luận.`;
    const at = new Date().toISOString();

    try {
      await submitDecisionApi(finding.id, { decision: 'approved', note: finalNote });
    } catch (err) {
      console.warn('API error when submitting decision:', err);
      notify('Không thể lưu quyết định duyệt vào database. Vui lòng thử lại.', 'danger');
      return;
    }

    setLocalFinding((prev) =>
      prev
        ? {
            ...prev,
            review: { status: 'approved', note: finalNote, at, by: 'Kỹ sư Robotics' },
          }
        : prev
    );

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
    const at = new Date().toISOString();
    try {
      await submitDecisionApi(finding.id, { decision: 'changes', note: finalNote });
    } catch (err) {
      console.warn('API error when requesting changes:', err);
      notify('Không thể lưu yêu cầu chỉnh sửa vào database. Vui lòng thử lại.', 'danger');
      return;
    }

    setLocalFinding((prev) =>
      prev
        ? {
            ...prev,
            review: { status: 'changes', note: finalNote, at, by: 'Kỹ sư Robotics' },
          }
        : prev
    );

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
    const at = new Date().toISOString();
    try {
      await submitDecisionApi(finding.id, { decision: 'rejected', note: finalNote });
    } catch (err) {
      console.warn('API error when rejecting:', err);
      notify('Không thể lưu quyết định từ chối vào database. Vui lòng thử lại.', 'danger');
      return;
    }

    setLocalFinding((prev) =>
      prev
        ? {
            ...prev,
            review: { status: 'rejected', note: finalNote, at, by: 'Kỹ sư Robotics' },
          }
        : prev
    );

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

  if (loading) {
    return (
      <div className="review-detail-page">
        <PageHeader title="Đang tải dữ liệu kết luận..." subtitle="Truy vấn từ cơ sở dữ liệu MySQL" />
        <Card>
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
            Đang tải dữ liệu từ database...
          </div>
        </Card>
      </div>
    );
  }

  if (!finding) {
    return (
      <div className="review-detail-page">
        <PageHeader title="Không tìm thấy sự cố" subtitle={`Mã sự cố #${targetId || 'N/A'} không tồn tại trong cơ sở dữ liệu.`}>
          <Link to="/reviews" className="button secondary">
            ← Quay lại danh sách
          </Link>
        </PageHeader>
        <Card>
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ marginBottom: '16px', color: 'var(--muted)' }}>Sự cố này không tồn tại trong database hoặc chưa được ghi nhận.</p>
            <Link to="/reviews" className="button primary">
              Xem danh sách sự cố
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const relatedEvidenceUrl = `/sessions/${finding.sessionId || 'sess-carla-001'}/issues?finding=${finding.id}`;

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

          {finding.rawRosoutLogs && finding.rawRosoutLogs.length > 0 && (
            <div style={{ margin: '12px 0 16px 0' }}>
              <div className="section-label" style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }}></span>
                <span>Log chi tiết từ MongoDB Atlas (/rosout)</span>
              </div>
              <pre className="ctrn-log" style={{ margin: '6px 0 0 0', padding: '10px 14px', borderRadius: '6px', background: '#0f172a', color: '#38bdf8', fontSize: '12px', fontFamily: 'Consolas, monospace', overflowX: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {finding.rawRosoutLogs.join('\n')}
              </pre>
            </div>
          )}

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
