import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function DataConnectionState({ status, error, retry }) {
  const { i18n } = useTranslation();
  const en = i18n.language.startsWith('en');
  const loading = status === 'loading';
  const unauthorized = error?.status === 401;
  const forbidden = error?.status === 403;
  const title = loading
    ? (en ? 'Loading data…' : 'Đang tải dữ liệu…')
    : unauthorized ? (en ? 'Please sign in again' : 'Vui lòng đăng nhập lại')
    : forbidden ? (en ? 'Access denied' : 'Bạn không có quyền truy cập dữ liệu này')
    : error?.status ? (en ? 'Unable to load data' : 'Không thể tải dữ liệu')
    : (en ? 'Cannot connect to the server' : 'Không thể kết nối máy chủ');
  return (
    <section role={loading ? 'status' : 'alert'} aria-live="polite" aria-busy={loading}
      style={{ padding: '64px 24px', textAlign: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}>
      <h2 style={{ fontSize: 22, marginBottom: 12 }}>{title}</h2>
      <p style={{ color: '#64748b', marginBottom: 24 }}>
        {loading ? (en ? 'Please wait while the latest data is loaded.' : 'Vui lòng chờ hệ thống tải dữ liệu mới nhất.')
          : (en ? 'Data is hidden until it can be loaded successfully.' : 'Dữ liệu sẽ hiển thị khi tải thành công. Vui lòng thử lại.')}
      </p>
      {!loading && (unauthorized
        ? <Link className="button primary" to="/login">{en ? 'Sign in' : 'Đăng nhập'}</Link>
        : <button className="button primary" type="button" onClick={retry}>{en ? 'Try again' : 'Thử lại'}</button>)}
    </section>
  );
}
