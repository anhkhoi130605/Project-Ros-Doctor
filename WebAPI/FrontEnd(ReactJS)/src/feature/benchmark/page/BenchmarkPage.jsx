import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../../stored/appStore';
import { Card, Button } from '../../../components/common/UIComponents';
import EngineeringBenchmarkPage from './Engineering/BenchmarkPage';

export default function BenchmarkPage() {
  const { state } = useApp();
  const navigate = useNavigate();
  const role = String(state.role || '').toLowerCase();
  const isEngineering = role === 'engineering' || role === 'admin';

  if (!isEngineering) {
    return (
      <div className="benchmark-restricted" style={{ maxWidth: '640px', margin: '48px auto', padding: '0 16px' }}>
        <Card style={{ padding: '32px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>Không có quyền truy cập</h2>
          <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
            Tính năng <strong>Benchmark & Đánh giá mô hình kiểm thử</strong> chỉ dành riêng cho vai trò Kỹ sư (Engineering) hoặc Quản trị viên (Admin).
          </p>
          <Button onClick={() => navigate('/dashboard')}>Quay về trang tổng quan</Button>
        </Card>
      </div>
    );
  }

  return <EngineeringBenchmarkPage />;
}
