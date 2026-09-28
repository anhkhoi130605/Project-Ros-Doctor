import { useEffect, useState, useCallback } from 'react';
import { fetchAdminMembersApi } from '../../../api/dashboardApi';

export default function useAdminMembers() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAdminMembersApi();
      setMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      setMembers([]);
      setError(err.message || 'Có lỗi xảy ra khi tải dữ liệu thành viên.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return { members, loading, error, refetch: fetchMembers };
}
