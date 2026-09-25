export const BAG_VALIDATION_CHECKS = [
  {
    id: 'format',
    title: 'Định dạng được hỗ trợ',
    getDescription: (bag) => `Phần mở rộng ${String(bag.format || 'không xác định').toUpperCase()} đã được nhận diện.`,
    verified: true,
  },
  {
    id: 'size',
    title: 'Tệp có dữ liệu',
    getDescription: (_bag, helpers) => `Dung lượng metadata: ${helpers.formattedSize}.`,
    verified: true,
  },
  {
    id: 'metadata',
    title: 'Metadata ROS2 và topic',
    description: 'Đang dùng bộ mẫu; chưa phân tích nội dung rosbag.',
    verified: false,
  },
  {
    id: 'quality',
    title: 'TF, timestamp và chất lượng ghi',
    description: 'Chỉ có thể xác minh thực khi kết nối backend ROS2.',
    verified: false,
  },
];

export const REDACTED_LOG_PREVIEW = `[00:35–00:40] /scan rate: 2 Hz; expected: 10 Hz
[01:18–01:22] timestamp skew: max 82 ms
source_ip: [IP_REDACTED]
gps: [GPS_REDACTED]
raw_payload: excluded; summary_only: true`;
