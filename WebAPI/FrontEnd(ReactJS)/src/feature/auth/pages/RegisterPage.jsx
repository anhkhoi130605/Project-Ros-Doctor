import React from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../auth.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:7149';

export default function RegisterPage() {
	const navigate = useNavigate();
	const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
	const [status, setStatus] = useState({ type: '', message: '' });
	const [isSubmitting, setIsSubmitting] = useState(false);

	function handleChange(event) {
		setForm({ ...form, [event.target.name]: event.target.value });
	}

	async function handleSubmit(event) {
		event.preventDefault();
		setStatus({ type: '', message: '' });
		if (!form.fullName || !form.email || !form.password || !form.confirmPassword) {
			setStatus({ type: 'error', message: 'Vui lòng điền đầy đủ thông tin.' });
			return;
		}
		if (form.password !== form.confirmPassword) {
			setStatus({ type: 'error', message: 'Mật khẩu xác nhận không khớp.' });
			return;
		}

		setIsSubmitting(true);
		try {
			const response = await fetch(`${API_URL}/api/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(form),
			});
			const data = await response.json().catch(() => ({}));

			if (!response.ok) {
				throw new Error(data.message || data.title || 'Đăng ký không thành công.');
			}
			setStatus({ type: 'success', message: 'Đăng ký thành công. Đang chuyển đến trang đăng nhập...' });
			setTimeout(() => navigate('/login'), 900);
		} catch (error) {
			setStatus({ type: 'error', message: error.message || 'Không thể kết nối đến máy chủ.' });
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<main className="auth-shell">
			<section className="auth-visual register-visual">
				<div className="visual-mark">CSN</div>
				<p className="eyebrow">Ctrl Shift N / New member</p>
				<h1>Your next chapter starts here.</h1>
				<p className="visual-copy">Tạo tài khoản để tham gia các hoạt động, kết nối với thành viên và cập nhật những điều mới nhất.</p>
				<div className="visual-note"><span>02</span><span>Make your mark</span></div>
			</section>

			<section className="auth-panel">
				<div className="auth-card register-card">
					<div className="mobile-mark">CSN</div>
					<p className="eyebrow">Start here</p>
					<h2>Tạo tài khoản</h2>
					<p className="form-intro">Tham gia Ctrl Shift N chỉ với vài thông tin cơ bản.</p>

					<form onSubmit={handleSubmit} noValidate>
						<div className="form-grid">
							<div className="field full-width"><label htmlFor="register-name">Họ và tên</label><input id="register-name" name="fullName" autoComplete="name" placeholder="Nguyễn Văn A" value={form.fullName} onChange={handleChange} /></div>
							<div className="field"><label htmlFor="register-email">Email</label><input id="register-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={handleChange} /></div>
							<div className="field"><label htmlFor="register-password">Mật khẩu</label><input id="register-password" name="password" type="password" autoComplete="new-password" placeholder="Tối thiểu 6 ký tự" value={form.password} onChange={handleChange} /></div>
							<div className="field"><label htmlFor="register-confirm-password">Nhập lại mật khẩu</label><input id="register-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" placeholder="Nhập lại mật khẩu" value={form.confirmPassword} onChange={handleChange} /></div>
						</div>

						{status.message && <p className={`form-status ${status.type}`}>{status.message}</p>}
						<button className="primary-button" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}</button>
					</form>

					<div className="divider"><span>hoặc</span></div>
					<a className="google-button" href={`${API_URL}/api/auth/register-google`}>
						<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
							<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
							<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
							<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
							<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
						</svg>
						<span>Đăng ký bằng Google</span>
					</a>
					<p className="switch-copy">Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
				</div>
			</section>
		</main>
	);
}
