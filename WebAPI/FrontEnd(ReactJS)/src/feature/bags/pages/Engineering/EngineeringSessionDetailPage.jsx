import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { useApp, formatDuration } from '../../../../stored/appStore';
import { Badge, Card, Button, Notice, FormField, Icon } from '../../../../components/common/UIComponents';
import { buildRealTfTree } from '../../utils/tfTreeHelper';
import { getSessionByIdApi } from '../../../../service';

export default function EngineeringSessionDetailPage() {
  const { id, tab } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state, dispatch, notify } = useApp();

  // Find or fallback session
  const matchedSession = (state.sessions || []).find((s) => s.id === id);
  const session = matchedSession || {
    id: id || '023',
    name: id === '024' ? 'AGV-Lab' : 'Warehouse',
    bagId: id === '024' ? 'bag-024' : 'bag-023',
    robot: 'RAV-13 AGV',
    status: id === '024' ? 'pending' : 'complete',
    topics: id === '024' ? 12 : 18,
    durationFormatted: id === '024' ? '12:40' : '08:15',
    date: id === '024' ? '09:24 22/09/2026' : '08:42 22/09/2026',
    bagFile: id === '024' ? 'agv_lab_2026.09_22.mcap' : 'warehouse_route_03.mcap',
  };

  const findings = (state.findings || []).filter((f) => f.sessionId === session?.id);
  const bag = (state.bags || []).find((b) => b.id === session?.bagId) || {
    name: session.bagFile || 'warehouse_route_03.mcap',
  };

  // Tab State: 'overview' (V03) | 'timeline' (V04) | 'issues' | 'tf' (V05) | 'sync'
  const getInitialTab = () => {
    if (tab) {
      if (tab === 'topics') return 'timeline';
      return tab;
    }
    const path = location.pathname;
    if (path.endsWith('/tf')) return 'tf';
    if (path.endsWith('/topics') || path.endsWith('/timeline')) return 'timeline';
    if (path.endsWith('/issues')) return 'issues';
    if (path.endsWith('/sync')) return 'sync';
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  useEffect(() => {
    const next = getInitialTab();
    setActiveTab(next);
  }, [tab, location.pathname]);

  const changeTab = (newTab) => {
    setActiveTab(newTab);
    const sub = newTab === 'overview' ? '' : `/${newTab === 'timeline' ? 'topics' : newTab}`;
    navigate(`/sessions/${id}${sub}`, { replace: true });
  };

  // V04 Timeline & Topics State
  const [topicSearch, setTopicSearch] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('/scan');
  const [scrubberSec, setScrubberSec] = useState(35); // 00:35 default matching Figma

  // V05 TF 3D State
  const [selectedFrame, setSelectedFrame] = useState('map');
  const [tfTimeSec, setTfTimeSec] = useState(30.005); // Khởi tạo tại thời điểm xảy ra bất thường của rosbag
  const [yaw, setYaw] = useState(-0.55);
  const [pitch, setPitch] = useState(0.35);
  const [zoom, setZoom] = useState(1.0);
  const canvasRef = useRef(null);
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  // Tab 3 Issues State
  const [reviewNote, setReviewNote] = useState('');
  const [selectedFindingId, setSelectedFindingId] = useState(searchParams.get('finding') || findings[0]?.id || null);
  const [checks, setChecks] = useState([false, false, false]);
  const activeFinding = findings.find((f) => f.id === selectedFindingId) || findings[0];

  const handleDecision = (decision) => {
    if (!activeFinding) return;
    if (decision === 'approved' && !checks.every(Boolean)) {
      notify('Vui lòng xác nhận đủ 3 mục trong danh sách kiểm tra trước khi phê duyệt.', 'warning');
      return;
    }
    if (!reviewNote.trim()) {
      notify('Vui lòng nhập nhận xét/ghi chú trước khi lưu quyết định.', 'warning');
      return;
    }

    dispatch({
      type: 'REVIEW',
      id: activeFinding.id,
      decision,
      note: reviewNote.trim(),
    });
    notify(`Đã lưu quyết định (${decision}) cho kết luận ${activeFinding.id}`, 'success');
  };

  const [liveSession, setLiveSession] = useState(null);

  useEffect(() => {
    if (id) {
      getSessionByIdApi(id)
        .then((res) => {
          if (res) setLiveSession(res);
        })
        .catch((err) => console.warn('Could not fetch session detail in EngineeringSessionDetailPage:', err));
    }
  }, [id]);

  const effectiveSession = liveSession || session;
  const effectiveIssues = liveSession?.issues || findings || [];

  // -------------------------------------------------------------
  // V05 TF 3D Frames mapped to real session rosbag data & dynamic time timeline
  // -------------------------------------------------------------
  const { frames: tfFrames, edgeCount, tfIssuesCount, hasAnomalies } = useMemo(
    () => buildRealTfTree(effectiveSession, bag, effectiveIssues, tfTimeSec),
    [effectiveSession, bag, effectiveIssues, tfTimeSec]
  );

  const formatTfTime = (totalSec) => {
    const safeSec = Math.max(0, totalSec || 0);
    const m = Math.floor(safeSec / 60);
    const s = Math.floor(safeSec % 60);
    const ms = Math.floor((safeSec % 1) * 1000);
    return {
      main: `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
      ms: ` . ${String(ms).padStart(3, '0')}`
    };
  };

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 700;
    const h = 425;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    ctx.save();
    ctx.scale(dpr, dpr);

    // Figma V05 has clean white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // 3D Perspective Grid Floor (Light gray-cyan lines matching Figma V05)
    ctx.strokeStyle = 'rgba(215, 230, 242, 0.7)';
    ctx.lineWidth = 1;
    const gridY = -115;
    for (let gx = -180; gx <= 180; gx += 45) {
      const p1 = project3D(gx, gridY, -180, w, h, yaw, pitch, zoom);
      const p2 = project3D(gx, gridY, 180, w, h, yaw, pitch, zoom);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    for (let gz = -180; gz <= 180; gz += 45) {
      const p1 = project3D(-180, gridY, gz, w, h, yaw, pitch, zoom);
      const p2 = project3D(180, gridY, gz, w, h, yaw, pitch, zoom);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // Project all nodes
    const projected = tfFrames.map((f) => {
      const p = project3D(f.x, f.y, f.z, w, h, yaw, pitch, zoom);
      return { ...f, ...p };
    });

    // Sort by depth (Z)
    projected.sort((a, b) => b.depth - a.depth);

    // Draw connecting edges
    tfFrames.forEach((f) => {
      if (!f.parent) return;
      const parent = projected.find((p) => p.id === f.parent);
      const child = projected.find((p) => p.id === f.id);
      if (!parent || !child) return;

      const isBroken = f.anomaly?.type === 'error';
      const isWarning = f.anomaly?.type === 'warning';

      ctx.beginPath();
      ctx.moveTo(parent.x, parent.y);
      ctx.lineTo(child.x, child.y);
      ctx.strokeStyle = isBroken ? '#ef4444' : isWarning ? '#f59e0b' : '#7dd3fc';
      ctx.lineWidth = isBroken ? 2.5 : isWarning ? 2.0 : 1.8;
      if (isBroken) {
        ctx.setLineDash([6, 4]);
      } else if (isWarning) {
        ctx.setLineDash([4, 4]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Draw glossy 3D spheres & labels (matching condition)
    projected.forEach((node) => {
      const isSelected = selectedFrame === node.id;
      const isBroken = node.anomaly?.type === 'error';
      const isWarning = node.anomaly?.type === 'warning';
      const radius = 13;

      // Glow / highlight ring
      if (isSelected || isBroken) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 5, 0, Math.PI * 2);
        ctx.strokeStyle = isSelected ? '#f59e0b' : isBroken ? '#ef4444' : '#38bdf8';
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.stroke();
      }

      // Glossy 3D sphere gradient based on condition
      const sphereGrad = ctx.createRadialGradient(
        node.x - 4,
        node.y - 4,
        2,
        node.x,
        node.y,
        radius
      );
      if (isBroken) {
        sphereGrad.addColorStop(0, '#fca5a5');
        sphereGrad.addColorStop(0.4, '#dc2626');
        sphereGrad.addColorStop(1, '#7f1d1d');
      } else if (isWarning) {
        sphereGrad.addColorStop(0, '#fde68a');
        sphereGrad.addColorStop(0.4, '#d97706');
        sphereGrad.addColorStop(1, '#78350f');
      } else {
        sphereGrad.addColorStop(0, '#7dd3fc');
        sphereGrad.addColorStop(0.4, '#0284c7');
        sphereGrad.addColorStop(1, '#082f49');
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = sphereGrad;
      ctx.fill();
      ctx.strokeStyle = isBroken ? '#b91c1c' : isWarning ? '#b45309' : '#0369a1';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Shiny specular highlight dot
      ctx.beginPath();
      ctx.arc(node.x - 4, node.y - 4, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.fill();

      // Capsule badge label below sphere
      const labelText = node.name;
      ctx.font = '700 12px Inter, sans-serif';
      const textWidth = ctx.measureText(labelText).width;
      const labelW = textWidth + 16;
      const labelH = 22;
      const labelX = node.x - labelW / 2;
      const labelY = node.y + radius + 6;

      ctx.fillStyle = isBroken ? '#7f1d1d' : isWarning ? '#78350f' : '#0f172a';
      roundRect(ctx, labelX, labelY, labelW, labelH, 4);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(labelText, node.x - textWidth / 2, labelY + 15);
    });

    ctx.restore();
  }, [yaw, pitch, zoom, selectedFrame, tfFrames]);

  useEffect(() => {
    if (activeTab === 'tf') {
      renderCanvas();
    }
  }, [activeTab, renderCanvas]);

  // Canvas mouse interactions
  const handleMouseDown = (e) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    setYaw((prev) => prev + dx * 0.008);
    setPitch((prev) => Math.max(-1.2, Math.min(1.2, prev + dy * 0.008)));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const w = canvas.clientWidth;
    const h = 425;

    // Check click on nodes
    tfFrames.forEach((f) => {
      const p = project3D(f.x, f.y, f.z, w, h, yaw, pitch, zoom);
      const dist = Math.hypot(clickX - p.x, clickY - p.y);
      if (dist < 26) {
        setSelectedFrame(f.id);
      }
    });
  };

  const resetView = () => {
    setYaw(-0.55);
    setPitch(0.35);
    setZoom(1.0);
  };

  // -------------------------------------------------------------
  // Data for V04 Topics & Waveform
  // -------------------------------------------------------------
  const representativeTopics = [
    { name: '/scan', rate: '10 Hz', color: '#0284c7' },
    { name: '/imu', rate: '100 Hz', color: '#10b981' },
    { name: '/camera/image', rate: '30 Hz', color: '#3b82f6' },
    { name: '/odom', rate: '50 Hz', color: '#d97706' },
    { name: '/tf', rate: 'Theo sự kiện', color: '#0284c7' },
    { name: '/tf_static', rate: 'Theo sự kiện', color: '#0284c7' },
    { name: '/rosout', rate: 'Theo sự kiện', color: '#0284c7' },
  ];

  const filteredTopics = representativeTopics.filter((t) =>
    t.name.toLowerCase().includes(topicSearch.toLowerCase())
  );

  const formattedScrubberTime = formatDuration(scrubberSec);

  // Active TF Frame Info
  const activeTfObj = tfFrames.find((f) => f.id === selectedFrame) || tfFrames[0];
  const activeTfParent = activeTfObj.parent || 'odom';

  return (
    <div className="session-detail" style={{ display: 'grid', gap: '20px' }}>
      {/* Page Title & Breadcrumb matching Figma V03/V04/V05 */}
      <div className="page-title" style={{ marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 6px 0', color: '#0f172a' }}>
            {effectiveSession?.name || effectiveSession?.bagName || bag?.fileName || bag?.name || 'Robot Di Động AGV'} · phiên #{id || effectiveSession?.id}
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            {bag?.fileName || bag?.name || effectiveSession?.bagName || effectiveSession?.name || 'scen_05_invalid_quaternion_denorm.db3'} / {effectiveSession?.createdAt ? new Date(effectiveSession.createdAt).toLocaleString('vi-VN') : (effectiveSession?.date || '08:42 22/09/2026')}
          </p>
        </div>
      </div>

      {/* 5-Tab Navigation Bar matching Figma V03/V04/V05 */}
      <div className="tabs" style={{ margin: '0 0 16px 0', borderBottom: '1px solid #e2e8f0' }}>
        <a
          href="#overview"
          onClick={(e) => {
            e.preventDefault();
            changeTab('overview');
          }}
          className={activeTab === 'overview' ? 'active' : ''}
          style={{ cursor: 'pointer' }}
        >
          Tổng quan phiên
        </a>
        <a
          href="#timeline"
          onClick={(e) => {
            e.preventDefault();
            changeTab('timeline');
          }}
          className={activeTab === 'timeline' ? 'active' : ''}
          style={{ cursor: 'pointer' }}
        >
          Topics & Timeline
        </a>
        <a
          href="#issues"
          onClick={(e) => {
            e.preventDefault();
            changeTab('issues');
          }}
          className={activeTab === 'issues' ? 'active' : ''}
          style={{ cursor: 'pointer' }}
        >
          Sự cố & Chẩn đoán
          {findings.length > 0 && <span className="tab-mini">{findings.length}</span>}
        </a>
        <a
          href="#tf"
          onClick={(e) => {
            e.preventDefault();
            changeTab('tf');
          }}
          className={activeTab === 'tf' ? 'active' : ''}
          style={{ cursor: 'pointer' }}
        >
          Cây TF <span className="tab-mini" style={{ background: '#ecfeff', color: '#0891b2', fontWeight: 700 }}>3D</span>
        </a>
        <a
          href="#sync"
          onClick={(e) => {
            e.preventDefault();
            changeTab('sync');
          }}
          className={activeTab === 'sync' ? 'active' : ''}
          style={{ cursor: 'pointer' }}
        >
          Đồng bộ thời gian
        </a>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: TỔNG QUAN PHIÊN (V03)                                */}
      {/* ============================================================ */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gap: '24px' }}>
          {/* 4 Stats Grid V03 matching Figma */}
          <div className="stats-grid" style={{ marginBottom: 0 }}>
            {/* Stat 1: Thời lượng ghi */}
            <div className="card stat cyan" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
              <span className="stat-label">Thời lượng ghi</span>
              <div className="stat-icon" style={{ background: '#ecfeff', color: '#0891b2' }}>
                <Icon name="clock" size={16} />
              </div>
              <strong style={{ color: '#0f172a' }}>{effectiveSession?.durationFormatted || formatDuration(effectiveSession?.duration || 86)}</strong>
              <small>{(effectiveSession?.messages || 387000).toLocaleString('vi-VN')} message thực tế</small>
            </div>

            {/* Stat 2: Topic trong bag */}
            <div className="card stat blue" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
              <span className="stat-label">Topic trong bag</span>
              <div className="stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
                <Icon name="database" size={16} />
              </div>
              <strong style={{ color: '#0f172a' }}>{effectiveSession?.topics || 2}</strong>
              <small>Từ tệp .db3 thực tế</small>
            </div>

            {/* Stat 3: Bất thường đo đạc */}
            <div className="card stat amber" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
              <span className="stat-label">Bất thường đo đạc</span>
              <div className="stat-icon" style={{ background: '#fffbeb', color: '#d97706' }}>
                <Icon name="alert" size={16} />
              </div>
              <strong style={{ color: '#0f172a' }}>{effectiveIssues.length}</strong>
              <small>{effectiveIssues.filter(f => f.severity === 'high' || f.severity === 'critical').length} mức cao / nghiêm trọng</small>
            </div>

            {/* Stat 4: Thời gian xử lý */}
            <div className="card stat green" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
              <span className="stat-label">Thời gian xử lý</span>
              <div className="stat-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                <Icon name="trend" size={16} />
              </div>
              <strong style={{ color: '#0f172a' }}>{effectiveSession?.processingSeconds ?? 1}s</strong>
              <small>Thời gian thực thi trích xuất</small>
            </div>
          </div>

          {/* Clean State Banner matching Figma V03 */}
          {findings.length === 0 ? (
            <div
              className="card"
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '64px 32px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 24px auto',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: '2px solid #2563eb',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#2563eb',
                  }}
                >
                  <Icon name="check" size={18} />
                </div>
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px 0' }}>
                Chưa phát hiện bất thường
              </h2>
              <p style={{ fontSize: '13.5px', color: '#475569', maxWidth: '540px', margin: '0 auto 28px auto', lineHeight: 1.6 }}>
                Các quy tắc trong phiên mẫu này không phát hiện vấn đề. Kết quả không khẳng định<br />
                toàn bộ hệ thống không có lỗi.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '14px' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('timeline')}
                  className="button ghost"
                  style={{
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    fontWeight: 650,
                    borderRadius: '8px',
                    padding: '10px 20px',
                    background: '#ffffff',
                  }}
                >
                  <Icon name="activity" size={16} /> Kiểm tra topic
                </button>
                <Link
                  to="/reports/RPT-023"
                  className="button"
                  style={{
                    background: '#07253d',
                    color: '#ffffff',
                    fontWeight: 650,
                    borderRadius: '8px',
                    padding: '10px 20px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Icon name="file-text" size={16} /> Xem báo cáo mẫu
                </Link>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: '24px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  Danh sách {findings.length} cảnh báo phát hiện
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('issues')}
                  className="text-link"
                  style={{ fontWeight: 600 }}
                >
                  Mở tab Sự cố & Chẩn đoán →
                </button>
              </div>
              <div style={{ display: 'grid', gap: '10px' }}>
                {findings.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => {
                      setSelectedFindingId(f.id);
                      setActiveTab('issues');
                    }}
                    style={{
                      padding: '14px 18px',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>{f.title}</strong>
                      <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '12px' }}>
                        <code>{f.topic}</code>
                      </span>
                    </div>
                    <Badge status={f.review?.status || 'pending'} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* V03 Notice */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              background: '#f0f9ff',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#0369a1',
              border: '1px solid #bae6fd',
            }}
          >
            <Icon name="info" size={16} />
            <div>
              Đây là bộ kết quả mô phỏng để thử giao diện. Mọi nhận định phải được người duyệt kiểm tra trước khi đưa vào báo cáo.
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: TOPICS & TIMELINE (V04)                                */}
      {/* ============================================================ */}
      {activeTab === 'timeline' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 320px) minmax(0, 1fr)', gap: '20px' }}>
          {/* Left Column: Topics List matching Figma V04 */}
          <section
            className="card"
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>Danh sách topic</h2>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                {representativeTopics.length} topic đại diện / {session.topics || 18} topic trong bag
              </p>
            </div>

            {/* Search topic input */}
            <div className="search-field" style={{ background: '#ffffff', border: '1px solid #cbd5e1' }}>
              <Icon name="search" size={15} />
              <input
                type="text"
                placeholder="Tìm topic…"
                value={topicSearch}
                onChange={(e) => setTopicSearch(e.target.value)}
              />
            </div>

            {/* Topic items */}
            <div style={{ display: 'grid', gap: '8px' }}>
              {filteredTopics.map((t) => {
                const isSelected = selectedTopic === t.name;
                return (
                  <div
                    key={t.name}
                    onClick={() => setSelectedTopic(t.name)}
                    style={{
                      background: isSelected ? '#f0f9ff' : 'transparent',
                      border: isSelected ? '1px solid #bae6fd' : '1px solid transparent',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: t.color,
                          display: 'inline-block',
                          flexShrink: 0,
                        }}
                      />
                      <strong style={{ fontSize: '13px', color: '#0f172a', fontWeight: 700 }}>
                        {t.name}
                      </strong>
                    </div>
                    <small style={{ fontSize: '11px', color: '#64748b', paddingLeft: '15px' }}>
                      {t.rate}
                    </small>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                marginTop: 'auto',
                padding: '12px',
                background: '#f0f9ff',
                borderRadius: '8px',
                fontSize: '11px',
                color: '#0369a1',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: '1px solid #bae6fd',
              }}
            >
              <Icon name="info" size={15} />
              <div>Không áp ngưỡng tần số của topic định kỳ cho /tf_static.</div>
            </div>
          </section>

          {/* Right Column: Timeline & Waveform Chart */}
          <div style={{ display: 'grid', gap: '20px' }}>
            {/* Card 1: Timeline hoạt động */}
            <section
              className="card"
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '24px',
              }}
            >
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>Timeline hoạt động</h2>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 20px 0' }}>
                  Bấm một ô tín hiệu hoặc kéo thanh thời gian để đối chiếu.
                </p>
              </div>

              <div className="timeline">
                {/* Timeline scale */}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '110px', fontSize: '11px', color: '#94a3b8', marginBottom: '10px' }}>
                  <span>00:00</span>
                  <span>04:07</span>
                  <span>08:15</span>
                </div>

                {/* Timeline signal lanes */}
                {[
                  { name: '/scan', bg: '#22d3ee' },
                  { name: '/imu', bg: '#34d399' },
                  { name: '/camera/image', bg: '#60a5fa' },
                  { name: '/odom', bg: '#d97706' },
                  { name: '/tf', bg: '#22d3ee' },
                ].map((lane) => (
                  <div
                    key={lane.name}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '100px 1fr',
                      alignItems: 'center',
                      gap: '10px',
                      margin: '8px 0',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '12px',
                        color: selectedTopic === lane.name ? '#0284c7' : '#334155',
                        fontWeight: selectedTopic === lane.name ? 700 : 500,
                      }}
                    >
                      {lane.name}
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(42, 1fr)', gap: '3px' }}>
                      {Array.from({ length: 42 }).map((_, idx) => (
                        <div
                          key={idx}
                          style={{
                            height: '11px',
                            borderRadius: '2px',
                            background: lane.bg,
                            opacity: 0.9,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}

                {/* Scrubber slider */}
                <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                    Thời điểm: <strong style={{ color: '#0284c7', fontSize: '13px', fontWeight: 800 }}>{formattedScrubberTime}</strong>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="495"
                    value={scrubberSec}
                    onChange={(e) => setScrubberSec(Number(e.target.value))}
                    style={{ flex: 1, accentColor: '#0284c7' }}
                  />
                </div>
              </div>
            </section>

            {/* Card 2: Biểu đồ sóng tần số matching Figma V04 */}
            <section
              className="card"
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '24px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
                    Tần số ghi nhận · {selectedTopic}
                  </h2>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                    sensor_msgs/LaserScan · 2.570 message mẫu
                  </p>
                </div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#f0f9ff',
                    color: '#0284c7',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  ● {formattedScrubberTime}
                </span>
              </div>

              {/* Chart container */}
              <div style={{ background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
                <svg viewBox="0 0 700 160" style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
                  {/* Grid lines */}
                  {[
                    { val: 12, y: 25 },
                    { val: 8, y: 65 },
                    { val: 4, y: 105 },
                    { val: 0, y: 145 },
                  ].map((g) => (
                    <g key={g.val}>
                      <line x1="45" y1={g.y} x2="680" y2={g.y} stroke="#e2e8f0" strokeWidth="1" />
                      <text x="35" y={g.y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
                        {g.val}
                      </text>
                    </g>
                  ))}
                  <text x="18" y="16" fontSize="10" fontWeight="700" fill="#64748b">Hz</text>

                  {/* Frequency line at 10 Hz matching Figma V04 */}
                  <line x1="45" y1="45" x2="680" y2="45" stroke="#2563eb" strokeWidth="2.5" />

                  {/* X Axis Ticks */}
                  {[
                    { label: '00:00', x: 45 },
                    { label: '00:10', x: 150 },
                    { label: '00:20', x: 256 },
                    { label: '00:30', x: 362 },
                    { label: '00:40', x: 468 },
                    { label: '00:50', x: 574 },
                    { label: '01:00', x: 680 },
                  ].map((t) => (
                    <text key={t.label} x={t.x} y="162" textAnchor="middle" fontSize="10" fill="#94a3b8">
                      {t.label}
                    </text>
                  ))}
                </svg>

                {/* Chart Legend */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '28px', marginTop: '16px', fontSize: '11px', color: '#64748b' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb', display: 'inline-block' }} />
                    Tần số quan sát
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                    Khoảng cần kiểm tra
                  </span>
                </div>
              </div>

              <div
                style={{
                  marginTop: '16px',
                  padding: '12px 16px',
                  background: '#f0f9ff',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: '#0369a1',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: '1px solid #bae6fd',
                }}
              >
                <Icon name="info" size={15} />
                <div>2.570 message minh họa. Chuỗi hiển thị dùng để kiểm tra tương tác frontend.</div>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: SỰ CỐ & CHẨN ĐOÁN (Existing Findings Checklist)      */}
      {/* ============================================================ */}
      {activeTab === 'issues' && (
        <div>
          {findings.length === 0 ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
              <div className="empty-state" style={{ padding: 0 }}>
                <div
                  className="empty-icon"
                  style={{
                    background: 'radial-gradient(circle, #ecfdf5 0%, #d1fae5 100%)',
                    color: '#059669',
                    margin: '0 auto 16px auto',
                  }}
                >
                  <Icon name="check" size={32} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0', color: '#0f172a' }}>Không có sự cố nào</h3>
                <p style={{ color: '#64748b', fontSize: '13px' }}>
                  Phiên #{session.id} ({session.name}) không ghi nhận bất kỳ cảnh báo bất thường nào từ các bộ quy tắc.
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>
              <Card title="Các kết luận phát hiện">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                  {findings.map((f) => (
                    <div
                      key={f.id}
                      onClick={() => setSelectedFindingId(f.id)}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        border: activeFinding?.id === f.id ? '1px solid #0284c7' : '1px solid #e2e8f0',
                        background: activeFinding?.id === f.id ? '#f0f9ff' : '#ffffff',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <strong style={{ fontSize: '13px', color: '#0f172a' }}>{f.title}</strong>
                        <Badge status={f.review?.status || 'pending'} />
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        Topic: <code>{f.topic}</code>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <div>
                {activeFinding ? (
                  <Card
                    title={activeFinding.title}
                    subtitle={`Bằng chứng: ${activeFinding.topic} [${activeFinding.interval?.[0]}s - ${activeFinding.interval?.[1]}s]`}
                    action={<Badge status={activeFinding.review?.status || 'pending'} />}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                      <Notice tone="blue" icon="info">
                        <strong>Quan sát:</strong> {activeFinding.observation}
                      </Notice>

                      <div>
                        <h4 style={{ marginBottom: '8px', color: '#0f172a' }}>Giả thuyết nguyên nhân (AI đề xuất):</h4>
                        <p style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#334155' }}>
                          {activeFinding.analystNote || 'Phát hiện tần số truyền tín hiệu sụt giảm nghiêm trọng trong khoảng thời gian diễn ra sự cố.'}
                        </p>
                      </div>

                      {state.role === 'Engineering' && (
                        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                          <h4 style={{ marginBottom: '12px', color: '#0284c7' }}>Xác nhận của Kỹ sư Robotics (Human-in-the-Loop):</h4>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                            {[
                              'Đã kiểm tra biểu đồ tần số topic',
                              'Đã đối chiếu thời gian xảy ra cảnh báo',
                              'Đồng ý với giả thuyết nguyên nhân sự cố',
                            ].map((chk, i) => (
                              <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={checks[i]}
                                  onChange={(e) => {
                                    const next = [...checks];
                                    next[i] = e.target.checked;
                                    setChecks(next);
                                  }}
                                />
                                <span>{chk}</span>
                              </label>
                            ))}
                          </div>

                          <FormField label="Ghi chú nhận xét của kỹ sư">
                            <textarea
                              rows={3}
                              value={reviewNote}
                              onChange={(e) => setReviewNote(e.target.value)}
                              placeholder="Nhập lý do phê duyệt hoặc yêu cầu bổ sung thông tin..."
                            />
                          </FormField>

                          <div className="button-row" style={{ marginTop: '16px' }}>
                            <Button onClick={() => handleDecision('approved')} icon="check">
                              Phê duyệt kết luận
                            </Button>
                            <Button variant="ghost" onClick={() => handleDecision('changes')} icon="alert">
                              Yêu cầu làm rõ
                            </Button>
                            <Button variant="danger" onClick={() => handleDecision('rejected')} icon="close">
                              Bác bỏ
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ) : (
                  <Notice tone="blue">Chọn một kết luận bên trái để xem chi tiết.</Notice>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: CÂY TF 3D (V05)                                       */}
      {/* ============================================================ */}
      {activeTab === 'tf' && (
        <div style={{ display: 'grid', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(320px, 1fr)', gap: '20px' }}>
            {/* Left 3D Canvas Card matching Figma V05 */}
            <section
              className="card"
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '24px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
                    Không gian TF
                  </h2>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                    Bố cục 3D minh họa · Kéo để xoay góc nhìn
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetView}
                  className="button ghost"
                  style={{
                    fontSize: '11px',
                    padding: '6px 14px',
                    borderRadius: '7px',
                    border: '1px solid #cbd5e1',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#334155',
                  }}
                >
                  🔄 Đặt lại góc nhìn
                </button>
              </div>

              {/* Instructions text matching real data */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 0',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#94a3b8',
                  letterSpacing: '0.4px',
                }}
              >
                <span>KÉO ĐỂ XOAY · PHÍM MŨI TÊN</span>
                <span style={{ color: hasAnomalies ? '#ef4444' : '#0284c7' }}>
                  {tfFrames.length} FRAME / {edgeCount} QUAN HỆ {hasAnomalies ? `(${tfIssuesCount} SỰ CỐ)` : ''}
                </span>
              </div>

              {/* 3D Canvas on clean white background matching Figma */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onClick={handleCanvasClick}
                  style={{
                    display: 'block',
                    width: '100%',
                    height: '425px',
                    cursor: 'grab',
                    background: '#ffffff',
                  }}
                />
              </div>

              {/* Time Scrubber & Frame Select matching Figma V05 */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '16px',
                  fontSize: '12px',
                }}
              >
                <div style={{ color: '#64748b' }}>
                  THỜI ĐIỂM <strong style={{ color: '#0f172a', fontWeight: 800, marginLeft: '6px' }}>{formatTfTime(tfTimeSec).main}</strong>
                  <span style={{ color: '#0284c7', fontWeight: 700 }}>{formatTfTime(tfTimeSec).ms}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
                  <span>Frame đang chọn</span>
                  <select
                    value={selectedFrame}
                    onChange={(e) => setSelectedFrame(e.target.value)}
                    style={{
                      padding: '4px 28px 4px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    {tfFrames.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} {f.anomaly?.type === 'error' ? '❌' : f.anomaly?.type === 'warning' ? '⚠️' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Slider track matching real duration */}
              <input
                type="range"
                min="0"
                max={Math.max(10, Math.round(effectiveSession?.duration || effectiveSession?.durationSec || 86))}
                step="0.05"
                value={tfTimeSec}
                onChange={(e) => setTfTimeSec(parseFloat(e.target.value))}
                style={{ width: '100%', marginTop: '12px', accentColor: '#0284c7' }}
              />
            </section>

            {/* Right Information Card: Chi tiết kết nối matching real data */}
            <section
              className="card"
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '24px',
              }}
            >
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0' }}>
                Chi tiết khung tọa độ
              </h2>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: activeTfObj.anomaly?.type === 'error' ? '#fef2f2' : activeTfObj.anomaly?.type === 'warning' ? '#fffbeb' : '#f0fdf4',
                  color: activeTfObj.anomaly?.color || '#16a34a',
                  border: `1px solid ${activeTfObj.anomaly?.type === 'error' ? '#fecaca' : activeTfObj.anomaly?.type === 'warning' ? '#fef3c7' : '#bbf7d0'}`,
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  marginBottom: '20px',
                }}
              >
                {activeTfObj.anomaly?.badgeText || '● Có kết nối trong mẫu'}
              </span>

              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 20px 0' }}>
                {activeTfObj.parent ? `${activeTfObj.parent} → ${activeTfObj.name}` : `Khung gốc: ${activeTfObj.name}`}
              </h3>

              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                    Frame đang chọn
                  </div>
                  <strong style={{ fontSize: '14px', color: '#0f172a' }}>{activeTfObj.name}</strong>
                  {activeTfObj.parent && (
                    <small style={{ display: 'block', color: '#64748b', marginTop: '2px' }}>
                      (Thuộc nhánh cha: <code>{activeTfObj.parent}</code>)
                    </small>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '2px' }}>TỌA ĐỘ TỊNH TIẾN [X, Y, Z] (m)</span>
                    <code style={{ fontSize: '11px', color: '#0284c7', fontWeight: 700 }}>
                      [{activeTfObj.translation ? activeTfObj.translation.join(', ') : '0.0, 0.0, 0.0'}]
                    </code>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '2px' }}>QUATERNION [qx, qy, qz, qw]</span>
                    <code style={{ fontSize: '11px', color: '#0284c7', fontWeight: 700 }}>
                      [{activeTfObj.rotation ? activeTfObj.rotation.join(', ') : '0.0, 0.0, 0.0, 1.0'}]
                    </code>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                    Khoảng thời gian bất thường
                  </div>
                  <strong style={{ fontSize: '13px', color: activeTfObj.anomaly?.type === 'error' ? '#dc2626' : activeTfObj.anomaly?.type === 'warning' ? '#d97706' : '#0f172a' }}>
                    {activeTfObj.anomaly?.timeRange || 'Không có'}
                  </strong>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                    Quan sát thực tế từ dữ liệu
                  </div>
                  <p style={{ fontSize: '13px', color: '#334155', margin: 0, lineHeight: 1.6 }}>
                    {activeTfObj.anomaly?.observation || 'Bộ mẫu có phép biến đổi tại thời điểm này.'}
                  </p>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                    Bước kiểm tra & khắc phục tiếp theo
                  </div>
                  <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: 1.6 }}>
                    {activeTfObj.anomaly?.suggestedFix || 'Đối chiếu /tf, /tf_static, nguồn phát và phạm vi ghi. Kiểm tra timestamp của phép biến đổi.'}
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* V05 Bottom Disclaimer Notice matching Figma */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              background: '#f0f9ff',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#0369a1',
              border: '1px solid #bae6fd',
            }}
          >
            <Icon name="info" size={16} />
            <div>
              Bố cục 3D chỉ thể hiện quan hệ giữa các frame. Vị trí hiển thị không phải tọa độ robot thực tế.
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 5: ĐỒNG BỘ THỜI GIAN                                    */}
      {/* ============================================================ */}
      {activeTab === 'sync' && (
        <div style={{ display: 'grid', gap: '20px' }}>
          <div className="stats-grid" style={{ marginBottom: 0 }}>
            <div className="card stat green" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
              <span className="stat-label">Độ lệch đồng hồ ROS</span>
              <div className="stat-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                <Icon name="clock" size={16} />
              </div>
              <strong style={{ color: '#0f172a' }}>4.2 ms</strong>
              <small>Ngưỡng an toàn: &lt; 30 ms</small>
            </div>

            <div className="card stat blue" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
              <span className="stat-label">Tần số /clock</span>
              <div className="stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
                <Icon name="activity" size={16} />
              </div>
              <strong style={{ color: '#0f172a' }}>100 Hz</strong>
              <small>Độ trôi &lt; 0.02 ms/s</small>
            </div>

            <div className="card stat cyan" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
              <span className="stat-label">Bước nhảy thời gian</span>
              <div className="stat-icon" style={{ background: '#ecfeff', color: '#0891b2' }}>
                <Icon name="shield" size={16} />
              </div>
              <strong style={{ color: '#0f172a' }}>0 bước</strong>
              <small>Không lệch pha hay lùi giờ</small>
            </div>

            <div className="card stat green" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
              <span className="stat-label">Độ tin cậy đồng bộ</span>
              <div className="stat-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                <Icon name="check" size={16} />
              </div>
              <strong style={{ color: '#0f172a' }}>99.98%</strong>
              <small>Đạt chuẩn đồng bộ</small>
            </div>
          </div>

          <div
            className="card"
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '24px',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0' }}>
              Chi tiết xác thực đồng bộ thời gian
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {[
                { title: 'Nguồn đồng hồ chuẩn', desc: 'Sử dụng chuẩn thời gian mô phỏng ROS Clock (/clock @ 100 Hz).' },
                { title: 'Kiểm tra bước nhảy ngược (Time Inversion)', desc: 'Không phát hiện bất kỳ thời điểm nào timestamp bị nhảy lùi.' },
                { title: 'Độ trễ truyền nhận tf_static', desc: 'Độ trễ trung bình giữa sensor_msgs và tf_static là 1.1 ms (nằm trong dung sai cho phép).' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '14px 18px',
                    borderRadius: '8px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                  }}
                >
                  <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '15px' }}>✓</span>
                  <div>
                    <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                      {item.title}
                    </strong>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Helper 3D Projection Math
// -------------------------------------------------------------
function project3D(x, y, z, width, height, yaw, pitch, zoom) {
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const x1 = x * cosY - z * sinY;
  const z1 = x * sinY + z * cosY;

  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  const y2 = y * cosP - z1 * sinP;
  const z2 = y * sinP + z1 * cosP;

  const cameraDist = 380;
  const perspective = cameraDist / (cameraDist + z2);
  const screenX = width / 2 + x1 * perspective * zoom;
  const screenY = height / 2 - y2 * perspective * zoom;

  return { x: screenX, y: screenY, depth: z2, perspective };
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
