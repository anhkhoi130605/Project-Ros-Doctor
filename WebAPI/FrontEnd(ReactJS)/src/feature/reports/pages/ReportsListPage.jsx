import React from 'react';
import { useApp } from '../../../stored/appStore';
import EngineeringReportsListPage from './Engineering/ReportsListPage';
import UserReportsListPage from './User/UserReportsListPage';

export default function ReportsListPage() {
  const { state } = useApp();
  const role = String(state.role || '').toLowerCase();
  const isUserRole = role === 'user' || role === 'viewer';

  if (isUserRole) {
    return <UserReportsListPage />;
  }

  return <EngineeringReportsListPage />;
}
