import { useState, useMemo } from 'react';
import { useApp } from '../../../../../stored/appStore';

export default function useEngineeringBags() {
  const { state, dispatch, notify } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const bags = state.bags || [];

  const filteredBags = useMemo(() => {
    return bags.filter((bag) => {
      const matchSearch = (bag.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'all' || bag.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [bags, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = bags.length;
    const complete = bags.filter((b) => b.status === 'complete').length;
    const processing = bags.filter((b) => b.status === 'processing').length;
    const pending = bags.filter((b) => b.status === 'pending').length;
    return { total, complete, processing, pending };
  }, [bags]);

  const renameBag = (id, newName) => {
    if (!newName?.trim()) return;
    dispatch({ type: 'RENAME_BAG', id, name: newName.trim() });
    notify('Đã lưu tên rosbag thành công.', 'success');
  };

  const deleteBag = (id) => {
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
    renameBag,
    deleteBag,
  };
}
