import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../../stored/appStore';
import { DEFAULT_SETTINGS } from '../../../domain/appTypes';
import { PageHeader, Button, Badge, Icon } from '../../../components/common/UIComponents';
import './SettingsPage.css';

const ROBOT_PRESETS = [
  { name: 'AGV-Lab Hồ sơ chuẩn', desc: 'AGV kho hàng với LiDAR 2D & IMU', hz: { '/scan': 10, '/imu': 50, '/odom': 20, '/cmd_vel': 10, '/camera/image': 30 } },
  { name: 'TurtleBot 4 Navigation', desc: 'Robot di động đào tạo ROS 2', hz: { '/scan': 15, '/imu': 100, '/odom': 30, '/cmd_vel': 20, '/camera/image': 30 } },
  { name: 'Drone Inspection v1', desc: 'UAV kiểm tra công trình trên cao', hz: { '/scan': 20, '/imu': 200, '/odom': 50, '/cmd_vel': 50, '/camera/image': 60 } },
  { name: 'AMR Heavy-Duty Logistics', desc: 'Robot tự hành tải trọng lớn công nghiệp', hz: { '/scan': 25, '/imu': 100, '/odom': 50, '/cmd_vel': 20, '/camera/image': 30 } },
];

const TOPIC_DESCRIPTIONS = {
  '/scan': { label: 'LiDAR Quét Laser 2D/3D', icon: 'activity' },
  '/imu': { label: 'Cảm biến Quán tính 6/9-DoF', icon: 'cpu' },
  '/odom': { label: 'Định vị Odometry bánh xe', icon: 'sliders' },
  '/cmd_vel': { label: 'Lệnh điều khiển vận tốc Twist', icon: 'trending-up' },
  '/camera/image': { label: 'Luồng hình ảnh RGB/Depth', icon: 'file-text' },
};

export default function SettingsPage() {
  const { state, dispatch, notify } = useApp();
  const { i18n } = useTranslation();
  const [settings, setSettings] = useState(() => ({
    ...DEFAULT_SETTINGS,
    ...(state.settings || {}),
    expected: {
      ...DEFAULT_SETTINGS.expected,
      ...(state.settings?.expected || {}),
    },
  }));
  const isEnglish = String(i18n.resolvedLanguage || i18n.language || 'vi').split('-')[0] === 'en';
  const displayedRobotProfile = settings.robot === 'AGV-Lab Hồ sơ chuẩn' || settings.robot === 'AGV-Lab standard profile'
    ? isEnglish ? 'AGV-Lab standard profile' : 'AGV-Lab Hồ sơ chuẩn'
    : settings.robot;

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleExpectedTopicChange = (topic, value) => {
    setSettings((prev) => ({
      ...prev,
      expected: {
        ...prev.expected,
        [topic]: Number(value) || 0,
      },
    }));
  };

  const handleApplyPreset = (preset) => {
    setSettings((prev) => ({
      ...prev,
      robot: preset.name,
      expected: {
        ...prev.expected,
        ...preset.hz,
      },
    }));
    notify(`Đã áp dụng thông số của hồ sơ "${preset.name}".`, 'info');
  };

  const handleReset = () => {
    setSettings({ ...DEFAULT_SETTINGS });
    notify('Đã khôi phục các giá trị thiết lập về mặc định của hệ thống.', 'info');
  };

  const handleSave = (e) => {
    if (e) e.preventDefault();
    dispatch({ type: 'SETTINGS', settings });
    notify('Đã lưu cấu hình phân tích & ngưỡng kiểm tra thành công!', 'success');
  };

  return (
    <div className="settings-page-container">
      <PageHeader
        eyebrow="WORKSPACE / CẤU HÌNH TOÀN CỤC"
        title="Cài đặt phân tích & Ngưỡng kiểm tra"
        subtitle="Thiết lập hồ sơ robot mặc định, ngưỡng dung sai lệch thời gian (Clock offset) và chính sách kiểm tra an toàn dữ liệu."
      >
        <Button variant="secondary" icon="refresh-cw" onClick={handleReset}>
          Khôi phục mặc định
        </Button>
        <Button variant="primary" icon="check" onClick={handleSave}>
          Lưu cấu hình
        </Button>
      </PageHeader>

      {/* Notice Banner */}
      <div className="settings-notice-banner">
        <div className="settings-notice-icon">
          <Icon name="info" size={20} />
        </div>
        <div className="settings-notice-content">
          <strong>Thông số mặc định cho phiên chẩn đoán</strong>
          <p>
            Các giá trị thiết lập dưới đây sẽ được nạp tự động khi tạo phiên phân tích mới. Bạn vẫn có thể tinh chỉnh lại từng thông số cụ thể cho từng tập tin rosbag riêng biệt trong giao diện tạo phiên.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div className="settings-layout-grid">
          {/* Cột Trái: Hồ sơ Robot & Ngưỡng thời gian */}
          <div className="settings-col">
            {/* Card 1: Hồ sơ Robot */}
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-title-group">
                  <div className="settings-card-icon blue">
                    <Icon name="settings" size={20} />
                  </div>
                  <div>
                    <h3>Hồ sơ Robot & Định danh nền tảng</h3>
                    <p>Thiết lập tên hồ sơ nền tảng phần cứng dùng để chuẩn hóa chẩn đoán</p>
                  </div>
                </div>
                <Badge tone="blue">Cấu hình chuẩn</Badge>
              </div>

              <div className="settings-input-group">
                <label className="settings-input-label" htmlFor="robot-profile-name">
                  <span>Hồ sơ Robot mặc định <span style={{ color: '#ef4444' }}>*</span></span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Bắt buộc</span>
                </label>
                <div className="settings-input-wrapper">
                  <input
                    id="robot-profile-name"
                    type="text"
                    value={displayedRobotProfile}
                    onChange={(e) => handleChange('robot', e.target.value)}
                    placeholder="VD: AGV-Lab Hồ sơ chuẩn"
                    required
                  />
                </div>
                <div className="settings-input-desc">
                  Tên định danh nhóm robot này sẽ liên kết trực tiếp với mẫu báo cáo và quy tắc kiểm tra QoS.
                </div>
              </div>

              <div>
                <span className="preset-chips-label">Gợi ý mẫu cấu hình có sẵn (Click để chọn nhanh):</span>
                <div className="preset-chips-container">
                  {ROBOT_PRESETS.map((preset) => {
                    const isActive = settings.robot === preset.name;
                    return (
                      <button
                        type="button"
                        key={preset.name}
                        className={`preset-chip-btn ${isActive ? 'active' : ''}`}
                        onClick={() => handleApplyPreset(preset)}
                        title={preset.desc}
                      >
                        <Icon name={isActive ? 'check' : 'activity'} size={13} />
                        {preset.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Card 2: Ngưỡng thời gian & Độ trễ */}
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-title-group">
                  <div className="settings-card-icon cyan">
                    <Icon name="clock" size={20} />
                  </div>
                  <div>
                    <h3>Ngưỡng thời gian & Dung sai trễ (Timing Tolerances)</h3>
                    <p>Các chỉ số kiểm soát độ nhạy phát hiện bất thường về mặt thời gian</p>
                  </div>
                </div>
                <Badge tone="cyan">Thời gian thực</Badge>
              </div>

              <div className="settings-param-grid">
                <div className="settings-param-item">
                  <label className="settings-input-label" htmlFor="win-sec">
                    Cửa sổ tính toán
                  </label>
                  <div className="settings-input-wrapper">
                    <input
                      id="win-sec"
                      type="number"
                      min="1"
                      max="120"
                      value={settings.windowSeconds}
                      onChange={(e) => handleChange('windowSeconds', Number(e.target.value))}
                    />
                    <span className="settings-input-unit">giây</span>
                  </div>
                  <div className="settings-input-desc">
                    Rolling window để tính trung bình tần số Hz và đo độ biến thiên jitter.
                  </div>
                </div>

                <div className="settings-param-item">
                  <label className="settings-input-label" htmlFor="dead-sec">
                    Thời gian topic ngừng
                  </label>
                  <div className="settings-input-wrapper">
                    <input
                      id="dead-sec"
                      type="number"
                      min="1"
                      max="60"
                      value={settings.deadTopicSeconds}
                      onChange={(e) => handleChange('deadTopicSeconds', Number(e.target.value))}
                    />
                    <span className="settings-input-unit">giây</span>
                  </div>
                  <div className="settings-input-desc">
                    Khoảng im lặng tối đa trước khi gắn cờ topic bị gián đoạn hoặc ngắt node.
                  </div>
                </div>

                <div className="settings-param-item">
                  <label className="settings-input-label" htmlFor="clock-thresh">
                    Ngưỡng lệch thời gian
                  </label>
                  <div className="settings-input-wrapper">
                    <input
                      id="clock-thresh"
                      type="number"
                      min="1"
                      max="5000"
                      value={settings.clockThresholdMs}
                      onChange={(e) => handleChange('clockThresholdMs', Number(e.target.value))}
                    />
                    <span className="settings-input-unit">ms</span>
                  </div>
                  <div className="settings-input-desc">
                    Độ lệch Clock Offset tối đa giữa header tin nhắn và thời gian máy chủ log.
                  </div>
                </div>

                <div className="settings-param-item">
                  <label className="settings-input-label" htmlFor="tf-tol">
                    Độ trễ TF động
                  </label>
                  <div className="settings-input-wrapper">
                    <input
                      id="tf-tol"
                      type="number"
                      min="1"
                      max="2000"
                      value={settings.tfToleranceMs}
                      onChange={(e) => handleChange('tfToleranceMs', Number(e.target.value))}
                    />
                    <span className="settings-input-unit">ms</span>
                  </div>
                  <div className="settings-input-desc">
                    Dung sai trễ phép biến đổi tọa độ giữa các link trong cây TF của robot.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cột Phải: Tần số Topic & Bảo mật / Kiểm tra */}
          <div className="settings-col">
            {/* Card 3: Tần số Topic kỳ vọng */}
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-title-group">
                  <div className="settings-card-icon amber">
                    <Icon name="sliders" size={20} />
                  </div>
                  <div>
                    <h3>Tần số Topic kỳ vọng (Expected Hz)</h3>
                    <p>Ngưỡng chuẩn để hệ thống đối chiếu và phát hiện hiện tượng rớt gói</p>
                  </div>
                </div>
                <Badge tone="orange">{Object.keys(settings.expected || {}).length} Cảm biến</Badge>
              </div>

              <table className="settings-topic-table">
                <thead>
                  <tr>
                    <th>Topic cảm biến</th>
                    <th style={{ width: '110px', textAlign: 'right' }}>Tần số (Hz)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(settings.expected || {}).map(([topic, hz]) => {
                    const meta = TOPIC_DESCRIPTIONS[topic] || { label: 'Topic ROS2', icon: 'activity' };
                    return (
                      <tr key={topic}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="topic-code">{topic}</span>
                          </div>
                          <div className="topic-type-badge">{meta.label}</div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="topic-hz-input-wrap">
                            <input
                              type="number"
                              min="1"
                              max="1000"
                              value={hz}
                              onChange={(e) => handleExpectedTopicChange(topic, e.target.value)}
                            />
                            <span>Hz</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Card 4: Bảo mật dữ liệu & Kiểm tra tính toàn vẹn */}
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-title-group">
                  <div className="settings-card-icon purple">
                    <Icon name="shield" size={20} />
                  </div>
                  <div>
                    <h3>Bảo mật & Kiểm tra tự động</h3>
                    <p>Chính sách bảo vệ sự riêng tư và bộ lọc kiểm định toàn vẹn</p>
                  </div>
                </div>
                <Badge tone="green">An toàn</Badge>
              </div>

              <div>
                <label className="settings-toggle-row">
                  <div className="settings-toggle-info">
                    <strong>Chỉ gửi dữ liệu thống kê (Send Statistics Only)</strong>
                    <p>Không gửi payload thô lên máy chủ đám mây, chỉ truyền tần số và thông số jitter.</p>
                  </div>
                  <div className="settings-switch">
                    <input
                      type="checkbox"
                      checked={!!settings.sendStatisticsOnly}
                      onChange={(e) => handleChange('sendStatisticsOnly', e.target.checked)}
                    />
                    <span className="settings-slider" />
                  </div>
                </label>

                <label className="settings-toggle-row">
                  <div className="settings-toggle-info">
                    <strong>Làm mờ tọa độ GPS nhạy cảm (Redact GPS)</strong>
                    <p>Tự động xóa kinh độ / vĩ độ thực để bảo mật vị trí cơ sở thử nghiệm robot.</p>
                  </div>
                  <div className="settings-switch">
                    <input
                      type="checkbox"
                      checked={!!settings.redactGps}
                      onChange={(e) => handleChange('redactGps', e.target.checked)}
                    />
                    <span className="settings-slider" />
                  </div>
                </label>

                <label className="settings-toggle-row">
                  <div className="settings-toggle-info">
                    <strong>Lưu nhật ký kiểm định (Audit Trail Logging)</strong>
                    <p>Ghi nhận mọi thay đổi cấu hình vào lịch sử kiểm toán của hệ thống.</p>
                  </div>
                  <div className="settings-switch">
                    <input
                      type="checkbox"
                      checked={!!settings.saveAudit}
                      onChange={(e) => handleChange('saveAudit', e.target.checked)}
                    />
                    <span className="settings-slider" />
                  </div>
                </label>

                <label className="settings-toggle-row">
                  <div className="settings-toggle-info">
                    <strong>Kiểm tra cây biến đổi tọa độ TF (TF Tree Continuity)</strong>
                    <p>Tự động cảnh báo frame bị thiếu, frame trễ hoặc chu kỳ đứt đoạn trong tf/tf_static.</p>
                  </div>
                  <div className="settings-switch">
                    <input
                      type="checkbox"
                      checked={!!settings.checkTF}
                      onChange={(e) => handleChange('checkTF', e.target.checked)}
                    />
                    <span className="settings-slider" />
                  </div>
                </label>

                <label className="settings-toggle-row">
                  <div className="settings-toggle-info">
                    <strong>Kiểm tra đồng bộ hóa tin nhắn (Sync Filter)</strong>
                    <p>Cảnh báo khi độ trễ giữa tin nhắn hình ảnh và quán tính (Camera ↔ IMU) vượt ngưỡng.</p>
                  </div>
                  <div className="settings-switch">
                    <input
                      type="checkbox"
                      checked={!!settings.checkSync}
                      onChange={(e) => handleChange('checkSync', e.target.checked)}
                    />
                    <span className="settings-slider" />
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Action Footer */}
        <div className="settings-footer-bar">
          <div className="settings-footer-status">
            <span className="settings-status-indicator" />
            <span>Cấu hình hiện tại đã đồng bộ và sẵn sàng áp dụng cho các phiên chẩn đoán mới.</span>
          </div>
          <div className="settings-footer-actions">
            <Button variant="ghost" icon="refresh-cw" onClick={handleReset}>
              Khôi phục mặc định
            </Button>
            <Button variant="primary" icon="check" onClick={handleSave}>
              Lưu cấu hình hệ thống
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
