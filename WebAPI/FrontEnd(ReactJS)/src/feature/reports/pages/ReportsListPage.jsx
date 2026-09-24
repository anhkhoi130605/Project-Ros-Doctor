import React from 'react';
import { Link } from 'react-router-dom';
import { useApp, formatDateTime } from '../../../stored/appStore';
import { PageHeader, Badge, Card, DataTable } from '../../../components/common/UIComponents';

export default function ReportsListPage() {
  const { state } = useApp();

  return (
    <div className="reports-page-container">
      <PageHeader
        title="Báo cáo chẩn đoán sự cố"
        subtitle="Tổng hợp kết quả chẩn đoán, bằng chứng và các kết luận đã được Kỹ sư robotics thẩm định."
      />

      <Card>
        <DataTable
          label="Danh sách Báo cáo"
          rows={state.reports}
          columns={[
            {
              key: 'id',
              label: 'MÃ BÁO CÁO',
              render: (r) => (
                <Link className="table-title-link" to={`/reports/${r.id}`}>
                  <strong>{r.id}</strong>
                  <small>{r.title}</small>
                </Link>
              ),
            },
            {
              key: 'generatedAt',
              label: 'THỜI ĐIỂM TẠO',
              render: (r) => formatDateTime(r.generatedAt),
            },
            {
              key: 'reviewer',
              label: 'NGƯỜI THẨM ĐỊNH',
              render: (r) => r.reviewer || 'Kỹ sư Robotics',
            },
            {
              key: 'findings',
              label: 'SỐ CẢNH BÁO DUYỆT',
              render: (r) => `${r.findings?.length || 0} kết luận`,
            },
            {
              key: 'status',
              label: 'TRẠNG THÁI',
              render: (r) => <Badge status={r.status} />,
            },
            {
              key: 'action',
              label: 'THAO TÁC',
              render: (r) => (
                <Link to={`/reports/${r.id}`} className="action-link-btn">
                  Xem chi tiết →
                </Link>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
