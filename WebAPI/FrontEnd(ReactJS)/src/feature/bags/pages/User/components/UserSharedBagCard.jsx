import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Badge, Button, Icon } from '../../../../../components/common/UIComponents';

export default function UserSharedBagCard({ bag }) {
  const duration = bag.duration ?? bag.durationSec ?? 120;
  const durationText = `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}`;

  return (
    <Card className="user-shared-bag-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 600 }}>{bag.name}</h3>
          <span style={{ fontSize: '12px', color: '#64748b' }}>ID: {bag.id} · Định dạng: <code>{bag.format || 'db3'}</code></span>
        </div>
        <Badge tone="green">• Đã công bố</Badge>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
        <div>
          <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Dung lượng</span>
          <strong>{bag.sizeMb} MB</strong>
        </div>
        <div>
          <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Topics</span>
          <strong>{bag.topicCount || bag.topics || 12} topics</strong>
        </div>
        <div>
          <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Thời lượng</span>
          <strong>{durationText}</strong>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <Button to={`/bags/${bag.id}`} variant="secondary" icon="eye">
          Xem thông tin
        </Button>
        {bag.sessionId && (
          <Button to={`/sessions/${bag.sessionId}/overview`} icon="arrow">
            Xem kết quả chẩn đoán
          </Button>
        )}
      </div>
    </Card>
  );
}
