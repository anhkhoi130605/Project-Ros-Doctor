import React from 'react';
import { useApp } from '../../../stored/appStore';
import EngineeringBagsListPage from '../page/Engineering/EngineeringBagsListPage';
import UserBagsListPage from '../page/User/UserBagsListPage';

export default function BagsListPage() {
  const { state } = useApp();
  const role = String(state.role || '').toLowerCase();
  const isUserRole = role === 'user' || role === 'viewer';

  if (isUserRole) {
    return <UserBagsListPage />;
  }

  return <EngineeringBagsListPage />;
}
