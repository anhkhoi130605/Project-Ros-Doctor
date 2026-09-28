import React from 'react';
import { Badge, Card } from '../../../../../components/common/UIComponents';

const AGENT_STEPS = [
  {
    id: '01',
    title: 'Tổng hợp bất thường',
    description: 'Tần số, timestamp, TF và topic silent',
  },
  {
    id: '02',
    title: 'Truy xuất ngữ cảnh',
    description: 'Quy tắc ROS2 và bằng chứng từ bag',
  },
  {
    id: '03',
    title: 'Lập giả thuyết',
    description: 'Đối chiếu nguyên nhân với dữ liệu',
  },
  {
    id: '04',
    title: 'Đề xuất kiểm tra',
    description: 'Các bước khắc phục cần kỹ sư xem xét',
  },
  {
    id: '05',
    title: 'HITL',
    description: 'Chờ kỹ sư xác nhận kết luận',
    pending: true,
  },
];

export default function AgentDiagnosticGraph() {
  return (
    <Card
      title="Đồ thị chẩn đoán Agent"
      subtitle="Luồng StateGraph · UC-11 / UC-13"
    >
      <div className="ctrn-agent-graph">
        {AGENT_STEPS.map((step) => (
          <article key={step.id}>
            <span>{step.id}</span>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
            <Badge tone={step.pending ? 'orange' : 'green'}>
              {step.pending ? 'Cần duyệt' : 'Đã xử lý mẫu'}
            </Badge>
          </article>
        ))}
      </div>
    </Card>
  );
}
