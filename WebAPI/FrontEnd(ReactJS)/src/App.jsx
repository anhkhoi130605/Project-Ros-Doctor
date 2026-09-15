import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './feature/auth/pages/Loginpage';
import RegisterPage from './feature/auth/pages/RegisterPage';
import DashboardPage from './feature/DashBoard';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
