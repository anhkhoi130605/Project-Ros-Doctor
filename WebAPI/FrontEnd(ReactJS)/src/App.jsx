import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './feature/auth/pages/LoginPage';
import RegisterPage from './feature/auth/pages/RegisterPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
