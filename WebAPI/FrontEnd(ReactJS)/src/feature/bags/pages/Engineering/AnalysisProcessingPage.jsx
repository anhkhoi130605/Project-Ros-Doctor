import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../../../stored/appStore';
import { apiClient } from '../../../../service/apiClient/apiClient';
import { Button, Card, EmptyState, Icon, PageHeader } from '../../../../components/common/UIComponents';

export default function AnalysisProcessingPage() {
  const { state } = useApp();
  const bag = (state.bags || []).find(item => item.id === state.selectedBagId);
  const canAnalyze = ['engineering', 'admin'].includes(String(state.role).toLowerCase());
  const [result, setResult] = useState({ status: 'running' });
  // Reuse the request during StrictMode effect replay and ordinary re-renders.
  const requestRef = useRef(null);
  const bagId = bag?.id;

  useEffect(() => {
    if (!bagId || !canAnalyze) return;
    let active = true;
    if (requestRef.current?.bagId !== bagId) {
      setResult({ status: 'running' });
      const promise = apiClient.post('/api/bags/inspect', { bagId }, {
        signal: AbortSignal.timeout(120000),
        handleErrorLocally: true,
      }).then(report => {
        if (!report?.sessionId || report.bagId !== bagId) {
          throw new Error('Máy chủ chưa trả về phiên phân tích hợp lệ của rosbag này. Vui lòng kiểm tra danh sách phiên trước khi chạy lại.');
        }
        return report;
      });
      requestRef.current = { bagId, promise };
    }
    requestRef.current.promise.then(report => {
      if (active) setResult({ status: 'complete', sessionId: report.sessionId });
    }).catch(error => {
      if (!active) return;
      setResult({ status: 'error', message: error.name === 'TimeoutError'
        ? 'Chưa nhận được phản hồi sau 2 phút. Máy chủ có thể vẫn đang xử lý; hãy kiểm tra danh sách phiên trước khi chạy lại để tránh tạo phiên trùng.'
        : error.name === 'AbortError'
          ? 'Yêu cầu đã bị gián đoạn. Vui lòng kiểm tra danh sách phiên để xác nhận kết quả.'
          : error.message || 'Không thể phân tích rosbag. Vui lòng kiểm tra backend.' });
    });
    return () => { active = false; };
  }, [bagId, bagPath, canAnalyze]);

  if (!bag) return <EmptyState icon="database" title="Chưa chọn dữ liệu" description="Chọn và cấu hình một rosbag trước khi chạy phân tích.">
    <Button to="/bags">Về danh sách rosbag</Button>
  </EmptyState>;

  if (!canAnalyze) return <EmptyState icon="shield" title="Không có quyền phân tích" description="Chức năng này dành cho Engineer và Admin.">
    <Button to="/dashboard">Về tổng quan</Button>
  </EmptyState>;

  const running = result.status === 'running';
  const complete = result.status === 'complete';
  return <div className="analysis-processing-page">
    <PageHeader title={running ? 'Đang phân tích rosbag' : complete ? 'Phân tích hoàn tất' : 'Chưa hoàn tất phân tích'} subtitle={bag.name} />
    <Card className="processing-card">
      {running ? <div className="scan-visual" aria-hidden="true"><i /><i /><i /><span><Icon name="activity" size={46} /></span></div>
        : <Icon name={complete ? 'check' : 'alert'} size={48} />}
      <h2>{running ? 'Máy chủ đang xử lý dữ liệu' : complete ? 'Đã có phiên phân tích' : 'Không thể hoàn tất yêu cầu'}</h2>
      <p role={result.status === 'error' ? 'alert' : 'status'} style={{ maxWidth: 680, margin: '16px auto', lineHeight: 1.8 }}>
        {running ? 'Đang đọc rosbag, kiểm tra bất thường và lưu phiên phân tích. Chỉ hiển thị kết quả sau khi backend xác nhận.'
          : complete ? `Phiên ${result.sessionId} đã được lưu trên máy chủ.` : result.message}
      </p>
      {running && <p><Icon name="loader" className="spin" size={18} /> Đang chờ phản hồi từ backend…</p>}
      <div className="button-row">
        {complete && <Button to={`/sessions/${encodeURIComponent(result.sessionId)}/overview`} icon="arrow">Xem kết quả phân tích</Button>}
        <Button to="/bags" variant="secondary">Về danh sách rosbag</Button>
      </div>
      <small>{running ? 'Rời trang không đồng nghĩa hủy tác vụ trên máy chủ. Không có phần trăm tiến độ giả lập.'
        : 'Phiên phân tích chỉ được tạo bởi backend, không dùng ID rosbag thay cho ID phiên.'}</small>
    </Card>
  </div>;
}
