import React from 'react';
import { useApp } from '../../../stored/appStore';
import EngineeringSessionDetailPage from './Engineering/EngineeringSessionDetailPage';
import UserSessionDetailPage from './User/UserSessionDetailPage';

export default function SessionDetailPage() {
  const { state } = useApp();
  const role = String(state.role || '').toLowerCase();
  const isUserRole = role === 'user' || role === 'viewer';

  if (isUserRole) {
    return <UserSessionDetailPage />;
  }

  return <EngineeringSessionDetailPage />;
}
