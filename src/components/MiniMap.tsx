import React, { useEffect, useRef } from 'react';
import { MiniMapEntity } from '../game/types';
import { ROAD_COORDS } from '../game/world';

interface MiniMapProps {
  playerX: number;
  playerZ: number;
  playerHeading: number;
  entities: MiniMapEntity[];
  compact?: boolean;
}

export const MiniMap: React.FC<MiniMapProps> = ({
  playerX,
  playerZ,
  playerHeading,
  entities,
  compact = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 148;
    const half = size / 2;
    const scale = 0.24;

    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.beginPath();
    ctx.arc(half, half, half - 2, 0, Math.PI * 2);
    ctx.fillStyle = '#09090b';
    ctx.fill();
    ctx.clip();

    ctx.save();
    ctx.translate(half, half);
    const toMapX = (wx: number) => (wx - playerX) * scale;
    const toMapY = (wz: number) => (wz - playerZ) * scale;

    // Ocean region
    const seaX = toMapX(280);
    if (seaX < half) {
      ctx.fillStyle = '#0c4a6e';
      ctx.fillRect(seaX, -half, half - seaX + 40, size + 40);
    }

    // Central Park
    ctx.fillStyle = '#14532d';
    ctx.fillRect(toMapX(8), toMapY(8), 144 * scale, 64 * scale);

    // Airport Tarmac
    ctx.fillStyle = '#27272a';
    ctx.fillRect(toMapX(-378), toMapY(334), 165 * scale, 68 * scale);

    // City Road Grid + Outer Highway Loop
    ctx.strokeStyle = '#3f3f46';
    ctx.lineWidth = 14 * scale;
    for (const rc of ROAD_COORDS) {
      const rx = toMapX(rc);
      const rz = toMapY(rc);
      ctx.beginPath();
      ctx.moveTo(rx, toMapY(-260));
      ctx.lineTo(rx, toMapY(260));
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(toMapX(-260), rz);
      ctx.lineTo(toMapX(260), rz);
      ctx.stroke();
    }

    // Highway perimeter
    ctx.strokeStyle = '#52525b';
    ctx.lineWidth = 16 * scale;
    ctx.strokeRect(toMapX(-318), toMapY(-318), 575 * scale, 636 * scale);

    // Entities
    for (const ent of entities) {
      if (ent.type === 'player') continue;
      const ex = toMapX(ent.x);
      const ey = toMapY(ent.z);
      if (Math.hypot(ex, ey) > half - 4) continue;

      if (ent.type === 'traffic') {
        ctx.fillStyle = '#71717a';
        ctx.fillRect(ex - 1.5, ey - 1.5, 3, 3);
      } else if (ent.type === 'police') {
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(ex, ey, 3.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (ent.type === 'car') {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(ex, ey, 3.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (ent.type === 'remote') {
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.arc(ex, ey, 3.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (ent.type === 'property') {
        ctx.fillStyle = '#10b981';
        ctx.fillRect(ex - 3.5, ey - 3.5, 7, 7);
      } else if (ent.type === 'gas') {
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(ex - 3, ey - 3, 6, 6);
      } else if (ent.type === 'landmark') {
        ctx.fillStyle = '#22d3ee';
        ctx.beginPath();
        ctx.arc(ex, ey, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (ent.type === 'target') {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(ex, ey, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Player Arrow
    ctx.save();
    ctx.rotate(-playerHeading);
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.lineTo(-4.5, -5);
    ctx.lineTo(0, -2.5);
    ctx.lineTo(4.5, -5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.restore();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(half, half, half - 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [playerX, playerZ, playerHeading, entities]);

  const sizeClass = compact ? 'w-[100px] h-[100px]' : 'w-[126px] h-[126px] sm:w-[148px] sm:h-[148px]';

  return (
    <div className={`relative ${sizeClass} select-none shrink-0`}>
      <canvas ref={canvasRef} width={148} height={148} className="w-full h-full block" />
      <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] font-bold text-zinc-400">N</span>
    </div>
  );
};
