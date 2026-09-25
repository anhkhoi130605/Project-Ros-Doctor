import React from 'react';
import { Icon } from '../../../components/common/UIComponents';
import TimestampSkewChart from './TimestampSkewChart';
import TopicFrequencyChart from './TopicFrequencyChart';

const SCAN_TOPIC = {
  id: '/scan',
  name: '/scan',
  hz: 10,
  observed: 10,
};

export default function FindingEvidence({ finding }) {
  if (finding.kind === 'silent') {
    return (
      <div className="ctrn-log">
        {`/imu  03:09.98  message received
      03:10.00 ── 03:16.00  NO MESSAGE (6 giây)
      03:16.02  message received
Ngưỡng silent: 3 giây. Chưa đủ bằng chứng về node crash.`}
      </div>
    );
  }

  if (finding.kind === 'clock') {
    return <TimestampSkewChart />;
  }

  if (finding.kind === 'tf') {
    return (
      <div className="tf-evidence">
        <span className="tf-label">map</span>
        <div className="tf-broken" aria-label="Kết nối TF bị thiếu">
          <i />
          <Icon name="alert" />
          <i />
        </div>
        <span className="tf-label">odom</span>
        <small>Chưa tìm thấy phép biến đổi phù hợp tại thời điểm đã chọn.</small>
      </div>
    );
  }

  if (finding.kind === 'timestamp') {
    return (
      <div className="timestamp-evidence">
        <div>
          <span>Message trước</span>
          <code>132.820 s</code>
        </div>
        <Icon name="arrow" />
        <div className="red-text">
          <span>Message sau</span>
          <code>132.540 s</code>
        </div>
        <small>Ví dụ timestamp nhảy lùi 280 ms trong thứ tự ghi.</small>
      </div>
    );
  }

  return (
    <TopicFrequencyChart
      topic={SCAN_TOPIC}
      time={finding.start || 35}
      onTimeChange={() => {}}
      showSelection={false}
    />
  );
}
