import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../../../stored/appStore';
import { PageHeader, Badge, Card, DataTable } from '../../../../components/common/UIComponents';

export default function EngineeringReviewsListPage() {
  const { state } = useApp();
  const [statusFilter, setStatusFilter] = useState('pending');

  const filteredFindings = (state.findings || []).filter((f) => {
    return statusFilter === 'all' || f.review?.status === statusFilter;
  });

  return (
    <div className="reviews-page-container">
      <PageHeader
        title="Danh sách kết luận chờ Kỹ sư thẩm định"
        subtitle="Rà soát, kiểm tra bằng chứng và phê duyệt hoặc phản hồi kết luận của AI Agent."
      />

      <Card>
        <div className="filter-tabs-row">
          <button
            type="button"
            className={`tab-btn ${statusFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setStatusFilter('pending')}
          >
            Chờ duyệt ({(state.findings || []).filter((f) => f.review?.status === 'pending').length})
          </button>
          <button
            type="button"
            className={`tab-btn ${statusFilter === 'approved' ? 'active' : ''}`}
            onClick={() => setStatusFilter('approved')}
          >
            Đã duyệt ({(state.findings || []).filter((f) => f.review?.status === 'approved').length})
          </button>
          <button
            type="button"
            className={`tab-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            Tất cả ({(state.findings || []).length})
          </button>
        </div>

        <DataTable
          label="Danh sách Thẩm định"
          rows={filteredFindings}
          columns={[
            {
              key: 'id',
              label: 'MÃ SỰ CỐ',
              render: (f) => (
                <Link className="table-title-link" to={`/reviews/${f.id}`}>
                  <strong>{f.id}</strong>
                  <small>{f.title}</small>
                </Link>
              ),
            },
            { key: 'topic', label: 'TOPIC' },
            {
              key: 'severity',
              label: 'MỨC ĐỘ',
              render: (f) => <Badge tone={f.severity}>{String(f.severity || '').toUpperCase()}</Badge>,
            },
            { key: 'interval', label: 'KHOẢNG THỜI GIAN' },
            {
              key: 'review',
              label: 'TRẠNG THÁI DUYỆT',
              render: (f) => <Badge status={f.review?.status || 'pending'} />,
            },
            {
              key: 'action',
              label: 'THAO TÁC',
              render: (f) => (
                <Link to={`/reviews/${f.id}`} className="action-link-btn">
                  Kiểm tra & Thẩm định →
                </Link>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
