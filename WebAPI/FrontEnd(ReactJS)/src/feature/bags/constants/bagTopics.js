export const BAG_TOPIC_PREVIEW = [
  { id: '/scan', name: '/scan', type: 'sensor_msgs/LaserScan', hz: 10 },
  { id: '/imu', name: '/imu', type: 'sensor_msgs/Imu', hz: 100 },
  { id: '/camera/image', name: '/camera/image', type: 'sensor_msgs/Image', hz: 30 },
  { id: '/odom', name: '/odom', type: 'nav_msgs/Odometry', hz: 50 },
  { id: '/tf', name: '/tf', type: 'tf2_msgs/TFMessage', hz: null },
  { id: '/tf_static', name: '/tf_static', type: 'tf2_msgs/TFMessage', hz: null },
  { id: '/rosout', name: '/rosout', type: 'rcl_interfaces/Log', hz: null },
];

export const BAG_SAMPLE_METADATA = {
  'bag-024': {
    startedAt: '22/09/2026 09:10:00 UTC',
    endedAt: '22/09/2026 09:14:32 UTC',
  },
};
