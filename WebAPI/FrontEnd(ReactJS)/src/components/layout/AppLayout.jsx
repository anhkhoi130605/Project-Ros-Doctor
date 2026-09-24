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
    ['/dashboard', 'Tổng quan', 'grid', ['Admin', 'Engineering', 'User']],
    ['/bags', 'Bản ghi ROSBag', 'hard-drive', ['Admin', 'Engineering', 'User']],
    ['/reports', 'Báo cáo chẩn đoán', 'file-text', ['Admin', 'Engineering', 'User']],
    ['/chat', 'Hỏi đáp AI', 'message-square', ['Engineering']],
    ['/benchmark', 'Bộ dữ liệu & Benchmark', 'database', ['Engineering']],
    ['/admin', 'Quản trị hệ thống', 'shield', ['Admin']],
    ['/settings', 'Cài đặt', 'settings', ['Admin']],
    ['/usage', 'Chi phí & Thời gian', 'clock', ['Admin', 'Engineering']],
  ];

  const currentRole = (state.role || 'Engineering').toLowerCase();
  const filteredNav = navItems.filter(([, , , roles]) =>
    roles.some((r) => r.toLowerCase() === currentRole)
  );

  const getPageTitle = (pathname) => {
    if (pathname.startsWith('/dashboard')) return 'Tổng quan';
    if (pathname.startsWith('/bags')) return 'Bản ghi ROSBag';
    if (pathname.startsWith('/reports')) return 'Báo cáo chẩn đoán';
    if (pathname.startsWith('/reviews')) return 'Kết luận cần duyệt';
    if (pathname.startsWith('/chat')) return 'Hỏi đáp AI';
    if (pathname.startsWith('/benchmark')) return 'Benchmark';
    if (pathname === '/admin/ai-config') return 'Cấu hình AI';
    if (pathname === '/admin/cost') return 'Chi phí & hiệu suất';
    if (pathname === '/admin/analysis-config') return 'Cấu hình phân tích';
    if (pathname === '/admin/members') return 'Tài khoản & quyền';
    if (pathname === '/admin/system-logs') return 'Nhật ký hệ thống';
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

        <nav>
          {filteredNav.map(([to, label, icon]) => {
            const isAdminRoute = to === '/admin';
            const isSettingsRoute = to === '/settings';

            const configPaths = ['/admin/ai-config', '/admin/analysis-config', '/admin/cost', '/settings/ai-config', '/settings/analysis-config', '/settings/cost'];
            const isCurrentConfigPath = configPaths.includes(location.pathname);
            const isCurrentAdminPath = location.pathname.startsWith('/admin') && !isCurrentConfigPath;
            const isCurrentSettingsPath = (location.pathname.startsWith('/settings') || isCurrentConfigPath);

            if (isAdminRoute) {
              return (
                <div
                  key={to}
                  className={`nav-item-wrapper ${isCurrentAdminPath ? 'is-active-route' : ''}`}
                >
                  <NavLink
                    to={to}
                    end={false}
                    className={({ isActive }) =>
                      `nav-item ${isActive && !isCurrentConfigPath ? 'active' : ''}`
                    }
                    onClick={() => setMobileNavOpen(false)}
                  >
                    <Icon name={icon} size={18} />
                    <span>{label}</span>
                    <Icon name="down" size={14} className="nav-chevron" />
                  </NavLink>

                  <div className={`sub-nav-group ${isCurrentAdminPath ? 'open' : ''}`}>
                    <NavLink
                      to="/admin/members"
                      className={({ isActive }) => `sub-nav-item ${isActive || location.pathname === '/admin' ? 'active' : ''}`}
                      onClick={() => setMobileNavOpen(false)}
                    >
                      <Icon name="users" size={14} />
                      <span>Tài khoản & quyền</span>
                    </NavLink>
                    <NavLink
                      to="/admin/system-logs"
                      className={({ isActive }) => `sub-nav-item ${isActive ? 'active' : ''}`}
                      onClick={() => setMobileNavOpen(false)}
                    >
                      <Icon name="clock" size={14} />
                      <span>Nhật ký hệ thống</span>
                    </NavLink>
                    <NavLink
                      to="/admin/user-activity"
                      className={({ isActive }) => `sub-nav-item ${isActive ? 'active' : ''}`}
                      onClick={() => setMobileNavOpen(false)}
                    >
                      <Icon name="file-text" size={14} />
                      <span>Lịch sử người dùng</span>
                    </NavLink>
                    <NavLink
                      to="/admin/activity"
                      className={({ isActive }) => `sub-nav-item ${isActive ? 'active' : ''}`}
                      onClick={() => setMobileNavOpen(false)}
                    >
                      <Icon name="activity" size={14} />
                      <span>Hoạt động gần đây</span>
                    </NavLink>
                    <div style={{ borderTop: '1px solid var(--border)', margin: '6px 0 2px' }} />
                    <NavLink
                      to="/"
                      className="sub-nav-item"
                      onClick={() => setMobileNavOpen(false)}
                    >
                      <Icon name="external-link" size={14} />
                      <span>Trang giới thiệu</span>
                    </NavLink>
                  </div>
                </div>
              );
            }

            if (isSettingsRoute) {
              return (
                <div
                  key={to}
                  className={`nav-item-wrapper ${isCurrentSettingsPath ? 'is-active-route' : ''}`}
                >
                  <NavLink
                    to={to}
                    end={false}
                    className={({ isActive }) =>
                      `nav-item ${isActive || isCurrentSettingsPath ? 'active' : ''}`
                    }
                    onClick={() => setMobileNavOpen(false)}
                  >
                    <Icon name={icon} size={18} />
                    <span>{label}</span>
                    <Icon name="down" size={14} className="nav-chevron" />
                  </NavLink>

                  <div className={`sub-nav-group ${isCurrentSettingsPath ? 'open' : ''}`}>
                    <NavLink
                      to="/admin/ai-config"
                      className={({ isActive }) => `sub-nav-item ${isActive || location.pathname === '/settings/ai-config' ? 'active' : ''}`}
                      onClick={() => setMobileNavOpen(false)}
                    >
                      <Icon name="cpu" size={14} />
                      <span>Cấu hình AI</span>
                    </NavLink>
                    <NavLink
                      to="/admin/analysis-config"
                      className={({ isActive }) => `sub-nav-item ${isActive || location.pathname === '/settings/analysis-config' ? 'active' : ''}`}
                      onClick={() => setMobileNavOpen(false)}
                    >
                      <Icon name="sliders" size={14} />
                      <span>Cấu hình phân tích</span>
                    </NavLink>
                    <NavLink
                      to="/admin/cost"
                      className={({ isActive }) => `sub-nav-item ${isActive || location.pathname === '/settings/cost' ? 'active' : ''}`}
                      onClick={() => setMobileNavOpen(false)}
                    >
                      <Icon name="trending-up" size={14} />
                      <span>Chi phí & hiệu suất</span>
                    </NavLink>
                    <NavLink
                      to="/settings"
                      className={({ isActive }) => `sub-nav-item ${isActive && location.pathname === '/settings' ? 'active' : ''}`}
                      onClick={() => setMobileNavOpen(false)}
                    >
                      <Icon name="settings" size={14} />
                      <span>Cài đặt hệ thống</span>
                    </NavLink>
                  </div>
                </div>
              );
            }

            return (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setMobileNavOpen(false)}
              >
                <Icon name={icon} size={18} />
                <span>{label}</span>
              </NavLink>
            );
          })}
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
