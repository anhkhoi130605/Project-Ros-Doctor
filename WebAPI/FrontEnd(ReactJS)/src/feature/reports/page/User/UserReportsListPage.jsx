import React from 'react';
import { Link } from 'react-router-dom';
import { useApp, formatDateTime } from '../../../../stored/appStore';
import { PageHeader, Badge, Card, DataTable } from '../../../../components/common/UIComponents';

export default function UserReportsListPage() {
  const { state } = useApp();

  // Users only see approved reports
  const approvedReports = (state.reports || []).filter((r) => r.status === 'approved');

  return (
    <div className="reports-page-container">
      <PageHeader
        eyebrow="NGƯỜI XEM · BÁO CÁO CÔNG BỐ"
        title="Báo cáo chẩn đoán đã duyệt"
        subtitle="Tổng hợp các báo cáo kết luận chính thức đã được Kỹ sư robotics thẩm định và phê duyệt."
      />

      <Card>
        <DataTable
          label="Báo cáo đã công bố"
          rows={approvedReports}
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
              label: 'THỜI ĐIỂM CÔNG BỐ',
              render: (r) => formatDateTime(r.generatedAt),
            },
            {
              key: 'reviewer',
              label: 'KỸ SƯ THẨM ĐỊNH',
              render: (r) => r.reviewer || 'Kỹ sư Robotics',
            },
            {
              key: 'findings',
              label: 'KẾT LUẬN XÁC NHẬN',
              render: (r) => `${r.findings?.length || 0} kết luận`,
            },
            {
              key: 'status',
              label: 'TRẠNG THÁI',
              render: () => <Badge tone="green">• Đã công bố</Badge>,
            },
            {
              key: 'action',
              label: 'THAO TÁC',
              render: (r) => (
                <Link to={`/reports/${r.id}`} className="action-link-btn">
                  Xem báo cáo →
                </Link>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
