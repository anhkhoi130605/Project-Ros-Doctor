import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../../stored/appStore';
import { PageHeader, Card, Button, Badge, Icon } from '../../../components/common/UIComponents';

function MiniDonutChart({ data, size = 150, thickness = 18, centerValue, centerLabel }) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0, margin: '0 auto' }}>
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
        {data.map((item, idx) => {
          const sliceAngle = (item.value / total) * circumference;
          const strokeDasharray = `${sliceAngle} ${circumference - sliceAngle}`;
          const strokeDashoffset = -accumulatedOffset;
          accumulatedOffset += sliceAngle;

          return (
            <circle
              key={idx}
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke={item.color}
              strokeWidth={thickness}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="butt"
              style={{
                transition: 'all 0.3s ease-in-out',
                cursor: 'pointer',
                filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.06))',
              }}
            >
              <title>{`${item.label}: ${item.value} (${Math.round((item.value / total) * 100)}%)`}</title>
            </circle>
          );
        })}
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <strong style={{ fontSize: '22px', color: 'var(--text)', fontWeight: '750', lineHeight: 1 }}>
          {centerValue}
        </strong>
        {centerLabel && (
          <small style={{ fontSize: '9px', color: 'var(--muted)', marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {centerLabel}
          </small>
        )}
      </div>
    </div>
  );
}

function RosbagBarChart({ bags }) {
  const [activeMetric, setActiveMetric] = useState('size');
  const maxMb = Math.max(...bags.map((b) => b.sizeMb || 100), 500);
  const maxTopics = Math.max(...bags.map((b) => b.topicCount || 10), 30);

  return (
    <div style={{ background: 'var(--panel)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <strong style={{ fontSize: '14px', color: 'var(--text)' }}>Biểu đồ cột so sánh bản ghi Rosbag</strong>
          <small style={{ display: 'block', color: 'var(--muted)', fontSize: '11px', marginTop: '2px' }}>
            Trực quan hóa chỉ số giữa các tập dữ liệu gần đây
          </small>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setActiveMetric('size')}
            style={{
              padding: '5px 12px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: activeMetric === 'size' ? 'var(--cyan)' : 'var(--panel)',
              color: activeMetric === 'size' ? '#fff' : 'var(--muted)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            📊 Dung lượng (MB)
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric('topics')}
            style={{
              padding: '5px 12px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: activeMetric === 'topics' ? 'var(--green)' : 'var(--panel)',
              color: activeMetric === 'topics' ? '#fff' : 'var(--muted)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            📈 Số lượng Topics
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', height: '190px', paddingBottom: '32px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
        {/* Background Grid Lines */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none', opacity: 0.2 }}>
          <div style={{ borderTop: '1px dashed var(--muted)' }} />
          <div style={{ borderTop: '1px dashed var(--muted)' }} />
          <div style={{ borderTop: '1px dashed var(--muted)' }} />
        </div>

        {bags.map((bag) => {
          const val = activeMetric === 'size' ? (bag.sizeMb || 120) : (bag.topicCount || 12);
          const maxVal = activeMetric === 'size' ? maxMb : maxTopics;
          const heightPercent = Math.max(14, Math.round((val / maxVal) * 100));
          const color = activeMetric === 'size' ? '#176cdd' : '#128267';
          const unit = activeMetric === 'size' ? 'MB' : 'topics';

          return (
            <div
              key={bag.id || bag.name}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: '100%',
                justifyContent: 'flex-end',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: '700', color: color, marginBottom: '6px' }}>
                {val} {unit}
              </div>
              <div
                style={{
                  width: '65%',
                  maxWidth: '52px',
                  height: `${heightPercent}%`,
                  background: `linear-gradient(180deg, ${color} 0%, ${color}c0 100%)`,
                  borderRadius: '6px 6px 0 0',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                  transition: 'height 0.4s ease-out, background 0.3s',
                  cursor: 'pointer',
                }}
                title={`${bag.name}: ${val} ${unit}`}
              />
              <span
                style={{
                  position: 'absolute',
                  bottom: '-24px',
                  fontSize: '10px',
                  color: 'var(--muted)',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  maxWidth: '90%',
                  textAlign: 'center',
                  fontWeight: 500,
                }}
              >
                {bag.name.length > 16 ? bag.name.substring(0, 13) + '...' : bag.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardOverviewPage() {
  const { state } = useApp();

  const pendingFindings = (state.findings || []).filter((f) => f.review?.status === 'pending');
  const highSeverityFindings = (state.findings || []).filter(
    (f) => f.severity === 'high' && f.review?.status !== 'rejected'
  );

  const totalBags = (state.bags || []).length || 4;
  const totalSessions = (state.sessions || []).length || 2;
  const totalReports = (state.reports || []).length || 1;
  const totalPending = pendingFindings.length || 5;

  const statsData = [
    { label: 'Tổng số Rosbag', value: totalBags, color: '#176cdd' },
    { label: 'Phiên chẩn đoán', value: totalSessions, color: '#128267' },
    { label: 'Báo cáo đã xuất', value: totalReports, color: '#ac650d' },
    { label: 'Chờ kỹ sư duyệt', value: totalPending, color: '#c2435b' },
  ];
  const statsTotalSum = statsData.reduce((acc, d) => acc + d.value, 0);

  const priorityData = [
    { label: 'Kết luận chờ duyệt', value: totalPending, color: '#ac650d', sub: 'Kỹ sư robotics cần kiểm tra xác nhận' },
    { label: 'Cảnh báo mức cao', value: highSeverityFindings.length || 3, color: '#c2435b', sub: 'Đối chiếu bằng chứng của phiên phân tích' },
  ];
  const priorityTotalSum = priorityData.reduce((acc, d) => acc + d.value, 0);

  const recentBags = (state.bags && state.bags.length > 0) ? state.bags.slice(0, 5) : [
    { id: '1', name: 'agv_lab_2026_09_22.mcap', sizeMb: 245, topicCount: 12, status: 'complete' },
    { id: '2', name: 'warehouse_route_03.mcap', sizeMb: 380, topicCount: 18, status: 'complete' },
    { id: '3', name: 'sensor_test_02.db3', sizeMb: 120, topicCount: 8, status: 'ready' },
    { id: '4', name: 'agv_split_recording.zip', sizeMb: 510, topicCount: 24, status: 'invalid' },
  ];

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

      {/* Row of Donut/Pie Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <Card title="Biểu đồ ưu tiên xử lý" action={<Badge tone="cyan">{priorityTotalSum} mục chờ</Badge>}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '14px', flexWrap: 'wrap' }}>
            <MiniDonutChart
              data={priorityData}
              size={150}
              thickness={18}
              centerValue={priorityTotalSum}
              centerLabel="Mục chờ"
            />
            <div style={{ flex: 1, minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {priorityData.map((item, idx) => (
                <Link
                  key={idx}
                  to="/reviews"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: 'var(--panel)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    textDecoration: 'none',
                    transition: 'border-color 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                    <div>
                      <strong style={{ fontSize: '12px', color: 'var(--text)', display: 'block' }}>
                        {item.value} {item.label}
                      </strong>
                      <small style={{ fontSize: '10px', color: 'var(--muted)', display: 'block' }}>{item.sub}</small>
                    </div>
                  </div>
                  <Icon name="arrow" size={14} />
                </Link>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Biểu đồ thống kê hệ thống" action={<Badge tone="blue">ROS2 Agent v2.4</Badge>}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '14px', flexWrap: 'wrap' }}>
            <MiniDonutChart
              data={statsData}
              size={150}
              thickness={18}
              centerValue={statsTotalSum}
              centerLabel="Tổng cộng"
            />
            <div style={{ flex: 1, minWidth: '180px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {statsData.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '10px 12px',
                    background: 'var(--panel)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
                    <span style={{ fontSize: '11px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{item.label}</span>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: item.color }}>
                    {item.value}
                    <small style={{ fontSize: '10px', color: 'var(--muted)', marginLeft: '4px', fontWeight: '400' }}>
                      ({Math.round((item.value / statsTotalSum) * 100)}%)
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Section with Bar Chart & Streamlined Table */}
      <Card title="Gần đây" subtitle="Biểu đồ cột & Danh sách bản ghi rosbag vừa được nạp vào không gian làm việc.">
        <RosbagBarChart bags={recentBags} />

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
              {recentBags.map((bag) => (
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

