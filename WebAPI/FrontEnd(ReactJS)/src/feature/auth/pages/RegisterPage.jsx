import React from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../auth.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:7423';

export default function RegisterPage() {
	const navigate = useNavigate();
	const [form, setForm] = useState({ fullName: '', email: '', studentId: '', password: '', confirmPassword: '' });
	const [status, setStatus] = useState({ type: '', message: '' });
	const [isSubmitting, setIsSubmitting] = useState(false);

	function handleChange(event) {
		setForm({ ...form, [event.target.name]: event.target.value });
	}

	async function handleSubmit(event) {
		event.preventDefault();
		setStatus({ type: '', message: '' });
		const studentId = form.studentId.toUpperCase();

		if (!form.fullName || !form.email || !studentId || !form.password || !form.confirmPassword) {
			setStatus({ type: 'error', message: 'Vui lòng điền đầy đủ thông tin.' });
			return;
		}
		if (!/^(DE|DS)\d{6}$/.test(studentId)) {
			setStatus({ type: 'error', message: 'Mã sinh viên phải có dạng DE123456 hoặc DS123456.' });
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
				body: JSON.stringify({ ...form, studentId }),
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
							<div className="field"><label htmlFor="register-student-id">Mã sinh viên</label><input id="register-student-id" name="studentId" maxLength="8" placeholder="DE123456" value={form.studentId} onChange={handleChange} /></div>
							<div className="field"><label htmlFor="register-password">Mật khẩu</label><input id="register-password" name="password" type="password" autoComplete="new-password" placeholder="Tối thiểu 6 ký tự" value={form.password} onChange={handleChange} /></div>
							<div className="field"><label htmlFor="register-confirm-password">Nhập lại mật khẩu</label><input id="register-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" placeholder="Nhập lại mật khẩu" value={form.confirmPassword} onChange={handleChange} /></div>
						</div>

						{status.message && <p className={`form-status ${status.type}`}>{status.message}</p>}
						<button className="primary-button" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}</button>
					</form>

					<div className="divider"><span>hoặc</span></div>
					<a className="google-button" href={`${API_URL}/api/auth/register-google`}>Đăng ký với Google <span>↗</span></a>
					<p className="switch-copy">Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
				</div>
			</section>
		</main>
	);
}
