import React, { useState } from 'react';
import { useApp } from '../../../stored/appStore';
import { PageHeader, Card, Button, Badge, Icon } from '../../../components/common/UIComponents';

export default function BenchmarkPage() {
  const { state } = useApp();
  const [selectedDataset, setSelectedDataset] = useState('agv_v2');

  const benchmarkDatasets = [
    { id: 'agv_v2', name: 'Bộ dữ liệu AGV-Lab Standard v2.4', totalBags: 45, precision: 96.4, recall: 92.1, f1: 94.2 },
    { id: 'warehouse_v1', name: 'Kho vận Warehouse Heavy Navigation', totalBags: 30, precision: 94.8, recall: 89.5, f1: 92.1 },
    { id: 'drone_sensor', name: 'Đo đạc Cảm biến UAV & LiDAR Sync', totalBags: 18, precision: 91.2, recall: 95.0, f1: 93.0 },
  ];

  const currentDataset = benchmarkDatasets.find(d => d.id === selectedDataset) || benchmarkDatasets[0];

  return (
    <div className="benchmark-page">
      <PageHeader
        eyebrow="ĐÁNH GIÁ MÔ HÌNH AI"
        title="Bộ dữ liệu & Benchmark"
        subtitle="Đánh giá độ chính xác, độ nhạy và chỉ số F1-Score của mô hình chẩn đoán ROS2 trên các bộ dữ liệu tiêu chuẩn."
      >
        <Button variant="ghost" icon="upload">
          Nạp bộ dữ liệu thử nghiệm
        </Button>
      </PageHeader>

      {/* Dataset Picker Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {benchmarkDatasets.map((ds) => (
          <div
            key={ds.id}
            onClick={() => setSelectedDataset(ds.id)}
            style={{
              background: selectedDataset === ds.id ? '#f0f9ff' : '#ffffff',
              border: `2px solid ${selectedDataset === ds.id ? '#0284c7' : '#e2e8f0'}`,
              borderRadius: '12px',
              padding: '20px',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <Badge tone={selectedDataset === ds.id ? 'blue' : 'muted'}>{ds.totalBags} bản ghi Rosbag</Badge>
              {selectedDataset === ds.id && <span style={{ color: '#0284c7', fontWeight: 700, fontSize: '12px' }}>● Đang chọn</span>}
            </div>
            <strong style={{ fontSize: '15px', color: '#0f172a', display: 'block', marginBottom: '12px' }}>{ds.name}</strong>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
              <div>
                <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Precision</span>
                <strong style={{ fontSize: '16px', color: '#0284c7' }}>{ds.precision}%</strong>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Recall</span>
                <strong style={{ fontSize: '16px', color: '#16a34a' }}>{ds.recall}%</strong>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>F1-Score</span>
                <strong style={{ fontSize: '16px', color: '#d97706' }}>{ds.f1}%</strong>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Benchmark Analysis */}
      <Card title={`Kết quả Benchmark: ${currentDataset.name}`} subtitle="Chi tiết các chỉ số ma trận nhầm lẫn (Confusion Matrix) và kết quả kiểm định tự động">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginTop: '16px' }}>
          <div>
            <h4 style={{ margin: '0 0 16px', fontSize: '14px', color: '#0f172a' }}>📊 Chỉ số hiệu năng chi tiết</h4>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: '#475569' }}>Độ chính xác (Precision)</span>
                  <strong style={{ color: '#0284c7' }}>{currentDataset.precision}%</strong>
                </div>
                <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${currentDataset.precision}%`, background: '#0284c7', height: '100%' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: '#475569' }}>Độ nhạy (Recall)</span>
                  <strong style={{ color: '#16a34a' }}>{currentDataset.recall}%</strong>
                </div>
                <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${currentDataset.recall}%`, background: '#16a34a', height: '100%' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: '#475569' }}>Điểm cân bằng (F1-Score)</span>
                  <strong style={{ color: '#d97706' }}>{currentDataset.f1}%</strong>
                </div>
                <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${currentDataset.f1}%`, background: '#d97706', height: '100%' }} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#0f172a' }}>🧪 Ma trận nhầm lẫn (Confusion Matrix)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', textAlignment: 'center' }}>
              <div style={{ background: '#dcfce7', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: '#166534', display: 'block' }}>True Positive (TP)</span>
                <strong style={{ fontSize: '20px', color: '#15803d' }}>142</strong>
              </div>
              <div style={{ background: '#fef2f2', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: '#991b1b', display: 'block' }}>False Positive (FP)</span>
                <strong style={{ fontSize: '20px', color: '#b91c1c' }}>6</strong>
              </div>
              <div style={{ background: '#fef3c7', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: '#92400e', display: 'block' }}>False Negative (FN)</span>
                <strong style={{ fontSize: '20px', color: '#b45309' }}>11</strong>
              </div>
              <div style={{ background: '#e0f2fe', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: '#075985', display: 'block' }}>True Negative (TN)</span>
                <strong style={{ fontSize: '20px', color: '#0369a1' }}>289</strong>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
