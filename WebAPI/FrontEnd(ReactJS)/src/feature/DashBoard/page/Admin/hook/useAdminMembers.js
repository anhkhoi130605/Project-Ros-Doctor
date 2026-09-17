import { useEffect, useState, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:7149';

export default function useAdminMembers() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMembers = useCallback(async () => {
    const token = localStorage.getItem('accessToken');

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/admin/members`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Không thể tải danh sách thành viên.');
      }

      const data = await response.json();
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
