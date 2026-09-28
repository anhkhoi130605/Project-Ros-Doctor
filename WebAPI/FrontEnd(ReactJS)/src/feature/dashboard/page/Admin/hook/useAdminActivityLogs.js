import { useEffect, useState } from 'react';
import { fetchAdminActivityLogsApi } from '../../../api/dashboardApi';

export default function useAdminActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchAdminActivityLogsApi(20);
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
