import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp, formatDuration, formatDateTime } from '../../../../stored/appStore';
import { PageHeader, Card, Button, Badge, Icon, Pagination } from '../../../../components/common/UIComponents';
import { getHealthCondition } from '../../../../domain/appTypes';
import { getBagsApi } from '../../../../service';

export default function AnalysisPage() {
  const { state, dispatch } = useApp();
  const [activeFilter, setActiveFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (!state.bags || state.bags.length === 0) {
      getBagsApi()
        .then((bags) => {
          if (Array.isArray(bags) && bags.length > 0) {
            dispatch({ type: 'SET_BAGS', bags });
          }
        })
        .catch((err) => console.warn('Could not fetch bags in AnalysisPage:', err));
    }
  }, [state.bags, dispatch]);

  const rawSessions = state.sessions || [];
  const sessions = rawSessions.filter(
    (s) =>
      !['024', '023', 'sess-fb47cf31', 'sess-736dabd1', 'sess-91332c3b', 'sess-05355333', 'SESS-5064'].includes(s.id) &&
      !String(s.id).startsWith('sess-fb47') &&
      !String(s.id).startsWith('sess-736d') &&
      !String(s.id).startsWith('sess-9133') &&
      !String(s.id).startsWith('sess-0535') &&
      !String(s.id).startsWith('SESS-5064')
  );

  const normalCount = sessions.filter((s) => {
    const wCount = s.warningsCount ?? (s.issues || []).length;
    const cond = getHealthCondition(s.healthScore, wCount);
    return cond.type === 'normal';
  }).length;

  const warningCount = sessions.filter((s) => {
    const wCount = s.warningsCount ?? (s.issues || []).length;
    const cond = getHealthCondition(s.healthScore, wCount);
    return cond.type === 'warning';
  }).length;

  const errorCount = sessions.filter((s) => {
    const wCount = s.warningsCount ?? (s.issues || []).length;
    const cond = getHealthCondition(s.healthScore, wCount);
    return cond.type === 'error';
  }).length;

  const filteredSessions = sessions.filter((s) => {
    const wCount = s.warningsCount ?? (s.issues || []).length;
    const cond = getHealthCondition(s.healthScore, wCount);
    if (activeFilter === 'normal') return cond.type === 'normal';
    if (activeFilter === 'warning') return cond.type === 'warning';
    if (activeFilter === 'error') return cond.type === 'error';
    if (activeFilter === 'pending') return s.status === 'pending';
    return true;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const pagedSessions = filteredSessions.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="analysis-page">
      <PageHeader
        eyebrow="KHÔNG GIAN LÀM VIỆC KỸ SƯ"
        title="Phân tích & Chẩn đoán ROS2"
        subtitle="Quản lý các phiên phân tích rosbag, phân loại theo 3 trạng thái: Bình thường (xanh), Cảnh báo (vàng) và Lỗi (đỏ)."
      >
        <Button to="/upload" icon="plus">
          Tạo phiên phân tích mới
        </Button>
      </PageHeader>

      {/* Top summary stats: 3 trạng thái chuẩn */}
      <div className="stats-grid analysis-summary-grid">
        <div className="card stat cyan analysis-summary-card">
          <span className="stat-label">Tổng phiên phân tích</span>
          <span className="stat-icon" aria-hidden="true"><Icon name="activity" /></span>
          <strong>{sessions.length}</strong>
          <small>Dữ liệu thực tế từ Database</small>
        </div>

        {/* 1. Bình thường: Xanh lá */}
        <div className="card stat green analysis-summary-card">
          <span className="stat-label">Bình thường (Danh định)</span>
          <span className="stat-icon" aria-hidden="true"><Icon name="check" /></span>
          <strong>
            {normalCount}
          </strong>
          <small>100 điểm, không có sự cố</small>
        </div>

        {/* 2. Cảnh báo: Vàng */}
        <div className="card stat orange analysis-summary-card">
          <span className="stat-label">Cảnh báo cần theo dõi</span>
          <span className="stat-icon" aria-hidden="true"><Icon name="warning" /></span>
          <strong>
            {warningCount}
          </strong>
          <small>Cảnh báo mức nhẹ / trung bình</small>
        </div>

        {/* 3. Lỗi: Đỏ */}
        <div className="card stat red analysis-summary-card">
          <span className="stat-label">Sự cố lỗi nghiêm trọng</span>
          <span className="stat-icon" aria-hidden="true"><Icon name="alert" /></span>
          <strong>
            {errorCount}
          </strong>
          <small>Cần đối chiếu & khắc phục ngay</small>
        </div>
      </div>

      {/* Main Table Card */}
      <Card title="Danh sách phiên chẩn đoán" subtitle="Xem thông tin chi tiết từng phiên chạy chẩn đoán tự động trên tập tin Rosbag">
        {/* Filter Toolbar */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
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
            onClick={() => setActiveFilter('normal')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              border: '1px solid #bbf7d0',
              background: activeFilter === 'normal' ? '#16a34a' : '#f0fdf4',
              color: activeFilter === 'normal' ? '#ffffff' : '#166534',
              cursor: 'pointer',
            }}
          >
            ✓ Bình thường ({normalCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('warning')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              border: '1px solid #fef3c7',
              background: activeFilter === 'warning' ? '#d97706' : '#fffbeb',
              color: activeFilter === 'warning' ? '#ffffff' : '#92400e',
              cursor: 'pointer',
            }}
          >
            ⚠️ Cảnh báo ({warningCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('error')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              border: '1px solid #fecaca',
              background: activeFilter === 'error' ? '#dc2626' : '#fef2f2',
              color: activeFilter === 'error' ? '#ffffff' : '#991b1b',
              cursor: 'pointer',
            }}
          >
            ❌ Lỗi ({errorCount})
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
                <th>TÌNH TRẠNG</th>
                <th>ĐIỂM SỨC KHỎE</th>
                <th>TRẠNG THÁI</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '36px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                    Đang đồng bộ dữ liệu phiên phân tích thực tế từ hệ thống...
                  </td>
                </tr>
              ) : (
                pagedSessions.map((s) => {
                  const wCount = s.warningsCount ?? (s.issues || []).length;
                  const highCount = (s.issues || []).filter((i) => i.severity === 'high' || i.severity === 'critical').length;
                  const cond = getHealthCondition(s.healthScore, wCount, highCount);

                  return (
                    <tr key={s.id}>
                      <td>
                        <strong style={{ color: '#0f172a', display: 'block' }}>
                          {s.title || `Phiên #${s.id}`}
                        </strong>
                        <small style={{ color: '#64748b' }}>
                          {s.bagName || s.name || `rosbag_${s.id}.db3`}
                        </small>
                      </td>
                      <td>{formatDateTime(s.createdAt || s.timestamp)}</td>
                      <td>{formatDuration(s.duration)}</td>
                      <td>{s.topicsCount || s.topics || 2} topics</td>
                      <td>
                        {/* 3 trường hợp: Bình thường (xanh lá), Cảnh báo (vàng), Lỗi (đỏ) */}
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: cond.color,
                            background: cond.bgColor,
                            border: `1px solid ${cond.borderColor}`,
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 700,
                          }}
                        >
                          {cond.summary}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 800, color: cond.scoreColor, fontSize: '13px' }}>
                          {s.healthScore !== undefined ? `${s.healthScore}/100` : '100/100'}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: cond.bgColor,
                            color: cond.color,
                            border: `1px solid ${cond.borderColor}`,
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          {cond.badgeText}
                        </span>
                      </td>
                      <td>
                        <Button to={`/sessions/${s.id}/overview`} variant="ghost" icon="arrow">
                          Chi tiết
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredSessions.length > 0 && (
          <Pagination
            totalItems={filteredSessions.length}
            pageSize={pageSize}
            currentPage={safePage}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            pageSizeOptions={[10, 20, 50]}
          />
        )}
      </Card>
    </div>
  );
}
