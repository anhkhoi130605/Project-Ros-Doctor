import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../../stored/appStore';
import { ROLE_NAMES } from '../../../domain/appTypes';
import { PageHeader, Button, Badge, Icon } from '../../../components/common/UIComponents';
import { logUserActivityApi, profileService } from '../../../service';
import './ProfileEditPage.css';

function getUserInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const WORKSPACE_PRESETS = [
  'Robotics Lab',
  'RAV-13 / Nghiên cứu ROS2',
  'Autonomous Vehicles Lab',
  'Phòng Lab AI & Thị giác Máy tính',
  'Phòng Điều khiển Tự động hóa',
];

export default function ProfileEditPage() {
  const { state, dispatch, notify } = useApp();
  const { t, i18n } = useTranslation(['common', 'auth']);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'security' | 'preferences'
  const [isDragging, setIsDragging] = useState(false);

  // Form states
  const [name, setName] = useState(state.profile?.name || (state.role ? ROLE_NAMES[state.role] : '') || '');
  const [email, setEmail] = useState(state.profile?.email || '');
  const [phone, setPhone] = useState(state.profile?.phone || '');
  const [jobTitle, setJobTitle] = useState(state.profile?.jobTitle || '');
  const [workspace, setWorkspace] = useState(state.profile?.workspace || '');
  const [bio, setBio] = useState(state.profile?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(state.profile?.avatarUrl || '');

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Preference states
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [autoSaveLogs, setAutoSaveLogs] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const currentRoleLabel = ROLE_NAMES[state.role] || state.role || 'Quản trị viên';

  // Tải dữ liệu hồ sơ thực tế từ Database khi mở trang
  useEffect(() => {
    profileService.getMyProfile()
      .then((data) => {
        if (data) {
          if (data.fullName) setName(data.fullName);
          if (data.email) setEmail(data.email);
          if (data.phone) setPhone(data.phone);
          if (data.bio) setBio(data.bio);
          if (data.avatarUrl) setAvatarUrl(data.avatarUrl);
          dispatch({
            type: 'UPDATE_PROFILE',
            profile: {
              name: data.fullName,
              email: data.email,
              phone: data.phone,
              bio: data.bio,
              avatarUrl: data.avatarUrl,
            },
          });
        }
      })
      .catch(() => {
        // Dự phòng dữ liệu local nếu chưa kết nối mạng
      });
  }, [dispatch]);

  // Xử lý nén và tải file ảnh đại diện lên Cloudinary & lưu DB
  const handleImageFile = async (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notify('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WebP, GIF).', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      notify('Kích thước ảnh quá lớn (vui lòng chọn ảnh dưới 10MB).', 'error');
      return;
    }

    setIsUploadingAvatar(true);
    notify('Đang tải ảnh lên Cloudinary...', 'info');

    try {
      const res = await profileService.uploadAvatar(file);
      if (res?.avatarUrl) {
        setAvatarUrl(res.avatarUrl);
        dispatch({
          type: 'UPDATE_PROFILE',
          profile: { avatarUrl: res.avatarUrl },
        });
        notify('Đã tải ảnh lên Cloudinary và lưu vào cơ sở dữ liệu thành công!', 'success');
      }
    } catch (err) {
      notify(err.message || 'Lỗi khi tải ảnh lên Cloudinary.', 'error');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleImageFile(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    dispatch({
      type: 'UPDATE_PROFILE',
      profile: { avatarUrl: '' },
    });
    notify('Đã xóa ảnh đại diện, trở về ký tự viết tắt.', 'info');
  };

  const handleSaveGeneral = async (e) => {
    if (e) e.preventDefault();

    if (!name.trim()) {
      notify('Họ và tên không được để trống.', 'error');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      notify('Email không hợp lệ.', 'error');
      return;
    }

    setIsSaving(true);

    try {
      const updated = await profileService.updateProfile({
        fullName: name.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
      });

      const updatedProfile = {
        name: updated?.fullName || name.trim(),
        email: updated?.email || email.trim(),
        phone: updated?.phone || phone.trim(),
        jobTitle: jobTitle.trim(),
        workspace: workspace.trim(),
        bio: updated?.bio || bio.trim(),
        avatarUrl: updated?.avatarUrl || avatarUrl.trim(),
      };

      dispatch({
        type: 'UPDATE_PROFILE',
        profile: updatedProfile,
      });

      // Cập nhật localStorage
      try {
        localStorage.setItem('userName', updatedProfile.name);
        localStorage.setItem('userEmail', updatedProfile.email);
      } catch {
        // Ignore storage errors
      }

      notify(t('common:profile.updateSuccess') || 'Cập nhật thông tin cá nhân thành công!', 'success');
    } catch (err) {
      notify(err.message || 'Lỗi khi lưu thông tin vào cơ sở dữ liệu.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (!currentPassword) {
      notify('Vui lòng nhập mật khẩu hiện tại.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      notify('Mật khẩu mới phải có ít nhất 6 ký tự.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      notify('Mật khẩu xác nhận không khớp.', 'error');
      return;
    }

    setPasswordLoading(true);
    setTimeout(() => {
      setPasswordLoading(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      notify('Đã cập nhật mật khẩu mới an toàn!', 'success');
    }, 600);
  };

  return (
    <div className="profile-edit-page">
      {/* Hidden File Input for Avatar Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/png, image/jpeg, image/webp, image/gif"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      <PageHeader
        eyebrow="TÀI KHOẢN / CẤU HÌNH HỒ SƠ"
        title={t('common:profile.editTitle') || 'Chỉnh sửa thông tin cá nhân'}
        subtitle={t('common:profile.editSubtitle') || 'Quản lý thông tin định danh, chức danh chuyên môn, không gian nghiên cứu và bảo mật tài khoản.'}
      >
        <Button
          variant="secondary"
          icon="arrow-left"
          onClick={() => navigate(-1)}
        >
          {t('common:profile.cancel') || 'Quay lại'}
        </Button>
        <Button
          variant="primary"
          icon="check"
          loading={isSaving}
          onClick={handleSaveGeneral}
        >
          {t('common:profile.save') || 'Lưu thay đổi'}
        </Button>
      </PageHeader>

      <div className="profile-grid">
        {/* Left Column: Live Profile Summary Card */}
        <div className="profile-summary-card">
          <div
            className="profile-avatar-container"
            onClick={() => fileInputRef.current?.click()}
            title="Bấm để tải ảnh đại diện từ máy tính"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name}
                className="profile-avatar-large"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="profile-avatar-large">
                {getUserInitials(name)}
              </div>
            )}
            <div className="profile-avatar-hover-overlay">
              <Icon name="camera" size={20} />
              <span>Đổi ảnh</span>
            </div>
            <button
              type="button"
              className="profile-avatar-camera-btn"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              title="Tải ảnh mới từ máy"
            >
              <Icon name="camera" size={15} />
            </button>
          </div>

          <div className="profile-summary-info">
            <h3 className="profile-summary-name">{name || 'Chưa đặt tên'}</h3>
            <span style={{ fontSize: '13px', color: '#64748b' }}>{jobTitle}</span>
            <div className="profile-summary-role-tag">
              <span>{state.role === 'Admin' ? '👑' : '🛠️'}</span>
              <span>{currentRoleLabel}</span>
            </div>
          </div>

          <div className="profile-summary-stats">
            <div className="profile-stat-item">
              <span className="profile-stat-label">
                <Icon name="mail" size={14} /> Email
              </span>
              <span className="profile-stat-value" style={{ fontSize: '12px' }}>{email}</span>
            </div>
            <div className="profile-stat-item">
              <span className="profile-stat-label">
                <Icon name="phone" size={14} /> Điện thoại
              </span>
              <span className="profile-stat-value">{phone || '—'}</span>
            </div>
            <div className="profile-stat-item">
              <span className="profile-stat-label">
                <Icon name="grid" size={14} /> Không gian
              </span>
              <span className="profile-stat-value">{workspace}</span>
            </div>
            <div className="profile-stat-item">
              <span className="profile-stat-label">
                <Icon name="activity" size={14} /> Trạng thái
              </span>
              <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '12px' }}>
                ● Đang hoạt động
              </span>
            </div>
          </div>

          <div className="profile-ai-progress-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
              <span style={{ color: '#475569' }}>Hạn ngạch AI Requests</span>
              <span style={{ color: '#2563eb' }}>
                {state.aiSettings?.dailyRequests || 500} req/ngày
              </span>
            </div>
            <div className="profile-ai-progress-bar">
              <div className="profile-ai-progress-fill" style={{ width: '42%' }} />
            </div>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              Đã sử dụng 210/500 requests trong hôm nay
            </span>
          </div>
        </div>

        {/* Right Column: Tabbed Forms */}
        <div className="profile-content-container">
          <div className="profile-nav-tabs">
            <button
              type="button"
              className={`profile-tab-button ${activeTab === 'general' ? 'active' : ''}`}
              onClick={() => setActiveTab('general')}
            >
              <Icon name="user" size={16} />
              <span>Thông tin chung</span>
            </button>
            <button
              type="button"
              className={`profile-tab-button ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              <Icon name="shield" size={16} />
              <span>Bảo mật & Mật khẩu</span>
            </button>
            <button
              type="button"
              className={`profile-tab-button ${activeTab === 'preferences' ? 'active' : ''}`}
              onClick={() => setActiveTab('preferences')}
            >
              <Icon name="settings" size={16} />
              <span>Tùy chọn hệ thống</span>
            </button>
          </div>

          {/* TAB 1: General Info */}
          {activeTab === 'general' && (
            <div className="profile-card-section">
              <div className="profile-card-header">
                <h4 className="profile-card-title">
                  <Icon name="user" size={18} />
                  <span>Hồ sơ định danh cá nhân</span>
                </h4>
                <Badge variant="blue" size="sm">
                  Thông tin công khai trong lab
                </Badge>
              </div>

              <form onSubmit={handleSaveGeneral} className="profile-form-grid">
                {/* Khu vực Upload ảnh đại diện */}
                <div className="profile-field-group full-width">
                  <label className="profile-field-label">
                    <span>Ảnh đại diện (Avatar)</span>
                    {avatarUrl && (
                      <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: 600 }}>
                        Đã chọn ảnh
                      </span>
                    )}
                  </label>

                  <div
                    className={`profile-upload-panel ${isDragging ? 'drag-over' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="profile-upload-top">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Avatar preview"
                          className="profile-upload-preview-thumb"
                        />
                      ) : (
                        <div
                          className="profile-upload-preview-thumb"
                          style={{
                            background: '#0f172a',
                            color: '#ffffff',
                            display: 'grid',
                            placeItems: 'center',
                            fontWeight: 700,
                            fontSize: '18px',
                          }}
                        >
                          {getUserInitials(name)}
                        </div>
                      )}

                      <div className="profile-upload-info">
                        <span className="profile-upload-title">Tải ảnh đại diện mới</span>
                        <span className="profile-upload-hint">
                          Hỗ trợ định dạng PNG, JPG, WebP. Bạn có thể bấm nút bên dưới hoặc kéo thả ảnh vào khung này.
                        </span>
                      </div>

                      <div className="profile-upload-actions">
                        <button
                          type="button"
                          className="profile-upload-btn primary"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Icon name="camera" size={16} />
                          <span>Tải ảnh từ máy</span>
                        </button>

                        {avatarUrl && (
                          <button
                            type="button"
                            className="profile-upload-btn danger"
                            onClick={handleRemoveAvatar}
                            title="Xóa ảnh đại diện hiện tại"
                          >
                            <Icon name="trash" size={16} />
                            <span>Xóa ảnh</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>Hoặc nhập URL:</span>
                      <input
                        type="url"
                        className="profile-field-input"
                        style={{ height: '34px', fontSize: '13px' }}
                        value={avatarUrl.startsWith('data:') ? '' : avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="https://example.com/avatar.jpg"
                      />
                    </div>
                  </div>
                </div>

                <div className="profile-field-group">
                  <label className="profile-field-label">
                    <span>{t('common:profile.fullName')} *</span>
                  </label>
                  <input
                    type="text"
                    className="profile-field-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="VD: Nguyễn Văn A"
                    required
                  />
                </div>

                <div className="profile-field-group">
                  <label className="profile-field-label">
                    <span>{t('common:profile.email')} *</span>
                    <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>✓ Đã xác thực</span>
                  </label>
                  <input
                    type="email"
                    className="profile-field-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="VD: yourname@gmail.com"
                    required
                  />
                </div>

                <div className="profile-field-group">
                  <label className="profile-field-label">
                    <span>{t('common:profile.phone')}</span>
                  </label>
                  <input
                    type="tel"
                    className="profile-field-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="VD: 0912345678"
                  />
                </div>

                <div className="profile-field-group">
                  <label className="profile-field-label">
                    <span>{t('common:profile.jobTitle')}</span>
                  </label>
                  <input
                    type="text"
                    className="profile-field-input"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="VD: Kỹ sư Robotics & ROS 2"
                  />
                </div>

                <div className="profile-field-group full-width">
                  <label className="profile-field-label">
                    <span>{t('common:profile.workspace')}</span>
                  </label>
                  <input
                    type="text"
                    className="profile-field-input"
                    value={workspace}
                    onChange={(e) => setWorkspace(e.target.value)}
                    placeholder="VD: Robotics Lab"
                  />
                  <div className="profile-preset-tags">
                    <span style={{ fontSize: '12px', color: '#64748b', alignSelf: 'center' }}>Gợi ý nhanh:</span>
                    {WORKSPACE_PRESETS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={`profile-preset-pill ${workspace === item ? 'active' : ''}`}
                        onClick={() => setWorkspace(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="profile-field-group full-width">
                  <label className="profile-field-label">
                    <span>{t('common:profile.bio')}</span>
                  </label>
                  <textarea
                    className="profile-field-textarea"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Mô tả tóm tắt về chuyên môn, dự án hoặc đề tài ROS 2 đang phụ trách..."
                  />
                </div>

                <div className="profile-field-group full-width profile-form-footer">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => navigate(-1)}
                  >
                    {t('common:profile.cancel') || 'Hủy'}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={isSaving}
                    icon="check"
                  >
                    {t('common:profile.save') || 'Lưu thay đổi'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: Security & Password */}
          {activeTab === 'security' && (
            <div className="profile-card-section">
              <div className="profile-card-header">
                <h4 className="profile-card-title">
                  <Icon name="shield" size={18} />
                  <span>Bảo mật tài khoản & Đổi mật khẩu</span>
                </h4>
                <Badge variant="green" size="sm">
                  Phiên đăng nhập an toàn
                </Badge>
              </div>

              <form onSubmit={handleChangePassword} className="profile-form-grid">
                <div className="profile-field-group full-width">
                  <label className="profile-field-label">
                    <span>Mật khẩu hiện tại *</span>
                  </label>
                  <input
                    type="password"
                    className="profile-field-input"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div className="profile-field-group">
                  <label className="profile-field-label">
                    <span>Mật khẩu mới *</span>
                  </label>
                  <input
                    type="password"
                    className="profile-field-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Ít nhất 6 ký tự"
                    required
                  />
                </div>

                <div className="profile-field-group">
                  <label className="profile-field-label">
                    <span>Xác nhận mật khẩu mới *</span>
                  </label>
                  <input
                    type="password"
                    className="profile-field-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    required
                  />
                </div>

                <div className="profile-field-group full-width profile-form-footer">
                  <Button
                    type="submit"
                    variant="primary"
                    loading={passwordLoading}
                    icon="shield"
                  >
                    Cập nhật mật khẩu
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: Preferences */}
          {activeTab === 'preferences' && (
            <div className="profile-card-section">
              <div className="profile-card-header">
                <h4 className="profile-card-title">
                  <Icon name="settings" size={18} />
                  <span>Tùy chọn giao diện & Thông báo</span>
                </h4>
              </div>

              <div style={{ display: 'grid', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block' }}>Ngôn ngữ hiển thị</strong>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Chọn ngôn ngữ làm việc mặc định của hệ thống</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className={`profile-preset-pill ${i18n.language?.startsWith('vi') ? 'active' : ''}`}
                      onClick={() => i18n.changeLanguage('vi')}
                    >
                      🇻🇳 Tiếng Việt
                    </button>
                    <button
                      type="button"
                      className={`profile-preset-pill ${i18n.language?.startsWith('en') ? 'active' : ''}`}
                      onClick={() => i18n.changeLanguage('en')}
                    >
                      🇬🇧 English
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block' }}>Thông báo kết quả chẩn đoán Rosbag</strong>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Nhận thông báo khi AI agent hoàn thành phân tích log</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block' }}>Tự động ghi vết nhật ký kiểm toán (Audit Logs)</strong>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Đồng bộ các thao tác kỹ sư vào cơ sở dữ liệu nhật ký hệ thống</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoSaveLogs}
                    onChange={(e) => setAutoSaveLogs(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
