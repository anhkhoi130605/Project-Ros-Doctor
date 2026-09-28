import { useMemo } from 'react';
import { useApp } from '../../../../../stored/appStore';

export default function useEngineeringDashboard() {
  const { state, dispatch, notify } = useApp();

  const pendingCount = useMemo(() => {
    return (state.findings || []).filter((f) => f.review?.status === 'pending').length || 5;
  }, [state.findings]);

  const bagsCount = useMemo(() => {
    return (state.bags || []).length || 4;
  }, [state.bags]);

  const sessionsCount = useMemo(() => {
    return (state.sessions || []).length || 2;
  }, [state.sessions]);

  const highWarningsCount = useMemo(() => {
    return (state.findings || []).filter((f) => f.severity === 'high').length || 5;
  }, [state.findings]);

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
    pendingCount,
    bagsCount,
    sessionsCount,
    highWarningsCount,
    recentSessions,
    recentBags,
  };
}
