import { useEffect, useState } from 'react';
import { apiClient, subscribeApiFailures } from '../../service/apiClient/apiClient';
import { mapReviewsResponse } from '../../service/reviewService';

export default function useWorkspaceData(routeKey, dispatch) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ status: 'loading' });
  const key = `${routeKey}:${attempt}`;

  useEffect(() => {
    let active = true;
    let failed = false;
    let probing = false;
    apiClient.resetSession();
    setResult({ key, status: 'loading' });

    const fail = (error) => {
      if (!active || failed || error.name === 'AbortError') return;
      failed = true;
      apiClient.resetSession();
      dispatch({ type: 'RESET_REMOTE_DATA' });
      setResult({ key, status: 'error', error });
    };
    const unsubscribe = subscribeApiFailures(fail);

    Promise.all([
      apiClient.get('/api/bags', { noCache: true }),
      apiClient.get('/api/reviews', { noCache: true }),
      apiClient.get('/api/reports', { noCache: true }),
    ]).then(([bags, reviews, reports]) => {
      if (!active || failed) return;
      if (!Array.isArray(bags) || !Array.isArray(reports)) throw new Error('Invalid data response');
      const findings = mapReviewsResponse(reviews);
      dispatch({ type: 'SET_BAGS', bags });
      dispatch({ type: 'SET_REVIEWS', findings });
      dispatch({ type: 'SET_REPORTS', reports });
      setResult({ key, status: 'ready' });
    }).catch(fail);

    // Detect a stopped server even when the current page makes no further requests.
    const probe = async () => {
      if (!active || failed || probing || document.visibilityState === 'hidden') return;
      probing = true;
      try {
        await apiClient.get('/api/bags', { noCache: true });
      } catch (error) {
        fail(error);
      } finally {
        probing = false;
      }
    };
    const timer = setInterval(probe, 15000);
    const offline = () => fail(new Error('Network unavailable'));
    window.addEventListener('offline', offline);
    window.addEventListener('focus', probe);
    return () => {
      active = false;
      clearInterval(timer);
      unsubscribe();
      window.removeEventListener('offline', offline);
      window.removeEventListener('focus', probe);
      apiClient.resetSession();
    };
  }, [key, dispatch]);

  return {
    ...(result.key === key ? result : { status: 'loading' }),
    retry: () => setAttempt((value) => value + 1),
  };
}
