export const ANALYSIS_THRESHOLD_TOPICS = [
  '/scan',
  '/imu',
  '/camera/image',
];

export const E06_DEFAULT_CONFIG = {
  name: 'AGV-Lab · phiên mới',
  robot: 'AGV-Lab / Cảm biến tiêu chuẩn',
  expected: {
    '/scan': 10,
    '/imu': 100,
    '/camera/image': 30,
  },
  windowSeconds: 1,
  clockThresholdMs: 30,
  checkTF: true,
  checkSync: true,
  sendStatisticsOnly: true,
  redactGps: true,
};

export function validateAnalysisConfig(config) {
  if (!config.name.trim()) return 'Hãy đặt tên phiên phân tích.';
  if (!config.robot.trim()) return 'Hãy nhập hồ sơ robot.';

  const invalidTopic = ANALYSIS_THRESHOLD_TOPICS.find((topic) => {
    const value = config.expected[topic];
    return !Number.isFinite(value) || value <= 0 || value > 10000;
  });
  if (invalidTopic) return `Tần số kỳ vọng của ${invalidTopic} phải lớn hơn 0 Hz.`;

  if (!Number.isFinite(config.windowSeconds) || config.windowSeconds <= 0) {
    return 'Cửa sổ tính toán phải lớn hơn 0 giây.';
  }
  if (!Number.isFinite(config.clockThresholdMs) || config.clockThresholdMs <= 0) {
    return 'Ngưỡng lệch thời gian phải lớn hơn 0 ms.';
  }

  return '';
}
