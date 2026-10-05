import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../../../stored/appStore';
import { PageHeader, Badge, Card, DataTable, Icon } from '../../../../components/common/UIComponents';
import { getReviewsApi } from '../../../../service';

export default function EngineeringReviewsListPage() {
  const { state, dispatch, notify } = useApp();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getReviewsApi();
      const rawList = Array.isArray(res) ? res : (res?.data || res?.Data || []);
      if (Array.isArray(rawList)) {
        const mapped = rawList.map((r) => ({
          ...r,
          review: {
            status: r.status || 'pending',
            note: r.note || '',
            by: r.reviewedBy || null,
            at: r.reviewedAt || null,
          },
        }));
        dispatch({ type: 'SET_REVIEWS', findings: mapped });
      }
    } catch (err) {
      console.error('Lỗi khi tải kết luận từ database:', err);
      setError('Không thể tải dữ liệu từ database. Vui lòng kiểm tra kết nối API.');
      notify?.('Không thể tải dữ liệu kết luận từ database.', 'danger');
    } finally {
      setLoading(false);
    }
  }, [dispatch, notify]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const filteredFindings = (state.findings || []).filter((f) => {
    return statusFilter === 'all' || f.review?.status === statusFilter;
  });

  return (
    <div className="reviews-page-container">
      <PageHeader
        title="Danh sách kết luận chờ Kỹ sư thẩm định"
        subtitle="Rà soát, kiểm tra bằng chứng và phê duyệt hoặc phản hồi kết luận từ cơ sở dữ liệu."
      >
        <button
          type="button"
          className="button secondary"
          onClick={fetchReviews}
          disabled={loading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <Icon name="reset" />
          <span>{loading ? 'Đang tải DB...' : 'Làm mới từ DB'}</span>
        </button>
      </PageHeader>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div className="filter-tabs-row" style={{ margin: 0 }}>
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

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#16a34a', fontWeight: 500 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
            <span>Live DB: MySQL + MongoDB Atlas ({(state.findings || []).length} mục)</span>
          </div>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{error}</span>
            <button type="button" className="button secondary" onClick={fetchReviews} style={{ fontSize: '12px', padding: '4px 10px' }}>Thử lại</button>
          </div>
        )}

        <DataTable
          label="Danh sách Thẩm định"
          rows={filteredFindings}
          paginate={true}
          pageSize={10}
          pageSizeOptions={[10, 20, 50, 100]}
          empty={loading ? 'Đang nạp dữ liệu từ MySQL Database...' : 'Chưa có kết luận nào trong cơ sở dữ liệu.'}
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
