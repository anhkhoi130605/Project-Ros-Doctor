import React, { useState } from 'react';
import { useApp } from '../../../stored/appStore';
import { PageHeader, Card } from '../../../components/common/UIComponents';

export default function SettingsPage() {
  const { state, dispatch, notify } = useApp();
  const [settings, setSettings] = useState(() => ({ ...state.settings }));

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    dispatch({ type: 'SETTINGS', settings });
    notify('Đã lưu cấu hình mặc định trên trình duyệt.', 'success');
  };

  return (
    <div className="settings-page-container">
      <PageHeader
        title="Cài đặt phân tích & Ngưỡng kiểm tra"
        subtitle="Thiết lập hồ sơ robot, ngưỡng lệch thời gian và bảo mật dữ liệu."
      />

      <Card>
        <form onSubmit={handleSave} className="settings-form">
          <div className="form-group">
            <label htmlFor="robot-name">Hồ sơ Robot mặc định *</label>
            <input
              id="robot-name"
              type="text"
              value={settings.robot}
              onChange={(e) => handleChange('robot', e.target.value)}
              required
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="win-sec">Cửa sổ tính toán (giây)</label>
              <input
                id="win-sec"
                type="number"
                value={settings.windowSeconds}
                onChange={(e) => handleChange('windowSeconds', Number(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label htmlFor="dead-sec">Thời gian topic ngừng (giây)</label>
              <input
                id="dead-sec"
                type="number"
                value={settings.deadTopicSeconds}
                onChange={(e) => handleChange('deadTopicSeconds', Number(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label htmlFor="clock-thresh">Ngưỡng lệch thời gian (ms)</label>
              <input
                id="clock-thresh"
                type="number"
                value={settings.clockThresholdMs}
                onChange={(e) => handleChange('clockThresholdMs', Number(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label htmlFor="tf-tol">Độ trễ TF động (ms)</label>
              <input
                id="tf-tol"
                type="number"
                value={settings.tfToleranceMs}
                onChange={(e) => handleChange('tfToleranceMs', Number(e.target.value))}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="primary-button lg">
              ✓ Lưu cấu hình
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
