import React from 'react';
import { useApp } from '../../../stored/appStore';
import EngineeringBagDetailPage from './Engineering/EngineeringBagDetailPage';
import UserBagDetailPage from './User/UserBagDetailPage';

export default function BagDetailPage() {
  const { state } = useApp();
  const role = String(state.role || '').toLowerCase();
  const isUserRole = role === 'user' || role === 'viewer';

  if (isUserRole) {
    return <UserBagDetailPage />;
  }

  return <EngineeringBagDetailPage />;
}
