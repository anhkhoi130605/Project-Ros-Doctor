import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../../stored/appStore';
import { PageHeader, Card, Button, Badge, Icon, DataTable } from '../../../components/common/UIComponents';

export default function AnalysisPage() {
  const { state } = useApp();
  const [activeFilter, setActiveFilter] = useState('all');

  const sessions = state.sessions || [
    {
      id: '024',
      bagName: 'agv_lab_2026_09_22.mcap',
      timestamp: '09:24 22/09/2026',
      topicsCount: 12,
      warningCount: 5,
      status: 'pending',
      statusLabel: 'Chờ duyệt',
      duration: '4 phút 32 giây',
      healthScore: '78%',
    },
    {
      id: '023',
      bagName: 'warehouse_route_03.mcap',
      timestamp: '08:42 22/09/2026',
      topicsCount: 18,
      warningCount: 0,
      status: 'complete',
      statusLabel: 'Hoàn tất',
      duration: '8 phút 15 giây',
      healthScore: '98%',
    },
    {
      id: '022',
      bagName: 'sensor_test_02.db3',
      timestamp: '16:10 21/09/2026',
      topicsCount: 8,
      warningCount: 2,
      status: 'ready',
      statusLabel: 'Sẵn sàng',
      duration: '2 phút 00 giây',
      healthScore: '91%',
    },
  ];

  const filteredSessions = sessions.filter((s) => {
    if (activeFilter === 'pending') return s.status === 'pending';
    if (activeFilter === 'warning') return s.warningCount > 0;
    return true;
  });

  return (
    <div className="analysis-page">
      <PageHeader
        eyebrow="KHÔNG GIAN LÀM VIỆC KỸ SƯ"
        title="Phân tích & Chẩn đoán ROS2"
        subtitle="Quản lý các phiên phân tích rosbag, phát hiện bất thường và đối chiếu bằng chứng kỹ thuật."
      >
        <Button to="/upload" icon="plus">
          Tạo phiên phân tích mới
        </Button>
      </PageHeader>

      {/* Top summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '18px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Tổng phiên phân tích</span>
          <strong style={{ fontSize: '24px', color: '#0f172a', fontWeight: 800 }}>{sessions.length}</strong>
          <small style={{ display: 'block', color: '#16a34a', marginTop: '4px', fontSize: '11px' }}>● Tất cả sẵn sàng</small>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '18px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Phiên có cảnh báo</span>
          <strong style={{ fontSize: '24px', color: '#dc2626', fontWeight: 800 }}>
            {sessions.filter(s => s.warningCount > 0).length}
          </strong>
          <small style={{ display: 'block', color: '#dc2626', marginTop: '4px', fontSize: '11px' }}>⚠️ Cần xử lý sớm</small>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '18px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Kết luận chờ duyệt</span>
          <strong style={{ fontSize: '24px', color: '#d97706', fontWeight: 800 }}>
            {sessions.filter(s => s.status === 'pending').length}
          </strong>
          <small style={{ display: 'block', color: '#d97706', marginTop: '4px', fontSize: '11px' }}>📋 Kỹ sư xem xét</small>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '18px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Điểm sức khỏe trung bình</span>
          <strong style={{ fontSize: '24px', color: '#2563eb', fontWeight: 800 }}>89%</strong>
          <small style={{ display: 'block', color: '#2563eb', marginTop: '4px', fontSize: '11px' }}>📈 Chỉ số ổn định</small>
        </div>
      </div>

      {/* Main Table Card */}
      <Card title="Danh sách phiên chẩn đoán" subtitle="Xem thông tin chi tiết từng phiên chạy chẩn đoán tự động trên tập tin Rosbag">
        {/* Filter Toolbar */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              border: '1px solid #cbd5e1',
              background: activeFilter === 'all' ? '#0f172a' : '#ffffff',
              color: activeFilter === 'all' ? '#ffffff' : '#334155',
              cursor: 'pointer',
            }}
          >
            Tất cả ({sessions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('pending')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              border: '1px solid #cbd5e1',
              background: activeFilter === 'pending' ? '#0f172a' : '#ffffff',
              color: activeFilter === 'pending' ? '#ffffff' : '#334155',
              cursor: 'pointer',
            }}
          >
            Chờ duyệt ({sessions.filter(s => s.status === 'pending').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('warning')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              border: '1px solid #cbd5e1',
              background: activeFilter === 'warning' ? '#0f172a' : '#ffffff',
              color: activeFilter === 'warning' ? '#ffffff' : '#334155',
              cursor: 'pointer',
            }}
          >
            Có cảnh báo ({sessions.filter(s => s.warningCount > 0).length})
          </button>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>PHIÊN / ROSBAG</th>
                <th>THỜI ĐIỂM</th>
                <th>THỜI LƯỢNG</th>
                <th>SỐ TOPIC</th>
                <th>CẢNH BÁO</th>
                <th>ĐIỂM SỨC KHỎE</th>
                <th>TRẠNG THÁI</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong style={{ color: '#0f172a', display: 'block' }}>AGV-Lab - phiên #{s.id}</strong>
                    <small style={{ color: '#64748b' }}>{s.bagName}</small>
                  </td>
                  <td>{s.timestamp}</td>
                  <td>{s.duration}</td>
                  <td>{s.topicsCount} topics</td>
                  <td>
                    <span style={{ color: s.warningCount > 0 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
                      {s.warningCount} lỗi
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: '#2563eb' }}>{s.healthScore}</span>
                  </td>
                  <td>
                    <Badge status={s.status}>{s.statusLabel}</Badge>
                  </td>
                  <td>
                    <Button to={`/sessions/${s.id}/overview`} variant="ghost" icon="arrow">
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
