import React, { useEffect, useRef, useState } from 'react';

const TF_NODES = [
  ['map', 0, 2.6, 0],
  ['odom', 0, 1.25, 0],
  ['base_link', 0, 0, 0],
  ['laser', -2, -1, 1.2],
  ['camera_link', 2, -0.7, 0.6],
  ['imu_link', 0.2, 0.1, -2],
];

const TF_EDGES = [
  [0, 1],
  [1, 2],
  [2, 3],
  [2, 4],
  [2, 5],
];

function projectNode(node, yaw, pitch, width, height) {
  const [name, x, y, z] = node;
  const rotatedX = x * Math.cos(yaw) + z * Math.sin(yaw);
  const rotatedZ = -x * Math.sin(yaw) + z * Math.cos(yaw);
  const rotatedY = y * Math.cos(pitch) - rotatedZ * Math.sin(pitch);
  const depth = y * Math.sin(pitch) + rotatedZ * Math.cos(pitch);
  const perspective = 5.4 / (5.4 + depth * 0.35);
  const scale = Math.min(width / 8, height / 6);

  return {
    name,
    x: width * 0.5 + rotatedX * scale * perspective,
    y: height * 0.57 - rotatedY * scale * perspective,
    z: depth,
    radius: Math.max(9, Math.min(16, width / 46)) * perspective,
  };
}

export default function TfTreeViewer({
  onSelect,
  selectedNode = 'map',
  resetToken = 0,
  anomaly = true,
}) {
  const canvasRef = useRef(null);
  const viewRef = useRef({ yaw: 0.62, pitch: 0.25, selected: 'map' });
  const [canvasUnavailable, setCanvasUnavailable] = useState(false);

  useEffect(() => {
    viewRef.current = { yaw: 0.62, pitch: 0.25, selected: 'map' };
  }, [resetToken]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!context) {
      setCanvasUnavailable(true);
      return undefined;
    }

    viewRef.current.selected = selectedNode;
    let width = 1;
    let height = 1;
    let disposed = false;
    let dragging = false;
    let pointerX = 0;
    let pointerY = 0;
    let dragDistance = 0;
    let projectedNodes = [];

    const drawLine = (from, to, color, lineWidth = 1, dash = []) => {
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.strokeStyle = color;
      context.lineWidth = lineWidth;
      context.setLineDash(dash);
      context.stroke();
      context.setLineDash([]);
    };

    const draw = () => {
      if (disposed) return;

      const view = viewRef.current;
      context.clearRect(0, 0, width, height);

      const glow = context.createRadialGradient(
        width / 2,
        height * 0.58,
        10,
        width / 2,
        height * 0.58,
        width * 0.46,
      );
      glow.addColorStop(0, 'rgba(36, 159, 194, .12)');
      glow.addColorStop(1, 'rgba(6, 10, 22, 0)');
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      const project = (node) => projectNode(node, view.yaw, view.pitch, width, height);

      for (let index = -4; index <= 4; index += 1) {
        drawLine(
          project(['', index, -1.45, -4]),
          project(['', index, -1.45, 4]),
          'rgba(66, 113, 146, .24)',
          0.8,
        );
        drawLine(
          project(['', -4, -1.45, index]),
          project(['', 4, -1.45, index]),
          'rgba(66, 113, 146, .24)',
          0.8,
        );
      }

      projectedNodes = TF_NODES.map(project);
      TF_EDGES.forEach(([fromIndex, toIndex], edgeIndex) => {
        const isAnomalousEdge = edgeIndex === 0 && anomaly;
        drawLine(
          projectedNodes[fromIndex],
          projectedNodes[toIndex],
          isAnomalousEdge ? '#ff7183' : '#42afc9',
          edgeIndex === 0 ? 2.2 : 1.6,
          isAnomalousEdge ? [5, 5] : [],
        );
      });

      [...projectedNodes]
        .sort((first, second) => second.z - first.z)
        .forEach((node) => {
          const isAnomalousNode = node.name === 'odom' && anomaly;
          const color = isAnomalousNode ? '#ff7183' : '#51dcf8';
          const radius = node.radius;

          context.beginPath();
          context.arc(
            node.x,
            node.y,
            radius + (node.name === view.selected ? 9 : 5),
            0,
            Math.PI * 2,
          );
          context.strokeStyle = node.name === view.selected ? '#ffa94d' : 'rgba(75, 190, 222, .3)';
          context.lineWidth = 1;
          context.stroke();

          const nodeGlow = context.createRadialGradient(
            node.x - radius * 0.3,
            node.y - radius * 0.3,
            1,
            node.x,
            node.y,
            radius,
          );
          nodeGlow.addColorStop(0, isAnomalousNode ? '#ffd0d4' : '#c0f8ff');
          nodeGlow.addColorStop(0.28, color);
          nodeGlow.addColorStop(0.65, isAnomalousNode ? '#58263d' : '#154a61');
          nodeGlow.addColorStop(1, '#061221');

          context.beginPath();
          context.arc(node.x, node.y, radius, 0, Math.PI * 2);
          context.fillStyle = nodeGlow;
          context.shadowColor = color;
          context.shadowBlur = 10;
          context.fill();
          context.shadowBlur = 0;

          const compact = width < 420;
          const placeLabelBeside = compact && ['map', 'odom', 'base_link'].includes(node.name);
          context.font = compact ? '600 10px Inter, Arial, sans-serif' : '600 12px Inter, Arial, sans-serif';
          const labelHeight = compact ? 22 : 25;
          const labelWidth = context.measureText(node.name).width + 20;
          const labelX = Math.max(
            2,
            Math.min(width - labelWidth - 2, placeLabelBeside ? node.x + radius + 12 : node.x - labelWidth / 2),
          );
          const labelY = Math.max(
            2,
            Math.min(height - labelHeight - 3, placeLabelBeside ? node.y - labelHeight / 2 : node.y + radius + 12),
          );

          context.fillStyle = 'rgba(11, 28, 47, .97)';
          context.fillRect(labelX, labelY, labelWidth, labelHeight);
          context.strokeStyle = 'rgba(81, 220, 248, .25)';
          context.strokeRect(labelX, labelY, labelWidth, labelHeight);
          context.textAlign = 'center';
          context.fillStyle = '#eaf3ff';
          context.fillText(node.name, labelX + labelWidth / 2, labelY + (compact ? 15 : 17));
        });
    };

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(bounds.width, 1);
      height = Math.max(bounds.height, 1);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      draw();
    };

    const handlers = {
      pointerdown: (event) => {
        dragging = true;
        pointerX = event.clientX;
        pointerY = event.clientY;
        dragDistance = 0;
        canvas.setPointerCapture(event.pointerId);
        canvas.style.cursor = 'grabbing';
      },
      pointermove: (event) => {
        if (!dragging) return;
        const deltaX = event.clientX - pointerX;
        const deltaY = event.clientY - pointerY;
        viewRef.current.yaw += deltaX * 0.009;
        viewRef.current.pitch = Math.max(-0.6, Math.min(0.85, viewRef.current.pitch + deltaY * 0.006));
        dragDistance += Math.abs(deltaX) + Math.abs(deltaY);
        pointerX = event.clientX;
        pointerY = event.clientY;
        draw();
      },
      pointerup: (event) => {
        dragging = false;
        canvas.style.cursor = 'grab';
        if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);

        if (dragDistance < 6) {
          const bounds = canvas.getBoundingClientRect();
          const clickX = event.clientX - bounds.left;
          const clickY = event.clientY - bounds.top;
          const node = projectedNodes.find(
            (item) => Math.hypot(clickX - item.x, clickY - item.y) < item.radius + 17,
          );
          if (node) {
            viewRef.current.selected = node.name;
            onSelect?.(node.name);
            draw();
          }
        }
      },
      pointercancel: () => {
        dragging = false;
        canvas.style.cursor = 'grab';
      },
      keydown: (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
        event.preventDefault();
        const view = viewRef.current;
        if (event.key === 'Home') {
          view.yaw = 0.62;
          view.pitch = 0.25;
        } else {
          view.yaw += event.key === 'ArrowLeft' ? -0.15 : event.key === 'ArrowRight' ? 0.15 : 0;
          view.pitch = Math.max(
            -0.6,
            Math.min(0.85, view.pitch + (event.key === 'ArrowUp' ? -0.1 : event.key === 'ArrowDown' ? 0.1 : 0)),
          );
        }
        draw();
      },
    };

    Object.entries(handlers).forEach(([eventName, handler]) => canvas.addEventListener(eventName, handler));
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      Object.entries(handlers).forEach(([eventName, handler]) => canvas.removeEventListener(eventName, handler));
    };
  }, [anomaly, onSelect, resetToken, selectedNode]);

  return (
    <div className="tf-viewer">
      <div className="tf-instructions">
        <span>KÉO ĐỂ XOAY · PHÍM MŨI TÊN</span>
        <span>6 FRAME / 5 QUAN HỆ</span>
      </div>
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-label="Sơ đồ quan hệ TF 3D. Kéo chuột hoặc dùng phím mũi tên để xoay. Phím Home đặt lại góc nhìn."
      />
      {canvasUnavailable && (
        <div className="tf-fallback">
          <p>Trình duyệt không hỗ trợ canvas. Quan hệ TF:</p>
          <ul>
            {TF_EDGES.map(([fromIndex, toIndex]) => (
              <li key={`${fromIndex}-${toIndex}`}>
                {TF_NODES[fromIndex][0]} → {TF_NODES[toIndex][0]}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
