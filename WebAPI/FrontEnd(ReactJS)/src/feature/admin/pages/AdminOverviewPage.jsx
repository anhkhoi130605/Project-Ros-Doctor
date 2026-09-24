import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../../stored/appStore';
import { PageHeader, StatWidget, Card, DataTable } from '../../../components/common/UIComponents';

export default function AdminOverviewPage() {
  const { state } = useApp();

  return (
    <div className="admin-page-container">
      <PageHeader
        title="Tổng quan Quản trị Hệ thống"
        subtitle="Quản lý thành viên, phân quyền vai trò và theo dõi lịch sử thao tác hệ thống."
      >
        <Link to="/admin/users" className="primary-button">
          + Thêm thành viên
        </Link>
      </PageHeader>

      <div className="stats-grid">
        <StatWidget
          title="Tổng thành viên"
          value={state.users.length}
          note="Admin, Engineer & Viewer"
          icon="👥"
        />
        <StatWidget
          title="Không gian làm việc"
          value="Robotics Lab"
          note="Dự án RAV-13 active"
          tone="blue"
          icon="🏢"
        />
        <StatWidget
          title="Cấu hình AI Agent"
          value={state.aiSettings?.dailyRequests || 100}
          note="Requests / ngày"
          tone="orange"
          icon="🤖"
        />
      </div>

      <Card title="Danh sách tài khoản thành viên">
        <DataTable
          label="Danh sách tài khoản"
          rows={state.users}
          columns={[
            { key: 'name', label: 'TÊN THÀNH VIÊN' },
            { key: 'email', label: 'EMAIL' },
            { key: 'role', label: 'VAI TRÒ', render: (u) => u.role.toUpperCase() },
            { key: 'project', label: 'DỰ ÁN' },
          ]}
        />
      </Card>
    </div>
  );
}
