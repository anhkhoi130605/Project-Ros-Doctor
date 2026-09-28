import React, { useState, useEffect } from 'react';
import { Icon } from '../../../../../components/common/UIComponents';

export default function LabeledCaseDialog({ isOpen, onClose, onSave, initialData }) {
  const [formData, setFormData] = useState({
    code: 'C01',
    rosbag: 'AGV-Lab',
    topic: '/scan',
    start: 0,
    end: 10,
    label: 'Tần số / mất gói',
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        code: `C0${Math.floor(Math.random() * 90) + 10}`,
        rosbag: 'AGV-Lab',
        topic: '/scan',
        start: 0,
        end: 10,
        label: 'Tần số / mất gói',
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div
      className="dialog-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(6, 10, 22, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 120,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ width: 'min(520px, 100% - 28px)' }}>
        <div className="dialog-heading">
          <h2>Trường hợp có nhãn</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Đóng hộp thoại"
            onClick={onClose}
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="dialog-body">
          <form onSubmit={handleSubmit}>
            <label className="field">
              <span>Rosbag</span>
              <select
                value={formData.rosbag}
                onChange={(e) => setFormData({ ...formData, rosbag: e.target.value })}
              >
                <option value="AGV-Lab">AGV-Lab</option>
                <option value="Warehouse">Warehouse</option>
                <option value="Sensor-Test">Sensor-Test</option>
              </select>
            </label>

            <label className="field">
              <span>Topic / quan hệ TF</span>
              <input
                type="text"
                value={formData.topic}
                placeholder="/scan"
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                required
              />
            </label>

            <div className="form-grid">
              <label className="field">
                <span>Bắt đầu (giây)</span>
                <input
                  type="number"
                  value={formData.start}
                  onChange={(e) => setFormData({ ...formData, start: Number(e.target.value) })}
                  min={0}
                  required
                />
              </label>

              <label className="field">
                <span>Kết thúc (giây)</span>
                <input
                  type="number"
                  value={formData.end}
                  onChange={(e) => setFormData({ ...formData, end: Number(e.target.value) })}
                  min={0}
                  required
                />
              </label>
            </div>

            <label className="field">
              <span>Nhãn lỗi</span>
              <select
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              >
                <option value="Tần số / mất gói">Tần số / mất gói</option>
                <option value="Timestamp skew">Timestamp skew</option>
                <option value="Cây tọa độ TF">Cây tọa độ TF</option>
                <option value="Node / topic silent">Node / topic silent</option>
                <option value="Không có lỗi">Không có lỗi</option>
              </select>
            </label>

            <div className="button-row" style={{ marginTop: '26px', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" className="button ghost" onClick={onClose}>
                Hủy
              </button>
              <button type="submit" className="button primary">
                Lưu trường hợp
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
