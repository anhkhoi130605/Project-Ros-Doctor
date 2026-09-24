import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:7149';

function getInitials(name, email) {
  const target = (name || email || 'User').trim();
  const parts = target.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return target.slice(0, 2).toUpperCase();
}

export default function UserAvatarDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [user, setUser] = useState(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Load user from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        setUser(JSON.parse(stored));
      } else {
        const email = localStorage.getItem('userEmail') || '';
        const role = localStorage.getItem('userRole') || 'User';
        setUser({
          fullName: email ? email.split('@')[0] : 'Administrator',
          email: email || 'admin@csn.club',
          role: role,
        });
      }
    } catch {
      setUser({ fullName: 'Administrator', email: '', role: 'Admin' });
    }
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle Logout
  const handleLogout = async () => {
    const token = localStorage.getItem('accessToken');
    setIsOpen(false);

    try {
      if (token) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }).catch(() => { });
      }
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('currentUser');
      navigate('/login');
    }
  };

  const displayName = user?.fullName || user?.FullName || (user?.email ? user.email.split('@')[0] : 'User');
  const displayEmail = user?.email || user?.Email || '';
  const displayRole = user?.role || user?.Role || 'Member';
  const avatarUrl = user?.avatarUrl || user?.AvatarUrl;
  const initials = getInitials(displayName, displayEmail);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    gender: 'Male',
    dateOfBirth: '',
    bio: ''
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleStartEdit = () => {
    setEditForm({
      fullName: user?.fullName || user?.FullName || '',
      phone: user?.phone || user?.Phone || '',
      gender: user?.gender || user?.Gender || 'Male',
      dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.split('T')[0] : (user?.DateOfBirth ? user.DateOfBirth.split('T')[0] : ''),
      bio: user?.bio || user?.Bio || ''
    });
    setSaveSuccess(false);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    const updated = {
      ...user,
      fullName: editForm.fullName.trim() || displayName,
      FullName: editForm.fullName.trim() || displayName,
      phone: editForm.phone.trim(),
      Phone: editForm.phone.trim(),
      gender: editForm.gender,
      Gender: editForm.gender,
      dateOfBirth: editForm.dateOfBirth,
      DateOfBirth: editForm.dateOfBirth,
      bio: editForm.bio.trim(),
      Bio: editForm.bio.trim()
    };
    setUser(updated);
    localStorage.setItem('currentUser', JSON.stringify(updated));
    setSaveSuccess(true);
    setTimeout(() => {
      setIsEditing(false);
      setSaveSuccess(false);
    }, 600);
  };

  return (
    <div className="user-avatar-wrapper" ref={dropdownRef}>
      {/* Avatar Trigger Button */}
      <button
        type="button"
        className={`user-avatar-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="User menu"
        aria-expanded={isOpen}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="user-avatar-img" />
        ) : (
          <span className="user-avatar-initials">{initials}</span>
        )}
        <span className="user-online-badge" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="user-dropdown-menu">
          {/* User Header */}
          <div className="user-dropdown-header">
            <div className="user-dropdown-avatar-sm">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="user-dropdown-info">
              <strong className="user-dropdown-name">{displayName}</strong>
              {displayEmail && <span className="user-dropdown-email">{displayEmail}</span>}
              <span className="user-dropdown-role-pill">{displayRole}</span>
            </div>
          </div>

          <div className="user-dropdown-divider" />

          {/* Action 1: Thông tin cá nhân */}
          <button
            type="button"
            className="user-dropdown-item"
            onClick={() => {
              setIsOpen(false);
              setIsEditing(false);
              setShowProfileModal(true);
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>Thông tin cá nhân</span>
          </button>

          <div className="user-dropdown-divider" />

          {/* Action 2: Đăng xuất */}
          <button
            type="button"
            className="user-dropdown-item danger"
            onClick={handleLogout}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Đăng xuất</span>
          </button>
        </div>
      )}

      {/* Modal Thông tin cá nhân */}
      {showProfileModal && (
        <div className="profile-modal-backdrop" onClick={() => { setShowProfileModal(false); setIsEditing(false); }}>
          <div className="profile-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h3>{isEditing ? 'Chỉnh sửa thông tin cá nhân' : 'Thông tin cá nhân'}</h3>
              <button
                type="button"
                className="profile-modal-close"
                onClick={() => { setShowProfileModal(false); setIsEditing(false); }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="profile-modal-body">
              {saveSuccess && (
                <div className="profile-success-alert">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Cập nhật thông tin thành công!</span>
                </div>
              )}

              {!isEditing ? (
                <>
                  <div className="profile-modal-hero">
                    <div className="profile-modal-avatar">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={displayName} />
                      ) : (
                        <span>{initials}</span>
                      )}
                      <span className="profile-modal-status-badge" />
                    </div>
                    <div className="profile-modal-hero-text">
                      <h4>{displayName}</h4>
                      <p>{displayEmail}</p>
                      <span className="profile-role-badge">{displayRole}</span>
                    </div>
                  </div>

                  <div className="profile-details-grid">
                    <div className="profile-detail-item">
                      <small>Họ và tên</small>
                      <strong>{displayName}</strong>
                    </div>
                    <div className="profile-detail-item">
                      <small>Email</small>
                      <strong>{displayEmail || 'Chưa cập nhật'}</strong>
                    </div>
                    <div className="profile-detail-item">
                      <small>Số điện thoại</small>
                      <strong>{user?.phone || user?.Phone || 'Chưa cập nhật'}</strong>
                    </div>
                    <div className="profile-detail-item">
                      <small>Giới tính</small>
                      <strong>
                        {user?.gender === 'Male' || user?.Gender === 'Male' ? 'Nam' :
                         user?.gender === 'Female' || user?.Gender === 'Female' ? 'Nữ' :
                         user?.gender || user?.Gender || 'Chưa cập nhật'}
                      </strong>
                    </div>
                    <div className="profile-detail-item">
                      <small>Ngày sinh</small>
                      <strong>
                        {user?.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString('vi-VN') :
                         user?.DateOfBirth ? new Date(user.DateOfBirth).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}
                      </strong>
                    </div>
                    <div className="profile-detail-item">
                      <small>Vai trò</small>
                      <strong>{displayRole}</strong>
                    </div>
                    {user?.bio || user?.Bio ? (
                      <div className="profile-detail-item">
                        <small>Giới thiệu (Bio)</small>
                        <strong>{user?.bio || user?.Bio}</strong>
                      </div>
                    ) : null}
                    <div className="profile-detail-item">
                      <small>Trạng thái</small>
                      <strong className="profile-status-active">● Đang hoạt động</strong>
                    </div>
                  </div>
                </>
              ) : (
                /* Form Chỉnh sửa thông tin */
                <div className="profile-edit-form">
                  <div className="profile-edit-group">
                    <label htmlFor="edit-name">Họ và tên *</label>
                    <input
                      id="edit-name"
                      type="text"
                      value={editForm.fullName}
                      onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                      placeholder="Nguyễn Văn A"
                    />
                  </div>

                  <div className="profile-edit-group">
                    <label htmlFor="edit-email">Email</label>
                    <input
                      id="edit-email"
                      type="text"
                      value={displayEmail}
                      disabled
                      title="Email tài khoản không thể chỉnh sửa"
                    />
                  </div>

                  <div className="profile-edit-row">
                    <div className="profile-edit-group">
                      <label htmlFor="edit-phone">Số điện thoại</label>
                      <input
                        id="edit-phone"
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        placeholder="0912 345 678"
                      />
                    </div>
                    <div className="profile-edit-group">
                      <label htmlFor="edit-gender">Giới tính</label>
                      <select
                        id="edit-gender"
                        value={editForm.gender}
                        onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                      >
                        <option value="Male">Nam</option>
                        <option value="Female">Nữ</option>
                        <option value="Other">Khác</option>
                      </select>
                    </div>
                  </div>

                  <div className="profile-edit-group">
                    <label htmlFor="edit-dob">Ngày sinh</label>
                    <input
                      id="edit-dob"
                      type="date"
                      value={editForm.dateOfBirth}
                      onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                    />
                  </div>

                  <div className="profile-edit-group">
                    <label htmlFor="edit-bio">Giới thiệu ngắn (Bio)</label>
                    <textarea
                      id="edit-bio"
                      rows={2}
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      placeholder="Sở thích, chuyên ngành hoặc đôi nét về bạn..."
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="profile-modal-footer">
              {!isEditing ? (
                <>
                  <button
                    type="button"
                    className="dashboard-ghost-button"
                    onClick={() => setShowProfileModal(false)}
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    className="profile-edit-button"
                    onClick={handleStartEdit}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                    <span>Chỉnh sửa</span>
                  </button>
                  <button
                    type="button"
                    className="profile-logout-button"
                    onClick={handleLogout}
                  >
                    Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="dashboard-ghost-button"
                    onClick={() => setIsEditing(false)}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="profile-save-button"
                    onClick={handleSaveEdit}
                  >
                    Lưu thay đổi
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
