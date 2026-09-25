export const BAG_TOPIC_PREVIEW = [
  { id: '/scan', name: '/scan', type: 'sensor_msgs/LaserScan', hz: 10, observed: 2, count: 2570, color: 'cyan' },
  { id: '/imu', name: '/imu', type: 'sensor_msgs/Imu', hz: 100, observed: 100, count: 27184, color: 'green' },
  { id: '/camera/image', name: '/camera/image', type: 'sensor_msgs/Image', hz: 30, observed: 30, count: 8145, color: 'blue' },
  { id: '/odom', name: '/odom', type: 'nav_msgs/Odometry', hz: 50, observed: 50, count: 13595, color: 'orange' },
  { id: '/tf', name: '/tf', type: 'tf2_msgs/TFMessage', hz: null, observed: null, count: 18103, color: 'cyan' },
  { id: '/tf_static', name: '/tf_static', type: 'tf2_msgs/TFMessage', hz: null, observed: null, count: 6, color: 'blue' },
  { id: '/rosout', name: '/rosout', type: 'rcl_interfaces/Log', hz: null, observed: null, count: 139, color: 'muted' },
];

export const BAG_SAMPLE_METADATA = {
  'bag-024': {
    startedAt: '22/09/2026 09:10:00 UTC',
    endedAt: '22/09/2026 09:14:32 UTC',
  },
};
