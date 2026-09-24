import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../../stored/appStore';
import { PageHeader, Card, Button, Badge, Notice, Icon } from '../../../components/common/UIComponents';

export default function DashboardOverviewPage() {
  const { state } = useApp();

  const pendingFindings = (state.findings || []).filter((f) => f.review?.status === 'pending');
  const highSeverityFindings = (state.findings || []).filter(
    (f) => f.severity === 'high' && f.review?.status !== 'rejected'
  );

  return (
    <div className="dashboard-overview">
      <PageHeader
        eyebrow="TỔNG QUAN HỆ THỐNG"
        title="Trung tâm chẩn đoán ROS2"
        subtitle={`Xin chào ${state.profile?.name || 'Kỹ sư'}. Theo dõi dữ liệu, bằng chứng và các kết luận cần duyệt.`}
      >
        {state.role === 'engineer' && (
          <Button to="/upload" icon="plus">
            Phân tích mới
          </Button>
        )}
      </PageHeader>

      <section className="robot-hero" style={{ marginBottom: '24px' }}>
        <span className="section-kicker">CTRL SHIFT N / AI ASSISTED</span>
        <h2>
          Chẩn đoán tự động<br />
          <em>từ một bản ghi rosbag.</em>
        </h2>
        <p>Tự động đọc tín hiệu. Đối chiếu bằng chứng. Đề xuất nguyên nhân sự cố.</p>
        <div className="button-row" style={{ marginTop: '16px' }}>
          <Button to="/upload" icon="arrow">
            Nạp & phân tích rosbag
          </Button>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <Card title="Ưu tiên hôm nay" action={<Badge tone="cyan">{pendingFindings.length} mục chờ</Badge>}>
          <div className="priority-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
            <Link
              to="/reviews"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'var(--panel)',
                borderRadius: '8px',
                border: '1px solid var(--border)',
              }}
            >
              <div>
                <strong>{pendingFindings.length} kết luận chờ duyệt</strong>
                <p style={{ margin: 0, fontSize: '12px' }}>Kỹ sư robotics cần kiểm tra xác nhận</p>
              </div>
              <Icon name="arrow" />
            </Link>

            <Link
              to="/reviews"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'var(--panel)',
                borderRadius: '8px',
                border: '1px solid var(--border)',
              }}
            >
              <div>
                <strong>{highSeverityFindings.length} cảnh báo mức cao</strong>
                <p style={{ margin: 0, fontSize: '12px' }}>Đối chiếu bằng chứng của phiên phân tích AGV-Lab</p>
              </div>
              <Icon name="arrow" />
            </Link>
          </div>
        </Card>

        <Card title="Thống kê hệ thống" action={<Badge tone="blue">ROS2 Agent v2.4</Badge>}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
            <div style={{ padding: '16px', background: 'var(--panel)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Tổng số Rosbag</span>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--cyan)' }}>
                {(state.bags || []).length}
              </div>
            </div>
            <div style={{ padding: '16px', background: 'var(--panel)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Phiên chẩn đoán</span>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--green)' }}>
                {(state.sessions || []).length}
              </div>
            </div>
            <div style={{ padding: '16px', background: 'var(--panel)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Báo cáo đã xuất</span>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text)' }}>
                {(state.reports || []).length}
              </div>
            </div>
            <div style={{ padding: '16px', background: 'var(--panel)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Chờ kỹ sư duyệt</span>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--orange)' }}>
                {pendingFindings.length}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Gần đây" subtitle="Bản ghi rosbag vừa được nạp vào không gian làm việc.">
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Rosbag gần đây">
          <table>
            <thead>
              <tr>
                <th>Tên file</th>
                <th>Kích thước</th>
                <th>Số topic</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {(state.bags || []).slice(0, 5).map((bag) => (
                <tr key={bag.id}>
                  <td>
                    <strong>{bag.name}</strong>
                  </td>
                  <td>{bag.sizeMb} MB</td>
                  <td>{bag.topicCount || 12} topics</td>
                  <td>
                    <Badge status={bag.status || 'complete'} />
                  </td>
                  <td>
                    <Button to={`/bags/${bag.id}`} variant="ghost" icon="arrow">
                      Chi tiết
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
