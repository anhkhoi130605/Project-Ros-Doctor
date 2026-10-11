import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../../stored/appStore';
import { apiClient } from '../../../service/apiClient/apiClient';
import { Button, PageHeader } from '../../../components/common/UIComponents';
import { compareCases, emptyCase, proposalFrom } from '../domain/benchmarkReview';
import './benchmark-review.css';
import BenchmarkRequestCard from './BenchmarkRequestCard';

export default function BenchmarkManagementPage() {
  const { state, notify } = useApp();
  const { i18n } = useTranslation();
  const en = (i18n.resolvedLanguage || i18n.language || 'vi').startsWith('en');
  const t = (vi, english) => en ? english : vi;
  const admin = String(state.role).toLowerCase() === 'admin';
  const [page, setPage] = useState(1);
  const [list, setList] = useState({ items: [], total: 0 });
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [casePage, setCasePage] = useState(0);
  const active = useRef(true), listVersion = useRef(0), detailVersion = useRef(0), pending = useRef(false);
  const labels = { Pending: t('Chờ duyệt', 'Pending'), Approved: t('Đã duyệt', 'Approved'),
    Rejected: t('Từ chối', 'Rejected'), Cancelled: t('Đã hủy', 'Cancelled') };
  const refresh = useCallback(async () => {
    const version = ++listVersion.current;
    setLoading(true);
    try {
      const data = await apiClient.get(`/api/benchmarks?page=${page}&pageSize=25`, { noCache: true });
      if (!Array.isArray(data?.items)) throw new Error('Invalid benchmark response');
      if (active.current && version === listVersion.current) { setList(data); setError(''); }
    } catch (e) {
      if (active.current && version === listVersion.current) { setList({ items: [], total: 0 }); setError(e.message); }
    } finally { if (active.current && version === listVersion.current) setLoading(false); }
  }, [page]);
  useEffect(() => {
    active.current = true; refresh();
    return () => { active.current = false; listVersion.current++; detailVersion.current++; };
  }, [refresh]);

  const open = async code => {
    const version = ++detailVersion.current;
    setSelected(null); setDraft(null); setNote(''); setDetailLoading(true); setCasePage(0);
    try {
      const data = await apiClient.get(`/api/benchmarks/${encodeURIComponent(code)}`, { noCache: true });
      if (active.current && version === detailVersion.current) setSelected(data);
    } catch (e) { if (active.current && version === detailVersion.current) setError(e.message); }
    finally { if (active.current && version === detailVersion.current) setDetailLoading(false); }
  };
  const run = async (endpoint, body, code) => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try {
      const result = await apiClient.post(endpoint, body, { handleErrorLocally: true });
      if (active.current) {
        notify(result.message, 'success'); setDraft(null); await refresh(); await open(code);
      }
    } catch (e) {
      if (active.current) setError(e.message);
    } finally { pending.current = false; if (active.current) setBusy(false); }
  };
  const startDraft = dataset => {
    detailVersion.current++; setDetailLoading(false); setCasePage(0); setError('');
    setSelected(dataset); setDraft(proposalFrom(dataset));
  };
  const setContent = (key, value) => setDraft(d => ({ ...d, proposedData: { ...d.proposedData, [key]: value } }));
  const setCase = (index, key, value) => setDraft(d => ({ ...d, proposedData: { ...d.proposedData,
    testCases: d.proposedData.testCases.map((item, i) => i === index ? { ...item, [key]: value } : item) } }));
  const request = selected?.changeRequest;
  const isPending = request?.status === 'Pending';
  const ownRequest = request?.requestedBy === state.currentUserId;
  const rows = selected ? compareCases(selected.isPublished ? selected.testCases : [], request?.proposedData?.testCases || selected.testCases) : [];
  const showingProposal = !!request;
  const caseSummary = item => item ? <>
    <strong translate="no">{item.rosbagName}</strong><span translate="no">{item.topic || '—'} · {item.startSec}–{item.endSec}s</span>
    <span translate="no">{item.label}</span>{item.groundTruth && <details><summary>{t('Dữ liệu chuẩn đối chiếu', 'Ground truth')}</summary><pre>{item.groundTruth}</pre></details>}
  </> : '—';

  return <div className="benchmark-review-page">
    <PageHeader title={t('Benchmark & bộ dữ liệu chuẩn', 'Benchmarks & ground truth')}
      subtitle={t('Engineer đề xuất. Admin kiểm tra và duyệt trước khi đưa vào sử dụng.', 'Engineers propose. Admins review before publication.')} />
    <div className="benchmark-review-notice">{t('Chỉ dữ liệu đã duyệt được dùng cho đánh giá và RAG. Mỗi bộ có một yêu cầu chờ duyệt; thông tin bên dưới lưu quyết định gần nhất.', 'Only published data is used for evaluation and RAG. One pending request per dataset; the latest decision is retained.')}</div>
    {error && <div className="benchmark-review-error" role="alert">{error} <Button variant="secondary" onClick={() => { setSelected(null); setDraft(null); refresh(); }} disabled={busy}>{t('Tải lại', 'Reload')}</Button></div>}
    <section className="benchmark-review-panel">
      <div className="benchmark-review-heading"><div><h2>{t('Toàn bộ benchmark', 'All benchmarks')}</h2><p>{list.total} {t('bộ dữ liệu trong hệ thống', 'datasets in the system')}</p></div>
        <div className="button-row"><Button variant="secondary" onClick={refresh} disabled={loading || busy}>{t('Làm mới', 'Refresh')}</Button>
          <Button onClick={() => startDraft(null)} disabled={busy}>{t('Đề xuất thêm mới', 'Propose dataset')}</Button></div></div>
      <div className="table-scroll"><table><thead><tr><th>{t('Bộ benchmark', 'Dataset')}</th><th>{t('Bản chính thức', 'Published version')}</th><th>{t('Yêu cầu gần nhất', 'Latest request')}</th><th>{t('Thao tác', 'Action')}</th></tr></thead>
        <tbody>{loading ? <tr><td colSpan={4}>{t('Đang tải…', 'Loading…')}</td></tr> : list.items.map(item => <tr key={item.code}>
          <td translate="no"><strong>{item.name}</strong><small>{item.code}</small></td>
          <td>{item.isPublished ? `v${item.version} · ${item.totalCases} ${t('trường hợp', 'cases')}` : t('Chưa công bố', 'Unpublished')}</td>
          <td><span className={`benchmark-status ${item.requestStatus || ''}`}>{labels[item.requestStatus] || t('Không có yêu cầu', 'No request')}</span></td>
          <td><Button variant="secondary" disabled={busy} onClick={() => open(item.code)}>{t('Xem chi tiết', 'View details')}</Button></td></tr>)}
          {!loading && !list.items.length && <tr><td colSpan={4}>{t('Chưa có benchmark để hiển thị.', 'No benchmarks to display.')}</td></tr>}</tbody></table></div>
      <div className="benchmark-review-pagination"><Button variant="secondary" disabled={page <= 1 || busy || loading} onClick={() => setPage(p => p - 1)}>{t('Trước', 'Previous')}</Button>
        <span>{t('Trang', 'Page')} {page} / {Math.max(1, Math.ceil(list.total / 25))}</span><Button variant="secondary" disabled={page * 25 >= list.total || busy || loading} onClick={() => setPage(p => p + 1)}>{t('Tiếp', 'Next')}</Button></div>
    </section>
    {detailLoading && <p role="status">{t('Đang tải chi tiết…', 'Loading details…')}</p>}
    {draft ? <section className="benchmark-review-panel"><form onSubmit={e => {
      e.preventDefault(); run('/api/benchmarks/requests', draft, draft.code);
    }}><fieldset disabled={busy}><div className="benchmark-review-heading"><h2>{draft.requestType === 'Update' ? t('Đề xuất cập nhật', 'Propose update') : t('Đề xuất thêm mới', 'Propose dataset')}</h2>
        <Button variant="secondary" type="button" onClick={() => setDraft(null)}>{t('Đóng', 'Close')}</Button></div>
      <div className="benchmark-review-form"><label className="field"><span>{t('Mã benchmark', 'Benchmark code')}</span><input required maxLength={100} pattern="[A-Z0-9][A-Z0-9_-]{0,99}" readOnly={!!selected}
        value={draft.code} onChange={e => setDraft(d => ({ ...d, code: e.target.value.toUpperCase() }))} placeholder="BENCHMARK-NEW" /></label>
        <label className="field"><span>{t('Tên bộ dữ liệu', 'Dataset name')}</span><input required maxLength={200} value={draft.proposedData.name} onChange={e => setContent('name', e.target.value)} /></label>
        <label className="field wide"><span>{t('Nguồn / mô tả dữ liệu', 'Data source / description')}</span><textarea maxLength={2000} value={draft.proposedData.provenance} onChange={e => setContent('provenance', e.target.value)} /></label></div>
      <div className="benchmark-review-heading"><h3>{t('Trường hợp kiểm thử', 'Test cases')} ({draft.proposedData.testCases.length})</h3>
        <Button type="button" variant="secondary" disabled={draft.proposedData.testCases.length >= 5000} onClick={() => { setContent('testCases', [...draft.proposedData.testCases, emptyCase()]); setCasePage(Math.floor(draft.proposedData.testCases.length / 10)); }}>{t('Thêm trường hợp', 'Add case')}</Button></div>
      {draft.proposedData.testCases.slice(casePage * 10, (casePage + 1) * 10).map((item, offset) => {
        const index = casePage * 10 + offset;
        return <div className="benchmark-case-editor" key={index}><div className="benchmark-review-heading"><strong>#{index + 1}</strong><Button type="button" variant="ghost" disabled={draft.proposedData.testCases.length <= 1} onClick={() => {
          setContent('testCases', draft.proposedData.testCases.filter((_, i) => i !== index)); setCasePage(0);
        }}>{t('Xóa khỏi đề xuất', 'Remove from proposal')}</Button></div><div className="benchmark-review-form">
          {[["code", t('Mã trường hợp', 'Case code'), 100], ['rosbagName', 'Rosbag', 255], ['topic', 'Topic / TF', 1000], ['label', t('Nhãn lỗi', 'Fault label'), 200]].map(([key, label, max]) => <label className="field" key={key}><span>{label}</span><input required={key !== 'topic'} maxLength={max} value={item[key] || ''} onChange={e => setCase(index, key, e.target.value)} /></label>)}
          {['startSec', 'endSec'].map(key => <label className="field" key={key}><span>{key === 'startSec' ? t('Bắt đầu (giây)', 'Start (seconds)') : t('Kết thúc (giây)', 'End (seconds)')}</span><input type="number" min={key === 'endSec' ? item.startSec : 0} step="any" required value={item[key]} onChange={e => setCase(index, key, e.target.value === '' ? '' : Number(e.target.value))} /></label>)}
          <label className="field wide"><span>{t('Dữ liệu chuẩn đối chiếu', 'Ground truth')}</span><textarea maxLength={20000} value={item.groundTruth || ''} onChange={e => setCase(index, 'groundTruth', e.target.value)} /></label></div></div>;
      })}
      <div className="benchmark-review-pagination"><Button type="button" variant="secondary" disabled={casePage === 0} onClick={() => setCasePage(p => p - 1)}>{t('Trước', 'Previous')}</Button><span>{casePage + 1} / {Math.ceil(draft.proposedData.testCases.length / 10)}</span><Button type="button" variant="secondary" disabled={(casePage + 1) * 10 >= draft.proposedData.testCases.length} onClick={() => setCasePage(p => p + 1)}>{t('Tiếp', 'Next')}</Button></div>
      <div className="benchmark-review-heading"><p>{t('Gửi đề xuất không thay đổi bản đang sử dụng. Mã đã tồn tại sẽ được báo để bạn chọn cập nhật.', 'Submitting does not change published data. Existing codes must be opened for update.')}</p><Button type="submit">{busy ? t('Đang gửi…', 'Submitting…') : t('Gửi Admin duyệt', 'Submit for review')}</Button></div>
    </fieldset></form></section> : selected && <section className="benchmark-review-panel">
      <div className="benchmark-review-heading"><div><h2 translate="no">{selected.name}</h2><p><span translate="no">{selected.code}</span> · {selected.isPublished ? `v${selected.version}` : t('Chưa công bố', 'Unpublished')}</p></div>
        {!isPending && (selected.isPublished || ownRequest) && <Button disabled={busy} onClick={() => startDraft(selected)}>{t('Gửi đề xuất mới', 'New proposal')}</Button>}</div>
      {request && <BenchmarkRequestCard request={request} en={en} />}
      <div className="benchmark-review-comparison"><div><h3>{t('Dữ liệu chính thức', 'Published data')}</h3><p translate="no">{selected.isPublished ? selected.name : '—'}</p><p translate="no">{selected.isPublished ? selected.provenance : ''}</p></div>
        {showingProposal && <div><h3>{t('Nội dung đề xuất gần nhất', 'Latest proposed data')}</h3><p translate="no">{request.proposedData.name}</p><p translate="no">{request.proposedData.provenance}</p></div>}</div>
      <p className="small-note">{t('Xanh: thêm mới · Đỏ: xóa · Vàng: thay đổi. Nội dung bên trái luôn là bản chính thức hiện tại.', 'Green: added · Red: removed · Amber: changed. Left side is the current published version.')}</p>
      <div className="table-scroll"><table><thead><tr><th>{t('Mã trường hợp', 'Case code')}</th><th>{t('Chính thức', 'Published')}</th>{showingProposal && <th>{t('Đề xuất', 'Proposed')}</th>}</tr></thead><tbody>
        {rows.slice(casePage * 10, (casePage + 1) * 10).map(row => <tr className={showingProposal ? `benchmark-diff-${row.status}` : ''} key={row.code}><td>{row.code}</td><td className="benchmark-case-content">{caseSummary(row.before)}</td>{showingProposal && <td className="benchmark-case-content">{caseSummary(row.after)}</td>}</tr>)}</tbody></table></div>
      <div className="benchmark-review-pagination"><Button variant="secondary" disabled={casePage === 0} onClick={() => setCasePage(p => p - 1)}>{t('Trước', 'Previous')}</Button><span>{casePage + 1} / {Math.max(1, Math.ceil(rows.length / 10))}</span><Button variant="secondary" disabled={(casePage + 1) * 10 >= rows.length} onClick={() => setCasePage(p => p + 1)}>{t('Tiếp', 'Next')}</Button></div>
      {isPending && admin && <form className="benchmark-review-decision" onSubmit={e => { e.preventDefault(); run(`/api/benchmarks/${encodeURIComponent(selected.code)}/review`, { requestId: request.requestId, approve: true, note }, selected.code); }}>
        <label className="field"><span>{t('Ghi chú duyệt (bắt buộc khi từ chối)', 'Review note (required for rejection)')}</span><textarea maxLength={2000} value={note} onChange={e => setNote(e.target.value)} disabled={busy} /></label>
        <div className="button-row"><Button type="submit" disabled={busy}>{t('Duyệt & áp dụng', 'Approve & publish')}</Button><Button type="button" variant="secondary" disabled={busy || !note.trim()} onClick={() => run(`/api/benchmarks/${encodeURIComponent(selected.code)}/review`, { requestId: request.requestId, approve: false, note }, selected.code)}>{t('Từ chối', 'Reject')}</Button></div>
      </form>}
      {isPending && ownRequest && <Button variant="secondary" disabled={busy} onClick={() => run(`/api/benchmarks/${encodeURIComponent(selected.code)}/cancel`, { requestId: request.requestId }, selected.code)}>{t('Hủy yêu cầu của tôi', 'Cancel my request')}</Button>}
    </section>}
  </div>;
}
