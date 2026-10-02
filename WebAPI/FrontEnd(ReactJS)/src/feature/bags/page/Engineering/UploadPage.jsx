import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../../../stored/appStore';
import { PageHeader, Card, Button, Notice, Icon, Badge } from '../../../../components/common/UIComponents';
import { uploadAndInspectBagApi, getSampleBagsApi, inspectBagApi } from '../../../../service';

export default function UploadPage() {
  const navigate = useNavigate();
  const { dispatch, notify } = useApp();
  const [file, setFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sampleBags, setSampleBags] = useState([]);
  const [loadingSamples, setLoadingSamples] = useState(false);

  useEffect(() => {
    async function loadSamples() {
      try {
        setLoadingSamples(true);
        const samples = await getSampleBagsApi();
        if (Array.isArray(samples)) {
          setSampleBags(samples);
        }
      } catch {
        // Ignore if offline
      } finally {
        setLoadingSamples(false);
      }
    }
    loadSamples();
  }, []);

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleInspectSample = async (sample) => {
    try {
      setLoading(true);
      notify(`Đang nạp và phân tích rosbag mẫu: ${sample.name}...`, 'info');
      const report = await inspectBagApi({ bagPath: sample.path });
      processInspectionResult(report, sample.name, sample.sizeBytes);
    } catch (err) {
      notify(`Lỗi khi nạp mẫu: ${err.message || 'Không thể kết nối Backend'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      notify('Vui lòng chọn một tệp log .db3, .mcap hoặc .zip', 'warning');
      return;
    }

    setLoading(true);
    notify(`Đang tải lên và phân tích ${file.name}...`, 'info');

    try {
      // 1. Try real backend upload and inspection
      const report = await uploadAndInspectBagApi(file);
      processInspectionResult(report, file.name, file.size);
    } catch (err) {
      console.warn('Backend API call failed, falling back to local simulation:', err);
      // 2. Fallback to local import if backend is unreachable
      const newSessionId = `SESS-${Date.now().toString().slice(-4)}`;
      const fallbackBag = {
        id: `bag-${Date.now().toString().slice(-4)}`,
        name: file.name,
        size: file.size,
        sizeMb: Math.round(file.size / (1024 * 1024)) || 145,
        format: file.name.endsWith('.mcap') ? 'MCAP' : 'SQLite3',
        duration: 180,
        durationSec: 180,
        topics: 14,
        topicCount: 14,
        status: 'complete',
        sessionId: newSessionId,
      };

      dispatch({ type: 'IMPORT_BAG', bag: fallbackBag });
      notify(`Đã nạp tệp ${file.name} (chế độ dự phòng).`, 'success');
      navigate(`/sessions/${newSessionId}/overview`);
    } finally {
      setLoading(false);
    }
  };

  const processInspectionResult = (report, defaultName, defaultSize) => {
    const newSessionId = `SESS-${Date.now().toString().slice(-4)}`;
    const newBagId = `bag-${Date.now().toString().slice(-4)}`;

    const newBag = {
      id: newBagId,
      name: report.bagName || defaultName,
      size: report.fileSizeBytes || defaultSize,
      sizeMb: Math.round((report.fileSizeBytes || defaultSize) / (1024 * 1024)) || 1,
      format: (report.storageFormat || 'sqlite3').toUpperCase(),
      duration: Math.round(report.durationSec || 0),
      durationSec: Math.round(report.durationSec || 0),
      topics: report.topicCount || (report.topics?.length ?? 3),
      topicCount: report.topicCount || (report.topics?.length ?? 3),
      totalMessages: report.totalMessages || 0,
      status: 'complete',
      sessionId: newSessionId,
      healthScore: report.healthScore ?? 100,
      realTopics: report.topics || [],
      realTimeline: report.timeline || null,
      realAnomalies: report.anomalies || [],
    };

    // 1. Dispatch IMPORT_BAG
    dispatch({ type: 'IMPORT_BAG', bag: newBag });

    // 2. Dispatch COMPLETE_ANALYSIS to ensure session and findings are fully loaded
    const initialSession = {
      id: newSessionId,
      bagId: newBagId,
      name: (newBag.name || 'Rosbag').replace(/\.[^/.]+$/, ''),
      duration: newBag.durationSec,
      topics: newBag.topicCount,
      messages: newBag.totalMessages,
      status: 'complete',
      createdAt: new Date().toISOString(),
      processingSeconds: 15,
      isDemo: false,
      healthScore: newBag.healthScore,
      realTopics: newBag.realTopics,
      realTimeline: newBag.realTimeline,
    };

    const initialFindings = (newBag.realAnomalies || []).map((a, idx) => ({
      id: `A-${newSessionId}-${idx + 1}`,
      sessionId: newSessionId,
      title: a.issueTitle || 'Bất thường ghi nhận',
      kind: (a.anomalyType || 'frequency').toLowerCase(),
      topic: a.topic || 'Hệ thống',
      severity: (a.severity || 'medium').toLowerCase(),
      interval: a.timeRange || '00:00 - 00:05',
      observation: a.description || 'Ghi nhận bất thường trong luồng log.',
      hypothesis: a.suggestedFix || 'Cần kiểm tra cấu hình node và QoS.',
      steps: [a.suggestedFix || 'Kiểm tra log node.', 'Đối chiếu tần số mẫu.'],
      revision: 1,
      analystNote: '',
      review: { status: 'pending', note: '', by: null, at: null },
    }));

    dispatch({
      type: 'COMPLETE_ANALYSIS',
      session: initialSession,
      findings: initialFindings,
    });

    notify(`Nạp và phân tích ${newBag.name} thành công (${newBag.topics} topics, ${newBag.totalMessages} msgs).`, 'success');
    navigate(`/sessions/${newSessionId}/overview`);
  };

  return (
    <div className="upload-page">
      <PageHeader
        eyebrow="NẠP DỮ LIỆU"
        title="Nạp bản ghi ROSBag mới"
        subtitle="Tải lên tệp log .db3 / .mcap hoặc chọn mẫu CARLA sẵn có từ hệ thống."
      />

      <div style={{ maxWidth: '780px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Sample bags available from server */}
        {sampleBags.length > 0 && (
          <Card title="Các bản ghi Rosbag mẫu trong hệ thống (src/Data)">
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--muted)' }}>
              Phát hiện các tệp bản ghi CARLA vừa ghi được trong thư mục <code>src/Data</code>. Bấm nạp ngay:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sampleBags.map((sample) => (
                <div
                  key={sample.path}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--panel)',
                  }}
                >
                  <div>
                    <strong>{sample.name}</strong>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                      {Math.round(sample.sizeBytes / 1024)} KB · {sample.hasYaml ? 'Có metadata.yaml' : 'SQLite3 db3'}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon="arrow"
                    disabled={loading}
                    onClick={() => handleInspectSample(sample)}
                  >
                    Nạp &amp; Xem phiên
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Upload Custom File */}
        <Card title="Hoặc tải lên tệp ROSBag từ máy tính">
          <form onSubmit={handleUploadSubmit}>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleFileDrop}
              style={{
                border: isDragOver ? '2px dashed var(--cyan)' : '2px dashed var(--border)',
                borderRadius: '12px',
                padding: '40px 24px',
                textAlign: 'center',
                background: isDragOver ? 'rgba(81, 220, 248, 0.05)' : 'var(--panel)',
                cursor: 'pointer',
                marginBottom: '20px',
                transition: 'all 0.2s',
              }}
              onClick={() => document.getElementById('bag-file-input')?.click()}
            >
              <div style={{ color: 'var(--cyan)', marginBottom: '12px' }}>
                <Icon name="upload" size={44} />
              </div>
              <h3 style={{ margin: '0 0 8px', color: 'var(--text)' }}>
                {file ? file.name : 'Kéo thả tệp rosbag (.db3, .mcap) vào đây'}
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                Hệ thống backend .NET sẽ tự động đọc topics, tính tần số Hz, timeline và phát hiện lỗi.
              </p>
              <input
                id="bag-file-input"
                type="file"
                accept=".db3,.mcap,.zip"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>

            {file && (
              <Notice tone="green" icon="check" className="mb-4">
                Đã chọn: <strong>{file.name}</strong> ({Math.round(file.size / 1024)} KB)
              </Notice>
            )}

            <div className="button-row" style={{ justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => navigate('/bags')} disabled={loading}>
                Về danh sách
              </Button>
              <Button type="submit" icon="arrow" disabled={!file || loading}>
                {loading ? 'Đang phân tích...' : 'Bắt đầu nạp & phân tích'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
