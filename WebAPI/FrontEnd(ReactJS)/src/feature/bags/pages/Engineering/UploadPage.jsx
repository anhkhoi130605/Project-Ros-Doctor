import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../../../stored/appStore';
import { PageHeader, Card, Button, Notice, Icon, Badge } from '../../../../components/common/UIComponents';
import { uploadAndInspectBagApi, getSampleBagsApi, inspectBagApi, runAgentDiagnosticApi } from '../../../../service';

export default function UploadPage() {
  const navigate = useNavigate();
  const { dispatch, notify } = useApp();
  const [file, setFile] = useState(null);
  const [yamlFile, setYamlFile] = useState(null);
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

  const handleIncomingFiles = (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const filesArray = Array.from(fileList);
    const db3 = filesArray.find((f) => f.name.endsWith('.db3') || f.name.endsWith('.mcap') || f.name.endsWith('.zip'));
    const yaml = filesArray.find((f) => f.name.endsWith('.yaml') || f.name.endsWith('.yml'));

    if (db3) {
      setFile(db3);
    }
    if (yaml) {
      setYamlFile(yaml);
    }

    if (!db3 && yaml) {
      notify(`Đã nhận tệp cấu hình ${yaml.name}. Vui lòng chọn thêm tệp dữ liệu chính (.db3 hoặc .zip).`, 'info');
    } else if (!db3 && !yaml) {
      notify('Định dạng tệp không được hỗ trợ. Vui lòng chọn tệp .db3, .mcap, .zip hoặc .yaml.', 'warning');
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleIncomingFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleIncomingFiles(e.target.files);
    }
  };

  const handleInspectSample = async (sample) => {
    const startTime = Date.now();
    try {
      setLoading(true);
      notify(`Đang nạp và phân tích rosbag mẫu: ${sample.name}...`, 'info');
      const report = await inspectBagApi({ sampleName: sample.name });
      const elapsedSec = Math.round((Date.now() - startTime) / 100) / 10;
      processInspectionResult(report, sample.name, sample.sizeBytes, elapsedSec);
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
    notify(`Đang tải lên và phân tích ${file.name}${yamlFile ? ` kèm ${yamlFile.name}` : ''}...`, 'info');
    const startTime = Date.now();

    try {
      // 1. Try real backend upload and inspection
      const report = await uploadAndInspectBagApi(file, yamlFile);
      const elapsedSec = Math.round((Date.now() - startTime) / 100) / 10;
      processInspectionResult(report, file.name, file.size, elapsedSec);
    } catch (err) {
      console.error('Backend upload API error:', err);
      notify(`Lỗi tải tệp lên Backend: ${err.message || 'Không thể kết nối máy chủ'}. Vui lòng kiểm tra kết nối API.`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const processInspectionResult = (report, defaultName, defaultSize, elapsedSec = 2) => {
    const newSessionId = report.sessionId || report.SessionId || `SESS-${Date.now().toString().slice(-4)}`;
    const newBagId = report.bagId || report.BagId || `bag-${Date.now().toString().slice(-4)}`;
    const actualProcessingSec = Number(report.processingTimeSec || elapsedSec || 2);

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
      processingSeconds: actualProcessingSec,
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
      processingSeconds: actualProcessingSec,
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

    // Tự động kích hoạt AI Agent phân tích RCA chuyên sâu ở chế độ nền
    dispatch({ type: 'SET_AGENT_ANALYSIS', sessionId: newSessionId, status: 'analyzing' });
    runAgentDiagnosticApi({
      session: initialSession,
      findings: initialFindings,
      topics: newBag.realTopics || [],
    })
      .then((res) => {
        dispatch({
          type: 'SET_AGENT_ANALYSIS',
          sessionId: newSessionId,
          status: 'completed',
          report: res.report || null,
          response: res.response || '',
        });
      })
      .catch((err) => {
        console.warn('AI Agent background analysis error:', err);
        dispatch({
          type: 'SET_AGENT_ANALYSIS',
          sessionId: newSessionId,
          status: 'error',
          error: err.message || 'Không thể kết nối Python AI Agent (port 8000)',
        });
      });

    notify(`Nạp và phân tích ${newBag.name} thành công. AI Agent đang chạy RCA...`, 'success');
    navigate(`/sessions/${newSessionId}/overview`);
  };

  return (
    <div className="upload-page">
      <PageHeader
        eyebrow="NẠP DỮ LIỆU"
        title="Nạp bản ghi ROSBag từ máy tính"
        subtitle="Chọn tệp log .db3 (hoặc .zip) kèm metadata.yaml trực tiếp từ máy của bạn để chẩn đoán hệ thống."
      />

      <div style={{ maxWidth: '780px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* KHU VỰC CHÍNH 1: TẢI LÊN TỆP ROSBAG TỪ MÁY TÍNH CỦA BẠN */}
        <Card title="Tải lên tệp ROSBag từ máy tính của bạn">
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
                padding: '44px 24px',
                textAlign: 'center',
                background: isDragOver ? 'rgba(81, 220, 248, 0.05)' : 'var(--panel)',
                cursor: 'pointer',
                marginBottom: '20px',
                transition: 'all 0.2s',
              }}
              onClick={() => document.getElementById('bag-file-input')?.click()}
            >
              <div style={{ color: 'var(--cyan)', marginBottom: '14px' }}>
                <Icon name="upload" size={48} />
              </div>
              <h3 style={{ margin: '0 0 10px', color: 'var(--text)', fontSize: '18px' }}>
                {file ? file.name : 'Kéo thả tệp rosbag từ máy tính vào đây hoặc bấm để chọn'}
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', lineHeight: '1.6' }}>
                Hỗ trợ tải lên tệp dữ liệu <strong>.db3</strong> / <strong>.mcap</strong> và tệp cấu hình <strong>metadata.yaml</strong> hoặc file nén <strong>.zip</strong>.
              </p>
              <input
                id="bag-file-input"
                type="file"
                multiple
                accept=".db3,.mcap,.zip,.yaml,.yml"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>

            {file && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <Notice tone="green" icon="check" style={{ margin: 0, flex: 1 }}>
                  📁 Tệp dữ liệu chính: <strong>{file.name}</strong> ({Math.round(file.size / 1024)} KB)
                </Notice>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  style={{ marginLeft: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
                  title="Bỏ chọn tệp này"
                >
                  <Icon name="close" size={16} />
                </button>
              </div>
            )}

            {yamlFile && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <Notice tone="cyan" icon="check" style={{ margin: 0, flex: 1 }}>
                  📄 Tệp cấu hình QoS / Metadata: <strong>{yamlFile.name}</strong> ({Math.round(yamlFile.size / 1024)} KB)
                </Notice>
                <button
                  type="button"
                  onClick={() => setYamlFile(null)}
                  style={{ marginLeft: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
                  title="Bỏ chọn tệp này"
                >
                  <Icon name="close" size={16} />
                </button>
              </div>
            )}

            {!file && yamlFile && (
              <Notice tone="amber" icon="alert" style={{ marginBottom: '16px' }}>
                ⚠️ Bạn mới chỉ chọn tệp cấu hình metadata.yaml. Vui lòng chọn thêm tệp dữ liệu chính (<strong>.db3</strong> hoặc <strong>.zip</strong>) để bắt đầu phân tích.
              </Notice>
            )}

            <div className="button-row" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                {file ? '✓ Tệp đã sẵn sàng tải lên và phân tích' : 'Chưa chọn tệp'}
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Button variant="ghost" onClick={() => navigate('/bags')} disabled={loading}>
                  Về danh sách
                </Button>
                <Button type="submit" icon="arrow" disabled={!file || loading}>
                  {loading ? 'Đang phân tích...' : 'Bắt đầu nạp & phân tích từ máy'}
                </Button>
              </div>
            </div>
          </form>
        </Card>

        {/* KHU VỰC PHỤ 2: CÁC BẢN GHI MẪU (TUỲ CHỌN CHO THỬ NGHIỆM NHANH) */}
        {sampleBags.length > 0 && (
          <details style={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--panel)', padding: '12px 16px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: 'var(--muted)', userSelect: 'none' }}>
              ⚡ Hoặc chọn nhanh bản ghi mẫu có sẵn trên máy chủ ({sampleBags.length} tệp)
            </summary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
              {sampleBags.map((sample) => (
                <div
                  key={sample.name}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '13px' }}>{sample.name}</strong>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
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
                    Thử mẫu này
                  </Button>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
