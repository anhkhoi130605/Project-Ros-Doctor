import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../stored/appStore';
import { Logo, Button, Badge, Icon } from '../common/UIComponents';
import { ROLE_NAMES } from '../../domain/appTypes';

function getUserInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function AppLayout() {
  const { state, dispatch, notify } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

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

        {/* Sidebar Footer Account Badge Button at Bottom-Left */}
        <div
          className="sidebar-footer"
          style={{
            marginTop: 'auto',
            paddingTop: '16px',
            borderTop: '1px solid var(--border, #cbd5e1)',
            position: 'relative',
          }}
        >
          <button
            type="button"
            aria-label="Menu tài khoản"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '10px 12px',
              borderRadius: '10px',
              background: userMenuOpen ? '#f1f5f9' : 'transparent',
              border: '1px solid #cbd5e1',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: '#1c5c43',
                color: '#ffffff',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 700,
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              {getUserInitials(state.profile?.name || state.role)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong
                style={{
                  fontSize: 13,
                  display: 'block',
                  color: '#0f172a',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {state.profile?.name || ROLE_NAMES[state.role] || state.role}
              </strong>
              <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>
                {ROLE_NAMES[state.role] || state.role}
              </span>
            </div>
            <Icon
              name="chevron"
              size={14}
              style={{
                transform: userMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
                color: '#64748b',
              }}
            />
          </button>

          {/* Popover Menu with 2 buttons */}
          {userMenuOpen && (
            <div
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 8px)',
                left: 0,
                right: 0,
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 10,
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12)',
                padding: '6px',
                zIndex: 100,
                display: 'grid',
                gap: '4px',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false);
                  setShowProfileModal(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 6,
                  background: 'none',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                <Icon name="user" size={16} />
                <span>Thông tin cá nhân</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false);
                  handleLogout();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 6,
                  background: 'none',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#ef4444',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                <Icon name="logout" size={16} />
                <span>Đăng xuất</span>
              </button>
            </div>
          )}
        </div>
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

      {/* Profile Modal Dialog excluding User ID */}
      {showProfileModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setShowProfileModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              width: '100%',
              maxWidth: '460px',
              borderRadius: '14px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
              display: 'grid',
              gap: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                👤 Thông tin cá nhân
              </h3>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: '#1c5c43',
                  color: '#ffffff',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 700,
                  fontSize: 20,
                  flexShrink: 0,
                }}
              >
                {getUserInitials(state.profile?.name || state.role)}
              </div>
              <div style={{ minWidth: 0 }}>
                <strong style={{ fontSize: '16px', color: '#0f172a', display: 'block' }}>
                  {state.profile?.name || ROLE_NAMES[state.role] || state.role}
                </strong>
                <span style={{ fontSize: '12px', color: '#64748b', wordBreak: 'break-all' }}>
                  {state.profile?.email || `${(state.role || 'user').toLowerCase()}@ros2doctor.local`}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Họ & Tên</span>
                <strong style={{ color: '#0f172a' }}>{state.profile?.name || ROLE_NAMES[state.role] || state.role}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Email</span>
                <strong style={{ color: '#0f172a' }}>{state.profile?.email || `${(state.role || 'user').toLowerCase()}@ros2doctor.local`}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Vai trò / Phân quyền</span>
                <span className="badge green" style={{ fontSize: '11px' }}>
                  <i /> {ROLE_NAMES[state.role] || state.role}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Không gian làm việc</span>
                <strong style={{ color: '#0f172a' }}>{state.profile?.workspace || 'Robotics Lab / RAV-13'}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Trạng thái tài khoản</span>
                <span style={{ color: '#16a34a', fontWeight: 700 }}>● Đang hoạt động (Online)</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Giới hạn AI Requests</span>
                <strong style={{ color: '#0f172a' }}>{state.aiSettings?.dailyRequests || 100} requests / ngày</strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button
                type="button"
                className="button primary"
                onClick={() => setShowProfileModal(false)}
                style={{ minHeight: '38px', padding: '0 24px' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
