import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from '../stored/appStore';

// Layout
import AppLayout from '../components/layout/AppLayout';

// Public Pages
import LandingPage from '../feature/auth/pages/LandingPage';
import LoginPage from '../feature/auth/pages/LoginPage';
import RegisterPage from '../feature/auth/pages/RegisterPage';
import LoginSuccessPage from '../feature/auth/pages/LoginSuccessPage';

// Feature Pages
import DashboardOverviewPage from '../feature/DashBoard/pages/DashboardOverviewPage';
import BagsListPage from '../feature/bags/pages/BagsListPage';
import BagDetailPage from '../feature/bags/pages/BagDetailPage';
import BagValidationPage from '../feature/bags/pages/BagValidationPage';
import AnalysisConfigurePage from '../feature/bags/pages/AnalysisConfigurePage';
import AnalysisProcessingPage from '../feature/bags/pages/AnalysisProcessingPage';
import SessionDetailPage from '../feature/bags/pages/SessionDetailPage';
import SessionOverviewPage from '../feature/bags/pages/SessionOverviewPage';
import SessionTopicsPage from '../feature/bags/pages/SessionTopicsPage';
import SessionIssuesPage from '../feature/bags/pages/SessionIssuesPage';
import SessionTfPage from '../feature/bags/pages/SessionTfPage';
import SessionSyncPage from '../feature/bags/pages/SessionSyncPage';
import SessionAgentPage from '../feature/bags/pages/SessionAgentPage';
import UploadPage from '../feature/bags/pages/UploadPage';
import AnalysisPage from '../feature/bags/pages/AnalysisPage';
import ReportsListPage from '../feature/reports/pages/ReportsListPage';
import ReportDetailPage from '../feature/reports/pages/ReportDetailPage';
import ReviewsListPage from '../feature/reports/pages/ReviewsListPage';
import ChatPage from '../feature/chat/pages/ChatPage';
import BenchmarkPage from '../feature/benchmark/pages/BenchmarkPage';
import CostPerformancePage from '../feature/admin/pages/CostPerformancePage';
import AdminOverviewPage from '../feature/admin/pages/AdminOverviewPage';
import SettingsPage from '../feature/admin/pages/SettingsPage';
import AiConfigPage from '../feature/admin/pages/AiConfigPage';

function ProtectedRoute({ children }) {
  const { state } = useApp();
  if (!state.signedIn && !localStorage.getItem('accessToken')) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function AppRouter() {
  return (
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
        <Route path="/sessions/:id/overview" element={<SessionOverviewPage />} />
        <Route path="/sessions/:id/topics" element={<SessionTopicsPage />} />
        <Route path="/sessions/:id/issues" element={<SessionIssuesPage />} />
        <Route path="/sessions/:id/tf" element={<SessionTfPage />} />
        <Route path="/sessions/:id/sync" element={<SessionSyncPage />} />
        <Route path="/sessions/:id/agent" element={<SessionAgentPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/reports" element={<ReportsListPage />} />
        <Route path="/reports/:id" element={<ReportDetailPage />} />
        <Route path="/reviews" element={<ReviewsListPage />} />
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
  );
}
