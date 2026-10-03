import React from 'react';
import { Badge, Card } from '../../../../../components/common/UIComponents';

export default function AgentDiagnosticGraph({ status = 'completed', findingsCount = 0, hasFault = false, sourcesCount = 0 }) {
  const isAnalyzing = status === 'analyzing';
  const isCompleted = status === 'completed';
  const isError = status === 'error';

  const steps = [
    {
      id: '01',
      title: 'Tổng hợp Telemetry',
      description: `${findingsCount} bất thường từ thuật toán đo đạc .db3`,
      badge: isAnalyzing ? 'Đang đọc' : 'Đã nạp',
      tone: 'green',
    },
    {
      id: '02',
      title: 'Truy xuất RAG Playbook',
      description: sourcesCount > 0 ? `Khớp ${sourcesCount} tài liệu ChromaDB` : 'Kịch bản 6 miền lỗi ROS2',
      badge: isAnalyzing ? 'Đang truy vấn' : 'Đã đối chiếu',
      tone: 'green',
    },
    {
      id: '03',
      title: 'Lập giả thuyết RCA',
      description: hasFault ? 'Xác định cơ chế hư hỏng' : 'Hệ thống hoạt động bình thường',
      badge: isAnalyzing ? 'LLM suy luận' : (isError ? 'Lỗi' : 'Hoàn tất'),
      tone: isError ? 'red' : (hasFault ? 'orange' : 'green'),
    },
    {
      id: '04',
      title: 'Kịch bản khắc phục',
      description: 'Đề xuất playbook và lệnh ROS2',
      badge: isAnalyzing ? 'Đang tạo' : 'Sẵn sàng',
      tone: isAnalyzing ? 'blue' : 'green',
    },
    {
      id: '05',
      title: 'Kỹ sư duyệt (HITL)',
      description: 'Chờ kỹ sư xác nhận & đóng ca',
      badge: 'Cần duyệt',
      tone: 'orange',
    },
  ];

  return (
    <Card
      title="Đồ thị luồng chẩn đoán AI Agent (LangGraph)"
      subtitle="Tiến trình StateGraph: Ingestion → RAG Retrieval → LLM RCA Analysis → HITL Review"
    >
      <div className="ctrn-agent-graph">
        {steps.map((step) => (
          <article key={step.id}>
            <span>{step.id}</span>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
            <Badge tone={step.tone}>
              {step.badge}
            </Badge>
          </article>
        ))}
      </div>
    </Card>
  );
}
