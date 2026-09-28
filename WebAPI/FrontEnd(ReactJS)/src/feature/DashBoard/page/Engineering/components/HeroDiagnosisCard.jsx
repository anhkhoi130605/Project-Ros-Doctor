import React from 'react';
import { Button } from '../../../../../components/common/UIComponents';
import robotHeroImg from '../../../../../assets/robot-hero.jpg';

export default function HeroDiagnosisCard() {
  return (
    <div
      style={{
        position: 'relative',
        background: 'linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%)',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '32px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minHeight: '260px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
      }}
    >
      {/* Background Robot Image on right */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: '50%',
          backgroundImage: `url(${robotHeroImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          maskImage: 'linear-gradient(to right, transparent 0%, black 35%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 35%)',
          pointerEvents: 'none',
          opacity: 0.9,
        }}
      />

      <div style={{ position: 'relative', zIndex: 2, maxWidth: '58%' }}>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.8px',
            color: '#64748b',
            textTransform: 'uppercase',
            display: 'block',
            marginBottom: '10px',
          }}
        >
          CTRN SHIFT N / AI ASSISTED
        </span>
        <h2
          style={{
            fontSize: '32px',
            fontWeight: 800,
            color: '#0f172a',
            lineHeight: 1.2,
            margin: '0 0 12px 0',
            letterSpacing: '-0.5px',
          }}
        >
          Chẩn đoán bắt đầu
          <br />
          từ một rosbag.
        </h2>
        <p style={{ fontSize: '14px', color: '#475569', margin: '0 0 24px 0' }}>
          Đọc tín hiệu. Đối chiếu bằng chứng.
        </p>
        <Button
          to="/upload"
          icon="upload"
          style={{
            background: '#0f172a',
            color: '#ffffff',
            padding: '12px 22px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '13px',
            border: 'none',
            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.15)',
          }}
        >
          Nạp & phân tích rosbag
        </Button>
      </div>
    </div>
  );
}
