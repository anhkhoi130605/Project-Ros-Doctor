import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hook/useAuth';
import { useApp } from '../../../stored/appStore';
import { getGoogleRegisterUrl } from '../api/authApi';
import { Logo, Button, FormField, Notice, Icon } from '../../../components/common/UIComponents';
import PearlScene from '../../../components/common/PearlScene';
import SmoothReveal from '../../../components/common/SmoothReveal';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { isSubmitting, register } = useAuth();
  const { dispatch, notify } = useApp();

  const [formData, setFormData] = useState({
    fullName: 'Nguyễn Văn A',
    email: 'kpham6488@gmail.com',
    phone: '0987654321',
    gender: '0', // 0: Nam (Male), 1: Nữ (Female), 2: Khác (Other)
    dateOfBirth: '2000-01-15',
    workspace: 'AGV-Lab',
    bio: 'Kỹ sư nghiên cứu điều khiển ROS2 robot tự hành.',
    password: 'demo123',
    confirmPassword: 'demo123',
  });

  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleGoogleRegister = () => {
    window.location.href = getGoogleRegisterUrl();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu và xác nhận mật khẩu không khớp.');
      return;
    }

    try {
      // 1. Gửi request đăng ký sang Backend ASP.NET
      const payload = {
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        phone: formData.phone,
        gender: parseInt(formData.gender, 10),
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : null,
        bio: formData.bio,
      };

      const res = await register(payload);
      const token = res?.accessToken || res?.token;

      if (token) {
        localStorage.setItem('accessToken', token);
        localStorage.setItem('userRole', 'user');
        localStorage.setItem('userEmail', formData.email);
      }

      dispatch({
        type: 'REGISTER_DEMO',
        user: {
          name: formData.fullName,
          email: formData.email,
          workspace: formData.workspace,
          phone: formData.phone,
          gender: formData.gender,
          bio: formData.bio,
        },
      });

      setIsSuccess(true);
      notify('Tạo tài khoản thành công!', 'success');
    } catch (err) {
      // Fallback demo nếu backend báo lỗi hoặc email đã có
      console.warn('Backend register error, fallback demo mode:', err);
      dispatch({
        type: 'REGISTER_DEMO',
        user: {
          name: formData.fullName,
          email: formData.email,
          workspace: formData.workspace,
          phone: formData.phone,
          gender: formData.gender,
          bio: formData.bio,
        },
      });
      setIsSuccess(true);
      notify(err.message || 'Đăng ký hồ sơ mẫu thành công!', 'info');
    }
  };

  return (
    <div className="ctrn-register">
      <header className="ctrn-public-header">
        <Link to="/" aria-label="CTRN SHIFT N, trang chủ">
          <Logo />
        </Link>
        <Link to="/login">
          Đã có tài khoản? <strong>Đăng nhập</strong>
        </Link>
      </header>

      <main className="ctrn-register-grid">
        <aside>
          <span className="section-kicker">CTRN SHIFT N / RAV-13</span>
          <h1>
            Bắt đầu từ<br />
            <em>sự thấu hiểu.</em>
          </h1>
          <p>
            Mỗi tín hiệu đều có câu chuyện.<br />
            Cùng khám phá dữ liệu của robot.
          </p>

          <PearlScene compact />

          <div className="ctrn-register-note" style={{ marginTop: '20px' }}>
            <Icon name="shield" />
            <span>
              Tài khoản mới có quyền User.<br />
              Admin quản lý quyền và dự án được truy cập.
            </span>
          </div>
        </aside>

        <section>
          {isSuccess ? (
            <div className="ctrn-register-success">
              <Icon name="success" size={52} />
              <span className="section-kicker">ĐĂNG KÝ HOÀN TẤT / PREVIEW</span>
              <h2>Tài khoản đã sẵn sàng.</h2>
              <p>
                {formData.fullName}, bạn đã tạo hồ sơ với quyền <b>User</b>.
              </p>
              <Notice tone="green" style={{ marginBottom: '20px' }}>
                Chào mừng bạn đến với hệ thống chẩn đoán ROS2. Hãy sử dụng email vừa đăng ký để đăng nhập.
              </Notice>
              <Button to={`/login?email=${encodeURIComponent(formData.email)}`} icon="arrow">
                Đến đăng nhập
              </Button>
            </div>
          ) : (
            <SmoothReveal begin={80} duration={460} distance={12}>
              <form onSubmit={handleSubmit}>
              <span className="section-kicker">TẠO HỒ SƠ MỚI</span>
              <h2>Đăng ký tham gia.</h2>

              {error && <Notice tone="red" style={{ marginBottom: '16px' }}>{error}</Notice>}

              <div className="form-grid">
                <FormField label="Họ và tên">
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="vd: Nguyễn Văn A"
                    required
                  />
                </FormField>

                <FormField label="Địa chỉ Email">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="vd: engineer@ros2doctor.local"
                    required
                  />
                </FormField>

                <FormField label="Số điện thoại">
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="vd: 0987654321"
                  />
                </FormField>

                <FormField label="Giới tính">
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                  >
                    <option value="0">Nam (Male)</option>
                    <option value="1">Nữ (Female)</option>
                    <option value="2">Khác (Other)</option>
                  </select>
                </FormField>

                <FormField label="Ngày sinh">
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                  />
                </FormField>

                <FormField label="Không gian làm việc (Workspace)">
                  <input
                    type="text"
                    name="workspace"
                    value={formData.workspace}
                    onChange={handleChange}
                    placeholder="vd: AGV-Lab"
                    required
                  />
                </FormField>

                <div className="span-2">
                  <FormField label="Tiểu sử / Giới thiệu bản thân (Bio)">
                    <textarea
                      name="bio"
                      rows={2}
                      value={formData.bio}
                      onChange={handleChange}
                      placeholder="vd: Kỹ sư robotics phụ trách phân tích cụm cảm biến LiDAR..."
                    />
                  </FormField>
                </div>

                <FormField label="Mật khẩu">
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                  />
                </FormField>

                <FormField label="Xác nhận mật khẩu">
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                  />
                </FormField>
              </div>

              <Button
                type="submit"
                icon="arrow"
                loading={isSubmitting}
                className="ctrn-full"
                style={{ marginTop: '12px' }}
              >
                {isSubmitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
              </Button>

              <div className="ctrn-or">hoặc</div>

              <Button
                type="button"
                variant="secondary"
                className="ctrn-full"
                onClick={handleGoogleRegister}
              >
                <span className="google-g">G</span> Đăng ký bằng Google
              </Button>

              <p className="ctrn-auth-bottom">
                Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
              </p>
              </form>
            </SmoothReveal>
          )}
        </section>
      </main>
    </div>
  );
}
