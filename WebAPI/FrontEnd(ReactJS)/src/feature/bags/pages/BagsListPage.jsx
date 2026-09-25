import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../../stored/appStore';
import { PageHeader, Badge, Card, Button, FormField, Icon } from '../../../components/common/UIComponents';

export default function BagsListPage() {
  const { state } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredBags = useMemo(() => {
    return (state.bags || []).filter((b) => {
      const matchSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'all' || b.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [state.bags, searchTerm, statusFilter]);

  return (
    <div className="bags-page">
      <PageHeader
        eyebrow="DỮ LIỆU ĐÃ NẠP"
        title="Danh sách bản ghi ROSBag"
        subtitle="Quản lý các tệp .mcap, .db3 và các gói dữ liệu log robot đã ghi."
      >
        {state.role === 'engineer' && (
          <Button to="/upload" icon="plus">
            Nạp tệp mới
          </Button>
        )}
      </PageHeader>

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
              {!filteredBags.length && (
                <tr>
                  <td colSpan={7} className="table-empty">
                    Không tìm thấy bản ghi rosbag nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
