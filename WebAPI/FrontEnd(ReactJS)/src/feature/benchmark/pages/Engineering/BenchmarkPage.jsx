import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../../../../stored/appStore';
import { PageHeader, Card, Badge, Icon } from '../../../../components/common/UIComponents';
import LabeledCaseDialog from './components/LabeledCaseDialog';
import {
  INITIAL_TEST_CASES,
  DEEPEVAL_METRICS,
  computeBenchmarkMetrics,
} from '../../domain/benchmarkData';

export default function EngineeringBenchmarkPage() {
  const { notify } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  // Mode: 'results' (Màn E23) or 'dataset' (Màn E21)
  const initialMode = searchParams.get('tab') === 'dataset' ? 'dataset' : 'results';
  const [mode, setModeState] = useState(initialMode);

  const setMode = (newMode) => {
    setModeState(newMode);
    setSearchParams(newMode === 'dataset' ? { tab: 'dataset' } : {});
  };

  // State for dataset & test cases (E21 / E22)
  const [datasetName, setDatasetName] = useState('RAV-13 / Lỗi đã biết');
  const [testCases, setTestCases] = useState(INITIAL_TEST_CASES);

  // State for Modal Dialog (E22)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCase, setEditingCase] = useState(null);

  // State for evaluation running simulation
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Compute metrics dynamically from current test cases
  const metrics = useMemo(() => computeBenchmarkMetrics(testCases), [testCases]);

  // Handle Run Evaluation in E23
  const handleRunEvaluation = () => {
    setIsEvaluating(true);
    notify('Đang chạy đánh giá mô hình ROS2 với bộ dữ liệu Ground Truth...', 'info');
    setTimeout(() => {
      setIsEvaluating(false);
      notify('Đã cập nhật kết quả benchmark và ma trận nhầm lẫn.', 'success');
    }, 600);
  };

  // Handle Save Dataset in E21
  const handleSaveDataset = () => {
    notify(`Đã lưu bộ dữ liệu "${datasetName}" với ${testCases.length} trường hợp.`, 'success');
  };

  // Handle Add New Case (Opens E22)
  const handleAddNewCase = () => {
    setEditingCase(null);
    setDialogOpen(true);
  };

  // Handle Edit Case (Opens E22)
  const handleEditCase = (tc) => {
    setEditingCase(tc);
    setDialogOpen(true);
  };

  // Handle Delete Case
  const handleDeleteCase = (code) => {
    setTestCases((prev) => prev.filter((c) => c.code !== code));
    notify(`Đã xóa trường hợp ${code}.`, 'info');
  };

  // Handle Save Case from Dialog (E22)
  const handleSaveCaseFromDialog = (formData) => {
    if (editingCase) {
      setTestCases((prev) =>
        prev.map((c) =>
          c.code === editingCase.code
            ? {
                ...c,
                ...formData,
                intervalText: `${formData.start}–${formData.end} giây`,
              }
            : c
        )
      );
      notify(`Đã cập nhật trường hợp ${editingCase.code}.`, 'success');
    } else {
      const newCode = `C0${testCases.length + 1}`;
      setTestCases((prev) => [
        ...prev,
        {
          code: newCode,
          ...formData,
          intervalText: `${formData.start}–${formData.end} giây`,
          prediction: formData.label, // Default prediction matching label or mock
        },
      ]);
      notify(`Đã thêm mới trường hợp ${newCode}.`, 'success');
    }
    setDialogOpen(false);
  };

  return (
    <div className="benchmark-page">
      {/* ========================================================================= */}
      {/* MÀN E23: KẾT QUẢ BENCHMARK & DEEPEVAL                                   */}
      {/* ========================================================================= */}
      {mode === 'results' && (
        <>
          {/* Header matching Figma E23 1 */}
          <PageHeader
            title="Kết quả benchmark"
            subtitle={`${datasetName} · ${testCases.length} trường hợp có nhãn`}
          >
            <button
              type="button"
              className="button secondary"
              onClick={() => setMode('dataset')}
            >
              <Icon name="arrow-left" />
              <span>Bộ dữ liệu</span>
            </button>
            <button
              type="button"
              className="button primary"
              onClick={handleRunEvaluation}
              disabled={isEvaluating}
            >
              <Icon name="play" />
              <span>{isEvaluating ? 'Đang đánh giá...' : 'Chạy đánh giá'}</span>
            </button>
          </PageHeader>

          {/* Blue Notice matching Figma E23 */}
          <div className="notice blue" style={{ marginBottom: '25px' }}>
            <Icon name="info" />
            <div>
              Các dự đoán đầu ra và điểm DeepEval trong preview là dữ liệu minh họa. Đây chưa phải
              kết quả kiểm thử mô hình ROS2 thực.
            </div>
          </div>

          {/* 4 Stats Grid Widgets matching Figma E23 */}
          <div className="stats-grid">
            <section className="card stat cyan">
              <span className="stat-label">Precision</span>
              <span className="stat-icon">
                <Icon name="check" size={16} />
              </span>
              <strong>{metrics.precision}</strong>
              <small>TP / (TP + FP)</small>
            </section>

            <section className="card stat cyan">
              <span className="stat-label">Recall</span>
              <span className="stat-icon">
                <Icon name="search" size={16} />
              </span>
              <strong>{metrics.recall}</strong>
              <small>TP / (TP + FN)</small>
            </section>

            <section className="card stat cyan">
              <span className="stat-label">F1 score</span>
              <span className="stat-icon">
                <Icon name="activity" size={16} />
              </span>
              <strong>{metrics.f1}</strong>
              <small>Cân bằng Precision / Recall</small>
            </section>

            <section className="card stat cyan">
              <span className="stat-label">Trường hợp</span>
              <span className="stat-icon">
                <Icon name="database" size={16} />
              </span>
              <strong>{metrics.casesCount}</strong>
              <small>Theo bộ nhãn đã lưu</small>
            </section>
          </div>

          {/* Card 1: Error Detection Evaluation (Ma trận benchmark) */}
          <section className="card" style={{ marginBottom: '24px' }}>
            <div className="card-heading">
              <div>
                <h2>Đánh giá phát hiện lỗi</h2>
                <p>TP: đúng · FP: cảnh báo sai · FN: bỏ sót</p>
              </div>
              <Badge tone="green">Mẫu đã tính</Badge>
            </div>

            <div className="table-scroll" tabIndex={0} role="region" aria-label="Ma trận benchmark">
              <table>
                <thead>
                  <tr>
                    <th scope="col">LOẠI LỖI</th>
                    <th scope="col">TP</th>
                    <th scope="col">FP</th>
                    <th scope="col">FN</th>
                    <th scope="col">F1</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.matrix.map((row) => (
                    <tr key={row.type}>
                      <td>{row.type}</td>
                      <td>{row.tp}</td>
                      <td>{row.fp}</td>
                      <td>{row.fn}</td>
                      <td>{row.f1}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Card 2: DeepEval Evaluation matching Figma E23 */}
          <section className="card" style={{ marginBottom: '24px' }}>
            <div className="card-heading">
              <div>
                <h2>Đánh giá câu trả lời Agent / DeepEval</h2>
                <p>UC-19 · Kiểm tra mức bám sát bằng chứng và tính liên quan</p>
              </div>
            </div>

            <div className="ctrn-evaluation">
              {DEEPEVAL_METRICS.map((m) => (
                <div key={m.name}>
                  <span>{m.name}</span>
                  <strong>{m.score}</strong>
                  <p>{m.desc}</p>
                  <Badge tone="blue">{m.badge}</Badge>
                </div>
              ))}
            </div>
          </section>

          {/* Card 3: Cases to Check (Mismatch Cases) matching Figma E23 */}
          <section className="card">
            <div className="card-heading">
              <div>
                <h2>Trường hợp cần kiểm tra</h2>
              </div>
            </div>

            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Đối chiếu nhãn và dự đoán"
            >
              <table>
                <thead>
                  <tr>
                    <th scope="col">TRƯỜNG HỢP</th>
                    <th scope="col">TOPIC</th>
                    <th scope="col">NHÃN ĐÚNG</th>
                    <th scope="col">DỰ ĐOÁN MẪU</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.mismatches.map((item) => (
                    <tr key={item.code}>
                      <td>{item.code}</td>
                      <td>{item.topic}</td>
                      <td>{item.label}</td>
                      <td>{item.prediction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="button-row" style={{ marginTop: '24px' }}>
              <button
                type="button"
                className="button secondary"
                onClick={() => setMode('dataset')}
              >
                <span>Kiểm tra nhãn dữ liệu</span>
              </button>

              <Link to="/usage" className="button primary">
                <span>Xem chi phí & thời gian</span>
              </Link>
            </div>
          </section>
        </>
      )}

      {/* ========================================================================= */}
      {/* MÀN E21: BỘ DỮ LIỆU BENCHMARK (GROUND TRUTH EDITOR)                      */}
      {/* ========================================================================= */}
      {mode === 'dataset' && (
        <>
          {/* Header matching Figma E21 1 */}
          <PageHeader
            title="Bộ dữ liệu benchmark"
            subtitle="Gán nhãn lỗi đã biết để kiểm thử chất lượng chẩn đoán."
          >
            <button
              type="button"
              className="button secondary"
              onClick={handleSaveDataset}
            >
              <Icon name="check" />
              <span>Lưu bộ dữ liệu</span>
            </button>
            <button
              type="button"
              className="button primary"
              onClick={() => setMode('results')}
            >
              <Icon name="play" />
              <span>Chạy benchmark</span>
            </button>
          </PageHeader>

          {/* Main Ground Truth Card matching Figma E21 */}
          <section className="card" style={{ marginBottom: '24px' }}>
            <div className="card-heading">
              <div>
                <h2>Ground truth</h2>
              </div>
              <Badge tone="blue">UC-18</Badge>
            </div>

            <label className="field" style={{ marginBottom: '22px' }}>
              <span>Tên bộ dữ liệu</span>
              <input
                type="text"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
              />
            </label>

            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Trường hợp kiểm thử"
              style={{ marginBottom: '20px' }}
            >
              <table>
                <thead>
                  <tr>
                    <th scope="col">MÃ</th>
                    <th scope="col">ROSBAG</th>
                    <th scope="col">TOPIC / TF</th>
                    <th scope="col">KHOẢNG THỜI GIAN</th>
                    <th scope="col">NHÃN ĐÚNG</th>
                    <th scope="col">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {testCases.map((tc) => (
                    <tr key={tc.code}>
                      <td><strong>{tc.code}</strong></td>
                      <td>{tc.rosbag}</td>
                      <td>{tc.topic}</td>
                      <td>{tc.intervalText}</td>
                      <td>
                        <Badge tone={tc.label === 'Không có lỗi' ? 'green' : 'orange'}>
                          {tc.label}
                        </Badge>
                      </td>
                      <td>
                        <div className="button-row" style={{ gap: '8px' }}>
                          <button
                            type="button"
                            className="button ghost"
                            style={{ minHeight: '30px', padding: '4px 10px', fontSize: '11px' }}
                            onClick={() => handleEditCase(tc)}
                          >
                            <span>Sửa nhãn</span>
                          </button>
                          <button
                            type="button"
                            className="button ghost"
                            style={{ minHeight: '30px', padding: '4px 10px', fontSize: '11px', color: 'var(--red)' }}
                            onClick={() => handleDeleteCase(tc.code)}
                          >
                            <span>Xóa</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              className="button secondary"
              onClick={handleAddNewCase}
            >
              <Icon name="plus" />
              <span>Thêm trường hợp</span>
            </button>
          </section>

          {/* Blue Notice matching Figma E21 */}
          <div className="notice blue">
            <Icon name="info" />
            <div>
              Các dự đoán đầu ra trong preview là dữ liệu mẫu cố định. Precision, Recall và F1 được
              tính lại theo nhãn bạn chọn; DeepEval thật cần backend.
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* MÀN E22: MODAL THÊM / SỬA TRƯỜNG HỢP CÓ NHÃN                            */}
      {/* ========================================================================= */}
      <LabeledCaseDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaveCaseFromDialog}
        initialData={editingCase}
      />
    </div>
  );
}
