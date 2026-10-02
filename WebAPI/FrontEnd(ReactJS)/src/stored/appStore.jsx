import React, { createContext, useContext, useReducer, useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { DEFAULT_SETTINGS, ROLES } from '../domain/appTypes';

const STORAGE_KEY = 'ros2-doctor-frontend:v1';
const AppContext = createContext(null);

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 4);
  return `${(bytes / Math.pow(1024, i)).toFixed(+(i > 1))} ${['B', 'KB', 'MB', 'GB', 'TB'][i]}`;
}

export function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatDateTime(dateStr) {
  if (!dateStr || Number.isNaN(Date.parse(dateStr))) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

export function formatPercent(val) {
  return `${(100 * val).toFixed(1)}%`;
}

export function calculateMetrics(items) {
  const totals = items.reduce(
    (acc, cur) => ({
      tp: acc.tp + (cur.tp || 0),
      fp: acc.fp + (cur.fp || 0),
      fn: acc.fn + (cur.fn || 0),
    }),
    { tp: 0, fp: 0, fn: 0 }
  );
  const precision = totals.tp + totals.fp ? totals.tp / (totals.tp + totals.fp) : 0;
  const recall = totals.tp + totals.fn ? totals.tp / (totals.tp + totals.fn) : 0;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;

  return { ...totals, precision, recall, f1 };
}

function getInitialState() {
  return {
    schema: 2,
    signedIn: false,
    role: ROLES.ENGINEER,
    profile: {
      name: 'An Nguyễn',
      email: 'engineer@ros2doctor.local',
      workspace: 'Robotics Lab',
    },
    settings: { ...DEFAULT_SETTINGS },
    selectedBagId: 'bag-024',
    analysisConfig: null,
    bags: [
      {
        id: 'bag-024',
        name: 'agv_lab_2026_09_22.mcap',
        size: 2576980378,
        format: 'MCAP',
        duration: 272,
        topics: 12,
        status: 'complete',
        date: '2026-09-22T09:24:00',
        sessionId: '024',
        isSample: true,
      },
      {
        id: 'bag-023',
        name: 'warehouse_route_03.mcap',
        size: 1181116006,
        format: 'MCAP',
        duration: 495,
        topics: 18,
        status: 'complete',
        date: '2026-09-22T08:42:00',
        sessionId: '023',
        isSample: true,
      },
      {
        id: 'bag-022',
        name: 'sensor_test_02.db3',
        size: 679477248,
        format: 'SQLite3',
        duration: 120,
        topics: 8,
        status: 'ready',
        date: '2026-09-21T16:10:00',
        isSample: true,
      },
      {
        id: 'bag-021',
        name: 'agv_split_recording.zip',
        size: 2254857830,
        format: 'ZIP',
        duration: null,
        topics: null,
        status: 'invalid',
        date: '2026-09-20T10:12:00',
        isSample: true,
      },
    ],
    sessions: [
      {
        id: '024',
        bagId: 'bag-024',
        name: 'AGV-Lab',
        duration: 272,
        topics: 12,
        messages: 387284,
        status: 'pending',
        createdAt: '2026-09-22T09:24:00',
        processingSeconds: 24,
        isDemo: true,
      },
      {
        id: '023',
        bagId: 'bag-023',
        name: 'Warehouse',
        duration: 495,
        topics: 18,
        messages: 418217,
        status: 'complete',
        createdAt: '2026-09-22T08:42:00',
        processingSeconds: 19,
        isDemo: true,
      },
    ],
    findings: [],
    reports: [
      {
        id: 'RPT-023',
        sessionId: '023',
        title: 'Warehouse · Không phát hiện bất thường',
        status: 'approved',
        generatedAt: '2026-09-22T09:12:00',
        reviewer: 'Minh Nguyễn',
        findings: [],
        pendingCount: 0,
        totalFindings: 0,
        isDemo: true,
      },
    ],
    users: [
      {
        id: 'u1',
        name: 'Admin RAV-13',
        email: 'admin@ros2doctor.local',
        role: 'admin',
        project: 'Robotics Lab',
        active: true,
      },
      {
        id: 'u2',
        name: 'An Nguyễn',
        email: 'engineer@ros2doctor.local',
        role: 'engineer',
        project: 'Robotics Lab',
        active: true,
      },
      {
        id: 'u3',
        name: 'Khách quan sát',
        email: 'viewer@ros2doctor.local',
        role: 'viewer',
        project: 'Robotics Lab',
        active: true,
      },
    ],
    aiSettings: {
      dailyRequests: 100,
      tokensPerRun: 4000,
      requestsPerMinute: 10,
      monthlyBudget: 25,
      vectorUrl: import.meta.env.VITE_VECTOR_DB_URL || 'http://localhost:6333',
      model: 'Chưa kết nối',
      prompt: 'Phân tích log ROS2 dựa trên bằng chứng. Phân biệt quan sát với giả thuyết. Kỹ sư duyệt mọi kết luận.',
    },
    conversations: {},
    audit: [],
  };
}

function loadSavedState(savedJson) {
  const initial = getInitialState();
  const savedRole = localStorage.getItem('userRole');
  const token = localStorage.getItem('accessToken');
  try {
    const parsed = JSON.parse(savedJson);
    const parsedFindings = (parsed.findings || []).filter((f) => !String(f.id).startsWith('A-00'));
    const stateObj = parsed
      ? {
        ...initial,
        ...parsed,
        findings: parsedFindings,
        settings: { ...initial.settings, ...parsed.settings },
        profile: { ...initial.profile, ...parsed.profile },
        signedIn: !!parsed.signedIn || !!token,
      }
      : {
        ...initial,
        signedIn: !!token,
      };

    if (savedRole) {
      const norm = savedRole.toLowerCase();
      stateObj.role = norm.includes('admin') ? ROLES.ADMIN : norm.includes('user') ? ROLES.USER : ROLES.ENGINEERING;
    }
    return stateObj;
  } catch {
    if (savedRole) {
      const norm = savedRole.toLowerCase();
      initial.role = norm.includes('admin') ? ROLES.ADMIN : norm.includes('user') ? ROLES.USER : ROLES.ENGINEERING;
    }
    initial.signedIn = !!token;
    return initial;
  }
}

function appReducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        signedIn: true,
        currentUserId: action.userId || null,
        role: action.role || ROLES.ENGINEER,
        profile: {
          ...state.profile,
          name: action.userName || state.profile.name,
          email: action.email || state.profile.email,
        },
      };

    case 'LOGOUT':
      return {
        ...state,
        signedIn: false,
      };

    case 'REGISTER_DEMO': {
      const user = action.user;
      if (!user?.name?.trim() || !user?.email?.trim()) return state;
      return {
        ...state,
        users: [
          ...state.users,
          {
            ...user,
            id: `u-${Date.now()}`,
            role: 'viewer',
            active: true,
            project: 'Chưa cấp dự án',
          },
        ],
      };
    }

    case 'RENAME_BAG':
      if (state.role !== ROLES.ENGINEER || !action.name?.trim()) return state;
      return {
        ...state,
        bags: state.bags.map((b) => (b.id === action.id ? { ...b, name: action.name.trim() } : b)),
      };

    case 'DELETE_BAG': {
      if (state.role !== ROLES.ENGINEER) return state;
      const sessionIds = new Set(state.sessions.filter((s) => s.bagId === action.id).map((s) => s.id));
      return {
        ...state,
        bags: state.bags.filter((b) => b.id !== action.id),
        sessions: state.sessions.filter((s) => !sessionIds.has(s.id)),
        findings: state.findings.filter((f) => !sessionIds.has(f.sessionId)),
        reports: state.reports.filter((r) => !sessionIds.has(r.sessionId)),
      };
    }

    case 'IMPORT_BAG': {
      const isEng = String(state.role || '').toLowerCase().includes('eng') || String(state.role || '').toLowerCase() === 'admin';
      if (!isEng) return state;

      const bagSessionId = action.bag.sessionId || `SESS-${Date.now().toString().slice(-4)}`;
      const importedBag = { ...action.bag, sessionId: bagSessionId };

      const initialSession = {
        id: bagSessionId,
        bagId: importedBag.id,
        name: (importedBag.name || 'Rosbag').replace(/\.[^/.]+$/, ''),
        duration: importedBag.duration ?? importedBag.durationSec ?? 120,
        topics: importedBag.topics ?? importedBag.topicCount ?? 12,
        messages: importedBag.totalMessages ?? 350000,
        status: 'pending',
        createdAt: new Date().toISOString(),
        processingSeconds: 15,
        isDemo: false,
        realTopics: action.bag.realTopics || null,
        realTimeline: action.bag.realTimeline || null,
        healthScore: action.bag.healthScore ?? 100,
      };

      return {
        ...state,
        selectedBagId: importedBag.id,
        bags: [importedBag, ...state.bags.filter((b) => b.id !== importedBag.id)],
        sessions: [initialSession, ...state.sessions.filter((s) => s.id !== bagSessionId)],
      };
    }

    case 'SELECT_BAG':
      if (!state.bags.some((bag) => bag.id === action.id)) return state;
      return {
        ...state,
        selectedBagId: action.id,
      };

    case 'CONFIG':
      return {
        ...state,
        analysisConfig: action.config,
      };

    case 'COMPLETE_ANALYSIS': {
      const existingSessionIdx = state.sessions.findIndex((s) => s.id === action.session.id);
      const updatedSessions = existingSessionIdx >= 0
        ? state.sessions.map((s) => (s.id === action.session.id ? { ...s, ...action.session, status: 'complete' } : s))
        : [action.session, ...state.sessions];

      const newFindings = Array.isArray(action.findings) ? action.findings : [];

      return {
        ...state,
        sessions: updatedSessions,
        findings: [...newFindings, ...state.findings.filter((f) => f.sessionId !== action.session.id)],
        bags: state.bags.map((b) => (b.id === action.session.bagId ? { ...b, status: 'complete', sessionId: action.session.id } : b)),
      };
    }

    case 'SAVE_NOTE':
      if (state.role !== ROLES.ENGINEERING) return state;
      return {
        ...state,
        findings: state.findings.map((f) =>
          f.id === action.id
            ? {
              ...f,
              analystNote: action.note.trim(),
              revision: (f.revision || 1) + 1,
              review: { status: 'pending', note: '', by: null, at: null },
            }
            : f
        ),
      };

    case 'REVIEW': {
      if (String(state.role).toLowerCase() === 'user') return state;
      const at = action.at || new Date().toISOString();
      return {
        ...state,
        findings: state.findings.map((f) =>
          f.id === action.id
            ? {
              ...f,
              review: { status: action.decision, note: action.note.trim(), by: state.profile.name, at },
            }
            : f
        ),
        audit: [
          {
            id: `${action.id}-${at}`,
            findingId: action.id,
            decision: action.decision,
            at,
            by: state.profile.name,
          },
          ...state.audit,
        ].slice(0, 100),
      };
    }

    case 'ADD_REPORT':
      if (state.role !== ROLES.ENGINEER) return state;
      return {
        ...state,
        reports: [action.report, ...state.reports],
      };

    case 'SETTINGS':
      if (state.role === ROLES.VIEWER) return state;
      return {
        ...state,
        settings: action.settings,
      };

    case 'SET_BAGS':
      return {
        ...state,
        bags: action.bags,
      };

    case 'SET_REVIEWS':
      return {
        ...state,
        findings: action.findings,
      };

    case 'SET_REPORTS':
      return {
        ...state,
        reports: action.reports,
      };

    case 'SET_AI_SETTINGS':
      return {
        ...state,
        aiSettings: { ...state.aiSettings, ...action.aiSettings },
      };

    case 'SAVE_USER': {
      if (state.role !== ROLES.ADMIN) return state;
      const exists = state.users.some((u) => u.id === action.user.id);
      return {
        ...state,
        users: exists
          ? state.users.map((u) => (u.id === action.user.id ? action.user : u))
          : [...state.users, { ...action.user, id: action.user.id || `u-${Date.now()}` }],
      };
    }

    case 'DELETE_USER':
      if (state.role !== ROLES.ADMIN || action.id === 'u1') return state;
      return {
        ...state,
        users: state.users.filter((u) => u.id !== action.id),
      };

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, null, () => {
    try {
      return loadSavedState(localStorage.getItem(STORAGE_KEY));
    } catch {
      return loadSavedState(null);
    }
  });

  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  const notify = useCallback((message, tone = 'info') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, tone });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 4500);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota errors
    }
  }, [state]);

  const value = useMemo(
    () => ({
      state,
      dispatch,
      notify,
      toast,
      setToast,
    }),
    [state, notify, toast]
  );

  return (
    <AppContext.Provider value={value}>
      {children}
      <div className="toast-region" aria-live="polite">
        {toast && (
          <div className={`toast ${toast.tone}`}>
            <span>{toast.message}</span>
            <button type="button" aria-label="Đóng thông báo" onClick={() => setToast(null)}>
              ×
            </button>
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return context;
}
