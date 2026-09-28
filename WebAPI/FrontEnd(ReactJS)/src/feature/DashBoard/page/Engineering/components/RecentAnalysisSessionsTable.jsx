import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../../../../components/common/UIComponents';

export default function RecentAnalysisSessionsTable({ sessions = [] }) {
  const displaySessions = sessions.length > 0 ? sessions : [
    {
      id: '024',
      title: 'AGV-Lab - phiên # 024',
      bagName: 'agv_lab_2026.09_22.mcap',
      timestamp: '09:24 22/09/2026',
      topicsCount: 12,
      warningsCount: 5,
      status: 'pending',
      statusText: 'Chờ duyệt',
      statusTone: 'amber',
    },
    {
      id: '023',
      title: 'Warehouse - phiên # 023',
      bagName: 'warehouse_route_03.mcap',
      timestamp: '08:42 22/09/2026',
      topicsCount: 18,
      warningsCount: 0,
      status: 'complete',
      statusText: 'Hoàn tất',
      statusTone: 'green',
    },
  ];

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
            Phiên phân tích gần đây
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
            Toàn bộ kết quả chẩn đoán trong bản này là dữ liệu mô phỏng.
          </p>
        </div>
        <Link
          to="/analysis"
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#2563eb',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          Xem tất cả <Icon name="arrow" size={14} />
        </Link>
      </div>

      <div className="table-scroll">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
                PHIÊN / ROSBAG
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
                THỜI ĐIỂM
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
                TOPIC
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
                CẢNH BÁO
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
                TRẠNG THÁI
              </th>
            </tr>
          </thead>
          <tbody>
            {displaySessions.map((session) => {
              const isComplete = session.status === 'complete';
              const badgeStyle = isComplete
                ? { bg: '#f0fdf4', color: '#16a34a', text: '● Hoàn tất' }
                : { bg: '#fffbeb', color: '#d97706', text: '● Chờ duyệt' };

              return (
                <tr key={session.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px' }}>
                    <Link to={`/sessions/${session.id}`} style={{ textDecoration: 'none' }}>
                      <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block' }}>
                        {session.title || `Phiên #${session.id}`}
                      </strong>
                      <small style={{ fontSize: '12px', color: '#64748b' }}>
                        {session.bagName || session.filename || `rosbag_${session.id}.mcap`}
                      </small>
                    </Link>
                  </td>
                  <td style={{ padding: '16px', fontSize: '13px', color: '#334155' }}>
                    {session.timestamp || '09:24 22/09/2026'}
                  </td>
                  <td style={{ padding: '16px', fontSize: '13px', color: '#334155' }}>
                    {session.topicsCount || session.topics?.length || 12}
                  </td>
                  <td
                    style={{
                      padding: '16px',
                      fontSize: '13px',
                      color: (session.warningsCount || 0) > 0 ? '#dc2626' : '#16a34a',
                      fontWeight: 700,
                    }}
                  >
                    {session.warningsCount ?? 0}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: badgeStyle.bg,
                        color: badgeStyle.color,
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      {badgeStyle.text}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
