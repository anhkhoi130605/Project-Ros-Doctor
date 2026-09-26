import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../../stored/appStore';
import { PageHeader, Card, Button, Badge, Icon } from '../../../components/common/UIComponents';
import robotHeroImg from '../../../assets/robot-hero.jpg';

function ViewerDashboardView({ state, onSwitchToEngineer }) {
  const publishedSessions = (state.sessions || []).filter(
    (s) => s.status === 'complete' || s.id === '023'
  );
  const approvedReports = (state.reports || []).filter((r) => r.status === 'approved');

  return (
    <div className="viewer-dashboard-overview" style={{ display: 'grid', gap: '24px' }}>
      {/* Page Header V01 */}
      <PageHeader
        eyebrow="USER · CHỈ XEM"
        title="Không gian quan sát"
        subtitle="Dữ liệu và kết luận đã được kỹ sư xác nhận trong Robotics Lab."
      >
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Badge tone="blue">• Quyền Người xem (Chỉ đọc)</Badge>
          {onSwitchToEngineer && (
            <button
              type="button"
              onClick={onSwitchToEngineer}
              className="button ghost"
              style={{ fontSize: '12px', padding: '6px 12px', minHeight: '34px', borderRadius: '8px' }}
            >
              🔄 Xem góc nhìn Kỹ sư (E01)
            </button>
          )}
        </div>
      </PageHeader>

      {/* Hero Banner Card V01 */}
      <div
        style={{
          position: 'relative',
          background: 'linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%)',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '36px 32px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          minHeight: '260px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        }}
      >
        {/* Background Robot Image on right */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '50%',
            backgroundImage: `url(${robotHeroImg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
            maskImage: 'linear-gradient(to right, transparent 0%, black 35%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 35%)',
            pointerEvents: 'none',
            opacity: 0.9,
          }}
        />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: '62%' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 750,
              letterSpacing: '0.8px',
              color: '#d97706',
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: '10px',
            }}
          >
            RAV-13 / SHARED INSIGHTS
          </span>
          <h2
            style={{
              fontSize: '32px',
              fontWeight: 800,
              color: '#0f172a',
              lineHeight: 1.25,
              margin: '0 0 14px 0',
              letterSpacing: '-0.5px',
            }}
          >
            Hiểu dữ liệu.<br />
            Theo dõi kết quả.
          </h2>
          <p style={{ fontSize: '13.5px', color: '#475569', margin: '0 0 24px 0', lineHeight: 1.6 }}>
            Khám phá topic, timeline, cây TF và báo cáo được chia sẻ. Kết quả đang chờ duyệt sẽ xuất hiện sau khi kỹ sư hoàn tất xác nhận.
          </p>
          <Button
            to="/reports"
            icon="file-text"
            style={{
              background: '#0f172a',
              color: '#ffffff',
              padding: '12px 22px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '13px',
              border: 'none',
              boxShadow: '0 4px 14px rgba(15, 23, 42, 0.15)',
            }}
          >
            Xem báo cáo đã duyệt
          </Button>
        </div>
      </div>

      {/* Stats Grid 3 Cards V01 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Stat 1: Rosbag được chia sẻ */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '24px',
            position: 'relative',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Rosbag được chia sẻ</span>
            <div style={{ width: 36, height: 36, borderRadius: '8px', background: '#ecfeff', color: '#0891b2', display: 'grid', placeItems: 'center' }}>
              <Icon name="database" size={18} />
            </div>
          </div>
          <strong style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', display: 'block', lineHeight: 1.1 }}>
            {state.bags?.length ? Math.min(state.bags.length, 2) : 1}
          </strong>
          <small style={{ fontSize: '12px', color: '#64748b', marginTop: '8px', display: 'block' }}>
            Trong dự án được cấp quyền
          </small>
        </div>

        {/* Stat 2: Phiên đã công bố */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '24px',
            position: 'relative',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Phiên đã công bố</span>
            <div style={{ width: 36, height: 36, borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'grid', placeItems: 'center' }}>
              <Icon name="activity" size={18} />
            </div>
          </div>
          <strong style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', display: 'block', lineHeight: 1.1 }}>
            {publishedSessions.length || 1}
          </strong>
          <small style={{ fontSize: '12px', color: '#64748b', marginTop: '8px', display: 'block' }}>
            Có báo cáo được duyệt đầy đủ
          </small>
        </div>

        {/* Stat 3: Báo cáo đã duyệt */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '24px',
            position: 'relative',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Báo cáo đã duyệt</span>
            <div style={{ width: 36, height: 36, borderRadius: '8px', background: '#f0fdf4', color: '#16a34a', display: 'grid', placeItems: 'center' }}>
              <Icon name="file-text" size={18} />
            </div>
          </div>
          <strong style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', display: 'block', lineHeight: 1.1 }}>
            {approvedReports.length || 1}
          </strong>
          <small style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600, marginTop: '8px', display: 'block' }}>
            Có thể xem nội dung chi tiết →
          </small>
        </div>
      </div>

      {/* Main Table: Kết quả được chia sẻ V01 */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
            Kết quả được chia sẻ
          </h2>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Chỉ hiển thị các phiên đã có báo cáo phê duyệt
          </span>
        </div>

        <div className="table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  PHIÊN
                </th>
                <th style={{ padding: '12px 16px', fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  TOPIC
                </th>
                <th style={{ padding: '12px 16px', fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  THỜI ĐIỂM
                </th>
                <th style={{ padding: '12px 16px', fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  TRẠNG THÁI
                </th>
              </tr>
            </thead>
            <tbody>
              {publishedSessions.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px' }}>
                    <Link to={`/sessions/${s.id}`} style={{ textDecoration: 'none' }}>
                      <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block' }}>
                        {s.name || 'Warehouse'}
                      </strong>
                      <small style={{ fontSize: '12px', color: '#0284c7', fontWeight: 600 }}>
                        #{s.id} / Xem chi tiết →
                      </small>
                    </Link>
                  </td>
                  <td style={{ padding: '16px', fontSize: '13px', color: '#334155' }}>
                    {s.topics || 18}
                  </td>
                  <td style={{ padding: '16px', fontSize: '13px', color: '#334155' }}>
                    08:42 22/09/2026
                  </td>
                  <td style={{ padding: '16px' }}>
                    <Badge tone="green">• Đã công bố</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function DashboardOverviewPage() {
  const { state } = useApp();
  const [viewMode, setViewMode] = useState(
    (state.role || '').toLowerCase() === 'user' ? 'viewer' : 'engineer'
  );

  const isViewerMode = viewMode === 'viewer' || (state.role || '').toLowerCase() === 'user';

  if (isViewerMode) {
    return (
      <ViewerDashboardView
        state={state}
        onSwitchToEngineer={() => setViewMode('engineer')}
      />
    );
  }

  const pendingCount = (state.findings || []).filter((f) => f.review?.status === 'pending').length || 5;
  const bagsCount = (state.bags || []).length || 4;
  const sessionsCount = (state.sessions || []).length || 2;
  const highWarningsCount = 5;

  return (
    <div className="dashboard-overview" style={{ display: 'grid', gap: '24px' }}>
      {/* Page Header */}
      <PageHeader
        title="Trung tâm chẩn đoán"
        subtitle={`Xin chào ${state.profile?.name?.split(' ')[0] || 'An'}. Theo dõi dữ liệu, bằng chứng và các kết luận cần duyệt.`}
      >
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setViewMode('viewer')}
            className="button ghost"
            style={{ fontSize: '12px', padding: '6px 12px', minHeight: '34px', borderRadius: '8px' }}
          >
            👁️ Xem góc nhìn Người xem (V01)
          </button>
          {state.role === 'Engineering' && (
            <Button to="/upload" icon="plus" style={{ background: '#0f172a', color: '#ffffff', borderRadius: '8px' }}>
              Phân tích mới
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Hero & Priority Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2.2fr) minmax(300px, 1fr)', gap: '20px' }}>
        {/* Hero Banner Card */}
        <div
          style={{
            position: 'relative',
            background: 'linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%)',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '32px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minHeight: '260px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          }}
        >
          {/* Background Robot Image on right */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: '50%',
              backgroundImage: `url(${robotHeroImg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center top',
              maskImage: 'linear-gradient(to right, transparent 0%, black 35%)',
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 35%)',
              pointerEvents: 'none',
              opacity: 0.9,
            }}
          />

          <div style={{ position: 'relative', zIndex: 2, maxWidth: '58%' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.8px',
                color: '#64748b',
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: '10px',
              }}
            >
              CTRN SHIFT N / AI ASSISTED
            </span>
            <h2
              style={{
                fontSize: '32px',
                fontWeight: 800,
                color: '#0f172a',
                lineHeight: 1.2,
                margin: '0 0 12px 0',
                letterSpacing: '-0.5px',
              }}
            >
              Chẩn đoán bắt đầu<br />từ một rosbag.
            </h2>
            <p style={{ fontSize: '14px', color: '#475569', margin: '0 0 24px 0' }}>
              Đọc tín hiệu. Đối chiếu bằng chứng.
            </p>
            <Button
              to="/upload"
              icon="upload"
              style={{
                background: '#0f172a',
                color: '#ffffff',
                padding: '12px 22px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '13px',
                border: 'none',
                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.15)',
              }}
            >
              Nạp & phân tích rosbag
            </Button>
          </div>
        </div>

        {/* Priority Today Card */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <strong style={{ fontSize: '16px', color: '#0f172a', fontWeight: 700 }}>Ưu tiên hôm nay</strong>
            <span
              style={{
                background: '#e0f2fe',
                color: '#0369a1',
                fontSize: '11px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '12px',
              }}
            >
              ● 3 mục
            </span>
          </div>

          <div style={{ display: 'grid', gap: '14px' }}>
            <Link
              to="/reviews"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: '10px',
                background: '#fafbfd',
                border: '1px solid #f1f5f9',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#f1f5f9')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d97706' }} />
                <div>
                  <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>5 kết luận chờ duyệt</strong>
                  <small style={{ fontSize: '11px', color: '#64748b' }}>Cần người duyệt kiểm tra</small>
                </div>
              </div>
              <Icon name="chevron" size={16} style={{ color: '#94a3b8' }} />
            </Link>

            <Link
              to="/reviews"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: '10px',
                background: '#fafbfd',
                border: '1px solid #f1f5f9',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#f1f5f9')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626' }} />
                <div>
                  <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>3 cảnh báo mức cao</strong>
                  <small style={{ fontSize: '11px', color: '#64748b' }}>Đối chiếu bằng chứng của phiên</small>
                </div>
              </div>
              <Icon name="chevron" size={16} style={{ color: '#94a3b8' }} />
            </Link>

            <Link
              to="/bags"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: '10px',
                background: '#fafbfd',
                border: '1px solid #f1f5f9',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#f1f5f9')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb' }} />
                <div>
                  <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>1 bag chưa đủ dữ liệu</strong>
                  <small style={{ fontSize: '11px', color: '#64748b' }}>Kiểm tra các phần đã ghi</small>
                </div>
              </div>
              <Icon name="chevron" size={16} style={{ color: '#94a3b8' }} />
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
        {/* Card 1 */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '8px' }}>Phiên phân tích</span>
            <strong style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{sessionsCount}</strong>
            <small style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginTop: '8px' }}>Trong không gian làm việc</small>
          </div>
          <div style={{ background: '#f0f9ff', color: '#0284c7', padding: '10px', borderRadius: '10px' }}>
            <Icon name="activity" size={20} />
          </div>
        </div>

        {/* Card 2 */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '8px' }}>Rosbag đã nạp</span>
            <strong style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{bagsCount}</strong>
            <small style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginTop: '8px' }}>Dữ liệu mẫu và tệp đã chọn</small>
          </div>
          <div style={{ background: '#f0f9ff', color: '#0284c7', padding: '10px', borderRadius: '10px' }}>
            <Icon name="database" size={20} />
          </div>
        </div>

        {/* Card 3 */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '8px' }}>Sự cố cần kiểm tra</span>
            <strong style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{highWarningsCount}</strong>
            <small style={{ fontSize: '11px', color: '#dc2626', display: 'block', marginTop: '8px' }}>3 mức cao trong dữ liệu mẫu</small>
          </div>
          <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px', borderRadius: '10px' }}>
            <Icon name="alert" size={20} />
          </div>
        </div>

        {/* Card 4 */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '8px' }}>Kết luận chờ duyệt</span>
            <strong style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{pendingCount}</strong>
            <small style={{ fontSize: '11px', color: '#d97706', display: 'block', marginTop: '8px' }}>Kỹ sư kiểm tra trước khi xuất</small>
          </div>
          <div style={{ background: '#fffbeb', color: '#d97706', padding: '10px', borderRadius: '10px' }}>
            <Icon name="file-text" size={20} />
          </div>
        </div>
      </div>

      {/* Recent Analysis Sessions Table */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>Phiên phân tích gần đây</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              Toàn bộ kết quả chẩn đoán trong bản này là dữ liệu mô phỏng.
            </p>
          </div>
          <Link
            to="/analysis"
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#2563eb',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Xem tất cả <Icon name="arrow" size={14} />
          </Link>
        </div>

        <div className="table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#64748b', fontWeight: 700 }}>PHIÊN / ROSBAG</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#64748b', fontWeight: 700 }}>THỜI ĐIỂM</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#64748b', fontWeight: 700 }}>TOPIC</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#64748b', fontWeight: 700 }}>CẢNH BÁO</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#64748b', fontWeight: 700 }}>TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '16px' }}>
                  <Link to="/sessions/024" style={{ textDecoration: 'none' }}>
                    <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block' }}>AGV-Lab - phiên # 024</strong>
                    <small style={{ fontSize: '12px', color: '#64748b' }}>agv_lab_2026.09_22.mcap</small>
                  </Link>
                </td>
                <td style={{ padding: '16px', fontSize: '13px', color: '#334155' }}>09:24 22/09/2026</td>
                <td style={{ padding: '16px', fontSize: '13px', color: '#334155' }}>12</td>
                <td style={{ padding: '16px', fontSize: '13px', color: '#dc2626', fontWeight: 700 }}>5</td>
                <td style={{ padding: '16px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#fffbeb',
                      color: '#d97706',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    ● Chờ duyệt
                  </span>
                </td>
              </tr>

              <tr>
                <td style={{ padding: '16px' }}>
                  <Link to="/sessions/023" style={{ textDecoration: 'none' }}>
                    <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block' }}>Warehouse - phiên # 023</strong>
                    <small style={{ fontSize: '12px', color: '#64748b' }}>warehouse_route_03.mcap</small>
                  </Link>
                </td>
                <td style={{ padding: '16px', fontSize: '13px', color: '#334155' }}>08:42 22/09/2026</td>
                <td style={{ padding: '16px', fontSize: '13px', color: '#334155' }}>18</td>
                <td style={{ padding: '16px', fontSize: '13px', color: '#16a34a', fontWeight: 700 }}>0</td>
                <td style={{ padding: '16px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#f0fdf4',
                      color: '#16a34a',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    ● Hoàn tất
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
