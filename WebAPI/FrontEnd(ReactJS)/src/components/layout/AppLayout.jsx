import React, { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../stored/appStore';
import { Logo, Button, Badge, Icon } from '../common/UIComponents';
import LanguageSwitcher from '../common/LanguageSwitcher';
import { ROLE_NAMES } from '../../domain/appTypes';
import robotHeroImg from '../../assets/robot-hero.jpg';
import SmoothReveal from '../common/SmoothReveal';
import { apiClient, profileService } from '../../service';
import useWorkspaceData from './useWorkspaceData';
import DataConnectionState from '../common/DataConnectionState';
import HeaderMessengerDropdown from './HeaderMessengerDropdown';
import HeaderNotificationDropdown from './HeaderNotificationDropdown';
import './SidebarAutohide.css';

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
  const { t, i18n } = useTranslation(['common', 'navigation']);
  const navigate = useNavigate();
  const location = useLocation();
  const connection = useWorkspaceData(`${location.pathname}:${localStorage.getItem('accessToken') || ''}`, dispatch);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const isCostPath = ['/usage', '/admin/cost', '/settings/cost'].includes(location.pathname);
  const [costMenuOpen, setCostMenuOpen] = useState(isCostPath);

  useEffect(() => {
    setCostMenuOpen(isCostPath);
  }, [location.pathname, isCostPath]);

  const [avatarLoadError, setAvatarLoadError] = useState(false);

  // Tự động đồng bộ thông tin hồ sơ và ảnh đại diện từ backend khi vào ứng dụng
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    let isMounted = true;
    profileService.getMyProfile()
      .then((data) => {
        if (!isMounted || !data) return;
        setAvatarLoadError(false);
        dispatch({
          type: 'UPDATE_PROFILE',
          profile: {
            name: data.fullName || state.profile?.name,
            email: data.email || state.profile?.email,
            phone: data.phone ?? state.profile?.phone,
            bio: data.bio ?? state.profile?.bio,
            avatarUrl: data.avatarUrl ?? '',
          },
        });
      })
      .catch((err) => {
        console.warn('Could not load profile on layout mount:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [dispatch]);

  const [isPinned, setIsPinned] = useState(() => {
    return localStorage.getItem('sidebar_pinned') === 'true';
  });
  const [isHovered, setIsHovered] = useState(false);
  const leaveTimeoutRef = useRef(null);

  // Cleanup timeout on unmount to prevent memory leak and state update on unmounted component
  useEffect(() => {
    return () => {
      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current);
      }
    };
  }, []);

  const handleSidebarMouseEnter = () => {
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    setIsHovered(true);
  };

  const handleSidebarMouseLeave = () => {
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    leaveTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 220);
  };

  const togglePin = () => {
    setIsPinned((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar_pinned', String(next));
      return next;
    });
  };

  const closeNavIfAuto = () => {
    setMobileNavOpen(false);
    if (!isPinned) {
      setIsHovered(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiClient.post('/api/auth/logout');
    } catch (error) {
      console.warn('Could not record logout activity:', error);
    } finally {
      dispatch({ type: 'LOGOUT' });
      localStorage.removeItem('accessToken');
      localStorage.removeItem('userRole');
      notify(t('common:system.logoutSuccess'), 'info');
      navigate('/login');
    }
  };

  const rawRole = String(state.role || localStorage.getItem('userRole') || 'Engineering').toLowerCase();
  const currentRole = rawRole.includes('admin')
    ? 'admin'
    : rawRole.includes('user')
    ? 'user'
    : 'engineering';
  const isUserRole = currentRole === 'user';
  const currentRoleLabel = currentRole === 'admin'
    ? t('common:roles.admin')
    : currentRole === 'user'
    ? t('common:roles.user')
    : t('common:roles.engineering');

  const pendingReviewsCount = connection.status === 'ready' ? (state.findings || []).filter(
    (f) => (f.review?.status || f.status || 'pending') === 'pending'
  ).length : 0;

  const navItems = [
    ['/dashboard', t('navigation:items.dashboard'), 'grid', ['Admin', 'Engineering', 'User']],
    ['/bags', isUserRole ? t('navigation:items.sharedBags') : t('navigation:items.bags'), 'database', ['Admin', 'Engineering', 'User']],
    ['/bag-submissions', t(isUserRole ? 'navigation:items.mySubmissions' : 'navigation:items.submissions'), 'upload', ['Admin', 'Engineering', 'User']],
    ['/analysis', t('navigation:items.analysis'), 'activity', ['Engineering']],
    ['/chat', t('navigation:items.chat'), 'message-square', ['Engineering']],
    ['/reviews', t('navigation:items.reviews'), 'file-text', ['Engineering'], pendingReviewsCount > 0 ? pendingReviewsCount : undefined],
    ['/reports', isUserRole ? t('navigation:items.approvedReports') : t('navigation:items.reports'), 'file-text', ['Admin', 'Engineering', 'User']],
    ['/benchmark', t('navigation:items.benchmark'), 'trending-up', ['Engineering']],
    ['/usage', t('navigation:items.usage'), 'clock', ['Engineering']],
    ['/admin', t('navigation:items.admin'), 'shield', ['Admin']],
    ['/settings', t('navigation:items.settings'), 'settings', ['Admin']],
  ];
  const filteredNav = navItems.filter(([, , , roles]) =>
    roles.some((r) => {
      const rLower = r.toLowerCase();
      if (currentRole === 'admin') return true; // Admin có thể xem tất cả hoặc các tab admin
      if (currentRole === 'engineering') return rLower.includes('engineer') || rLower.includes('user');
      if (currentRole === 'user') return rLower.includes('user');
      return false;
    })
  );
  const rosbagChildPaths = ['/bags', '/bag-submissions', '/analysis', '/reviews', '/reports', '/benchmark'];
  const rosbagChildren = filteredNav.filter(([to]) => rosbagChildPaths.includes(to));

  const getPageTitle = (pathname) => {
    if (pathname.startsWith('/bag-submissions')) return t(isUserRole ? 'navigation:items.mySubmissions' : 'navigation:items.submissions');
    if (pathname.startsWith('/dashboard')) return t('navigation:pageTitles.dashboard');
    if (pathname.startsWith('/bags')) return t('navigation:pageTitles.bags');
    if (pathname.startsWith('/analysis')) return t('navigation:pageTitles.analysis');
    if (pathname.startsWith('/sessions')) return t('navigation:pageTitles.sessions');
    if (pathname.startsWith('/reports')) return t('navigation:pageTitles.reports');
    if (pathname.startsWith('/reviews')) return t('navigation:pageTitles.reviews');
    if (pathname.startsWith('/chat')) return t('navigation:pageTitles.chat');
    if (pathname.startsWith('/benchmark')) return t('navigation:pageTitles.benchmark');
    if (pathname.startsWith('/usage')) return t('navigation:cost.sessions');
    if (pathname === '/admin/ai-config') return t('navigation:pageTitles.aiConfig');
    if (pathname === '/admin/cost' || pathname === '/settings/cost') return t('navigation:cost.model');
    if (pathname === '/admin/analysis-config') return t('navigation:pageTitles.analysisConfig');
    if (pathname === '/admin/members') return t('navigation:pageTitles.members');
    if (pathname === '/admin/system-logs') return t('navigation:pageTitles.systemLogs');
    if (pathname.startsWith('/admin')) return t('navigation:pageTitles.admin');
    if (pathname.startsWith('/settings')) return t('navigation:pageTitles.settings');
    return t('navigation:pageTitles.workspace');
  };

  const currentPageTitle = getPageTitle(location.pathname);

  return (
    <div className={`app-shell ${isPinned ? 'sidebar-pinned' : ''} ${isHovered ? 'sidebar-is-hovered' : ''}`}>
      {mobileNavOpen && (
        <button
          className="sidebar-backdrop"
          aria-label={t('common:aria.closeNavigation')}
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <aside
        className={`sidebar ${mobileNavOpen ? 'open' : ''} ${isHovered ? 'is-hovered' : ''} ${isPinned ? 'is-pinned' : ''}`}
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
        aria-label={t('common:aria.applicationNavigation')}
      >
        <div className="sidebar-header-row">
          <NavLink
            to="/"
            className="brand-link"
            aria-label={t('common:aria.home')}
            onClick={closeNavIfAuto}
          >
            <Logo compact={!isHovered && !isPinned} />
          </NavLink>

          <button
            type="button"
            className={`sidebar-pin-btn ${isPinned ? 'active' : ''}`}
            onClick={togglePin}
            title={isPinned ? t('common:pin.unpinTitle') : t('common:pin.pinTitle')}
            aria-label={isPinned ? t('common:pin.unpin') : t('common:pin.pin')}
          >
            <Icon name={isPinned ? 'pin' : 'pin-off'} size={15} />
          </button>

          <button
            className="mobile-close icon-button"
            aria-label={t('common:aria.closeMenu')}
            onClick={() => setMobileNavOpen(false)}
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="workspace-label">{t('navigation:sections.workspace')}</div>
        <div className="workspace-card">
          <span className="workspace-avatar">R</span>
          <span className="workspace-card-details">
            <strong>{state.profile?.workspace || 'Robotics Lab'}</strong>
            <small>{t('common:workspace.research')}</small>
          </span>
        </div>

        <div className="workspace-label" style={{ marginTop: '12px' }}>{t('navigation:sections.navigation')}</div>
        <nav>
          {filteredNav.map(([to, label, icon, roles, badgeCount]) => {
            if (to !== '/bags' && rosbagChildPaths.includes(to)) return null;
            const isRosbagRoute = to === '/bags';
            const isAdminRoute = to === '/admin';
            const isSettingsRoute = to === '/settings';
            const isBagsActiveRoute = to === '/bags' && (
              location.pathname.startsWith('/bags') ||
              location.pathname.startsWith('/sessions') ||
              location.pathname.startsWith('/upload')
            );
            const isAnalysisActiveRoute = to === '/analysis' && location.pathname.startsWith('/analysis');

            const configPaths = ['/admin/ai-config', '/admin/analysis-config', '/settings/ai-config', '/settings/analysis-config'];
            const isCurrentConfigPath = configPaths.includes(location.pathname);
            const isCurrentAdminPath = location.pathname.startsWith('/admin') && !isCurrentConfigPath && !isCostPath;
            const isCurrentSettingsPath = (location.pathname.startsWith('/settings') || isCurrentConfigPath) && !isCostPath;

            if (to === '/usage') {
              return (
                <div key={to} className={`nav-item-wrapper cost-nav-group ${isCostPath ? 'is-active-route' : ''}`}>
                  <button
                    type="button"
                    className={`nav-item cost-nav-toggle ${isCostPath ? 'active' : ''}`}
                    aria-expanded={costMenuOpen}
                    aria-controls="cost-navigation"
                    onClick={() => setCostMenuOpen((open) => !open)}
                  >
                    <Icon name={icon} size={18} />
                    <span className="nav-item-label">{label}</span>
                    <Icon name="down" size={14} className="nav-chevron" />
                  </button>
                  <div id="cost-navigation" className={`sub-nav-group ${costMenuOpen ? 'open' : ''}`} hidden={!costMenuOpen}>
                    {currentRole === 'admin' && (
                      <NavLink
                        to="/admin/cost"
                        className={({ isActive }) => `sub-nav-item ${isActive || location.pathname === '/settings/cost' ? 'active' : ''}`}
                        onClick={closeNavIfAuto}
                      >
                        <Icon name="cpu" size={14} />
                        <span>{t('navigation:cost.model')}</span>
                      </NavLink>
                    )}
                    <NavLink
                      to="/usage"
                      className={({ isActive }) => `sub-nav-item ${isActive ? 'active' : ''}`}
                      onClick={closeNavIfAuto}
                    >
                      <Icon name="clock" size={14} />
                      <span>{t('navigation:cost.sessions')}</span>
                    </NavLink>
                  </div>
                </div>
              );
            }

            if (isRosbagRoute) {
              const isCurrentRosbagPath = rosbagChildPaths.some((path) =>
                location.pathname === path || location.pathname.startsWith(`${path}/`)
              ) || location.pathname.startsWith('/sessions') || location.pathname.startsWith('/upload');

              return (
                <div key={to} className={`nav-item-wrapper ${isCurrentRosbagPath ? 'is-active-route' : ''}`}>
                  <NavLink
                    to="/bags"
                    className={`nav-item ${isCurrentRosbagPath ? 'active' : ''}`}
                    onClick={closeNavIfAuto}
                  >
                    <Icon name={icon} size={18} />
                    <span className="nav-item-label">{t('navigation:items.rosbagGroup')}</span>
                    <Icon name="down" size={14} className="nav-chevron" />
                  </NavLink>

                  <div className={`sub-nav-group ${isCurrentRosbagPath ? 'open' : ''}`}>
                    {rosbagChildren.map(([childTo, childLabel, childIcon, , childBadgeCount]) => {
                      const isBagsChild = childTo === '/bags';
                      const isChildActive = isBagsChild && (
                        location.pathname.startsWith('/sessions') || location.pathname.startsWith('/upload')
                      );

                      return (
                        <NavLink
                          key={childTo}
                          to={childTo}
                          className={({ isActive }) => `sub-nav-item ${isActive || isChildActive ? 'active' : ''}`}
                          onClick={closeNavIfAuto}
                        >
                          <Icon name={childIcon} size={14} />
                          <span>{childLabel}</span>
                          {childBadgeCount !== undefined && <span className="sub-nav-badge">{childBadgeCount}</span>}
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              );
            }

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
                      `nav-item ${isActive && !isCurrentConfigPath && !isCostPath ? 'active' : ''}`
                    }
                    onClick={closeNavIfAuto}
                  >
                    <Icon name={icon} size={18} />
                    <span className="nav-item-label">{label}</span>
                    <Icon name="down" size={14} className="nav-chevron" />
                  </NavLink>

                  <div className={`sub-nav-group ${isCurrentAdminPath ? 'open' : ''}`}>
                    <NavLink
                      to="/admin/members"
                      className={({ isActive }) => `sub-nav-item ${isActive || location.pathname === '/admin' ? 'active' : ''}`}
                      onClick={closeNavIfAuto}
                    >
                      <Icon name="users" size={14} />
                      <span>{t('navigation:admin.members')}</span>
                    </NavLink>
                    <NavLink
                      to="/admin/system-logs"
                      className={({ isActive }) => `sub-nav-item ${isActive ? 'active' : ''}`}
                      onClick={closeNavIfAuto}
                    >
                      <Icon name="clock" size={14} />
                      <span>{t('navigation:admin.systemLogs')}</span>
                    </NavLink>
                    <NavLink
                      to="/admin/user-activity"
                      className={({ isActive }) => `sub-nav-item ${isActive ? 'active' : ''}`}
                      onClick={closeNavIfAuto}
                    >
                      <Icon name="file-text" size={14} />
                      <span>{t('navigation:admin.userActivity')}</span>
                    </NavLink>
                    <NavLink
                      to="/admin/activity"
                      className={({ isActive }) => `sub-nav-item ${isActive ? 'active' : ''}`}
                      onClick={closeNavIfAuto}
                    >
                      <Icon name="activity" size={14} />
                      <span>{t('navigation:admin.recentActivity')}</span>
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
                      `nav-item ${(isActive || isCurrentSettingsPath) && !isCostPath ? 'active' : ''}`
                    }
                    onClick={closeNavIfAuto}
                  >
                    <Icon name={icon} size={18} />
                    <span className="nav-item-label">{label}</span>
                    <Icon name="down" size={14} className="nav-chevron" />
                  </NavLink>

                  <div className={`sub-nav-group ${isCurrentSettingsPath ? 'open' : ''}`}>
                    <NavLink
                      to="/admin/ai-config"
                      className={({ isActive }) => `sub-nav-item ${isActive || location.pathname === '/settings/ai-config' ? 'active' : ''}`}
                      onClick={closeNavIfAuto}
                    >
                      <Icon name="cpu" size={14} />
                      <span>{t('navigation:settings.ai')}</span>
                    </NavLink>
                    <NavLink
                      to="/admin/analysis-config"
                      className={({ isActive }) => `sub-nav-item ${isActive || location.pathname === '/settings/analysis-config' ? 'active' : ''}`}
                      onClick={closeNavIfAuto}
                    >
                      <Icon name="sliders" size={14} />
                      <span>{t('navigation:settings.analysis')}</span>
                    </NavLink>
                    <NavLink
                      to="/settings"
                      className={({ isActive }) => `sub-nav-item ${isActive && location.pathname === '/settings' ? 'active' : ''}`}
                      onClick={closeNavIfAuto}
                    >
                      <Icon name="settings" size={14} />
                      <span>{t('navigation:settings.system')}</span>
                    </NavLink>
                  </div>
                </div>
              );
            }

            return (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `nav-item ${isActive || isBagsActiveRoute || isAnalysisActiveRoute ? 'active' : ''}`}
                onClick={closeNavIfAuto}
              >
                <Icon name={icon} size={18} />
                <span className="nav-item-label">{label}</span>
                {badgeCount !== undefined && (
                  <span
                    className="nav-badge"
                    style={{
                      marginLeft: 'auto',
                      background: '#e0f2fe',
                      color: '#0284c7',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                    }}
                  >
                    {badgeCount}
                  </span>
                )}
              </NavLink>
            );
          })}

          <div style={{ borderTop: '1px solid var(--border, #cbd5e1)', margin: '12px 0 6px' }} />

          <NavLink
            to="/"
            className="nav-item"
            onClick={closeNavIfAuto}
          >
            <Icon name="external-link" size={18} />
            <span className="nav-item-label">{t('navigation:items.about')}</span>
          </NavLink>
        </nav>

        {/* Sidebar Robot Preview Banner Card */}
        <div
          className="sidebar-robot-banner"
          style={{
            marginTop: 'auto',
            marginBottom: '14px',
            position: 'relative',
            borderRadius: '12px',
            overflow: 'hidden',
            height: '100px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            flexShrink: 0,
          }}
        >
          <img
            src={robotHeroImg}
            alt={t('common:system.offlineDiagnosis')}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center top',
              filter: 'brightness(0.85)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(15,23,42,0.1) 0%, rgba(15,23,42,0.85) 100%)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              padding: '10px 12px',
              color: '#ffffff',
            }}
          >
            <strong style={{ fontSize: '10px', letterSpacing: '0.5px', textTransform: 'uppercase', color: '#93c5fd' }}>
              {t('common:system.offlineDiagnosis')}
            </strong>
            <span style={{ fontSize: '10px', opacity: 0.9, marginTop: '2px' }}>
              {t('common:system.humanDecision')}
            </span>
          </div>
        </div>

        {/* Sidebar Footer Account Button at Bottom-Left */}
        <div
          className="sidebar-footer"
          style={{
            position: 'relative',
          }}
        >
          <button
            type="button"
            className={`sidebar-account-btn ${userMenuOpen ? 'menu-open' : ''}`}
            aria-label={t('common:aria.accountMenu')}
            onClick={() => setUserMenuOpen(!userMenuOpen)}
          >
            {state.profile?.avatarUrl && !avatarLoadError ? (
              <img
                src={state.profile.avatarUrl}
                alt="Avatar"
                onError={() => setAvatarLoadError(true)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  flexShrink: 0,
                  border: '1px solid #cbd5e1',
                }}
              />
            ) : (
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: '#0f172a',
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
            )}
            <div className="sidebar-account-details" style={{ flex: 1, minWidth: 0 }}>
              <strong
                translate={state.profile?.name ? 'no' : undefined}
                style={{
                  fontSize: 13,
                  display: 'block',
                  color: '#0f172a',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {state.profile?.name || ROLE_NAMES[state.role] || 'An Nguyễn'}
              </strong>
              <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>
                {ROLE_NAMES[state.role] || state.role || 'Robotics Engineer'}
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
                <span>{t('common:actions.profile')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false);
                  navigate('/profile/edit');
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
                  color: '#2563eb',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#eff6ff')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                <Icon name="edit" size={16} />
                <span>{t('common:actions.editProfile') || 'Chỉnh sửa hồ sơ'}</span>
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
                <span>{t('common:actions.logout')}</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      <div
        className={`workspace-main ${isHovered || isPinned ? 'sidebar-expanded' : ''}`}
        onClick={() => {
          if (!isPinned && isHovered) {
            setIsHovered(false);
          }
        }}
      >
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            aria-label={t('common:aria.openNavigation')}
            onClick={() => setMobileNavOpen(true)}
          >
            <Icon name="menu" />
          </button>

          <div className="breadcrumbs">
            <span>{t('navigation:pageTitles.workspace')}</span>
            <Icon name="chevron" size={14} />
            <strong>{currentPageTitle}</strong>
          </div>

          <div className="topbar-actions">
            <HeaderMessengerDropdown />
            <HeaderNotificationDropdown />
            <LanguageSwitcher />
            <span className="demo-tag">
              <Badge tone={connection.status === 'ready' ? 'green' : 'amber'}>
                {connection.status === 'ready' ? (i18n.language.startsWith('en') ? 'Connected' : 'Đã kết nối')
                  : connection.status === 'loading' ? (i18n.language.startsWith('en') ? 'Connecting…' : 'Đang kết nối…')
                  : (i18n.language.startsWith('en') ? 'Data unavailable' : 'Không có kết nối dữ liệu')}
              </Badge>
            </span>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '6px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                fontSize: '12px',
                fontWeight: 600,
                color: '#334155',
              }}
              title={t('common:roles.verifiedHint')}
            >
              <span style={{ fontSize: '11px', color: '#64748b' }}>{t('common:roles.label')}</span>
              <strong style={{ color: currentRole === 'admin' ? '#b45309' : currentRole === 'user' ? '#0369a1' : '#4338ca' }}>
                {currentRoleLabel}
              </strong>
            </div>
            <Button variant="ghost" icon="logout" onClick={handleLogout}>
              {t('common:actions.logout')}
            </Button>
          </div>
        </header>

        <main id="main-content" className="page-content" tabIndex={-1}>
          <SmoothReveal key={location.pathname} duration={320} distance={8}>
            <div className="route-transition">
              {connection.status === 'ready' ? <Outlet /> : <DataConnectionState {...connection} />}
            </div>
          </SmoothReveal>
        </main>

        <footer className="app-footer">
          <span>CTRN SHIFT N / RAV-13</span>
          <span>{t('common:system.humanDecision')}</span>
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
                👤 {t('common:profile.title')}
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
              {state.profile?.avatarUrl ? (
                <img
                  src={state.profile.avatarUrl}
                  alt="Avatar"
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    flexShrink: 0,
                    border: '2px solid #e2e8f0',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: '#0f172a',
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
              )}
              <div style={{ minWidth: 0 }}>
                <strong translate={state.profile?.name ? 'no' : undefined} style={{ fontSize: '16px', color: '#0f172a', display: 'block' }}>
                  {state.profile?.name || ROLE_NAMES[state.role] || 'An Nguyễn'}
                </strong>
                <span style={{ fontSize: '12px', color: '#64748b', wordBreak: 'break-all' }}>
                  {state.profile?.email || `${(state.role || 'user').toLowerCase()}@ros2doctor.local`}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>{t('common:profile.fullName')}</span>
                <strong translate={state.profile?.name ? 'no' : undefined} style={{ color: '#0f172a' }}>{state.profile?.name || ROLE_NAMES[state.role] || 'An Nguyễn'}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>{t('common:profile.email')}</span>
                <strong style={{ color: '#0f172a' }}>{state.profile?.email || `${(state.role || 'user').toLowerCase()}@ros2doctor.local`}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>{t('common:profile.role')}</span>
                <span className="badge green" style={{ fontSize: '11px' }}>
                  <i /> {currentRoleLabel}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>{t('common:profile.workspace')}</span>
                <strong style={{ color: '#0f172a' }}>{state.profile?.workspace || 'Robotics Lab / RAV-13'}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>{t('common:profile.accountStatus')}</span>
                <span style={{ color: '#16a34a', fontWeight: 700 }}>{t('common:profile.online')}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>{t('common:profile.aiLimit')}</span>
                <strong style={{ color: '#0f172a' }}>
                  {t('common:profile.requestsPerDay', { count: state.aiSettings?.dailyRequests || 100 })}
                </strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                style={{
                  minHeight: '38px',
                  padding: '0 18px',
                  background: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#e2e8f0')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#f1f5f9')}
              >
                {t('common:actions.close')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowProfileModal(false);
                  navigate('/profile/edit');
                }}
                style={{
                  minHeight: '38px',
                  padding: '0 20px',
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                  transition: 'opacity 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.92')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                <Icon name="edit" size={15} />
                <span>{t('common:actions.editProfile') || 'Chỉnh sửa hồ sơ'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End main container */}
    </div>
  );
}
