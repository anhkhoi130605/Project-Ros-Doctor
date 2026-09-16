import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:7149';

export default function useAdminActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLogs = async () => {
      const token = localStorage.getItem('accessToken');

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_URL}/api/user-activity?take=20`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || 'Không thể tải lịch sử hoạt động người dùng.');
        }

        const data = await response.json();
        setLogs(Array.isArray(data) ? data : []);
      } catch (err) {
        setLogs([]);
        setError(err.message || 'Có lỗi khi tải dữ liệu.');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  return { logs, loading, error };
}
