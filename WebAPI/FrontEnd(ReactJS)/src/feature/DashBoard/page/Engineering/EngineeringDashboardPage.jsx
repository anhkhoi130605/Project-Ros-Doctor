import React from 'react';
import { PageHeader, Button } from '../../../../components/common/UIComponents';
import useEngineeringDashboard from './hook/useEngineeringDashboard';
import EngineeringStatWidget from './components/EngineeringStatWidget';
import HeroDiagnosisCard from './components/HeroDiagnosisCard';
import DiagnosticPriorityPanel from './components/DiagnosticPriorityPanel';
import RecentAnalysisSessionsTable from './components/RecentAnalysisSessionsTable';

export default function EngineeringDashboardPage({ onSwitchToViewer }) {
  const {
    state,
    pendingCount,
    bagsCount,
    sessionsCount,
    highWarningsCount,
    recentSessions,
  } = useEngineeringDashboard();

  return (
    <div className="dashboard-overview engineering-dashboard" style={{ display: 'grid', gap: '24px' }}>
      {/* Page Header */}
      <PageHeader
        title="Trung tâm chẩn đoán"
        subtitle={`Xin chào ${state.profile?.name?.split(' ')[0] || 'An'}. Theo dõi dữ liệu, bằng chứng và các kết luận cần duyệt.`}
      >
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {onSwitchToViewer && (
            <button
              type="button"
              onClick={onSwitchToViewer}
              className="button ghost"
              style={{ fontSize: '12px', padding: '6px 12px', minHeight: '34px', borderRadius: '8px' }}
            >
              👁️ Xem góc nhìn Người xem (V01)
            </button>
          )}
          <Button
            to="/upload"
            icon="plus"
            style={{ background: '#0f172a', color: '#ffffff', borderRadius: '8px' }}
          >
            Phân tích mới
          </Button>
        </div>
      </PageHeader>

      {/* Hero & Priority Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2.2fr) minmax(300px, 1fr)',
          gap: '20px',
        }}
      >
        <HeroDiagnosisCard />
        <DiagnosticPriorityPanel
          pendingCount={pendingCount}
          highWarningsCount={highWarningsCount}
        />
      </div>

      {/* 4 Stat Cards Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '16px',
        }}
      >
        <EngineeringStatWidget
          label="Phiên phân tích"
          value={sessionsCount}
          sublabel="Trong không gian làm việc"
          icon="activity"
          tone="blue"
        />
        <EngineeringStatWidget
          label="Rosbag đã nạp"
          value={bagsCount}
          sublabel="Dữ liệu mẫu và tệp đã chọn"
          icon="database"
          tone="blue"
        />
        <EngineeringStatWidget
          label="Sự cố cần kiểm tra"
          value={highWarningsCount}
          sublabel="3 mức cao trong dữ liệu mẫu"
          icon="alert"
          tone="red"
          detailTone="#dc2626"
        />
        <EngineeringStatWidget
          label="Kết luận chờ duyệt"
          value={pendingCount}
          sublabel="Kỹ sư kiểm tra trước khi xuất"
          icon="file-text"
          tone="amber"
          detailTone="#d97706"
        />
      </div>

      {/* Recent Analysis Sessions Table */}
      <RecentAnalysisSessionsTable sessions={recentSessions} />
    </div>
  );
}
