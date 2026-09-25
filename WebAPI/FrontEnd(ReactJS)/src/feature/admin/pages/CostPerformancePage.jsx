import React from 'react';
import { useApp } from '../../../stored/appStore';
import { PageHeader, Card, Button, Badge, Icon } from '../../../components/common/UIComponents';

export default function CostPerformancePage() {
  const { state } = useApp();

  return (
    <div className="cost-performance-page">
      <PageHeader
        eyebrow="TỐI ƯU HÓA HỆ THỐNG"
        title="Chi phí & Hiệu suất AI"
        subtitle="Theo dõi định lượng tài nguyên GPU, thời gian phản hồi AI Agent và ngân sách token chẩn đoán."
      >
        <Button variant="ghost" icon="sliders">
          Cấu hình hạn mức
        </Button>
      </PageHeader>

      {/* Overview Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '18px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Thời gian phản hồi TB</span>
          <strong style={{ fontSize: '24px', color: '#0f172a', fontWeight: 800 }}>1.45 giây</strong>
          <small style={{ display: 'block', color: '#16a34a', marginTop: '4px', fontSize: '11px' }}>⚡ Nhanh hơn 18% so với tuần trước</small>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '18px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Tổng Tokens đã dùng</span>
          <strong style={{ fontSize: '24px', color: '#0284c7', fontWeight: 800 }}>1.24M</strong>
          <small style={{ display: 'block', color: '#0284c7', marginTop: '4px', fontSize: '11px' }}>📊 42% hạn mức tháng</small>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '18px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Tải GPU / NPU trung bình</span>
          <strong style={{ fontSize: '24px', color: '#d97706', fontWeight: 800 }}>34.2%</strong>
          <small style={{ display: 'block', color: '#16a34a', marginTop: '4px', fontSize: '11px' }}>🟢 Hoạt động mát mẻ</small>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '18px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Ước tính chi phí / phiên</span>
          <strong style={{ fontSize: '24px', color: '#16a34a', fontWeight: 800 }}>$0.04</strong>
          <small style={{ display: 'block', color: '#64748b', marginTop: '4px', fontSize: '11px' }}>💡 Tối ưu với Local LLM</small>
        </div>
      </div>

      {/* Cost & Performance Details */}
      <Card title="Phân bổ tài nguyên & Thời gian chạy" subtitle="Thống kê hiệu năng mô hình AI chẩn đoán theo từng tác vụ">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>TÁC VỤ AI</th>
                <th>MÔ HÌNH SỬ DỤNG</th>
                <th>THỜI GIAN THỰC THI</th>
                <th>TOKENS / PHIÊN</th>
                <th>MỨC ĐỘ TIÊU HAO</th>
                <th>TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong style={{ color: '#0f172a' }}>Phân tích TF Tree & Drift</strong>
                  <small style={{ color: '#64748b', display: 'block' }}>Kiểm tra lệch tọa độ robot</small>
                </td>
                <td>ROS2-Doctor Vision v2</td>
                <td>0.8s</td>
                <td>12,400 tokens</td>
                <td><Badge tone="green">Thấp</Badge></td>
                <td><span style={{ color: '#16a34a', fontWeight: 700 }}>● Tối ưu</span></td>
              </tr>
              <tr>
                <td>
                  <strong style={{ color: '#0f172a' }}>Tổng hợp & Đề xuất sửa đổi</strong>
                  <small style={{ color: '#64748b', display: 'block' }}>Sinh báo cáo kết luận cho Kỹ sư</small>
                </td>
                <td>Claude 3.5 Sonnet / Local LLM</td>
                <td>2.1s</td>
                <td>48,900 tokens</td>
                <td><Badge tone="orange">Trung bình</Badge></td>
                <td><span style={{ color: '#16a34a', fontWeight: 700 }}>● Tối ưu</span></td>
              </tr>
              <tr>
                <td>
                  <strong style={{ color: '#0f172a' }}>Quét Topic Frequency & Drop Rate</strong>
                  <small style={{ color: '#64748b', display: 'block' }}>Phát hiện mất gói tin cảm biến</small>
                </td>
                <td>Fast-Rust Parser</td>
                <td>0.3s</td>
                <td>0 tokens (Local)</td>
                <td><Badge tone="cyan">Cực thấp</Badge></td>
                <td><span style={{ color: '#16a34a', fontWeight: 700 }}>● Tối ưu</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
