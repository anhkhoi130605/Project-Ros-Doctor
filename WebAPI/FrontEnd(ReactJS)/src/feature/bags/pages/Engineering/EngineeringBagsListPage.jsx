import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, Badge, Card, Button, FormField, Icon, Pagination } from '../../../../components/common/UIComponents';
import useEngineeringBags from '../../hooks/useEngineeringBags';
import { formatBytes } from '../../../../stored/appStore';

export default function EngineeringBagsListPage() {
  const {
    filteredBags,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    stats,
  } = useEngineeringBags();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredBags.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const pagedBags = filteredBags.slice((safePage - 1) * pageSize, safePage * pageSize);

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
        <Button to="/bag-submissions" variant="secondary">Duyệt rosbag gửi lên</Button>
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
              {pagedBags.map((bag) => (
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
                  <td>{formatBytes(bag.size)}</td>
                  <td>{bag.topics ?? bag.topicCount ?? '—'} topics</td>
                  <td>{(bag.duration ?? bag.durationSec) > 0 ? `${bag.duration ?? bag.durationSec}s` : '—'}</td>
                  <td>
                    <Badge status={bag.status} />
                  </td>
                  <td>
                    <Button
                      to={bag.sessionId ? `/sessions/${encodeURIComponent(bag.sessionId)}/overview` : `/bags/${encodeURIComponent(bag.id)}`}
                      variant="ghost"
                      icon="arrow"
                    >
                      {bag.sessionId ? 'Xem chẩn đoán' : 'Xem rosbag'}
                    </Button>
                    {!bag.sessionId && <small style={{ display: 'block', marginTop: 6, color: '#61758a' }}>Chưa có phiên phân tích</small>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredBags.length > 0 && (
          <Pagination
            totalItems={filteredBags.length}
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
