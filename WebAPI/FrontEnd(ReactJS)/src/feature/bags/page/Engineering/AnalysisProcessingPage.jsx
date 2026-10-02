import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../../../stored/appStore';
import { ROLES } from '../../../../domain/appTypes';
import {
  Button,
  Card,
  EmptyState,
  Icon,
  PageHeader,
} from '../../../../components/common/UIComponents';
import AnalysisProgress from './components/AnalysisProgress';
import {
  ANALYSIS_PROCESSING_STEPS,
  getAnalysisPhase,
} from '../../constants/analysisProcessing';

export default function AnalysisProcessingPage() {
  const navigate = useNavigate();
  const { state, dispatch, notify } = useApp();
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(getAnalysisPhase(0));
  const bag = (state.bags || []).find((item) => item.id === state.selectedBagId);
  const resultSessionId = useMemo(() => {
    const bagSession = (state.sessions || []).find((session) => session.bagId === bag?.id);
    return bagSession?.id || bag?.sessionId || `SESS-${Date.now().toString().slice(-4)}`;
  }, [bag?.id, bag?.sessionId, state.sessions]);

  useEffect(() => {
    const isEng = String(state.role || '').toLowerCase().includes('eng') || String(state.role || '').toLowerCase() === 'admin';
    if (!bag || !isEng) return undefined;

    let currentProgress = 0;
    let completionTimer;
    const interval = window.setInterval(() => {
      currentProgress = Math.min(currentProgress + 4, 100);
      setProgress(currentProgress);
      setPhase(getAnalysisPhase(currentProgress));

      if (currentProgress === 100) {
        window.clearInterval(interval);

        const newSession = {
          id: resultSessionId,
          bagId: bag.id,
          name: (bag.name || 'Rosbag').replace(/\.[^/.]+$/, ''),
          duration: bag.duration ?? bag.durationSec ?? 120,
          topics: bag.topics ?? bag.topicCount ?? 12,
          messages: bag.totalMessages ?? 350000,
          status: 'complete',
          createdAt: new Date().toISOString(),
          processingSeconds: 20,
          isDemo: false,
          healthScore: bag.healthScore ?? 100,
          realTopics: bag.realTopics || null,
          realTimeline: bag.realTimeline || null,
        };

        dispatch({
          type: 'COMPLETE_ANALYSIS',
          session: newSession,
          findings: bag.realAnomalies && bag.realAnomalies.length > 0
            ? bag.realAnomalies.map((a, idx) => ({
                id: `A-${resultSessionId}-${idx + 1}`,
                sessionId: resultSessionId,
                title: a.issueTitle || a.title || 'Bất thường ghi nhận',
                kind: (a.anomalyType || 'frequency').toLowerCase(),
                topic: a.topic || 'Hệ thống',
                severity: (a.severity || 'medium').toLowerCase(),
                interval: a.timeRange || '00:00 - 00:05',
                observation: a.description || 'Ghi nhận bất thường trong luồng log.',
                hypothesis: a.suggestedFix || 'Cần kiểm tra node phát và cấu hình QoS.',
                steps: [a.suggestedFix || 'Kiểm tra log node.', 'Đối chiếu tần số mẫu.'],
                revision: 1,
                analystNote: '',
                review: { status: 'pending', note: '', by: null, at: null },
              }))
            : [],
        });

        completionTimer = window.setTimeout(() => {
          notify('Đã hoàn tất tiến trình phân tích.', 'success');
          navigate(`/sessions/${resultSessionId}/overview`, { replace: true });
        }, 800);
      }
    }, 280);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(completionTimer);
    };
  }, [bag, dispatch, navigate, notify, resultSessionId, state.role]);

  if (!bag) {
    return (
      <EmptyState
        icon="database"
        title="Chưa chọn dữ liệu"
        description="Chọn và cấu hình một rosbag trước khi chạy tiến trình phân tích."
      >
        <Button to="/bags">Về danh sách rosbag</Button>
      </EmptyState>
    );
  }

  if (state.role !== ROLES.ENGINEERING) {
    return (
      <EmptyState
        icon="shield"
        title="Chức năng dành cho Kỹ sư Robotics"
        description="Vai trò hiện tại không có quyền chạy tiến trình phân tích."
      >
        <Button to="/dashboard">Về tổng quan</Button>
      </EmptyState>
    );
  }

  return (
    <div className="analysis-processing-page">
      <PageHeader title="Đang phân tích rosbag" subtitle={bag.name} />

      <Card className="processing-card">
        <div className="scan-visual" aria-hidden="true">
          <i />
          <i />
          <i />
          <span><Icon name="activity" size={46} /></span>
        </div>

        <h2>Đang tìm các bất thường</h2>
        <p aria-live="polite">{phase}</p>

        <AnalysisProgress value={progress} label="Tiến độ mô phỏng" />

        <div className="processing-steps">
          {ANALYSIS_PROCESSING_STEPS.map((step, index) => {
            const stepStarted = progress >= index * 25;
            const stepComplete = progress >= (index + 1) * 25;
            return (
              <span key={step} className={stepStarted ? 'done' : ''}>
                <Icon name={stepComplete ? 'check' : 'clock'} size={15} />
                {step}
              </span>
            );
          })}
        </div>

        <div className="button-row">
          <Button to={`/sessions/${resultSessionId}/overview`} icon="arrow">
            Xem kết quả mẫu đã có
          </Button>
          <Button to="/analysis/configure" variant="ghost">
            Hủy mô phỏng
          </Button>
        </div>

        <small>Không có tác vụ ROS2 hay AI thực đang chạy.</small>
      </Card>
    </div>
  );
}
