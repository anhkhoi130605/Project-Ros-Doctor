import React from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, Badge, Card, Button, FormField, Icon } from '../../../../components/common/UIComponents';
import useEngineeringBags from '../../hooks/useEngineeringBags';

export default function EngineeringBagsListPage() {
  const {
    filteredBags,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    stats,
  } = useEngineeringBags();

  return (
    <div className="bags-page engineering-bags-page">
      <PageHeader
        eyebrow="KHÔNG GIAN LÀM VIỆC KỸ SƯ"
        title="Danh sách bản ghi ROSBag"
        subtitle="Quản lý các tệp .mcap, .db3 và các gói dữ liệu log robot đã ghi."
      >
        <Button to="/upload" icon="plus">
          Nạp tệp mới
        </Button>
      </PageHeader>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <Card className="stat cyan">
          <span className="stat-label">Tổng số bản ghi</span>
          <strong>{stats.total}</strong>
          <small>Tệp trong hệ thống</small>
        </Card>
        <Card className="stat green">
          <span className="stat-label">Hoàn tất</span>
          <strong>{stats.complete}</strong>
          <small>Sẵn sàng chẩn đoán</small>
        </Card>
        <Card className="stat orange">
          <span className="stat-label">Đang phân tích</span>
          <strong>{stats.processing}</strong>
          <small>Tiến trình nền</small>
        </Card>
        <Card className="stat blue">
          <span className="stat-label">Chờ xử lý</span>
          <strong>{stats.pending}</strong>
          <small>Cần cấu hình</small>
        </Card>
      </div>

      <Card style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <input
              type="text"
              placeholder="Tìm theo tên bản ghi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="complete">Hoàn tất</option>
              <option value="pending">Chờ xử lý</option>
              <option value="processing">Đang phân tích</option>
            </select>
          </div>
        </div>
      </Card>

      <Card>
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Bản ghi ROSBag">
          <table>
            <thead>
              <tr>
                <th>Tên bản ghi</th>
                <th>Định dạng</th>
                <th>Kích thước</th>
                <th>Số topic</th>
                <th>Thời lượng</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredBags.map((bag) => (
                <tr key={bag.id}>
                  <td>
                    <Link className="table-title-link" to={`/bags/${bag.id}`}>
                      <strong>{bag.name}</strong>
                      <small>ID: {bag.id}</small>
                    </Link>
                  </td>
                  <td>
                    <code>{bag.format || 'db3'}</code>
                  </td>
                  <td>{bag.sizeMb} MB</td>
                  <td>{bag.topicCount || 12} topics</td>
                  <td>{bag.durationSec || 120}s</td>
                  <td>
                    <Badge status={bag.status || 'complete'} />
                  </td>
                  <td>
                    <Button
                      to={bag.sessionId ? `/sessions/${bag.sessionId}/overview` : `/sessions/${bag.id}`}
                      variant="ghost"
                      icon="arrow"
                    >
                      Xem chẩn đoán
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
