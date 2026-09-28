import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../../stored/appStore';
import { Card, Button } from '../../../components/common/UIComponents';
import EngineeringReviewDetailPage from './Engineering/ReviewDetailPage';

export default function ReviewDetailPage() {
  const { state } = useApp();
  const navigate = useNavigate();
  const role = String(state.role || '').toLowerCase();
  const isEngineering = role === 'engineering' || role === 'admin';

  if (!isEngineering) {
    return (
      <div style={{ maxWidth: '640px', margin: '48px auto', padding: '0 16px' }}>
        <Card style={{ padding: '32px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>Không có quyền truy cập</h2>
          <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
            Trang <strong>Thẩm định chi tiết kết luận</strong> chỉ dành riêng cho Kỹ sư Robotics.
          </p>
          <Button onClick={() => navigate('/reports')}>Xem báo cáo</Button>
        </Card>
      </div>
    );
  }

  return <EngineeringReviewDetailPage />;
}
