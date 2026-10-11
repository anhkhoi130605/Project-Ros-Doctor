import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp, formatDuration } from '../../../../stored/appStore';
import { ROLES } from '../../../../domain/appTypes';
import {
  Button,
  Card,
  EmptyState,
  FormField,
  Icon,
  Notice,
  PageHeader,
} from '../../../../components/common/UIComponents';
import AnalysisStepper from './components/AnalysisStepper';
import AnalysisToggleField from './components/AnalysisToggleField';
import {
  ANALYSIS_THRESHOLD_TOPICS,
  E06_DEFAULT_CONFIG,
  validateAnalysisConfig,
} from '../../constants/analysisConfig';

export default function AnalysisConfigurePage() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { state, dispatch, notify } = useApp();
  const bag = (state.bags || []).find((item) => item.id === state.selectedBagId);
  const [error, setError] = useState('');
  const [config, setConfig] = useState(() => ({
    ...state.settings,
    ...E06_DEFAULT_CONFIG,
    ...state.analysisConfig,
    expected: {
      ...state.settings?.expected,
      ...E06_DEFAULT_CONFIG.expected,
      ...state.analysisConfig?.expected,
    },
  }));
  const isEnglish = String(i18n.resolvedLanguage || i18n.language || 'vi').split('-')[0] === 'en';
  const displayedConfigName = config.name === 'AGV-Lab · phiên mới' || config.name === 'AGV-Lab · new session'
    ? isEnglish ? 'AGV-Lab · new session' : 'AGV-Lab · phiên mới'
    : config.name;
  const displayedRobotProfile = config.robot === 'AGV-Lab / Cảm biến tiêu chuẩn' || config.robot === 'AGV-Lab / Standard sensors'
    ? isEnglish ? 'AGV-Lab / Standard sensors' : 'AGV-Lab / Cảm biến tiêu chuẩn'
    : config.robot;

  if (!bag) {
    return (
      <EmptyState
        icon="database"
        title="Chưa chọn dữ liệu"
        description="Chọn và kiểm tra một rosbag trước khi cấu hình phân tích."
      >
        <Button to="/bags">Về danh sách rosbag</Button>
      </EmptyState>
    );
  }

  if (state.role !== ROLES.ENGINEERING) {
    return (
      <EmptyState
        icon="shield"
        title="Chức năng dành cho Kỹ sư Robotics"
        description="Vai trò hiện tại không có quyền cấu hình hoặc bắt đầu phiên phân tích."
      >
        <Button to="/dashboard">Về tổng quan</Button>
      </EmptyState>
    );
  }

  const updateConfig = (key, value) => {
    setConfig((current) => ({ ...current, [key]: value }));
    setError('');
  };

  const updateExpectedFrequency = (topic, value) => {
    setConfig((current) => ({
      ...current,
      expected: { ...current.expected, [topic]: value },
    }));
    setError('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const validationError = validateAnalysisConfig(config);
    if (validationError) {
      setError(validationError);
      return;
    }

    dispatch({ type: 'CONFIG', config });
    notify('Đang chuyển sang phân tích bằng backend.', 'info');
    navigate('/analysis/processing');
  };

  const duration = bag.duration ?? bag.durationSec;
  const durationLabel = Number.isFinite(duration) ? formatDuration(duration) : '—';

  return (
    <div className="analysis-configure-page">
      <PageHeader
        title="Tạo phiên phân tích"
        subtitle="Chọn phạm vi kiểm tra và các ngưỡng cho log đã ghi."
      />

      <AnalysisStepper currentStep={3} />

      <Notice>API phân tích hiện sử dụng cấu hình phía máy chủ. Các tùy chọn bên dưới chỉ được lưu ở giao diện, chưa áp dụng vào kết quả phân tích.</Notice>

      <form onSubmit={handleSubmit} noValidate>
        <div className="two-column wide-left">
          <Card title="Cấu hình chẩn đoán" subtitle={bag.name}>
            <div className="form-grid">
              <FormField label="Tên phiên phân tích" className="span-2">
                <input
                  value={displayedConfigName}
                  onChange={(event) => updateConfig('name', event.target.value)}
                  maxLength={80}
                  required
                />
              </FormField>

              <FormField label="Hồ sơ robot">
                <input
                  value={displayedRobotProfile}
                  onChange={(event) => updateConfig('robot', event.target.value)}
                  maxLength={80}
                  required
                />
              </FormField>

              <FormField label="Phạm vi dữ liệu">
                <input value={`${isEnglish ? 'Full sample' : 'Toàn bộ bộ mẫu'} · 00:00 – ${durationLabel}`} readOnly />
              </FormField>
            </div>

            <div className="section-label">Quy tắc phát hiện</div>
            <p className="small-note">Tần số kỳ vọng cho từng topic trong mô phỏng.</p>

            <div className="threshold-table">
              <div>
                <span>TOPIC</span>
                <span>TẦN SỐ KỲ VỌNG</span>
              </div>
              {ANALYSIS_THRESHOLD_TOPICS.map((topic) => (
                <label key={topic}>
                  <code>{topic}</code>
                  <span>
                    <input
                      type="number"
                      min="0.1"
                      max="10000"
                      step="0.1"
                      value={config.expected[topic]}
                      aria-label={`Tần số kỳ vọng ${topic}`}
                      onChange={(event) => updateExpectedFrequency(topic, Number(event.target.value))}
                      required
                    />
                    Hz
                  </span>
                </label>
              ))}
            </div>

            <div className="form-grid">
              <FormField label="Cửa sổ tính toán (giây)">
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={config.windowSeconds}
                  onChange={(event) => updateConfig('windowSeconds', Number(event.target.value))}
                  required
                />
              </FormField>

              <FormField label="Ngưỡng lệch thời gian (ms)">
                <input
                  type="number"
                  min="1"
                  value={config.clockThresholdMs}
                  onChange={(event) => updateConfig('clockThresholdMs', Number(event.target.value))}
                  required
                />
              </FormField>
            </div>

            <AnalysisToggleField
              label="Kiểm tra quan hệ TF"
              description="Đối chiếu theo thời điểm, tách riêng TF tĩnh."
              checked={config.checkTF}
              onChange={(value) => updateConfig('checkTF', value)}
            />
            <AnalysisToggleField
              label="Kiểm tra đồng bộ thời gian"
              description="Đối chiếu camera và IMU trong bộ mẫu."
              checked={config.checkSync}
              onChange={(value) => updateConfig('checkSync', value)}
            />
          </Card>

          <div className="stack">
            <Card
              title="Dữ liệu gửi cho AI"
              subtitle="Các tùy chọn dành cho tích hợp backend sau này."
            >
              <AnalysisToggleField
                label="Chỉ gửi thống kê"
                description="Topic, tần số và khoảng bất thường."
                checked={config.sendStatisticsOnly}
                onChange={(value) => updateConfig('sendStatisticsOnly', value)}
              />
              <AnalysisToggleField
                label="Ẩn tọa độ GPS"
                description="Loại dữ liệu vị trí khỏi ngữ cảnh AI."
                checked={config.redactGps}
                onChange={(value) => updateConfig('redactGps', value)}
              />
              <Notice>
                Không có yêu cầu nào được gửi đến AI hoặc máy chủ trong bản frontend này.
              </Notice>
            </Card>

            <Card className="launch-card">
              <Icon name="activity" size={34} />
              <h3>Sẵn sàng phân tích</h3>
              <p>Phân tích file đã lưu bằng backend và tạo phiên kết quả thật. API hiện dùng cấu hình phía máy chủ; các tùy chọn trên trang này chưa được gửi vào bộ phân tích.</p>
              {error && <p role="alert" className="field-error">{error}</p>}
              <Button type="submit" icon="activity">Bắt đầu phân tích</Button>
              <Button to="/upload/validate" variant="ghost">Quay lại kiểm tra</Button>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
