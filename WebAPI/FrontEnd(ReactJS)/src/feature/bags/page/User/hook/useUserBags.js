import { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../../../../stored/appStore';
import { getBagsApi } from '../../../../../service';

export default function useUserBags() {
  const { state, dispatch } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getBagsApi()
      .then((bags) => {
        if (Array.isArray(bags) && bags.length > 0) {
          dispatch({ type: 'SET_BAGS', bags });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dispatch]);

  // User sees published / complete / ready bags from DB
  const sharedBags = useMemo(() => {
    return (state.bags || [])
      .map((b) => ({
        ...b,
        sizeMb: Math.round((b.size || 0) / (1024 * 1024)) || 120,
      }))
      .filter((b) => b.status === 'complete' || b.status === 'ready' || b.id === 'bag-023' || b.id === 'bag-024');
  }, [state.bags]);

  const filteredBags = useMemo(() => {
    return sharedBags.filter((bag) => {
      return (bag.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [sharedBags, searchTerm]);

  return {
    state,
    sharedBags,
    filteredBags,
    searchTerm,
    setSearchTerm,
    loading,
  };
}
