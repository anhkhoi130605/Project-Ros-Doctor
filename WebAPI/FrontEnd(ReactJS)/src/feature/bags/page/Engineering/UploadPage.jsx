import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../../../stored/appStore';
import { PageHeader, Card, Button, Notice, FormField, Icon } from '../../../../components/common/UIComponents';

export default function UploadPage() {
  const navigate = useNavigate();
  const { dispatch, notify } = useApp();
  const [file, setFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!file) {
      notify('Vui lòng chọn một tệp log .mcap, .db3 hoặc .zip', 'warning');
      return;
    }

    const newBag = {
      id: `bag-${Date.now().toString().slice(-3)}`,
      name: file.name,
      sizeMb: Math.round(file.size / (1024 * 1024)) || 145,
      format: file.name.endsWith('.mcap') ? 'mcap' : file.name.endsWith('.db3') ? 'db3' : 'zip',
      durationSec: 180,
      topicCount: 14,
      status: 'complete',
      sessionId: `SESS-${Date.now().toString().slice(-3)}`,
    };

    dispatch({ type: 'IMPORT_BAG', bag: newBag });
    notify(`Đã nạp tệp ${file.name} thành công. Bắt đầu phân tích.`, 'success');
    navigate('/bags');
  };

  return (
    <div className="upload-page">
      <PageHeader
        eyebrow="NẠP DỮ LIỆU"
        title="Nạp bản ghi ROSBag mới"
        subtitle="Tải lên tệp log .mcap hoặc .db3 được ghi từ hệ thống ROS2 trên robot."
      />

      <Card style={{ maxWidth: '720px', margin: '0 auto' }}>
        <form onSubmit={handleUploadSubmit}>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleFileDrop}
            style={{
              border: isDragOver ? '2px dashed var(--cyan)' : '2px dashed var(--border)',
              borderRadius: '12px',
              padding: '48px 24px',
              textAlign: 'center',
              background: isDragOver ? 'rgba(81, 220, 248, 0.05)' : 'var(--panel)',
              cursor: 'pointer',
              marginBottom: '24px',
              transition: 'all 0.2s',
            }}
            onClick={() => document.getElementById('bag-file-input')?.click()}
          >
            <div style={{ color: 'var(--cyan)', marginBottom: '12px' }}>
              <Icon name="upload" size={48} />
            </div>
            <h3 style={{ margin: '0 0 8px', color: 'var(--text)' }}>
              {file ? file.name : 'Kéo thả tệp rosbag vào đây'}
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
              Hỗ trợ định dạng <code>.mcap</code>, <code>.db3</code>, hoặc <code>.zip</code> chứa log rosbag.
            </p>
            <input
              id="bag-file-input"
              type="file"
              accept=".mcap,.db3,.zip"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>

          {file && (
            <Notice tone="green" icon="check" className="mb-4">
              Đã chọn tệp: <strong>{file.name}</strong> ({Math.round(file.size / 1024)} KB)
            </Notice>
          )}

          <div className="button-row" style={{ justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => navigate('/bags')}>
              Hủy bỏ
            </Button>
            <Button type="submit" icon="arrow" disabled={!file}>
              Bắt đầu nạp & phân tích
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
