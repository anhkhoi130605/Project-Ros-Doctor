import React, { useRef } from 'react';
import pearlRobotImg from '../../assets/robot-pearl.png';
import robotHeroImg from '../../assets/robot-hero.jpg';

export default function PearlScene({ compact = false }) {
  const containerRef = useRef(null);

  const handlePointerMove = (e) => {
    if (e.pointerType === 'touch' || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    containerRef.current.style.setProperty(
      '--robot-x',
      `${((e.clientX - rect.left) / rect.width - 0.5) * 11}deg`
    );
    containerRef.current.style.setProperty(
      '--robot-y',
      `${-((e.clientY - rect.top) / rect.height - 0.5) * 7}deg`
    );
  };

  const handlePointerLeave = () => {
    if (!containerRef.current) return;
    containerRef.current.style.setProperty('--robot-x', '0deg');
    containerRef.current.style.setProperty('--robot-y', '0deg');
  };

  const robotImage = pearlRobotImg || robotHeroImg;

  return (
    <div
      ref={containerRef}
      className={`pearl-scene ${compact ? 'compact' : ''}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      aria-label="Hình robot với hiệu ứng nổi và nghiêng theo con trỏ"
      style={{
        width: '100%',
        height: '100%',
        minHeight: '420px',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div className="pearl-glow" aria-hidden="true" />
      <div className="pearl-rings" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div
        className="pearl-perspective"
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          maxWidth: '520px',
          maxHeight: '520px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div className="pearl-float" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src={robotImage}
            alt="Robot nghiên cứu trắng bạc với mắt xanh"
            className="pearl-robot"
            fetchPriority="high"
            style={{
              width: '100%',
              height: '100%',
              maxHeight: '460px',
              objectFit: 'contain',
              filter: 'drop-shadow(0 15px 30px rgba(0,0,0,0.12))',
            }}
          />
        </div>
      </div>
      <div className="pearl-scan" aria-hidden="true" />
      {!compact && (
        <>
          <div className="robot-label label-top" style={{ zIndex: 10 }}>
            <i /> ROS2 / DIAGNOSTICS
          </div>
          <div className="robot-label label-data" style={{ zIndex: 10 }}>
            <span>TÍN HIỆU MINH HỌA</span>
            <strong>
              /scan <b>10 → 2 Hz</b>
            </strong>
            <svg viewBox="0 0 160 34" aria-hidden="true">
              <path d="M0 16H12L17 5L22 27L28 14H45L50 6L55 28L61 14H79L85 25H117L125 14H160" />
            </svg>
            <small>Phát hiện bất thường · 00:35</small>
          </div>
          <span className="robot-coordinate" style={{ zIndex: 10 }}>RAV-13 / HUMAN-IN-THE-LOOP</span>
        </>
      )}
    </div>
  );
}
