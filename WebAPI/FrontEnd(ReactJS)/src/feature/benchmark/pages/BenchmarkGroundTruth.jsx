import React, { useEffect, useRef, useState } from 'react';
import { importGroundTruthPair } from '../domain/groundTruth';
import { Button } from '../../../components/common/UIComponents';
export { GroundTruthPreview } from './GroundTruthPreview';

export function GroundTruthImporter({ cases, onImport, en, disabled }) {
  const [files, setFiles] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const t = (vi, english) => en ? english : vi;
  const run = async () => {
    setError(''); setLoading(true);
    try {
      if (files.vi.size > 2 * 1024 * 1024 || files.en.size > 2 * 1024 * 1024) throw new Error(t('Mỗi file tối đa 2 MB.', 'Maximum 2 MB per file.'));
      const [vi, english] = await Promise.all([files.vi, files.en].map(async file => JSON.parse((await file.text()).replace(/^\uFEFF/, ''))));
      const result = importGroundTruthPair(vi, english, cases);
      if (active.current) onImport(result);
    } catch (e) { if (active.current) setError(e.message); }
    finally { if (active.current) setLoading(false); }
  };
  return <section className="benchmark-case-editor">
    <h3>{t('Nhập ground truth Việt / Anh', 'Import Vietnamese / English ground truth')}</h3>
    <p>{t('Chỉ cập nhật bản đề xuất; Admin cần duyệt trước khi lưu chính thức. Case khớp theo case_id, mã hoặc tên rosbag; case khác được giữ nguyên.',
      'Updates the proposal only; Admin approval is required for publication. Matches by case_id, code or rosbag name; other cases are retained.')}</p>
    <div className="benchmark-review-form">{['vi', 'en'].map(lang => <label className="field" key={lang}>
      <span>{lang === 'vi' ? 'ground_truth_vi.json' : 'ground_truth_en.json'}</span>
      <input type="file" accept=".json,application/json" disabled={disabled || loading}
        onChange={e => { setFiles(previous => ({ ...previous, [lang]: e.target.files[0] })); setError(''); }} />
    </label>)}</div>
    <Button type="button" variant="secondary" disabled={disabled || loading || !files.vi || !files.en} onClick={run}>
      {loading ? t('Đang đọc…', 'Reading…') : t('Nhập vào đề xuất', 'Import into proposal')}
    </Button>
    <p className="small-note">{t('Hãy kiểm tra tên file và thời gian trước khi gửi. Nếu case mới không có end_sec, ô kết thúc tạm bằng ô bắt đầu, không có nghĩa lỗi chỉ kéo dài 0 giây. Ground truth giữ nguyên việc thiếu mốc kết thúc.',
      'Check filenames and time windows before submission. If a new case has no end_sec, the form initially uses its start time; this does not mean a zero-duration fault. Ground truth retains the missing end time.')}</p>
    {error && <p role="alert" className="benchmark-review-error">{error}</p>}
  </section>;
}

