import React, { useState } from 'react';
import { useAuth } from '../hook/useAuth';

export default function ForgotPasswordModal({ isOpen, onClose }) {
  const { isSubmitting, requestForgotPassword, verifyAndResetPassword } = useAuth();
  
  const [email, setEmail] = useState('');
  const [step, setStep] = useState(1); // 1: Send OTP, 2: Enter OTP & New Password
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [toast, setToast] = useState({ show: false, type: '', title: '', text: '' });

  if (!isOpen) return null;

  const showToast = (type, title, text) => {
    setToast({ show: true, type, title, text });
  };

  const closeToast = () => {
    setToast({ show: false, type: '', title: '', text: '' });
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    closeToast();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      showToast('error', 'Lỗi nhập liệu', 'Vui lòng nhập địa chỉ Email đăng ký.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      showToast('error', 'Lỗi nhập liệu', 'Định dạng Email không hợp lệ.');
      return;
    }

    try {
      const res = await requestForgotPassword({ email: trimmedEmail });
      if (res && res.success === false) {
        showToast('error', 'Gửi OTP thất bại', res.message || 'Không thể gửi mã OTP.');
        return;
      }
      showToast('success', 'Đã gửi mã OTP', res?.message || 'Vui lòng kiểm tra hộp thư Hộp thư đến (Inbox) hoặc Thư rác (Spam).');
      setStep(2);
    } catch (err) {
      showToast('error', 'Gửi OTP thất bại', err.message || 'Không thể gửi mã OTP. Vui lòng kiểm tra lại Email.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    closeToast();

    if (!otpCode.trim()) {
      showToast('error', 'Lỗi nhập liệu', 'Vui lòng nhập mã OTP 6 chữ số.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      showToast('error', 'Mật khẩu yếu', 'Mật khẩu mới phải từ 6 ký tự trở lên.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('error', 'Mật khẩu không khớp', 'Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    try {
      const res = await verifyAndResetPassword({
        email: email.trim(),
        otpCode: otpCode.trim(),
        newPassword,
      });

      if (res && res.success === false) {
        showToast('error', 'Đổi mật khẩu thất bại', res.message || 'Mã OTP không chính xác hoặc đã hết hạn.');
        return;
      }

      showToast('success', 'Thành công', res?.message || 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.');

      setTimeout(() => {
        handleClose();
      }, 1800);
    } catch (err) {
      showToast('error', 'Đổi mật khẩu thất bại', err.message || 'Mã OTP không chính xác hoặc đã hết hạn.');
    }
  };

  const handleClose = () => {
    setStep(1);
    setEmail('');
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    closeToast();
    onClose();
  };

  return (
    <>
      {/* Top-Right Floating Toast Alert */}
      {toast.show && (
        <div className={`top-right-toast-container ${toast.type}`}>
          <div className="toast-icon-wrapper">
            {toast.type === 'success' ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            )}
          </div>
          <div className="toast-content">
            <h4 className="toast-title">{toast.title}</h4>
            <p className="toast-text">{toast.text}</p>
          </div>
          <button type="button" className="toast-close-btn" onClick={closeToast}>&times;</button>
        </div>
      )}

      {/* Forgot Password Modal */}
      <div className="forgot-modal-backdrop" onClick={handleClose}>
        <div className="forgot-modal-card" onClick={(e) => e.stopPropagation()}>
          <div className="forgot-modal-header">
            <h3>Quên mật khẩu</h3>
            <button type="button" className="close-btn" onClick={handleClose}>&times;</button>
          </div>

          <p className="forgot-modal-desc">
            {step === 1
              ? 'Nhập địa chỉ Email đăng ký tài khoản. Hệ thống sẽ gửi mã OTP xác thực về Gmail của bạn.'
              : `Nhập mã OTP vừa được gửi về Email: ${email}`}
          </p>

          {step === 1 ? (
            <form onSubmit={handleSendOtp}>
              <label htmlFor="forgot-email">Địa chỉ Email đăng ký *</label>
              <input
                id="forgot-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <button type="submit" className="primary-button" disabled={isSubmitting}>
                {isSubmitting ? 'Đang gửi OTP...' : 'Gửi mã OTP về Email'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword}>
              <label htmlFor="forgot-otp">Mã xác thực OTP (6 chữ số) *</label>
              <input
                id="forgot-otp"
                type="text"
                maxLength={6}
                placeholder="Nhập 6 chữ số OTP"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                required
              />

              <label htmlFor="forgot-new-password">Mật khẩu mới *</label>
              <input
                id="forgot-new-password"
                type="password"
                placeholder="Tối thiểu 6 ký tự"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />

              <label htmlFor="forgot-confirm-password">Xác nhận mật khẩu mới *</label>
              <input
                id="forgot-confirm-password"
                type="password"
                placeholder="Nhập lại mật khẩu mới"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              <div className="modal-actions-row">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setStep(1)}
                >
                  Gửi lại OTP
                </button>
                <button type="submit" className="primary-button" disabled={isSubmitting}>
                  {isSubmitting ? 'Đang lưu...' : 'Đặt lại mật khẩu'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
