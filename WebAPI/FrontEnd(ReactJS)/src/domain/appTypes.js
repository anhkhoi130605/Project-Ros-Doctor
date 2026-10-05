export const ROLES = {
  ADMIN: 'Admin',
  ENGINEERING: 'Engineering',
  ENGINEER: 'Engineering',
  USER: 'User',
  VIEWER: 'User',
};

export const ROLE_NAMES = {
  Admin: 'Quản trị viên (Admin)',
  admin: 'Quản trị viên (Admin)',
  Engineering: 'Kỹ sư Robotics (Engineer)',
  engineering: 'Kỹ sư Robotics (Engineer)',
  Engineer: 'Kỹ sư Robotics (Engineer)',
  engineer: 'Kỹ sư Robotics (Engineer)',
  User: 'Người dùng (User)',
  user: 'Người dùng (User)',
};

export const DEFAULT_SETTINGS = {
  robot: 'AGV-Lab Hồ sơ chuẩn',
  windowSeconds: 10,
  deadTopicSeconds: 3,
  clockThresholdMs: 30,
  tfToleranceMs: 50,
  expected: {
    '/scan': 10,
    '/imu': 50,
    '/odom': 20,
    '/cmd_vel': 10,
    '/camera/image': 30,
  },
  sendStatisticsOnly: true,
  redactGps: true,
  saveAudit: true,
  checkTF: true,
  checkSync: true,
};

export const SAMPLE_FINDINGS = [
  {
    id: 'A-001',
    title: 'Tần số /scan giảm',
    kind: 'frequency',
    topic: '/scan',
    severity: 'high',
    interval: '00:35 – 00:40',
    start: 35,
    end: 40,
    observation: '/scan ghi nhận khoảng 2 Hz trong khoảng 00:35–00:40. Mức kỳ vọng của hồ sơ AGV-Lab là 10 Hz.',
    hypothesis: 'Nguồn phát có thể bị gián đoạn hoặc bỏ lỡ khi ghi dữ liệu. Chưa có bằng chứng xác nhận node crash.',
    steps: [
      'Đối chiếu log /rosout trong khoảng bất thường.',
      'Kiểm tra phạm vi ghi và cấu hình QoS.',
      'Xác minh tình trạng cảm biến và node phát.',
    ],
  },
  {
    id: 'A-002',
    title: 'Camera – IMU lệch thời gian',
    kind: 'clock',
    topic: '/camera/image ↔ /imu',
    severity: 'medium',
    interval: '01:18 – 01:22',
    start: 78,
    end: 82,
    observation: 'Độ lệch timestamp camera – IMU tối đa 82 ms, vượt ngưỡng cấu hình 30 ms trong bộ dữ liệu mẫu.',
    hypothesis: 'Hai cảm biến có thể dùng nguồn đồng hồ hoặc độ trễ khác nhau. Cần xác định cùng miền thời gian trước khi kết luận.',
    steps: [
      'Xác minh nguồn đồng hồ của hai cảm biến.',
      'So sánh header.stamp và thời điểm ghi bag.',
      'Kiểm tra thiết lập đồng bộ thời gian.',
    ],
  },
  {
    id: 'A-003',
    title: 'Timestamp /odom nhảy lùi',
    kind: 'timestamp',
    topic: '/odom',
    severity: 'medium',
    interval: '02:12 – 02:13',
    start: 132,
    end: 133,
    observation: 'Có message /odom với timestamp nhỏ hơn message trước đó trong thứ tự ghi của bag mẫu.',
    hypothesis: 'Đồng hồ có thể được đặt lại hoặc message đến không theo thứ tự. Chưa đủ dữ liệu để phân biệt hai trường hợp.',
    steps: [
      'Đối chiếu timestamp message và thời điểm ghi.',
      'Kiểm tra /clock và use_sim_time.',
      'Tìm sự kiện khởi động lại trong log.',
    ],
  },
  {
    id: 'A-004',
    title: 'Thiếu kết nối TF tại thời điểm',
    kind: 'tf',
    topic: 'map → odom',
    severity: 'high',
    interval: '02:14 – 02:18',
    start: 134,
    end: 138,
    observation: 'Không tìm thấy biến đổi map → odom phù hợp tại thời điểm đã chọn trong dữ liệu ghi mẫu.',
    hypothesis: 'Phạm vi ghi hoặc khoảng thời gian lưu TF có thể chưa đủ. Không thể suy ra cây TF của robot đang chạy bị lỗi chỉ từ bag này.',
    steps: [
      'Kiểm tra /tf, /tf_static và phạm vi ghi.',
      'Đối chiếu timestamp của phép biến đổi.',
      'Kiểm tra nguồn phát map → odom.',
    ],
  },
  {
    id: 'A-005',
    title: 'Topic /imu ngừng phát trong bag',
    kind: 'silent',
    topic: '/imu',
    severity: 'high',
    interval: '03:10 – 03:16',
    start: 190,
    end: 196,
    observation: 'Không ghi nhận message /imu trong 6 giây giữa bản ghi; ngưỡng topic silent là 3 giây.',
    hypothesis: 'Có thể nguồn phát gián đoạn hoặc recorder không nhận được dữ liệu. Topic silent chưa đủ để kết luận node crash.',
    steps: [
      'Kiểm tra /rosout và tình trạng node trong khoảng 03:10–03:16.',
      'Đối chiếu QoS giữa nguồn phát và recorder.',
      'Kiểm tra giới hạn phạm vi ghi và tải hệ thống.',
    ],
  },
];

export const STATUS_MAP = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  partial: 'Duyệt một phần',
  changes: 'Cần chỉnh sửa',
  rejected: 'Bị bác bỏ',
  complete: 'Hoàn tất',
  ready: 'Sẵn sàng',
  invalid: 'Không hợp lệ',
  outdated: 'Cần cập nhật',
  processing: 'Đang xử lý',
  draft: 'Bản nháp',
};

/**
 * Phân loại tình trạng phiên / rosbag theo 3 trường hợp chuẩn:
 * 1. Bình thường: Xanh lá (#16a34a) - Điểm >= 90 (hoặc 100đ), không có sự cố
 * 2. Cảnh báo: Vàng (#d97706) - Điểm 60-89 hoặc có cảnh báo nhẹ
 * 3. Lỗi: Đỏ (#dc2626) - Điểm < 60 hoặc có lỗi nghiêm trọng (high severity > 0)
 */
export function getHealthCondition(healthScore, warningsCount = 0, highSeverityCount = 0) {
  const score = Number.isFinite(Number(healthScore)) ? Number(healthScore) : 100;
  const count = Number(warningsCount) || 0;
  const highCount = Number(highSeverityCount) || 0;

  // Trường hợp 3: Lỗi (Màu đỏ)
  if (score < 60 || highCount > 0 || (count >= 3 && score < 75)) {
    return {
      type: 'error',
      label: 'Lỗi',
      summary: `❌ ${count > 0 ? count : highCount} lỗi`,
      badgeText: '● Lỗi',
      color: '#dc2626',
      bgColor: '#fef2f2',
      borderColor: '#fecaca',
      scoreColor: '#dc2626',
    };
  }

  // Trường hợp 2: Cảnh báo (Màu vàng)
  if ((score >= 60 && score < 90) || count > 0) {
    return {
      type: 'warning',
      label: 'Cảnh báo',
      summary: `⚠️ ${count > 0 ? count : 1} cảnh báo`,
      badgeText: '● Cảnh báo',
      color: '#d97706',
      bgColor: '#fffbeb',
      borderColor: '#fef3c7',
      scoreColor: '#d97706',
    };
  }

  // Trường hợp 1: Bình thường (Xanh lá)
  return {
    type: 'normal',
    label: 'Bình thường',
    summary: '✓ Bình thường',
    badgeText: '● Bình thường',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    scoreColor: '#16a34a',
  };
}
