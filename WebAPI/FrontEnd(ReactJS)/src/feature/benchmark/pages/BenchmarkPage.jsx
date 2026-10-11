import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../../stored/appStore';
import { Card, Button } from '../../../components/common/UIComponents';
import BenchmarkManagementPage from './BenchmarkManagementPage';
import { useTranslation } from 'react-i18next';

export default function BenchmarkPage() {
  const { state } = useApp();
  const { i18n } = useTranslation();
  const en = (i18n.resolvedLanguage || i18n.language || 'vi').startsWith('en');
  const navigate = useNavigate();
  const role = String(state.role || '').toLowerCase();
  const isEngineering = role === 'engineering' || role === 'admin';

  if (!isEngineering) {
    return (
      <div className="benchmark-restricted" style={{ maxWidth: '640px', margin: '48px auto', padding: '0 16px' }}>
        <Card style={{ padding: '32px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>{en ? 'Access denied' : 'Không có quyền truy cập'}</h2>
          <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
            {en ? 'Benchmark management is available only to Engineers and Administrators.' : 'Quản lý benchmark chỉ dành cho Kỹ sư hoặc Quản trị viên.'}
          </p>
          <Button onClick={() => navigate('/dashboard')}>{en ? 'Back to overview' : 'Quay về trang tổng quan'}</Button>
        </Card>
      </div>
    );
  }

  return <BenchmarkManagementPage />;
}
