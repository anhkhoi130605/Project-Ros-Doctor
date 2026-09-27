import React, { useState, useMemo } from 'react';
import { useApp } from '../../../stored/appStore';
import { PageHeader, Card, Icon } from '../../../components/common/UIComponents';

export default function CostPerformancePage() {
  const { state } = useApp();
  const [filterSessionId, setFilterSessionId] = useState('all');

  // Filter sessions from store
  const allSessions = state.sessions || [
    { id: '024', name: 'AGV-Lab', processingSeconds: 24 },
    { id: '023', name: 'Warehouse', processingSeconds: 19 },
  ];

  const filteredSessions = useMemo(() => {
    if (filterSessionId === 'all') return allSessions;
    return allSessions.filter((s) => s.id === filterSessionId);
  }, [allSessions, filterSessionId]);

  const totalProcessingSeconds = useMemo(() => {
    return filteredSessions.reduce((acc, cur) => acc + (cur.processingSeconds || 0), 0);
  }, [filteredSessions]);

  return (
    <div className="cost-performance-page">
      {/* Page Title matching Figma E24 1 */}
      <PageHeader
        title="Chi phí & hiệu suất"
        subtitle="Theo dõi tài nguyên và thời gian xử lý của các phiên phân tích."
      />

      {/* Top Blue Notice matching Figma E24 1 */}
      <div className="notice blue" style={{ marginBottom: '24px' }}>
        <Icon name="info" />
        <div>
          Thời gian xử lý dưới đây là số liệu mẫu. Chưa kết nối usage hoặc chi phí thực từ nhà cung cấp AI.
        </div>
      </div>

      {/* 3 Stats Grid Cards matching Figma E24 1 `.stats-grid.three` */}
      <div className="stats-grid three" style={{ marginBottom: '24px' }}>
        {/* Stat 1: Phiên phân tích */}
        <section className="card stat cyan">
          <span className="stat-label">Phiên phân tích</span>
          <span className="stat-icon">
            <Icon name="activity" size={16} />
          </span>
          <strong>{filteredSessions.length}</strong>
          <small>Theo bộ lọc đang chọn</small>
          <svg className="spark" viewBox="0 0 64 32" aria-hidden="true">
            <path
              d="M2 18 Q 16 6, 32 16 T 62 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        </section>

        {/* Stat 2: Tổng thời gian mẫu */}
        <section className="card stat blue">
          <span className="stat-label">Tổng thời gian mẫu</span>
          <span className="stat-icon">
            <Icon name="clock" size={16} />
          </span>
          <strong>{totalProcessingSeconds}s</strong>
          <small>Tổng processingSeconds của phiên mẫu</small>
          <svg className="spark" viewBox="0 0 64 32" aria-hidden="true">
            <path
              d="M2 14 Q 18 24, 34 12 T 62 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        </section>

        {/* Stat 3: Chi phí thực tế */}
        <section className="card stat green">
          <span className="stat-label">Chi phí thực tế</span>
          <span className="stat-icon">
            <Icon name="trending-up" size={16} />
          </span>
          <strong>—</strong>
          <small>Chưa kết nối dịch vụ AI</small>
          <svg className="spark" viewBox="0 0 64 32" aria-hidden="true">
            <path
              d="M2 16 Q 16 16, 32 16 T 62 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        </section>
      </div>

      {/* Main Card: Chi tiết theo phiên matching Figma E24 1 */}
      <section className="card" style={{ marginBottom: '24px' }}>
        <div className="card-heading">
          <div>
            <h2>Chi tiết theo phiên</h2>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="toolbar" style={{ marginBottom: '18px' }}>
          <select
            value={filterSessionId}
            onChange={(e) => setFilterSessionId(e.target.value)}
            aria-label="Lọc phiên chi phí"
            style={{ maxWidth: '240px' }}
          >
            <option value="all">Tất cả phiên</option>
            {allSessions.map((s) => (
              <option key={s.id} value={s.id}>
                Phiên #{s.id} ({s.name})
              </option>
            ))}
          </select>
        </div>

        {/* Table matching Figma E24 1 */}
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Hiệu suất phiên phân tích"
          style={{ marginBottom: '24px' }}
        >
          <table>
            <thead>
              <tr>
                <th scope="col">PHIÊN</th>
                <th scope="col">THỜI GIAN MẪU</th>
                <th scope="col">TOKEN</th>
                <th scope="col">CHI PHÍ</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.map((session) => (
                <tr key={session.id}>
                  <td><strong>{session.name}</strong></td>
                  <td>{session.processingSeconds || 0} giây</td>
                  <td>Chưa đo</td>
                  <td>Chưa đo</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Visual Usage Bars matching Figma E24 1 `.usage-bars` */}
        <div className="usage-bars">
          {filteredSessions.map((session) => {
            const val = session.processingSeconds || 0;
            return (
              <div key={session.id}>
                <span>{session.name}</span>
                <meter
                  min="0"
                  max="60"
                  value={val}
                  aria-label={`${session.name} ${val} giây`}
                ></meter>
                <span>{val} giây</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom Blue Notice matching Figma E24 1 */}
      <div className="notice blue">
        <Icon name="info" />
        <div>
          Chỉ tính thời gian tiết kiệm khi có kết quả đo thủ công làm đối chứng.
        </div>
      </div>
    </div>
  );
}
