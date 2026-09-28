import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../../stored/appStore.jsx';
import { PageHeader, Card, Button, Badge, Icon } from '../../../components/common/UIComponents.jsx';
import robotHeroImg from '../../../assets/robot-hero.jpg';
import EngineeringDashboardPage from './Engineering/EngineeringDashboardPage.jsx';

function ViewerDashboardView({ state, onSwitchToEngineer }) {
  const publishedSessions = (state.sessions || []).filter(
    (s) => s.status === 'complete' || s.id === '023'
  );
  const approvedReports = (state.reports || []).filter((r) => r.status === 'approved');

  return (
    <div className="viewer-dashboard-overview" style={{ display: 'grid', gap: '24px' }}>
      {/* Page Header V01 */}
      <PageHeader
        eyebrow="USER Â· CHá»ˆ XEM"
        title="KhÃ´ng gian quan sÃ¡t"
        subtitle="Dá»¯ liá»‡u vÃ  káº¿t luáº­n Ä‘Ã£ Ä‘Æ°á»£c ká»¹ sÆ° xÃ¡c nháº­n trong Robotics Lab."
      >
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Badge tone="blue">â€¢ Quyá»n NgÆ°á»i xem (Chá»‰ Ä‘á»c)</Badge>
          {onSwitchToEngineer && (
            <button
              type="button"
              onClick={onSwitchToEngineer}
              className="button ghost"
              style={{ fontSize: '12px', padding: '6px 12px', minHeight: '34px', borderRadius: '8px' }}
            >
              ðŸ”„ Xem gÃ³c nhÃ¬n Ká»¹ sÆ° (E01)
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
            Hiá»ƒu dá»¯ liá»‡u.<br />
            Theo dÃµi káº¿t quáº£.
          </h2>
          <p style={{ fontSize: '13.5px', color: '#475569', margin: '0 0 24px 0', lineHeight: 1.6 }}>
            KhÃ¡m phÃ¡ topic, timeline, cÃ¢y TF vÃ  bÃ¡o cÃ¡o Ä‘Æ°á»£c chia sáº». Káº¿t quáº£ Ä‘ang chá» duyá»‡t sáº½ xuáº¥t hiá»‡n sau khi ká»¹ sÆ° hoÃ n táº¥t xÃ¡c nháº­n.
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
            Xem bÃ¡o cÃ¡o Ä‘Ã£ duyá»‡t
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
        {/* Stat 1: Rosbag Ä‘Æ°á»£c chia sáº» */}
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
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Rosbag Ä‘Æ°á»£c chia sáº»</span>
            <div style={{ width: 36, height: 36, borderRadius: '8px', background: '#ecfeff', color: '#0891b2', display: 'grid', placeItems: 'center' }}>
              <Icon name="database" size={18} />
            </div>
          </div>
          <strong style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', display: 'block', lineHeight: 1.1 }}>
            {state.bags?.length ? Math.min(state.bags.length, 2) : 1}
          </strong>
          <small style={{ fontSize: '12px', color: '#64748b', marginTop: '8px', display: 'block' }}>
            Trong dá»± Ã¡n Ä‘Æ°á»£c cáº¥p quyá»n
          </small>
        </div>

        {/* Stat 2: PhiÃªn Ä‘Ã£ cÃ´ng bá»‘ */}
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
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>PhiÃªn Ä‘Ã£ cÃ´ng bá»‘</span>
            <div style={{ width: 36, height: 36, borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'grid', placeItems: 'center' }}>
              <Icon name="activity" size={18} />
            </div>
          </div>
          <strong style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', display: 'block', lineHeight: 1.1 }}>
            {publishedSessions.length || 1}
          </strong>
          <small style={{ fontSize: '12px', color: '#64748b', marginTop: '8px', display: 'block' }}>
            CÃ³ bÃ¡o cÃ¡o Ä‘Æ°á»£c duyá»‡t Ä‘áº§y Ä‘á»§
          </small>
        </div>

        {/* Stat 3: BÃ¡o cÃ¡o Ä‘Ã£ duyá»‡t */}
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
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>BÃ¡o cÃ¡o Ä‘Ã£ duyá»‡t</span>
            <div style={{ width: 36, height: 36, borderRadius: '8px', background: '#f0fdf4', color: '#16a34a', display: 'grid', placeItems: 'center' }}>
              <Icon name="file-text" size={18} />
            </div>
          </div>
          <strong style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', display: 'block', lineHeight: 1.1 }}>
            {approvedReports.length || 1}
          </strong>
          <small style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600, marginTop: '8px', display: 'block' }}>
            CÃ³ thá»ƒ xem ná»™i dung chi tiáº¿t â†’
          </small>
        </div>
      </div>

      {/* Main Table: Káº¿t quáº£ Ä‘Æ°á»£c chia sáº» V01 */}
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
            Káº¿t quáº£ Ä‘Æ°á»£c chia sáº»
          </h2>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Chá»‰ hiá»ƒn thá»‹ cÃ¡c phiÃªn Ä‘Ã£ cÃ³ bÃ¡o cÃ¡o phÃª duyá»‡t
          </span>
        </div>

        <div className="table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  PHIÃŠN
                </th>
                <th style={{ padding: '12px 16px', fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  TOPIC
                </th>
                <th style={{ padding: '12px 16px', fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  THá»œI ÄIá»‚M
                </th>
                <th style={{ padding: '12px 16px', fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  TRáº NG THÃI
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
                        #{s.id} / Xem chi tiáº¿t â†’
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
                    <Badge tone="green">â€¢ ÄÃ£ cÃ´ng bá»‘</Badge>
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

  return <EngineeringDashboardPage onSwitchToViewer={() => setViewMode('viewer')} />;
}

