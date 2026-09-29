import { useMemo, useEffect, useState } from 'react';
import { useApp } from '../../../../../stored/appStore';
import { getDashboardStatsApi, getBagsApi } from '../../../../../service';

export default function useEngineeringDashboard() {
  const { state, dispatch, notify } = useApp();
  const [dbStats, setDbStats] = useState(null);

  useEffect(() => {
    getDashboardStatsApi()
      .then((data) => {
        if (data) setDbStats(data);
      })
      .catch(() => {});

    getBagsApi()
      .then((bags) => {
        if (Array.isArray(bags) && bags.length > 0) {
          dispatch({ type: 'SET_BAGS', bags });
        }
      })
      .catch(() => {});
  }, [dispatch]);

  const pendingCount = useMemo(() => {
    return (state.findings || []).filter((f) => f.review?.status === 'pending').length || 5;
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
    return (state.sessions || []).slice(0, 5);
  }, [state.sessions]);

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
  };
}
