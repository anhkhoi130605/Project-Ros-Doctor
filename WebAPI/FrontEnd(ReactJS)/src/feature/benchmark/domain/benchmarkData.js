export const INITIAL_TEST_CASES = [
  {
    code: 'C01',
    rosbag: 'AGV-Lab',
    topic: '/scan',
    start: 35,
    end: 40,
    intervalText: '35–40 giây',
    label: 'Tần số / mất gói',
    prediction: 'Tần số / mất gói',
  },
  {
    code: 'C02',
    rosbag: 'AGV-Lab',
    topic: '/camera/image',
    start: 78,
    end: 82,
    intervalText: '78–82 giây',
    label: 'Timestamp skew',
    prediction: 'Timestamp skew',
  },
  {
    code: 'C03',
    rosbag: 'AGV-Lab',
    topic: 'map → odom',
    start: 134,
    end: 138,
    intervalText: '134–138 giây',
    label: 'Cây tọa độ TF',
    prediction: 'Cây tọa độ TF',
  },
  {
    code: 'C04',
    rosbag: 'AGV-Lab',
    topic: '/imu',
    start: 190,
    end: 196,
    intervalText: '190–196 giây',
    label: 'Node / topic silent',
    prediction: 'Không có lỗi',
  },
  {
    code: 'C05',
    rosbag: 'Warehouse',
    topic: '/scan',
    start: 0,
    end: 60,
    intervalText: '0–60 giây',
    label: 'Không có lỗi',
    prediction: 'Tần số / mất gói',
  },
];

export const ERROR_TYPES = [
  'Tần số / mất gói',
  'Timestamp skew',
  'Cây tọa độ TF',
  'Node / topic silent',
];

export const DEEPEVAL_METRICS = [
  {
    name: 'Faithfulness',
    score: '0,92',
    desc: 'Câu trả lời có căn cứ trong ngữ cảnh.',
    badge: 'Điểm minh họa',
  },
  {
    name: 'Answer Relevancy',
    score: '0,89',
    desc: 'Trả lời đúng vấn đề chẩn đoán.',
    badge: 'Điểm minh họa',
  },
  {
    name: 'Hallucination',
    score: '0,06',
    desc: 'Mức nội dung không được bằng chứng hỗ trợ.',
    badge: 'Điểm minh họa',
  },
];

export function computeBenchmarkMetrics(cases) {
  let totalTP = 0;
  let totalFP = 0;
  let totalFN = 0;

  const matrix = ERROR_TYPES.map((type) => {
    let tp = 0;
    let fp = 0;
    let fn = 0;

    cases.forEach((item) => {
      const isActual = item.label === type;
      const isPredicted = item.prediction === type;

      if (isActual && isPredicted) tp++;
      else if (!isActual && isPredicted) fp++;
      else if (isActual && !isPredicted) fn++;
    });

    totalTP += tp;
    totalFP += fp;
    totalFN += fn;

    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    return {
      type,
      tp,
      fp,
      fn,
      f1: (f1 * 100).toFixed(1) + '%',
    };
  });

  const overallPrecision = totalTP + totalFP > 0 ? (totalTP / (totalTP + totalFP)) * 100 : 0;
  const overallRecall = totalTP + totalFN > 0 ? (totalTP / (totalTP + totalFN)) * 100 : 0;
  const overallF1 =
    overallPrecision + overallRecall > 0
      ? (2 * overallPrecision * overallRecall) / (overallPrecision + overallRecall)
      : 0;

  const mismatches = cases.filter((c) => c.label !== c.prediction);

  return {
    casesCount: cases.length,
    precision: overallPrecision.toFixed(1) + '%',
    recall: overallRecall.toFixed(1) + '%',
    f1: overallF1.toFixed(1) + '%',
    matrix,
    mismatches,
  };
}
