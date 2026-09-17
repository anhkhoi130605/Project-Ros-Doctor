import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import '../auth.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:7149';

export default function LoginPage() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const [form, setForm] = useState({ email: '', password: '' });
	const [status, setStatus] = useState({ type: '', message: '' });
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		const errorParam = searchParams.get('error');
		if (errorParam) {
			setStatus({ type: 'error', message: decodeURIComponent(errorParam) });
		}
	}, [searchParams]);

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
			const user = data.user || {};
			const role = (user.role ?? user.Role ?? data.role ?? data.Role ?? '').toString().trim();

			if (token) localStorage.setItem('accessToken', token);
			if (role) localStorage.setItem('userRole', role);

			setStatus({ type: 'success', message: 'Đăng nhập thành công.' });

			setTimeout(() => {
				const normalizedRole = role.toLowerCase();
				if (normalizedRole.includes('admin')) {
					navigate('/admin-dashboard');
					return;
				}
				if (normalizedRole.includes('user')) {
					navigate('/user-dashboard');
					return;
				}
				navigate('/dashboard');
			}, 500);
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
					<a className="google-button" href={`${API_URL}/api/auth/login-google`}>
						<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
							<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
							<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
							<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
							<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
						</svg>
						<span>Đăng nhập bằng Google</span>
					</a>
					<p className="switch-copy">Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link></p>
				</div>
			</section>
		</main>
	);
}
