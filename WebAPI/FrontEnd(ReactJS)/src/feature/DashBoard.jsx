import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './dashboard.css';

const activity = [
  { initials: 'PA', name: 'Phạm Hoàng Anh Khôi', action: 'vừa tạo tài khoản', time: '2 phút trước', tone: 'green' },
  { initials: 'MN', name: 'Mai Ngọc Anh', action: 'đăng nhập hệ thống', time: '18 phút trước', tone: 'blue' },
  { initials: 'TL', name: 'Trần Linh Chi', action: 'cập nhật hồ sơ', time: '42 phút trước', tone: 'orange' },
  { initials: 'DV', name: 'Đỗ Việt Hoàng', action: 'đăng nhập hệ thống', time: '1 giờ trước', tone: 'purple' },
];

const stats = [
  { label: 'Tổng thành viên', value: '1,284', change: '+12.8%', detail: 'so với tháng trước', tone: 'green' },
  { label: 'Đang hoạt động', value: '964', change: '+8.4%', detail: 'trong 30 ngày qua', tone: 'blue' },
  { label: 'Tài khoản mới', value: '86', change: '+18.2%', detail: 'trong tháng này', tone: 'orange' },
  { label: 'Tỷ lệ duy trì', value: '92.6%', change: '+3.1%', detail: 'so với tháng trước', tone: 'purple' },
];

export default function DashboardPage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  function handleLogout() {
    localStorage.removeItem('accessToken');
    navigate('/login', { replace: true });
  }

  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand"><span>CSN</span><small>ADMIN CONSOLE</small></div>
        <nav className="dashboard-nav" aria-label="Dashboard navigation">
          <a className="dashboard-nav-item active" href="#overview"><span className="nav-icon">◈</span>Tổng quan</a>
          <a className="dashboard-nav-item" href="#members"><span className="nav-icon">◎</span>Thành viên</a>
          <a className="dashboard-nav-item" href="#activity"><span className="nav-icon">◷</span>Hoạt động</a>
          <a className="dashboard-nav-item" href="#settings"><span className="nav-icon">⚙</span>Cài đặt</a>
        </nav>
        <div className="sidebar-footer">
          <div className="admin-profile"><div className="admin-avatar">AD</div><div><strong>Admin</strong><span>Quản trị viên</span></div></div>
          <button className="logout-button" type="button" onClick={handleLogout}><span>↪</span>Đăng xuất</button>
        </div>
      </aside>

      <section className="dashboard-content" id="overview">
        <header className="dashboard-header">
          <div><p className="dashboard-kicker">Wednesday, 16 September 2026</p><h1>Chào buổi sáng, Admin.</h1><p className="dashboard-subtitle">Đây là những gì đang diễn ra trong hệ thống hôm nay.</p></div>
          <div className="header-actions"><button className="icon-button" type="button" aria-label="Thông báo">♢<span className="notification-dot" /></button><button className="header-avatar" type="button">AD</button></div>
        </header>

        <div className="stats-grid">
          {stats.map((stat) => <article className={`stat-card ${stat.tone}`} key={stat.label}><div className="stat-topline"><span>{stat.label}</span><span className="stat-mark">↗</span></div><strong>{stat.value}</strong><p><b>{stat.change}</b> {stat.detail}</p></article>)}
        </div>

        <div className="dashboard-grid">
          <section className="dashboard-panel activity-panel" id="activity">
            <div className="panel-heading"><div><p className="panel-kicker">Live feed</p><h2>Hoạt động gần đây</h2></div><button className="panel-link" type="button">Xem tất cả ↗</button></div>
            <div className="activity-list">{activity.map((item) => <div className="activity-row" key={item.name}><div className={`activity-avatar ${item.tone}`}>{item.initials}</div><div className="activity-copy"><strong>{item.name}</strong><span>{item.action}</span></div><time>{item.time}</time></div>)}</div>
          </section>

          <section className="dashboard-panel status-panel">
            <div className="panel-heading"><div><p className="panel-kicker">System health</p><h2>Trạng thái hệ thống</h2></div><span className="status-badge"><i />Ổn định</span></div>
            <div className="health-score"><strong>98.4</strong><span>/ 100</span></div>
            <div className="health-bar"><span /></div>
            <div className="health-meta"><span>API response time</span><strong>124ms</strong></div><div className="health-meta"><span>Uptime tháng này</span><strong>99.98%</strong></div><div className="health-meta"><span>Database</span><strong className="healthy">Connected</strong></div>
          </section>
        </div>

        <section className="quick-section" id="members"><div className="panel-heading"><div><p className="panel-kicker">Quick actions</p><h2>Tác vụ nhanh</h2></div></div><div className="quick-grid"><button type="button"><span>＋</span><strong>Thêm thành viên</strong><small>Tạo tài khoản mới</small></button><button type="button"><span>▤</span><strong>Xem báo cáo</strong><small>Phân tích dữ liệu</small></button><button type="button"><span>→</span><strong>Xuất dữ liệu</strong><small>Tải xuống CSV</small></button></div></section>
      </section>
    </main>
  );
}
