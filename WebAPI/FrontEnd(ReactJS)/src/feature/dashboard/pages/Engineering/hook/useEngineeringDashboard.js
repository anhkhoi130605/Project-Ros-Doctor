import { useMemo, useEffect, useState } from 'react';
import { useApp } from '../../../../../stored/appStore';
import { getDashboardStatsApi, getBagsApi, getSessionByIdApi } from '../../../../../service';

export default function useEngineeringDashboard() {
  const { state, dispatch, notify } = useApp();
  const [dbStats, setDbStats] = useState(null);
  const [realSessions, setRealSessions] = useState([]);
  const [topicStats, setTopicStats] = useState([]);

  useEffect(() => {
    let active = true;
    // 1. Tải thống kê tổng thể từ Backend Database
    getDashboardStatsApi()
      .then((data) => {
        if (active && data) setDbStats(data);
      })
      .catch((err) => console.warn('Could not load dashboard stats:', err));

    // 2. Tải danh sách Rosbag thực tế từ Database
    getBagsApi()
      .then(async (bags) => {
        if (active && Array.isArray(bags)) {
          dispatch({ type: 'SET_BAGS', bags });

          // Lấy top 6 rosbag mới nhất có sessionId để nạp chi tiết phiên phân tích thực tế từ DB
          const targetBags = bags.filter((b) => b.sessionId).slice(0, 6);
          const loadedSessions = await Promise.all(
            targetBags.map((b) =>
              getSessionByIdApi(b.sessionId)
                .then((s) => ({
                  id: s.id,
                  title: `Phiên #${s.id}`,
                  bagName: s.name || b.name,
                  bagId: b.id,
                  timestamp: s.createdAt || b.date,
                  topicsCount: s.topics ?? b.topics ?? 0,
                  warningsCount: (s.issues || []).length,
                  healthScore: s.healthScore,
                  status: s.status || 'complete',
                  statusText: s.status === 'complete' ? 'Hoàn tất' : 'Chờ duyệt',
                  issues: s.issues || [],
                  duration: s.duration ?? b.duration ?? 0,
                  processingSeconds: s.processingSeconds ?? b.processingSeconds ?? null,
                }))
            )
          );

          if (active) {
            setRealSessions(loadedSessions);
            dispatch({ type: 'SET_REAL_SESSIONS', sessions: loadedSessions });

            // Tổng hợp phân bổ topic thực tế từ các sự cố đã phát hiện trong DB
            const topicCounts = {};
            loadedSessions.forEach((s) => {
              (s.issues || []).forEach((iss) => {
                const t = iss.topic || '/rosout';
                topicCounts[t] = (topicCounts[t] || 0) + 1;
              });
            });

            const topicsArray = Object.entries(topicCounts).map(([name, count]) => ({
              name,
              label: name.replace('/', ''),
              count,
              color: name.includes('tf') ? '#3b82f6' : name.includes('imu') ? '#f59e0b' : '#ef4444',
            }));

            setTopicStats(topicsArray.sort((a, b) => b.count - a.count));
          }
        }
      })
      .catch((err) => console.warn('Could not load bags:', err));
    return () => { active = false; };
  }, [dispatch]);

  const pendingCount = useMemo(() => {
    return (state.findings || []).filter((f) => f.review?.status === 'pending').length;
  }, [state.findings]);

  const bagsCount = useMemo(() => {
    return dbStats?.totalBags ?? (state.bags || []).length;
  }, [dbStats, state.bags]);

  const sessionsCount = useMemo(() => {
    return dbStats?.totalSessions ?? (state.sessions || []).length;
  }, [dbStats, state.sessions]);

  const highWarningsCount = useMemo(() => {
    return dbStats?.highSeverityIssues ?? (state.findings || []).filter((f) => f.severity === 'high').length;
  }, [dbStats, state.findings]);

  const recentSessions = useMemo(() => {
    if (realSessions.length > 0) return realSessions;
    const cleanSessions = (state.sessions || []).filter(
      (s) =>
        s.createdAt &&
        !['024', '023', 'sess-fb47cf31', 'sess-736dabd1', 'sess-91332c3b', 'sess-05355333', 'SESS-5064'].includes(s.id) &&
        !String(s.id).startsWith('sess-fb47') &&
        !String(s.id).startsWith('sess-736d') &&
        !String(s.id).startsWith('sess-9133') &&
        !String(s.id).startsWith('sess-0535') &&
        !String(s.id).startsWith('SESS-5064')
    );
    return cleanSessions.slice(0, 6);
  }, [realSessions, state.sessions]);

  const recentBags = useMemo(() => {
    return (state.bags || []).slice(0, 5);
  }, [state.bags]);

  return {
    state,
    dispatch,
    notify,
    dbStats,
    pendingCount,
    bagsCount,
    sessionsCount,
    highWarningsCount,
    recentSessions,
    recentBags,
    topicStats,
  };
}
