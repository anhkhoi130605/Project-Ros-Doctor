import React from 'react';

export default function BenchmarkRequestCard({ request, en = false }) {
  const t = (vi, english) => en ? english : vi;
  const statuses = {
    Pending: [t('Chờ duyệt', 'Pending review'), t('Đề xuất đang chờ Admin kiểm tra.', 'This proposal is awaiting an admin review.')],
    Approved: [t('Đã duyệt', 'Approved'), t('Đề xuất đã được áp dụng vào bộ dữ liệu chính thức.', 'This proposal has been published to the official dataset.')],
    Rejected: [t('Đã từ chối', 'Rejected'), t('Đề xuất chưa được áp dụng. Xem ghi chú bên dưới để bổ sung.', 'This proposal was not applied. See the review note below.')],
    Cancelled: [t('Đã hủy', 'Cancelled'), t('Người gửi đã hủy yêu cầu này.', 'The requester cancelled this proposal.')],
  };
  const [status, description] = statuses[request.status] || [t('Chưa xác định', 'Unknown status'), ''];
  const date = value => {
    if (!value || Number.isNaN(new Date(value).getTime())) return '—';
    return new Intl.DateTimeFormat(en ? 'en-GB' : 'vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(new Date(value));
  };
  const person = (name, label, timestamp, empty = false) => {
    const displayName = name?.trim() || t('Chưa có thông tin tên', 'Name unavailable');
    const initials = name?.trim().split(/\s+/).slice(-2).map(part => Array.from(part)[0]).join('').toLocaleUpperCase() || '?';
    return <div className={`benchmark-request-person${empty ? ' is-waiting' : ''}`}>
      <span className="benchmark-person-avatar" aria-hidden="true" translate="no">{empty ? '…' : initials}</span>
      <div><span className="benchmark-meta-label">{label}</span>
        <strong data-i18n-ignore="true">{empty ? t('Chưa có người duyệt', 'Not reviewed yet') : displayName}</strong>
        <span className="benchmark-person-time">{empty ? t('Chưa ghi nhận quyết định duyệt', 'No review decision recorded') : date(timestamp)}</span>
      </div>
    </div>;
  };

  return <section className={`benchmark-request-card ${request.status}`} aria-label={t('Thông tin yêu cầu', 'Request information')}>
    <div className="benchmark-request-header">
      <div><span className="benchmark-meta-label">{t('Yêu cầu gần nhất', 'Latest request')}</span>
        <h3>{request.requestType === 'Create' ? t('Đề xuất thêm benchmark', 'New benchmark proposal') : t('Đề xuất cập nhật benchmark', 'Benchmark update proposal')}</h3>
        <p>{description}</p>
      </div>
      <span className={`benchmark-status ${request.status}`}><span aria-hidden="true">●</span> {status}</span>
    </div>
    <div className="benchmark-request-people">
      {person(request.requestedByName, t('Người gửi', 'Requested by'), request.requestedAt)}
      {person(request.reviewedByName, t('Người duyệt', 'Reviewed by'), request.reviewedAt, !request.reviewedBy)}
    </div>
    {request.reviewNote?.trim() && <div className="benchmark-request-note">
      <span className="benchmark-meta-label">{t('Ghi chú của người duyệt', 'Reviewer’s note')}</span>
      <p translate="no">{request.reviewNote}</p>
    </div>}
  </section>;
}
