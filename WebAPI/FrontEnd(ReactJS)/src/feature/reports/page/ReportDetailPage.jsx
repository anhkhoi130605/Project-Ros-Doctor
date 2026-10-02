import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp, formatDateTime } from '../../../stored/appStore';
import { PageHeader, Badge, Button, Icon, Notice, Card } from '../../../components/common/UIComponents';

export default function ReportDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useApp();

  // Find target report or fallback to first available
  const report =
    (state.reports || []).find((r) => r.id === id) ||
    state.reports?.[0] || {
      id: id || 'RPT-023',
      sessionId: '023',
      title: 'Warehouse · Không phát hiện bất thường',
      status: 'approved',
      generatedAt: '2026-09-22T09:12:00',
      reviewer: 'Minh Nguyễn',
      findings: [],
    };

  // Find associated session and bag
  const session = (state.sessions || []).find((s) => s.id === report.sessionId);
  const bag = (state.bags || []).find((b) => b.sessionId === session?.id || b.id === session?.bagId);

  // Associated findings
  const sessionFindings = (state.findings || []).filter((f) => f.sessionId === report.sessionId);
  const approvedFindings = sessionFindings.filter((f) => f.review?.status === 'approved');
  const pendingFindings = sessionFindings.filter((f) => f.review?.status === 'pending');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="report-detail-page">
      {/* Top Header matching Figma V07 */}
      <PageHeader
        eyebrow={`BÁO CÁO ${report.id}`}
        title={report.title || 'Báo cáo chẩn đoán hệ thống'}
        subtitle="Bản chụp các kết luận được duyệt tại thời điểm tạo báo cáo."
      >
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Button variant="secondary" onClick={handlePrint} icon="download">
            In / Lưu PDF
          </Button>
          <Button to="/reports" variant="ghost" icon="arrow">
            Tất cả báo cáo
          </Button>
        </div>
      </PageHeader>

      {/* Main 2-column layout matching Figma V07 */}
      <div className="report-layout">
        {/* Left Column: Official Report Document (White-paper style) */}
        <article className="card report-document">
          {/* Header section */}
          <div className="report-heading">
            <span
              className="eyebrow"
              style={{
                color: '#ac650d',
                fontWeight: 750,
                fontSize: '11px',
                letterSpacing: '1px',
                marginBottom: '8px',
                display: 'block',
              }}
            >
              CTRN SHIFT N / DIAGNOSTIC REPORT
            </span>
            <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 10px', color: '#133753' }}>
              Báo cáo chẩn đoán hệ thống
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#405970' }}>
                <strong>{bag?.name || 'warehouse_route_03.mcap'}</strong> · {formatDateTime(report.generatedAt)}
              </p>
              <Badge tone="green">• Đã duyệt</Badge>
            </div>
          </div>

          {/* Section 01 / Overview */}
          <section style={{ margin: '24px 0' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#133753', marginBottom: '16px' }}>
              01 / Tổng quan
            </h3>
            <div className="report-facts">
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px 16px',
                }}
              >
                <span style={{ fontSize: '11px', color: '#607991', display: 'block', marginBottom: '4px' }}>
                  Phiên phân tích
                </span>
                <strong style={{ fontSize: '14px', color: '#09243b' }}>
                  #{session?.id || '023'} · {session?.name || 'Warehouse'}
                </strong>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px 16px',
                }}
              >
                <span style={{ fontSize: '11px', color: '#607991', display: 'block', marginBottom: '4px' }}>
                  Kết luận xác nhận
                </span>
                <strong style={{ fontSize: '14px', color: '#09243b' }}>
                  {approvedFindings.length} / {sessionFindings.length}
                </strong>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px 16px',
                }}
              >
                <span style={{ fontSize: '11px', color: '#607991', display: 'block', marginBottom: '4px' }}>
                  Chưa được xác nhận
                </span>
                <strong style={{ fontSize: '14px', color: '#09243b' }}>
                  {pendingFindings.length}
                </strong>
              </div>
            </div>

            <p className="body-copy" style={{ marginTop: '16px', fontSize: '12.5px', color: '#405970', lineHeight: 1.7 }}>
              Báo cáo chỉ dựa trên log đã ghi. Dữ liệu và kết quả trong bản frontend này là mô phỏng; không sử dụng để điều khiển robot thực.
            </p>
          </section>

          {/* Section 02 / Approved Findings */}
          <section style={{ margin: '28px 0', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#133753', marginBottom: '16px' }}>
              02 / Kết luận đã được duyệt
            </h3>
            {approvedFindings.length === 0 ? (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                  padding: '14px 18px',
                  color: '#166534',
                  fontSize: '13px',
                  lineHeight: 1.6,
                }}
              >
                ✓ Không phát hiện bất thường trong bộ dữ liệu mẫu Warehouse. Kết quả không chứng minh hệ thống hoàn toàn không có lỗi.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '14px' }}>
                {approvedFindings.map((f) => (
                  <div
                    key={f.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '14px 16px',
                      background: '#ffffff',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <strong style={{ color: '#0f172a', fontSize: '13.5px' }}>
                        {f.id}: {f.title}
                      </strong>
                      <Badge tone="green">Đã duyệt</Badge>
                    </div>
                    <p style={{ margin: '0 0 6px', fontSize: '12.5px', color: '#475569' }}>
                      <strong>Giả thuyết AI:</strong> {f.hypothesis || f.analystNote}
                    </p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                      <strong>Topic liên quan:</strong> <code>{f.topic}</code> · <strong>Mức độ:</strong> {f.severity || 'Medium'}
                    </p>
                    {f.review?.note && (
                      <div style={{ marginTop: '8px', padding: '6px 10px', background: '#f8fafc', borderRadius: '4px', fontSize: '12px', color: '#334155' }}>
                        💬 <em>Nhận xét kỹ sư: "{f.review.note}"</em>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Section 03 / Next Steps */}
          <section style={{ margin: '28px 0', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#133753', marginBottom: '14px' }}>
              03 / Hướng kiểm tra tiếp theo
            </h3>
            <ul className="steps-list" style={{ margin: 0, paddingLeft: '20px', color: '#405970', fontSize: '13px', lineHeight: 1.8 }}>
              <li>Tiếp tục đối chiếu phạm vi ghi và chất lượng dữ liệu theo điều kiện vận hành thực tế.</li>
              <li>Kiểm tra cấu hình QoS và băng thông truyền nhận khi mở rộng thêm các topic camera độ phân giải cao.</li>
            </ul>
          </section>

          {/* Notice box matching Figma */}
          <div
            className="notice blue"
            style={{
              background: '#f0f6fd',
              border: '1px solid #d0e1f9',
              borderRadius: '8px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              margin: '24px 0',
            }}
          >
            <span style={{ color: '#2563eb', fontSize: '16px', flexShrink: 0 }}>ℹ</span>
            <p style={{ margin: 0, fontSize: '12px', color: '#38618a', lineHeight: 1.6 }}>
              Chưa xác nhận nguyên nhân gốc nếu thiếu bằng chứng. Các mục chưa được duyệt chỉ được thống kê, không trình bày như kết luận xác nhận.
            </p>
          </div>

          {/* Report Signature & Footer matching Figma */}
          <div
            className="report-signature"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid #e2e8f0',
              paddingTop: '20px',
              marginTop: '28px',
              fontSize: '12px',
              color: '#607991',
            }}
          >
            <div>
              <span>Người duyệt: </span>
              <strong style={{ color: '#0f172a' }}>{report.reviewer || 'Minh Nguyễn'}</strong>
            </div>
            <div>
              <span>{report.id} / Bản mẫu chính thức</span>
            </div>
          </div>
        </article>

        {/* Right Column: Metadata Sidebar Card matching Figma V07 */}
        <aside className="report-sidebar stack">
          <section className="card" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#09243b' }}>
                Thông tin xác nhận
              </h2>
              <Badge tone="green">• Đã duyệt</Badge>
            </div>

            <dl className="detail-list" style={{ margin: 0, display: 'grid', gap: '14px', fontSize: '13px' }}>
              <div>
                <dt style={{ color: '#607991', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                  Người duyệt
                </dt>
                <dd style={{ margin: '4px 0 0', color: '#173955', fontWeight: 700, fontSize: '13.5px' }}>
                  {report.reviewer || 'Minh Nguyễn'}
                </dd>
              </div>

              <div>
                <dt style={{ color: '#607991', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                  Thời điểm tạo
                </dt>
                <dd style={{ margin: '4px 0 0', color: '#173955', fontWeight: 600 }}>
                  {formatDateTime(report.generatedAt)}
                </dd>
              </div>

              <div>
                <dt style={{ color: '#607991', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                  Phạm vi kết luận
                </dt>
                <dd style={{ margin: '4px 0 0', color: '#173955', fontWeight: 600 }}>
                  {approvedFindings.length} kết luận đã được duyệt
                </dd>
              </div>
            </dl>

            <div style={{ marginTop: '24px', display: 'grid', gap: '10px' }}>
              <Button
                to={`/sessions/${report.sessionId || '023'}`}
                variant="secondary"
                icon="activity"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Mở phiên phân tích
              </Button>
              <Button
                to="/reports"
                variant="ghost"
                icon="arrow-left"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Tất cả báo cáo
              </Button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
