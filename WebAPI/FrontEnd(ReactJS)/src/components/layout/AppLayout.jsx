import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../stored/appStore';
import { Logo, Button, Badge, Icon } from '../common/UIComponents';
import { ROLE_NAMES } from '../../domain/appTypes';

export default function AppLayout() {
  const { state, dispatch, notify } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleLogout = () => {
    dispatch({ type: 'LOGOUT' });
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userRole');
    notify('Đã đăng xuất khỏi hệ thống.', 'info');
    navigate('/login');
  };

  const navItems = [
    ['/dashboard', 'Tổng quan', 'grid', ['admin', 'engineer', 'viewer']],
    ['/bags', 'Bản ghi ROSBag', 'hard-drive', ['admin', 'engineer', 'viewer']],
    ['/reports', 'Báo cáo chẩn đoán', 'file-text', ['admin', 'engineer', 'viewer']],
    ['/chat', 'Hỏi đáp AI', 'message-square', ['engineer']],
    ['/benchmark', 'Bộ dữ liệu & Benchmark', 'database', ['engineer']],
    ['/admin', 'Quản trị hệ thống', 'shield', ['admin']],
    ['/settings', 'Cài đặt', 'settings', ['admin']],
    ['/usage', 'Chi phí & Thời gian', 'clock', ['admin', 'engineer']],
  ];

  const filteredNav = navItems.filter(([, , , roles]) => roles.includes(state.role || 'engineer'));

  const getPageTitle = (pathname) => {
    if (pathname.startsWith('/dashboard')) return 'Tổng quan';
    if (pathname.startsWith('/bags')) return 'Bản ghi ROSBag';
    if (pathname.startsWith('/reports')) return 'Báo cáo chẩn đoán';
    if (pathname.startsWith('/reviews')) return 'Kết luận cần duyệt';
    if (pathname.startsWith('/chat')) return 'Hỏi đáp AI';
    if (pathname.startsWith('/benchmark')) return 'Benchmark';
    if (pathname.startsWith('/admin')) return 'Quản trị hệ thống';
    if (pathname.startsWith('/settings')) return 'Cài đặt';
    if (pathname.startsWith('/usage')) return 'Chi phí & Thời gian';
    return 'Không gian làm việc';
  };

  const currentPageTitle = getPageTitle(location.pathname);

  return (
    <div className="app-shell">
      {mobileNavOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Đóng menu điều hướng"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <aside className={`sidebar ${mobileNavOpen ? 'open' : ''}`} aria-label="Điều hướng ứng dụng">
        <NavLink to="/dashboard" className="brand-link" aria-label="CTRN SHIFT N, trang chủ">
          <Logo />
        </NavLink>

        <button
          className="mobile-close icon-button"
          aria-label="Đóng menu"
          onClick={() => setMobileNavOpen(false)}
        >
          <Icon name="close" />
        </button>

        <div className="workspace-label">KHÔNG GIAN LÀM VIỆC</div>
        <div className="workspace-card">
          <span className="workspace-avatar">R</span>
          <span>
            <strong>{state.profile?.workspace || 'AGV-Lab'}</strong>
            <small>RAV-13 / Nghiên cứu ROS2</small>
          </span>
        </div>

        <div className="workspace-label">ĐIỀU HƯỚNG</div>
        <nav>
          {filteredNav.map(([to, label, icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/admin'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMobileNavOpen(false)}
            >
              <Icon name={icon} size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="workspace-main">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            aria-label="Mở menu điều hướng"
            onClick={() => setMobileNavOpen(true)}
          >
            <Icon name="menu" />
          </button>

          <div className="breadcrumbs">
            <span>Workspace</span>
            <Icon name="chevron" size={14} />
            <strong>{currentPageTitle}</strong>
          </div>

          <div className="topbar-actions">
            <span className="demo-tag">
              <Badge tone="blue">DEMO</Badge>
            </span>
            <span className="header-role">
              {ROLE_NAMES[state.role] || state.role || 'Kỹ sư Robotics'}
            </span>
            <Button variant="ghost" icon="logout" onClick={handleLogout}>
              Đăng xuất
            </Button>
          </div>
        </header>

        <main id="main-content" className="page-content" tabIndex={-1}>
          <Outlet />
        </main>

        <footer className="app-footer">
          <span>CTRN SHIFT N / RAV-13</span>
          <span>AI đề xuất · Kỹ sư quyết định</span>
        </footer>
      </div>
    </div>
  );
}
