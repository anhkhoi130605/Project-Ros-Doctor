import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    notify('Đã lưu cấu hình phân tích.', 'success');
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

      <form onSubmit={handleSubmit} noValidate>
        <div className="two-column wide-left">
          <Card title="Cấu hình chẩn đoán" subtitle={bag.name}>
            <div className="form-grid">
              <FormField label="Tên phiên phân tích" className="span-2">
                <input
                  value={config.name}
                  onChange={(event) => updateConfig('name', event.target.value)}
                  maxLength={80}
                  required
                />
              </FormField>

              <FormField label="Hồ sơ robot">
                <input
                  value={config.robot}
                  onChange={(event) => updateConfig('robot', event.target.value)}
                  maxLength={80}
                  required
                />
              </FormField>

              <FormField label="Phạm vi dữ liệu">
                <input value={`Toàn bộ bộ mẫu · 00:00 – ${durationLabel}`} readOnly />
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
              <p>Thử pipeline và nhận bộ kết quả mẫu để kiểm tra luồng duyệt.</p>
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
