import React from 'react';
import { Icon } from '../../../../components/common/UIComponents';

const ANALYSIS_STEPS = [
  'Chọn rosbag',
  'Kiểm tra dữ liệu',
  'Cấu hình phân tích',
];

export default function AnalysisStepper({ currentStep = 1 }) {
  return (
    <ol className="stepper" aria-label="Tiến trình tạo phiên phân tích">
      {ANALYSIS_STEPS.map((label, index) => {
        const step = index + 1;
        const isComplete = step < currentStep;
        const isActive = step === currentStep;

        return (
          <li
            key={label}
            className={isActive ? 'active' : isComplete ? 'complete' : ''}
            aria-current={isActive ? 'step' : undefined}
          >
            <span>{isComplete ? <Icon name="check" size={13} /> : step}</span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}
