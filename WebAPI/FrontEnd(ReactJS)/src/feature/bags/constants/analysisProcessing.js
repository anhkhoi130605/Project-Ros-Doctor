export const ANALYSIS_PROCESSING_STEPS = [
  'Metadata & lọc log',
  'Kiểm tra bất thường',
  'Truy xuất ngữ cảnh',
  'Suy luận & đề xuất',
];

const ANALYSIS_PHASES = [
  { from: 0, label: 'Đọc metadata mẫu' },
  { from: 25, label: 'Kiểm tra tần số, timestamp và quan hệ TF' },
  { from: 50, label: 'Nén thống kê và truy xuất ngữ cảnh' },
  { from: 75, label: 'Tổng hợp bằng chứng và đề xuất' },
  { from: 100, label: 'Hoàn tất mô phỏng' },
];

export function getAnalysisPhase(progress) {
  return [...ANALYSIS_PHASES]
    .reverse()
    .find((phase) => progress >= phase.from)?.label || ANALYSIS_PHASES[0].label;
}
