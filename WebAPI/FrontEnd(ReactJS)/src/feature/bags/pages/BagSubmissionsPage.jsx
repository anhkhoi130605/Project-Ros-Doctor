import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../../stored/appStore';
import { apiClient } from '../../../service/apiClient/apiClient';
import { PageHeader, Button, Icon } from '../../../components/common/UIComponents';
import { attachSubmissionSessions } from '../utils/submissionSessions';
import './BagSubmissionsPage.css';

export default function BagSubmissionsPage() {
  const { state, notify } = useApp();
  const { i18n } = useTranslation();
  const en = (i18n.resolvedLanguage || i18n.language || 'vi').startsWith('en');
  const txt = (vi, english) => en ? english : vi;
  const canReview = ['admin', 'engineering'].includes(String(state.role).toLowerCase());
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [filter, setFilter] = useState('all');
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState('');
  const [rejectId, setRejectId] = useState(null);
  const [reason, setReason] = useState('');
  const fileInput = useRef(null);
  const mounted = useRef(true);
  const actionPending = useRef(false);
  const loadVersion = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++loadVersion.current;
    try {
      const [data, bags] = await Promise.all([
        apiClient.get('/api/bags/submissions', { noCache: true }),
        apiClient.get('/api/bags', { noCache: true }),
      ]);
      if (!Array.isArray(data)) throw new Error('Invalid submissions response');
      if (!Array.isArray(bags)) throw new Error('Invalid bags response');
      if (mounted.current && version === loadVersion.current) { setEntries(attachSubmissionSessions(data, bags)); setError(''); }
    } catch (e) {
      if (mounted.current && version === loadVersion.current) { setEntries([]); setError(e.message); }
    } finally { if (mounted.current && version === loadVersion.current) setLoading(false); }
  }, []);
  useEffect(() => {
    mounted.current = true;
    refresh();
    const timer = setInterval(() => { if (!document.hidden && !actionPending.current) refresh(); }, 15000);
    return () => { mounted.current = false; clearInterval(timer); loadVersion.current++; };
  }, [refresh]);

  const run = async (key, operation) => {
    if (actionPending.current) return;
    actionPending.current = true;
    setBusy(key);
    try {
      await operation();
      if (mounted.current) { setRejectId(null); setReason(''); await refresh(); }
    } catch (e) {
      if (mounted.current) {
        notify(e.message || txt('Thao tác thất bại.', 'Action failed.'), 'error');
        await refresh();
      }
    } finally { actionPending.current = false; if (mounted.current) setBusy(''); }
  };

  const upload = (event) => {
    event.preventDefault();
    if (!file || !/\.(db3|zip)$/i.test(file.name) || file.size === 0 || file.size > 512 * 1024 * 1024) {
      notify(txt('Chọn file .db3 hoặc .zip hợp lệ, tối đa 512 MB.', 'Choose a non-empty .db3 or .zip file, up to 512 MB.'), 'error');
      return;
    }
    run('upload', async () => {
      const body = new FormData(); body.append('file', file); body.append('description', description);
      await apiClient.post('/api/bags/submissions', body);
      if (mounted.current) { setFile(null); setDescription(''); if (fileInput.current) fileInput.current.value = ''; }
      notify(txt('Đã gửi rosbag. Vui lòng chờ Engineer duyệt.', 'Rosbag submitted. Awaiting engineer review.'), 'success');
    });
  };

  const review = (entry, approve) => {
    if (!approve && !reason.trim()) return;
    if (approve && !window.confirm(txt(`Chấp nhận file ${entry.fileName}?`, `Accept ${entry.fileName}?`))) return;
    run(entry.id, async () => {
      await apiClient.post(`/api/bags/${encodeURIComponent(entry.id)}/review`, { approve, reason: approve ? null : reason.trim() });
      notify(txt('Đã lưu quyết định duyệt.', 'Review saved.'), 'success');
    });
  };

  const statuses = {
    Draft: txt('Bản nháp', 'Draft'), Submitted: txt('Chờ duyệt', 'Awaiting review'), Approved: txt('Đã chấp nhận', 'Accepted'),
    Rejected: txt('Đã từ chối', 'Rejected'),
  };
  const visible = entries.filter(e => filter === 'all' || e.reviewStatus === filter);
  const statusIcons = { Draft: 'file-text', Submitted: 'clock', Approved: 'check', Rejected: 'x' };
  const date = value => value ? new Date(value).toLocaleString(en ? 'en-US' : 'vi-VN') : '—';
  return (
    <div className="bag-submissions">
      <PageHeader title={canReview ? txt('Duyệt rosbag được gửi', 'Rosbag review queue') : txt('Gửi rosbag & theo dõi', 'Submit & track rosbags')}
        subtitle={canReview ? txt('Kiểm tra file được gửi và quản lý quyết định duyệt trong một nơi.', 'Review submitted files and manage decisions in one place.') : txt('Gửi dữ liệu robot cho kỹ sư và theo dõi kết quả duyệt của bạn.', 'Send robot data to an engineer and follow your review results.')}>
        <Button variant="secondary" icon="reset" disabled={!!busy || loading} onClick={refresh}>{txt('Làm mới', 'Refresh')}</Button>
      </PageHeader>
      <div className="bs-summary" aria-label={txt('Tổng quan file gửi', 'Submission overview')}>
        {['all', 'Submitted', 'Approved', 'Rejected'].map(status => <div className="bs-metric" key={status}>
          <span className={`bs-metric-icon bs-tone-${status}`}><Icon name={statusIcons[status] || 'database'} size={20} /></span>
          <div><span>{status === 'all' ? txt('Tổng file đã gửi', 'Total submissions') : statuses[status]}</span>
            <strong>{loading || error ? '—' : status === 'all' ? entries.length : entries.filter(entry => entry.reviewStatus === status).length}</strong>
          </div>
        </div>)}
      </div>

      {!canReview && <section className="bs-upload-panel" aria-labelledby="bs-upload-title">
        <form onSubmit={upload} className="bs-upload-form">
          <div className="bs-section-heading"><h2 id="bs-upload-title">{txt('Gửi rosbag mới', 'Submit a rosbag')}</h2><p>{txt('Chọn file và mô tả nội dung cần kỹ sư kiểm tra.', 'Choose a file and describe what needs inspection.')}</p></div>
          <label className={`bs-file-picker ${file ? 'has-file' : ''} ${busy ? 'is-disabled' : ''}`}>
            <input ref={fileInput} type="file" accept=".db3,.zip" required disabled={!!busy} aria-label={txt('Chọn file rosbag', 'Choose rosbag file')} onChange={e => setFile(e.target.files?.[0] || null)} />
            <span className="bs-file-symbol"><Icon name={file ? 'file-text' : 'upload'} size={26} /></span>
            <strong>{file ? file.name : txt('Chọn file rosbag từ máy tính', 'Choose a rosbag from your computer')}</strong>
            <span>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : txt('.db3 hoặc .zip · Tối đa 512 MB', '.db3 or .zip · Up to 512 MB')}</span>
            <span className="bs-file-cta">{file ? txt('Đổi file', 'Change file') : txt('Chọn file', 'Browse files')}<Icon name="arrow" size={16} /></span>
          </label>
          <label className="bs-field"><span>{txt('Mô tả / yêu cầu kiểm tra', 'Description / inspection request')} <small>{txt('(không bắt buộc)', '(optional)')}</small></span>
            <textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={2000} rows={3} disabled={!!busy} placeholder={txt('Ví dụ: Robot mất tín hiệu /scan khi chuyển hướng…', 'For example: The robot loses /scan signals when turning…')} />
          </label>
          <div className="bs-form-footer"><span className="bs-muted">{description.length}/2.000 {txt('ký tự', 'characters')}</span><Button type="submit" icon="upload" disabled={!!busy || !file}>{busy === 'upload' ? txt('Đang kiểm tra và gửi…', 'Validating and uploading…') : txt('Gửi chờ duyệt', 'Submit for review')}</Button></div>
        </form>
        <aside className="bs-guide">
          <span className="bs-eyebrow">{txt('TRƯỚC KHI GỬI', 'BEFORE YOU SUBMIT')}</span>
          <h3>{txt('Dữ liệu rõ ràng.\nDuyệt thuận tiện hơn.', 'Clear data.\nA smoother review.')}</h3>
          <ol>
            <li><strong>{txt('Chuẩn bị file', 'Prepare your file')}</strong><p>{txt('File .db3 hoặc ZIP chứa đúng một file .db3. Chưa hỗ trợ MCAP.', 'Use a .db3 or a ZIP containing exactly one .db3. MCAP is not supported.')}</p></li>
            <li><strong>{txt('Gửi để kiểm tra', 'Submit for inspection')}</strong><p>{txt('Hệ thống kiểm tra cấu trúc topics/messages trước khi đưa file vào hàng đợi.', 'The server validates the topics/messages structure before queuing the file.')}</p></li>
            <li><strong>{txt('Theo dõi kết quả', 'Follow the decision')}</strong><p>{txt('Engineer hoặc Admin duyệt file. Kết quả và ghi chú hiển thị ở danh sách bên dưới.', 'An Engineer or Admin reviews your file. Decisions and notes appear below.')}</p></li>
          </ol>
        </aside>
      </section>}

      <div className="bs-notice"><Icon name="info" size={19} /><p>{txt('Duyệt file không tự chạy phân tích hoặc tạo báo cáo. Rosbag được chấp nhận có thể sử dụng trong luồng phân tích hiện tại.', 'Approval does not automatically run analysis or create a report. Accepted rosbags can be used in the existing analysis workflow.')}</p></div>

      <section className="bs-list" aria-labelledby="bs-list-title">
        <div className="bs-list-header">
          <div className="bs-section-heading"><h2 id="bs-list-title">{canReview ? txt('Hàng đợi & lịch sử duyệt', 'Queue & review history') : txt('File đã gửi', 'Your submissions')}</h2><p>{txt('Danh sách tự cập nhật mỗi 15 giây khi mở trang.', 'The list refreshes every 15 seconds while this page is visible.')}</p></div>
          <label className="bs-filter">{txt('Trạng thái', 'Status')}<select value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">{txt('Tất cả', 'All')}</option>
            {Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
        </div>
        {error ? <div className="bs-empty bs-error" role="alert"><Icon name="alert" size={28} /><h3>{txt('Không thể tải danh sách', 'Unable to load submissions')}</h3><p>{error}</p><Button variant="secondary" onClick={refresh} disabled={!!busy}>{txt('Thử lại', 'Retry')}</Button></div> : loading ?
          <div className="bs-empty" role="status"><Icon name="loader" className="spin" size={28} /><p>{txt('Đang tải danh sách…', 'Loading submissions…')}</p></div> : !visible.length ?
          <div className="bs-empty"><span className="bs-empty-icon"><Icon name="hard-drive" size={30} /></span><h3>{entries.length ? txt('Không có file ở trạng thái này', 'No files with this status') : txt('Chưa có file gửi duyệt', 'No submissions yet')}</h3><p>{entries.length ? txt('Chọn trạng thái khác để xem các file đã gửi.', 'Choose another status to view your submissions.') : canReview ? txt('File mới từ người dùng sẽ xuất hiện tại đây.', 'New user submissions will appear here.') : txt('Chọn rosbag ở phía trên để gửi file đầu tiên của bạn.', 'Choose a rosbag above to submit your first file.')}</p></div> :
          <div className="bs-table-scroll" role="region" aria-label={txt('Danh sách file gửi duyệt', 'Submitted files')} tabIndex={0}><table className="bs-table">
            <thead><tr><th scope="col">{txt('File / mô tả', 'File / description')}</th><th scope="col">{txt('Trạng thái', 'Status')}</th><th scope="col">{txt('Kết quả duyệt', 'Review decision')}</th><th scope="col">{txt('Thao tác', 'Actions')}</th></tr></thead>
            <tbody>{visible.map(entry => <React.Fragment key={entry.id}><tr>
              <td><div className="bs-file-heading"><span className="bs-row-icon"><Icon name="file-text" size={20} /></span><div><strong className="bs-filename">{entry.fileName}</strong><div className="bs-metadata">{(entry.sizeBytes / 1024 / 1024).toFixed(2)} MB <span>·</span> {entry.topicCount} topics</div></div></div>
                <div className="bs-file-details"><time className="bs-muted">{date(entry.createdAt)}</time>
                  {entry.description && <p className="bs-description">{entry.description}</p>}
                  {canReview && <small className="bs-muted">{txt('Người gửi: ', 'Submitted by: ')}{entry.userId}</small>}
                </div>
              </td>
              <td><span className={`bs-status bs-tone-${entry.reviewStatus}`}><Icon name={statusIcons[entry.reviewStatus] || 'info'} size={14} />{busy === entry.id ? txt('Đang lưu…', 'Saving…') : statuses[entry.reviewStatus] || entry.reviewStatus}</span></td>
              <td><p className="bs-review-note">{entry.reviewNote || (entry.reviewStatus === 'Submitted' ? txt('Chưa có quyết định', 'No decision yet') : '—')}</p>
                {entry.reviewedAt && <time className="bs-muted">{date(entry.reviewedAt)}</time>}
              </td>
              <td><div className="bs-row-actions">
                {canReview && entry.reviewStatus === 'Submitted' && <>
                  <Button icon="check" disabled={!!busy} onClick={() => review(entry, true)}>{txt('Chấp nhận', 'Accept')}</Button>
                  <Button variant="secondary" className="bs-reject-button" disabled={!!busy} aria-expanded={rejectId === entry.id} aria-controls={rejectId === entry.id ? `bs-reject-${entry.id}` : undefined} onClick={() => { setRejectId(entry.id); setReason(''); }}>{txt('Từ chối', 'Reject')}</Button>
                </>}
                {entry.reviewStatus === 'Approved' && <div className="bs-session-action">
                  {entry.sessionId ? <Button variant="secondary" icon="arrow" to={`/sessions/${encodeURIComponent(entry.sessionId)}`}>
                    {txt('Xem chi tiết', 'View details')}
                  </Button> : <>
                    <Button variant="secondary" icon="arrow" disabled>{txt('Xem chi tiết', 'View details')}</Button>
                    <span className="bs-muted">{txt('Chưa có phiên phân tích', 'No analysis session yet')}</span>
                  </>}
                </div>}
                {entry.reviewStatus !== 'Approved' && (!canReview || entry.reviewStatus !== 'Submitted') && <span className="bs-muted">{entry.reviewStatus === 'Submitted' ? txt('Đang chờ Engineer duyệt', 'Awaiting engineer review') : entry.reviewStatus === 'Draft' ? txt('Chưa gửi duyệt', 'Not submitted') : txt('Đã hoàn tất duyệt', 'Review completed')}</span>}
              </div></td>
            </tr>
              {rejectId === entry.id && <tr className="bs-rejection-row"><td colSpan={4}>
                <form id={`bs-reject-${entry.id}`} className="bs-rejection-form" onSubmit={e => { e.preventDefault(); review(entry, false); }}>
                  <label className="bs-field"><span>{txt('Lý do từ chối (bắt buộc)', 'Rejection reason (required)')}</span><textarea autoFocus required rows={2} maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} disabled={!!busy} placeholder={txt('Nêu rõ vấn đề để người gửi có thể chuẩn bị lại file…', 'Explain the issue so the sender can prepare a corrected file…')} /></label>
                  <div className="bs-rejection-actions"><Button variant="secondary" disabled={!!busy} onClick={() => setRejectId(null)}>{txt('Hủy', 'Cancel')}</Button><Button type="submit" className="bs-confirm-reject" disabled={!!busy || !reason.trim()}>{txt('Xác nhận từ chối', 'Confirm rejection')}</Button></div>
                </form>
              </td></tr>}
            </React.Fragment>)}</tbody>
          </table></div>}
        {!loading && !error && visible.length > 0 && <div className="bs-list-footer">{txt(`Hiển thị ${visible.length} / ${entries.length} file`, `Showing ${visible.length} of ${entries.length} files`)}</div>}
      </section>
    </div>
  );
}
