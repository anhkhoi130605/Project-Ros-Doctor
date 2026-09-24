import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hook/useAuth';
import { getGoogleLoginUrl } from '../api/authApi';
import ForgotPasswordModal from '../component/ForgotPasswordModal';
import robotPearl from '../../../assets/robot-pearl.png';
import '../auth.css';

export default function LoginPage() {
	const [searchParams] = useSearchParams();
	const [form, setForm] = useState({ email: '', password: '' });
	const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
	const { isSubmitting, status, setStatus, login } = useAuth();

	useEffect(() => {
		const errorParam = searchParams.get('error');
		if (errorParam) {
			setStatus({ type: 'error', message: decodeURIComponent(errorParam) });
		}
	}, [searchParams, setStatus]);

	function handleChange(event) {
		setForm({ ...form, [event.target.name]: event.target.value });
	}

	async function handleSubmit(event) {
		event.preventDefault();
		await login({ email: form.email, password: form.password });
	}

	return (
		<main className="login-page">
			<header className="login-topbar">
				<Link className="login-brand" to="/login" aria-label="Ctrl Shift N">
					<span className="brand-pulse" aria-hidden="true">
						<span></span>
					</span>
					<span className="brand-copy">
						<strong>CTRN</strong>
						<small>SHIFT N</small>
					</span>
				</Link>
				<div className="login-toplinks">
					<span>Chưa có tài khoản?</span>
					<Link to="/register">Đăng ký</Link>
				</div>
			</header>

			<section className="login-stage">
				<div className="login-hero" aria-hidden="true">
					<p className="login-kicker">RAV-13 / ROBOTICS INTELLIGENCE</p>
					<h1>
						Hiểu dữ liệu.
						<span>Giải mã robot.</span>
					</h1>
					<div className="robot-orbit">
						<img src={robotPearl} alt="" />
					</div>
				</div>

				<section className="login-panel" aria-labelledby="login-title">
					<p className="login-kicker">KHÔNG GIAN CHẨN ĐOÁN</p>
					<h2 id="login-title">Chào mừng trở lại.</h2>
					<p className="form-intro">Đăng nhập để tiếp tục công việc của bạn.</p>

					<form onSubmit={handleSubmit} noValidate>
						<label htmlFor="login-email">Email</label>
						<input id="login-email" name="email" type="email" autoComplete="email" placeholder="engineer@ros2doctor.local" value={form.email} onChange={handleChange} />

						<div className="label-row">
							<label htmlFor="login-password">Mật khẩu</label>
							<button type="button" className="text-button" onClick={() => setIsForgotPasswordOpen(true)}>
								Quên mật khẩu?
							</button>
						</div>
						<input id="login-password" name="password" type="password" autoComplete="current-password" placeholder="Nhập mật khẩu" value={form.password} onChange={handleChange} />

						{status.message && <p className={`form-status ${status.type}`}>{status.message}</p>}
						<button className="primary-button" type="submit" disabled={isSubmitting}>
							<span aria-hidden="true">→</span>
							{isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
						</button>
					</form>

					<div className="demo-credential">
						<span>Bản preview sử dụng mật khẩu mẫu</span>
						<strong>demo123</strong>
					</div>

					<div className="sample-flow">
						<p>XEM LUỒNG MẪU</p>
						<div>
							<button type="button">Admin</button>
							<button type="button">Engineer</button>
							<button type="button">User</button>
						</div>
					</div>

					<a className="google-button" href={getGoogleLoginUrl()}>
						<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
							<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
							<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
							<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
							<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
						</svg>
						<span>Đăng nhập bằng Google</span>
					</a>
					<p className="switch-copy">Chưa có tài khoản? <Link to="/register">Tạo tài khoản</Link></p>
				</section>
			</section>

			<ForgotPasswordModal
				isOpen={isForgotPasswordOpen}
				onClose={() => setIsForgotPasswordOpen(false)}
			/>
		</main>
	);
}
