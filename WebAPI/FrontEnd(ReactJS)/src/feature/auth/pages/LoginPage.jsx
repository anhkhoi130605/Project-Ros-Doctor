import React from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../auth.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:7149';

export default function LoginPage() {
	const navigate = useNavigate();
	const [form, setForm] = useState({ email: '', password: '' });
	const [status, setStatus] = useState({ type: '', message: '' });
	const [isSubmitting, setIsSubmitting] = useState(false);

	function handleChange(event) {
		setForm({ ...form, [event.target.name]: event.target.value });
	}

	async function handleSubmit(event) {
		event.preventDefault();
		setStatus({ type: '', message: '' });

		if (!form.email || !form.password) {
			setStatus({ type: 'error', message: 'Vui lòng nhập email và mật khẩu.' });
			return;
		}

		setIsSubmitting(true);
		try {
			const response = await fetch(`${API_URL}/api/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: form.email,
					password: form.password
				})
			});
			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				throw new Error(data.message || data.title || 'Email hoặc mật khẩu không đúng.');
			}
            const token = data.accessToken || data.token;
            localStorage.setItem(
                'accessToken',
                data.accessToken
            );
			
			if (token) localStorage.setItem('accessToken', token);
			setStatus({ type: 'success', message: 'Đăng nhập thành công.' });
			setTimeout(() => navigate('/dashboard'), 500);
		} catch (error) {
			setStatus({ type: 'error', message: error.message || 'Không thể kết nối đến máy chủ.' });
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<main className="auth-shell">
			<section className="auth-visual">
				<div className="visual-mark">CSN</div>
				<p className="eyebrow">Ctrl Shift N / Member space</p>
				<h1>Build something worth belonging to.</h1>
				<p className="visual-copy">Kết nối cộng đồng, khám phá hoạt động và cùng nhau tạo nên những trải nghiệm đáng nhớ.</p>
				<div className="visual-note"><span>01</span><span>Connect with your club</span></div>
			</section>

			<section className="auth-panel">
				<div className="auth-card">
					<div className="mobile-mark">CSN</div>
					<p className="eyebrow">Welcome back</p>
					<h2>Đăng nhập</h2>
					<p className="form-intro">Đăng nhập để tiếp tục hành trình cùng Ctrl Shift N.</p>

					<form onSubmit={handleSubmit} noValidate>
						<label htmlFor="login-email">Email</label>
						<input id="login-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={handleChange} />

						<div className="label-row">
							<label htmlFor="login-password">Mật khẩu</label>
							<button type="button" className="text-button">Quên mật khẩu?</button>
						</div>
						<input id="login-password" name="password" type="password" autoComplete="current-password" placeholder="Nhập mật khẩu" value={form.password} onChange={handleChange} />

						{status.message && <p className={`form-status ${status.type}`}>{status.message}</p>}
						<button className="primary-button" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
					</form>

					<div className="divider"><span>hoặc</span></div>
					<a className="google-button" href={`${API_URL}/api/auth/login-google`}>Tiếp tục với Google <span>↗</span></a>
					<p className="switch-copy">Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link></p>
				</div>
			</section>
		</main>
	);
}
