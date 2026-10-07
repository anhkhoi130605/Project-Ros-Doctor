import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../stored/appStore';
import AppLayout from '../components/layout/AppLayout';

// Lightweight fallback spinner while lazy chunk loads
function PageLoadingFallback() {
  const { t } = useTranslation('common');

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            border: '3px solid #e2e8f0',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <span style={{ fontSize: '13px', color: '#64748b' }}>{t('system.loadingPage')}</span>
      </div>
    </div>
  );
}

// Public Pages (Lazy Loaded)
const LandingPage = lazy(() => import('../feature/auth/pages/LandingPage'));
const LoginPage = lazy(() => import('../feature/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('../feature/auth/pages/RegisterPage'));
const LoginSuccessPage = lazy(() => import('../feature/auth/pages/LoginSuccessPage'));

// Feature Pages (Lazy Loaded)
const DashboardOverviewPage = lazy(() =>
  import('../feature/dashboard').then((m) => ({ default: m.DashboardOverviewPage }))
);
const BagsListPage = lazy(() =>
  import('../feature/bags').then((m) => ({ default: m.BagsListPage }))
);
const BagDetailPage = lazy(() =>
  import('../feature/bags').then((m) => ({ default: m.BagDetailPage }))
);
const BagValidationPage = lazy(() =>
  import('../feature/bags').then((m) => ({ default: m.BagValidationPage }))
);
const AnalysisConfigurePage = lazy(() =>
  import('../feature/bags').then((m) => ({ default: m.AnalysisConfigurePage }))
);
const AnalysisProcessingPage = lazy(() =>
  import('../feature/bags').then((m) => ({ default: m.AnalysisProcessingPage }))
);
const SessionDetailPage = lazy(() =>
  import('../feature/bags').then((m) => ({ default: m.SessionDetailPage }))
);
const SessionOverviewPage = lazy(() =>
  import('../feature/bags').then((m) => ({ default: m.SessionOverviewPage }))
);
const SessionTopicsPage = lazy(() =>
  import('../feature/bags').then((m) => ({ default: m.SessionTopicsPage }))
);
const SessionIssuesPage = lazy(() =>
  import('../feature/bags').then((m) => ({ default: m.SessionIssuesPage }))
);
const SessionTfPage = lazy(() =>
  import('../feature/bags').then((m) => ({ default: m.SessionTfPage }))
);
const SessionSyncPage = lazy(() =>
  import('../feature/bags').then((m) => ({ default: m.SessionSyncPage }))
);
const SessionAgentPage = lazy(() =>
  import('../feature/bags').then((m) => ({ default: m.SessionAgentPage }))
);
const UploadPage = lazy(() =>
  import('../feature/bags').then((m) => ({ default: m.UploadPage }))
);
const AnalysisPage = lazy(() =>
  import('../feature/bags').then((m) => ({ default: m.AnalysisPage }))
);

const ReportsListPage = lazy(() =>
  import('../feature/reports').then((m) => ({ default: m.ReportsListPage }))
);
const ReportDetailPage = lazy(() =>
  import('../feature/reports').then((m) => ({ default: m.ReportDetailPage }))
);
const ReviewsListPage = lazy(() =>
  import('../feature/reports').then((m) => ({ default: m.ReviewsListPage }))
);
const ReviewDetailPage = lazy(() =>
  import('../feature/reports').then((m) => ({ default: m.ReviewDetailPage }))
);

const ChatPage = lazy(() => import('../feature/chat/pages/ChatPage'));
const BenchmarkPage = lazy(() => import('../feature/benchmark'));
const CostPerformancePage = lazy(() => import('../feature/admin/pages/CostPerformancePage'));
const AdminOverviewPage = lazy(() => import('../feature/admin/pages/AdminOverviewPage'));
const SettingsPage = lazy(() => import('../feature/admin/pages/SettingsPage'));
const AiConfigPage = lazy(() => import('../feature/admin/pages/AiConfigPage'));

function ProtectedRoute({ children }) {
  const { state } = useApp();
  if (!state.signedIn && !localStorage.getItem('accessToken')) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function AppRouter() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <Routes>
        {/* Public Landing & Auth Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login-success" element={<LoginSuccessPage />} />

        {/* Authenticated Dashboard App Routes */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardOverviewPage />} />
          <Route path="/bags" element={<BagsListPage />} />
          <Route path="/bags/:bagId" element={<BagDetailPage />} />
          <Route path="/upload/validate" element={<BagValidationPage />} />
          <Route path="/analysis/configure" element={<AnalysisConfigurePage />} />
          <Route path="/analysis/processing" element={<AnalysisProcessingPage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/sessions/:id" element={<SessionDetailPage />} />
          <Route path="/sessions/:id/:tab" element={<SessionDetailPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/reports" element={<ReportsListPage />} />
          <Route path="/reports/:id" element={<ReportDetailPage />} />
          <Route path="/reviews" element={<ReviewsListPage />} />
          <Route path="/reviews/:findingId" element={<ReviewDetailPage />} />
          <Route path="/reviews/detail" element={<ReviewDetailPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/benchmark" element={<BenchmarkPage />} />
          <Route path="/usage" element={<CostPerformancePage />} />
          <Route path="/admin" element={<Navigate to="/admin/members" replace />} />
          <Route path="/admin/overview" element={<Navigate to="/admin/members" replace />} />
          <Route path="/admin/ai-config" element={<AiConfigPage />} />
          <Route path="/admin/:tab" element={<AdminOverviewPage />} />
          <Route path="/admin/user-activity/:id" element={<AdminOverviewPage />} />
          <Route path="/admin-dashboard" element={<Navigate to="/admin" replace />} />
          <Route path="/admin-dashboard/*" element={<Navigate to="/admin" replace />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/ai-config" element={<AiConfigPage />} />
          <Route path="/settings/:tab" element={<AdminOverviewPage />} />
        </Route>

        {/* Fallback Catch-All */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
