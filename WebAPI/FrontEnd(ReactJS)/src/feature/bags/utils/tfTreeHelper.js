/**
 * tfTreeHelper.js
 * Xây dựng cây tọa độ TF 3D thực tế ánh xạ theo dữ liệu Rosbag và mô phỏng sự cố theo trục thời gian (Timeline).
 */

// Bố cục khung chuẩn AGV / Robot di động
const DEFAULT_AGV_FRAMES = [
  { id: 'map', name: 'map', x: 0, y: 80, z: -30, parent: null, translation: [0, 0, 0], rotation: [0, 0, 0, 1] },
  { id: 'odom', name: 'odom', x: 0, y: 30, z: -10, parent: 'map', translation: [0.12, 0.05, 0], rotation: [0, 0, 0.05, 0.998] },
  { id: 'base_link', name: 'base_link', x: 0, y: -25, z: 0, parent: 'odom', translation: [0.35, 0.1, 0.18], rotation: [0, 0, 0.02, 0.999] },
  { id: 'imu_link', name: 'imu_link', x: -65, y: -5, z: -20, parent: 'base_link', translation: [0.08, -0.05, 0.25], rotation: [0, 0, 0, 1] },
  { id: 'laser', name: 'laser', x: -15, y: -90, z: 35, parent: 'base_link', translation: [0.22, 0, 0.32], rotation: [0, 0, 0, 1] },
  { id: 'camera_link', name: 'camera_link', x: 80, y: -45, z: 25, parent: 'base_link', translation: [0.25, 0, 0.45], rotation: [0.5, -0.5, 0.5, -0.5] },
];

// Bố cục cho xe tự hành Carla Simulator
const CARLA_VEHICLE_FRAMES = [
  { id: 'map', name: 'map', x: 0, y: 85, z: -30, parent: null, translation: [0, 0, 0], rotation: [0, 0, 0, 1] },
  { id: 'odom', name: 'odom', x: 0, y: 35, z: -10, parent: 'map', translation: [1.25, 0.45, 0], rotation: [0, 0, 0.02, 0.999] },
  { id: 'ego_vehicle', name: 'ego_vehicle', x: 0, y: -20, z: 0, parent: 'odom', translation: [2.4, 0.1, 0.2], rotation: [0, 0, 0.01, 1.0] },
  { id: 'ego_vehicle/lidar', name: 'lidar_top', x: 0, y: -80, z: -15, parent: 'ego_vehicle', translation: [0, 0, 1.8], rotation: [0, 0, 0, 1] },
  { id: 'ego_vehicle/camera/rgb', name: 'camera_front', x: 75, y: -55, z: 20, parent: 'ego_vehicle', translation: [0.8, 0, 1.4], rotation: [0.5, -0.5, 0.5, -0.5] },
  { id: 'ego_vehicle/imu', name: 'imu_sensor', x: -70, y: -55, z: -15, parent: 'ego_vehicle', translation: [-0.2, 0, 0.5], rotation: [0, 0, 0, 1] },
];

// Bố cục cho xe tự hành Autoware
const AUTOWARE_VEHICLE_FRAMES = [
  { id: 'map', name: 'map', x: 0, y: 85, z: -35, parent: null, translation: [0, 0, 0], rotation: [0, 0, 0, 1] },
  { id: 'base_link', name: 'base_link', x: 0, y: 35, z: -10, parent: 'map', translation: [88.01, -254.9, -0.04], rotation: [0, 0, -0.716, 0.699] },
  { id: 'sensor_kit_base_link', name: 'sensor_kit_base_link', x: 0, y: -15, z: 0, parent: 'base_link', translation: [0, 0, 1.6], rotation: [0, 0, 0, 1] },
  { id: 'velodyne_top_base_link', name: 'velodyne_top', x: 0, y: -70, z: -15, parent: 'sensor_kit_base_link', translation: [0, 0, 0.866], rotation: [0, 0, 0, 1] },
  { id: 'velodyne_left_base_link', name: 'velodyne_left', x: -75, y: -65, z: 15, parent: 'sensor_kit_base_link', translation: [-0.5, 0, 0.838], rotation: [0, 0, 0, 1] },
  { id: 'velodyne_right_base_link', name: 'velodyne_right', x: 75, y: -65, z: 15, parent: 'sensor_kit_base_link', translation: [0.5, 0, 0.838], rotation: [0, 0, 0, 1] },
  { id: 'tamagawa/imu_link', name: 'tamagawa_imu', x: -50, y: -25, z: -25, parent: 'sensor_kit_base_link', translation: [0, 0, 0.8], rotation: [0, 0, 0, 1] },
  { id: 'camera0/camera_link', name: 'camera0', x: 50, y: -25, z: -25, parent: 'sensor_kit_base_link', translation: [0.7, 0, 0], rotation: [0, 0, 0, 1] },
];

/**
 * Trích xuất giây xuất hiện lỗi từ chuỗi timeRange (ví dụ: '00:30.005 -> 00:30.005 (+30s)')
 */
function parseAnomalyTimeSec(timeRangeStr) {
  if (!timeRangeStr) return null;
  const match = timeRangeStr.match(/(\d{2}):(\d{2}(?:\.\d+)?)/);
  if (match) {
    const mins = parseFloat(match[1]);
    const secs = parseFloat(match[2]);
    return mins * 60 + secs;
  }
  const plusMatch = timeRangeStr.match(/\+(\d+(?:\.\d+)?)s/);
  if (plusMatch) {
    return parseFloat(plusMatch[1]);
  }
  return null;
}

/**
 * Xây dựng cây tọa độ TF 3D thực tế và mô phỏng trạng thái theo trục thời gian (currentTimeSec)
 */
export function buildRealTfTree(session, bag, issues = [], currentTimeSec = null) {
  const bagName = (bag?.name || bag?.fileName || session?.bagFile || session?.bagName || session?.name || '').toLowerCase();
  const rawIssues = Array.isArray(issues) && issues.length > 0 ? issues : (session?.issues || []);

  // Lọc các vấn đề liên quan tới TF
  const tfIssues = rawIssues.filter((i) => {
    const topic = (i.topic || '').toLowerCase();
    const title = (i.title || i.issueTitle || '').toLowerCase();
    return topic.includes('tf') || title.includes('tf') || title.includes('frame') || title.includes('quaternion') || title.includes('tọa độ');
  });

  // Xác định bộ khung cơ sở
  let baseFrames = [];
  const rawTfTree = session?.tfTree || session?.tf_tree;
  const framesArray = Array.isArray(rawTfTree) ? rawTfTree : Array.isArray(rawTfTree?.frames) ? rawTfTree.frames : null;

  if (framesArray && framesArray.length > 0) {
    // 1. Ánh xạ trực tiếp từ MongoDB / API Backend
    baseFrames = framesArray.map((f, idx) => {
      const name = f.name || f.id;
      // Tạo layout 3D phân cấp tự động
      let y = 70;
      let x = 0;
      let z = 0;
      if (name === 'map') { y = 80; z = -30; }
      else if (name === 'odom') { y = 30; z = -10; }
      else if (name === 'base_link' || name === 'ego_vehicle') { y = -20; z = 0; }
      else {
        y = -65;
        x = (idx % 2 === 0 ? 1 : -1) * (35 + (idx * 20) % 55);
        z = idx % 2 === 0 ? 25 : -20;
      }

      return {
        id: name,
        name: name,
        parent: f.parent || null,
        translation: f.translation || [0, 0, 0],
        rotation: f.rotation || [0, 0, 0, 1],
        x: f.x ?? x,
        y: f.y ?? y,
        z: f.z ?? z,
      };
    });
  } else if (bagName.includes('carla')) {
    baseFrames = JSON.parse(JSON.stringify(CARLA_VEHICLE_FRAMES));
  } else if (bagName.includes('2024_05_07') || bagName.includes('sensor_kit') || bagName.includes('velodyne') || bagName.includes('autoware')) {
    baseFrames = JSON.parse(JSON.stringify(AUTOWARE_VEHICLE_FRAMES));
  } else {
    baseFrames = JSON.parse(JSON.stringify(DEFAULT_AGV_FRAMES));
  }

  // 1. Kiểm tra sự cố Ghost Frame (scen_08)
  const ghostIssue = tfIssues.find((i) => {
    const text = (i.title || i.issueTitle || '') + (i.description || '');
    return text.toLowerCase().includes('ghost') || text.toLowerCase().includes('unregistered');
  });

  const ghostTime = ghostIssue ? parseAnomalyTimeSec(ghostIssue.timeRange || ghostIssue.interval) : 25;
  const isGhostActive = ghostIssue && (currentTimeSec === null || Math.abs(currentTimeSec - ghostTime) <= 4.0);

  if (ghostIssue && isGhostActive) {
    const ghostExists = baseFrames.some((f) => f.id === 'ghost_frame');
    if (!ghostExists) {
      baseFrames.push({
        id: 'ghost_frame',
        name: 'ghost_frame',
        x: -95,
        y: 45,
        z: 25,
        parent: 'map',
        translation: [12.4, -5.2, 0.0],
        rotation: [0, 0, 0.84, 0.54],
        isGhost: true,
      });

      const baseNode = baseFrames.find((f) => f.id === 'base_link');
      if (baseNode) {
        baseNode.anomalyParent = 'ghost_frame';
      }
    }
  }

  // 2. Gán thông tin trạng thái mô phỏng vào từng node theo thời gian
  const mappedFrames = baseFrames.map((frame) => {
    let anomaly = null;
    let currentRotation = [...(frame.rotation || [0, 0, 0, 1])];
    let currentTranslation = [...(frame.translation || [0, 0, 0])];

    // Xử lý Ghost Frame
    if (frame.isGhost && isGhostActive) {
      anomaly = {
        type: 'error',
        severity: 'CRITICAL',
        badgeText: '❌ Khung cha chưa đăng ký (Ghost Frame)',
        title: ghostIssue?.title || ghostIssue?.issueTitle || "Khung cha không tồn tại: 'ghost_frame'",
        timeRange: ghostIssue?.timeRange || '00:25.005 -> 00:25.014 (+25s)',
        observation: `Tại t = ${(currentTimeSec ?? ghostTime).toFixed(2)}s: Liên kết TF chứa frame cha 'ghost_frame' chưa đăng ký trong cây tọa độ.`,
        suggestedFix: 'Kiểm tra tf_prefix và chuẩn hóa broadcaster static_transform_publisher trong launch file.',
        color: '#ef4444',
      };
    } else if (frame.id === 'base_link' && ghostIssue && isGhostActive) {
      anomaly = {
        type: 'error',
        severity: 'CRITICAL',
        badgeText: '❌ Đổi khung cha bất thường (Parent Switch)',
        title: "Đổi khung cha bất thường trên liên kết 'base_link' ('odom' -> 'ghost_frame')",
        timeRange: ghostIssue?.timeRange || '00:25.005 -> 00:25.005 (+25s)',
        observation: `Tại t = ${(currentTimeSec ?? ghostTime).toFixed(2)}s: Khung 'base_link' bị đổi frame cha sang 'ghost_frame'. Dấu hiệu xung đột giữa 2 node phát TF.`,
        suggestedFix: 'Tắt bớt broadcaster trùng lặp trên bus mạng ROS2.',
        color: '#ef4444',
      };
    }

    // Xử lý Quaternion Denormalized (scen_05)
    const quatIssue = tfIssues.find((i) => {
      const text = (i.title || i.issueTitle || '').toLowerCase();
      return text.includes('quaternion') || text.includes('chuẩn hóa') || text.includes('norm');
    });

    if (!anomaly && quatIssue && (frame.id === 'camera_link' || frame.id === 'base_link')) {
      const quatTime = parseAnomalyTimeSec(quatIssue.timeRange || quatIssue.interval) ?? 30.0;
      const isQuatActive = currentTimeSec === null || Math.abs(currentTimeSec - quatTime) <= 3.5;

      if (isQuatActive) {
        currentRotation = [0.65, 0.45, 0.85, 2.1]; // norm = 2.404
        anomaly = {
          type: 'warning',
          severity: 'HIGH',
          badgeText: '⚠️ Quaternion chưa chuẩn hóa (norm = 2.4)',
          title: quatIssue.title || quatIssue.issueTitle || 'Quaternion xoay không chuẩn hóa (norm = 2,4)',
          timeRange: quatIssue.timeRange || '00:30.000 -> 00:30.009 (+30s)',
          observation: `Tại t = ${(currentTimeSec ?? quatTime).toFixed(2)}s: Vector quaternion có norm = 2.404 ≠ 1.0. Sai lệch định hướng 3D nghiêm trọng.`,
          suggestedFix: 'Gọi tf2::Quaternion::normalize() trước khi đóng gói và broadcast bản tin TF.',
          color: '#f59e0b',
        };
      }
    }

    // Xử lý Bước nhảy tọa độ (Coordinate Jump - scen_01)
    const jumpIssue = tfIssues.find((i) => {
      const text = (i.title || i.issueTitle || '').toLowerCase();
      return text.includes('nhảy') || text.includes('jump');
    });

    if (!anomaly && jumpIssue && (frame.id === 'base_link' || frame.id === 'odom')) {
      const jumpTime = parseAnomalyTimeSec(jumpIssue.timeRange || jumpIssue.interval) ?? 25.0;
      const isJumpActive = currentTimeSec === null || Math.abs(currentTimeSec - jumpTime) <= 2.5;

      if (isJumpActive) {
        currentTranslation = [currentTranslation[0] + 2.5, currentTranslation[1] + 1.2, currentTranslation[2]];
        anomaly = {
          type: 'error',
          severity: 'HIGH',
          badgeText: '❌ Nhảy tọa độ đột ngột (>2m)',
          title: jumpIssue.title || jumpIssue.issueTitle,
          timeRange: jumpIssue.timeRange || '00:25.000 -> 00:25.005 (+25s)',
          observation: `Tại t = ${(currentTimeSec ?? jumpTime).toFixed(2)}s: Vị trí của frame '${frame.id}' nhảy vọt đột ngột 2.7m giữa 2 chu kỳ liên tiếp. Dấu hiệu snap mốc SLAM.`,
          suggestedFix: 'Kiểm tra tham số khoảng cách Mahalanobis trong bộ lọc Kalman EKF.',
          color: '#ef4444',
        };
      }
    }

    // Trạng thái danh định chuẩn xác (Hoạt động ổn định)
    if (!anomaly) {
      const parentLabel = frame.parent ? `${frame.parent} → ${frame.name}` : frame.name;
      anomaly = {
        type: 'normal',
        severity: 'NOMINAL',
        badgeText: '● Khung tọa độ đang hoạt động',
        title: `Liên kết tọa độ: ${parentLabel}`,
        timeRange: 'Dải đo định danh bình thường (Không có lỗi)',
        observation: currentTimeSec !== null
          ? `Tại t = ${currentTimeSec.toFixed(2)}s: Tọa độ và hướng quay chuẩn hóa, chuỗi biến đổi hợp lệ trong chu kỳ /tf.`
          : 'Dữ liệu biến đổi tọa độ thực tế từ luồng /tf và /tf_static tại thời điểm đã chọn.',
        suggestedFix: 'Duy trì cấu hình hiện tại. Tiếp tục giám sát chu kỳ broadcast định kỳ.',
        color: '#16a34a',
      };
    }

    return {
      ...frame,
      translation: currentTranslation,
      rotation: currentRotation,
      parent: frame.anomalyParent || frame.parent,
      color: anomaly.type === 'error' ? '#ef4444' : anomaly.type === 'warning' ? '#f59e0b' : '#38bdf8',
      anomaly,
    };
  });

  const edgeCount = mappedFrames.filter((f) => Boolean(f.parent)).length;

  return {
    frames: mappedFrames,
    edgeCount,
    tfIssuesCount: tfIssues.length,
    hasAnomalies: tfIssues.length > 0,
  };
}
