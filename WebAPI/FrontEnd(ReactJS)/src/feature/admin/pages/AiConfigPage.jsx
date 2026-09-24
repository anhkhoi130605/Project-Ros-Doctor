import React, { useState } from 'react';
import { useApp } from '../../../stored/appStore';
import { PageHeader, Card, Button, Badge } from '../../../components/common/UIComponents';

export default function AiConfigPage() {
  const { state, dispatch, notify } = useApp();

  const [aiConfig, setAiConfig] = useState(() => ({
    dailyCalls: state.aiSettings?.dailyRequests || 100,
    maxTokens: state.aiSettings?.maxTokens || 4000,
    rpm: state.aiSettings?.rpm || 10,
    monthlyBudget: state.aiSettings?.monthlyBudget || 25,
    modelName: state.aiSettings?.modelName || 'Chưa kết nối',
    vectorDbUrl: state.aiSettings?.vectorDbUrl || 'http://localhost:8333',
    prompt:
      state.aiSettings?.prompt ||
      'Phân tích log ROS2 dựa trên bằng chứng. Phân biệt quan sát với giả thuyết. Kỹ sư duyệt mọi kết luận.',
  }));

  const handleSave = (e) => {
    if (e) e.preventDefault();
    dispatch({
      type: 'SETTINGS',
      settings: {
        ...(state.settings || {}),
        aiSettings: aiConfig,
      },
    });
    notify('Đã lưu cấu hình AI & hệ thống thành công!', 'success');
  };

  return (
    <div className="ai-config-page">
      <PageHeader
        eyebrow="KHÔNG GIAN LÀM VIỆC"
        title="Cấu hình AI & hệ thống"
        subtitle="Thiết lập giới hạn và ngữ cảnh cho Agent chẩn đoán."
      >
        <Button variant="primary" icon="check" onClick={handleSave}>
          Lưu cấu hình AI
        </Button>
      </PageHeader>

      <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        <Card title="Ngân sách & hạn mức">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: 'var(--text)' }}>
                Số lượt gọi mỗi ngày
              </label>
              <input
                type="number"
                value={aiConfig.dailyCalls}
                onChange={(e) => setAiConfig({ ...aiConfig, dailyCalls: Number(e.target.value) })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: 'var(--text)' }}>
                Token tối đa mỗi lần
              </label>
              <input
                type="number"
                value={aiConfig.maxTokens}
                onChange={(e) => setAiConfig({ ...aiConfig, maxTokens: Number(e.target.value) })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: 'var(--text)' }}>
                Lượt gọi mỗi phút
              </label>
              <input
                type="number"
                value={aiConfig.rpm}
                onChange={(e) => setAiConfig({ ...aiConfig, rpm: Number(e.target.value) })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: 'var(--text)' }}>
                Ngân sách tháng (USD)
              </label>
              <input
                type="number"
                value={aiConfig.monthlyBudget}
                onChange={(e) => setAiConfig({ ...aiConfig, monthlyBudget: Number(e.target.value) })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
              />
            </div>
          </div>

          <div
            style={{
              marginTop: '20px',
              padding: '12px 14px',
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
            }}
          >
            <span style={{ color: 'var(--cyan)', marginTop: '1px', flexShrink: 0, fontWeight: 'bold' }}>(i)</span>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6 }}>
              Các giá trị được lưu cho bản demo. Hạn mức thực tế cần được API xác thực và thực thi.
            </p>
          </div>
        </Card>

        <Card title="Kết nối & prompt" action={<Badge tone="muted">• Chưa kết nối dịch vụ AI</Badge>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: 'var(--text)' }}>
                Mô hình dự kiến
              </label>
              <input
                type="text"
                value={aiConfig.modelName}
                onChange={(e) => setAiConfig({ ...aiConfig, modelName: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: 'var(--text)' }}>
                Địa chỉ Vector DB
              </label>
              <input
                type="text"
                value={aiConfig.vectorDbUrl}
                onChange={(e) => setAiConfig({ ...aiConfig, vectorDbUrl: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: 'var(--text)' }}>
                Prompt chẩn đoán
              </label>
              <textarea
                rows={5}
                value={aiConfig.prompt}
                onChange={(e) => setAiConfig({ ...aiConfig, prompt: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  fontSize: '13px',
                  lineHeight: 1.6,
                  resize: 'vertical',
                }}
              />
            </div>

            <small style={{ color: 'var(--muted)', fontSize: '11px' }}>
              Cấu hình kết nối được lưu làm bản nháp; giao diện không gửi yêu cầu đến địa chỉ này.
            </small>
          </div>
        </Card>
      </form>
    </div>
  );
}
