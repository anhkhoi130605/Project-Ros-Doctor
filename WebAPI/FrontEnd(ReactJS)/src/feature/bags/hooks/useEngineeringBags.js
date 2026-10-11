import { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '../../../stored/appStore';
import { getBagsApi, deleteBagApi } from '../../../service';

export default function useEngineeringBags() {
  const { state, dispatch, notify } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  const fetchBags = useCallback(async () => {
    try {
      setLoading(true);
      const apiBags = await getBagsApi();
      if (Array.isArray(apiBags)) {
        dispatch({ type: 'SET_BAGS', bags: apiBags });
      }
    } catch (error) {
      if (error.name !== 'AbortError') dispatch({ type: 'SET_BAGS', bags: [] });
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchBags();
  }, [fetchBags]);

  const bags = state.bags || [];

  const filteredBags = useMemo(() => {
    return bags.filter((bag) => {
      const matchSearch = (bag.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'all' || bag.status === statusFilter
        || (statusFilter === 'pending' && bag.status === 'ready');
      return matchSearch && matchStatus;
    });
  }, [bags, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = bags.length;
    const complete = bags.filter((b) => b.status === 'complete').length;
    const processing = bags.filter((b) => b.status === 'processing').length;
    const pending = bags.filter((b) => b.status === 'pending' || b.status === 'ready').length;
    return { total, complete, processing, pending };
  }, [bags]);

  const renameBag = (id, newName) => {
    if (!newName?.trim()) return;
    dispatch({ type: 'RENAME_BAG', id, name: newName.trim() });
    notify('Đã lưu tên rosbag thành công.', 'success');
  };

  const deleteBag = async (id) => {
    try {
      await deleteBagApi(id);
    } catch (error) {
      notify(error.message || 'Không thể xóa rosbag. Vui lòng thử lại.', 'error');
      return;
    }
    dispatch({ type: 'DELETE_BAG', id });
    notify('Đã xóa rosbag.', 'info');
  };

  return {
    state,
    bags,
    filteredBags,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    stats,
    loading,
    refresh: fetchBags,
    renameBag,
    deleteBag,
  };
}
