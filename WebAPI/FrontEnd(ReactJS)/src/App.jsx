import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './feature/auth/pages/LoginPage';
import RegisterPage from './feature/auth/pages/RegisterPage';
import LoginSuccessPage from './feature/auth/pages/LoginSuccessPage';
import DashboardPage, { AdminDashboardPage, UserDashboardPage } from './feature/DashBoard';
import MembersDashboardPage from './feature/DashBoard/page/Admin/Members/MembersDashboardPage';
import ActivityDashboardPage from './feature/DashBoard/page/Admin/components/ActivityLog/ActivityDashboardPage';
import SystemLogsDashboardPage from './feature/DashBoard/page/Admin/components/SystemLog/SystemLogsDashboardPage';
import UserActivityLogDashboardPage from './feature/DashBoard/page/Admin/components/ActivityLog/UserActivityLogDashboardPage';
import SettingsDashboardPage from './feature/DashBoard/page/Admin/Settings/SettingsDashboardPage';
import UserActivityLogDetailPage from './feature/DashBoard/page/Admin/components/ActivityLog/UserActivityLogDetailPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login-success" element={<LoginSuccessPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/admin-dashboard" element={<AdminDashboardPage />} />
      <Route path="/admin-dashboard/overview" element={<AdminDashboardPage />} />
      <Route path="/admin-dashboard/members" element={<MembersDashboardPage />} />
      <Route path="/admin-dashboard/activity" element={<ActivityDashboardPage />} />
      <Route path="/admin-dashboard/system-logs" element={<SystemLogsDashboardPage />} />
      <Route path="/admin-dashboard/user-activity" element={<UserActivityLogDashboardPage />} />
      <Route path="/admin-dashboard/settings" element={<SettingsDashboardPage />} />
      <Route path="/admin-dashboard/activity/:id" element={<UserActivityLogDetailPage />} />
      <Route path="/user-dashboard" element={<UserDashboardPage />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
