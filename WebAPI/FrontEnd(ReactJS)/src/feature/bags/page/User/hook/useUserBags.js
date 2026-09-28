import { useState, useMemo } from 'react';
import { useApp } from '../../../../../stored/appStore';

export default function useUserBags() {
  const { state } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  // User only sees complete or shared bags
  const sharedBags = useMemo(() => {
    return (state.bags || []).filter((b) => b.status === 'complete' || b.id === 'bag-023' || b.id === 'bag-024');
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
  };
}
