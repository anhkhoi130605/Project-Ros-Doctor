import { useEffect, useState, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:7149';

export default function useSystemLogs(initialPageSize = 20) {
  const [logs, setLogs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [search, setSearch] = useState('');
  const [logLevel, setLogLevel] = useState('');
  const [exceptionType, setExceptionType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [triggering, setTriggering] = useState(false);
  const [triggerSuccess, setTriggerSuccess] = useState(null);

  const fetchLogs = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (logLevel) params.append('logLevel', logLevel);
      if (exceptionType) params.append('exceptionType', exceptionType);
      params.append('pageIndex', String(pageIndex));
      params.append('pageSize', String(pageSize));

      const response = await fetch(`${API_URL}/api/system-logs?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`Lỗi kết nối máy chủ (${response.status})`);
      }

      const data = await response.json();
      setLogs(data.items || []);
      setTotalCount(data.totalCount || 0);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách nhật ký hệ thống');
    } finally {
      setLoading(false);
    }
  }, [search, logLevel, exceptionType, pageIndex, pageSize]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const triggerTestError = async (type, customMessage) => {
    const token = localStorage.getItem('accessToken');
    try {
      setTriggering(true);
      setTriggerSuccess(null);

      await fetch(`${API_URL}/api/system-logs/trigger-test-error`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          errorType: type,
          message: customMessage || undefined,
        }),
      });

      setTriggerSuccess(`Đã kích hoạt lỗi thử nghiệm [${type}] thành công! Hệ thống đã tự động bắt và dịch lỗi.`);
      
      // Auto refresh logs after 600ms
      setTimeout(() => {
        fetchLogs();
      }, 600);
    } catch (err) {
      setTriggerSuccess(`Lỗi phát sinh: ${err.message}`);
    } finally {
      setTriggering(false);
    }
  };

  return {
    logs,
    totalCount,
    pageIndex,
    setPageIndex,
    pageSize,
    setPageSize,
    search,
    setSearch,
    logLevel,
    setLogLevel,
    exceptionType,
    setExceptionType,
    loading,
    error,
    refresh: fetchLogs,
    triggerTestError,
    triggering,
    triggerSuccess,
  };
}
