import React from 'react';
import { PageHeader, Button, Icon } from '../../../../components/common/UIComponents';
import useEngineeringDashboard from './hook/useEngineeringDashboard';
import EngineeringStatWidget from './components/EngineeringStatWidget';
import HeroDiagnosisCard from './components/HeroDiagnosisCard';
import DiagnosticPriorityPanel from './components/DiagnosticPriorityPanel';
import DiagnosticChartsSection from './components/DiagnosticChartsSection';
import RecentAnalysisSessionsTable from './components/RecentAnalysisSessionsTable';
import './dashboard-refined.css';

export default function EngineeringDashboardPage({ onSwitchToViewer }) {
  const {
    state,
    pendingCount,
    bagsCount,
    sessionsCount,
    highWarningsCount,
    recentSessions,
    topicStats,
  } = useEngineeringDashboard();

  return (
    <div className="dashboard-overview engineering-dashboard dashboard-refined" style={{ display: 'grid', gap: '24px' }}>
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
              <Icon name="user" size={15} aria-hidden="true" /> Xem góc nhìn Người xem (V01)
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
        className="dash-lead-grid"
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
          incompleteCount={(state.bags || []).filter((bag) => bag.status === 'pending' || bag.status === 'ready').length}
        />
      </div>

      {/* 4 Stat Cards Row */}
      <div
        className="dash-stat-grid"
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
          chartType="bar"
        />
        <EngineeringStatWidget
          label="Rosbag đã nạp"
          value={bagsCount}
          sublabel="Dữ liệu đã tải từ máy chủ"
          icon="database"
          tone="blue"
          chartType="sparkline"
        />
        <EngineeringStatWidget
          label="Sự cố cần kiểm tra"
          value={highWarningsCount}
          sublabel="Cảnh báo mức cao đã ghi nhận"
          icon="alert"
          tone="red"
          detailTone="#dc2626"
          chartType="alert-bar"
        />
        <EngineeringStatWidget
          label="Kết luận chờ duyệt"
          value={pendingCount}
          sublabel="Kỹ sư kiểm tra trước khi xuất"
          icon="file-text"
          tone="amber"
          detailTone="#d97706"
          chartType="ring"
        />
      </div>

      {/* Visual Diagnostic Charts: Donut + Bar Chart */}
      <DiagnosticChartsSection
        sessionsCount={sessionsCount}
        bagsCount={bagsCount}
        highWarningsCount={highWarningsCount}
        pendingCount={pendingCount}
        topicStats={topicStats}
        recentSessions={recentSessions}
      />

      {/* Recent Analysis Sessions Table */}
      <RecentAnalysisSessionsTable sessions={recentSessions} />
    </div>
  );
}
