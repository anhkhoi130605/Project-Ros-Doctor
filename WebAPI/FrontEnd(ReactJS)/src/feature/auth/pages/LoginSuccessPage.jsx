import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import '../auth.css';

// Helper function to decode JWT payload safely without extra libraries
function parseJwt(token) {
	try {
		const base64Url = token.split('.')[1];
		if (!base64Url) return null;
		const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
		const jsonPayload = decodeURIComponent(
			atob(base64)
				.split('')
				.map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
				.join('')
		);
		return JSON.parse(jsonPayload);
	} catch (err) {
		console.error('Failed to parse JWT:', err);
		return null;
	}
}

export default function LoginSuccessPage() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const [status, setStatus] = useState({
		isProcessing: true,
		isSuccess: false,
		message: 'Đang xác thực đăng nhập Google...'
	});

	useEffect(() => {
		const token = searchParams.get('token');
		const error = searchParams.get('error');

		if (error) {
			setStatus({
				isProcessing: false,
				isSuccess: false,
				message: decodeURIComponent(error) || 'Xác thực tài khoản Google thất bại.'
			});
			return;
		}

		if (!token) {
			setStatus({
				isProcessing: false,
				isSuccess: false,
				message: 'Không tìm thấy mã xác thực token từ hệ thống.'
			});
			return;
		}

		try {
			// 1. Lưu token vào localStorage
			localStorage.setItem('accessToken', token);

			// 2. Giải mã token để lấy thông tin vai trò (role) và email
			const payload = parseJwt(token);
			const role =
				payload?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
				payload?.role ||
				payload?.Role ||
				'';

			if (role) {
				localStorage.setItem('userRole', role);
			}

			const email =
				payload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ||
				payload?.email ||
				'';
			if (email) {
				localStorage.setItem('userEmail', email);
			}

			const currentUser = {
				id: payload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || payload?.sub || '',
				email: email,
				fullName: payload?.name || (email ? email.split('@')[0] : 'User'),
				role: role
			};
			localStorage.setItem('currentUser', JSON.stringify(currentUser));

			setStatus({
				isProcessing: false,
				isSuccess: true,
				message: 'Đăng nhập Google thành công! Đang chuyển hướng...'
			});

			// 3. Chuyển hướng theo vai trò sau 600ms
			const timer = setTimeout(() => {
				const normalizedRole = (role || '').toLowerCase();
				if (normalizedRole.includes('admin')) {
					navigate('/admin-dashboard', { replace: true });
				} else if (normalizedRole.includes('user')) {
					navigate('/user-dashboard', { replace: true });
				} else {
					navigate('/dashboard', { replace: true });
				}
			}, 600);

			return () => clearTimeout(timer);
		} catch (err) {
			console.error('Error handling google login callback:', err);
			setStatus({
				isProcessing: false,
				isSuccess: false,
				message: 'Đã xảy ra lỗi khi lưu thông tin đăng nhập.'
			});
		}
	}, [searchParams, navigate]);

	return (
		<main className="auth-shell">
			<section className="auth-visual">
				<div className="visual-mark">CSN</div>
				<p className="eyebrow">Ctrl Shift N / Authentication</p>
				<h1>Welcome back to your workspace.</h1>
				<p className="visual-copy">
					Hệ thống đang kết nối tài khoản Google và thiết lập phiên làm việc an toàn cho bạn.
				</p>
				<div className="visual-note">
					<span>03</span>
					<span>Secure Single Sign-On</span>
				</div>
			</section>

			<section className="auth-panel">
				<div className="auth-card" style={{ textAlign: 'center' }}>
					<div className="mobile-mark">CSN</div>
					<p className="eyebrow">Google Authentication</p>
					<h2>{status.isSuccess ? 'Thành công!' : status.isProcessing ? 'Đang xử lý' : 'Thông báo'}</h2>
					<p className="form-intro" style={{ margin: '0 auto 28px', maxWidth: '380px' }}>
						{status.message}
					</p>

					{status.isProcessing && (
						<div className="auth-loader-container" style={{ margin: '24px 0 32px' }}>
							<div className="auth-spinner" />
						</div>
					)}

					{status.isSuccess && (
						<div style={{ margin: '20px 0 28px' }}>
							<div className="success-badge">
								<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1c5c43" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
									<polyline points="20 6 9 17 4 12" />
								</svg>
							</div>
						</div>
					)}

					{!status.isProcessing && !status.isSuccess && (
						<div style={{ marginTop: '24px' }}>
							<Link to="/login" className="primary-button" style={{ display: 'inline-flex' }}>
								Quay lại đăng nhập
							</Link>
						</div>
					)}
				</div>
			</section>
		</main>
	);
}
