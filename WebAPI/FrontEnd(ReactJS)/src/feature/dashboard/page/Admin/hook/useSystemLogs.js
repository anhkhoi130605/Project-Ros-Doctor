import { useEffect, useState, useCallback } from 'react';
import { fetchSystemLogsApi, triggerTestErrorApi } from '../../../api/dashboardApi';

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
    try {
      setLoading(true);
      setError(null);

      const data = await fetchSystemLogsApi({
        search,
        logLevel,
        exceptionType,
        pageIndex,
        pageSize,
      });

      setLogs(data.items || []);
      setTotalCount(data.totalCount || 0);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách nhật ký hệ thống');
    } finally {
      setLoading(false);
    }
  }, [search, logLevel, exceptionType, pageIndex, pageSize]);

  useEffect(() => {
    const controller = new AbortController();
    const delay = search ? 350 : 0;

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchSystemLogsApi(
          {
            search,
            logLevel,
            exceptionType,
            pageIndex,
            pageSize,
          },
          { signal: controller.signal }
        );

        if (!controller.signal.aborted) {
          setLogs(data.items || []);
          setTotalCount(data.totalCount || 0);
        }
      } catch (err) {
        if (err.name === 'AbortError' || controller.signal.aborted) return;
        setError(err.message || 'Không thể tải danh sách nhật ký hệ thống');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, delay);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, logLevel, exceptionType, pageIndex, pageSize]);

  const triggerTestError = async (type, customMessage) => {
    try {
      setTriggering(true);
      setTriggerSuccess(null);

      await triggerTestErrorApi({ errorType: type, message: customMessage });

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
