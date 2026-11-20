import React, { useRef, useState } from 'react';
import { Camera, Car, Flame, Lightbulb, Volume2 } from 'lucide-react';
import { TouchInputState } from '../game/GameEngine';

interface MobileControlsProps {
  inVehicle: boolean;
  nearVehicle: boolean;
  touchInput: TouchInputState;
  onEnterExit: () => void;
  onCycleCamera: () => void;
  onToggleLights: () => void;
  onHorn: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  inVehicle,
  nearVehicle,
  touchInput,
  onEnterExit,
  onCycleCamera,
  onToggleLights,
  onHorn,
}) => {
  const stickRef = useRef<HTMLDivElement | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const stickPointerId = useRef<number | null>(null);

  const updateStick = (clientX: number, clientY: number) => {
    const el = stickRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.38;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setKnob({ x: dx, y: dy });
    touchInput.moveX = dx / maxR;
    touchInput.moveY = -dy / maxR;
  };

  const resetStick = () => {
    stickPointerId.current = null;
    setKnob({ x: 0, y: 0 });
    touchInput.moveX = 0;
    touchInput.moveY = 0;
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 p-4 pb-6 flex items-end justify-between pointer-events-none">
      {/* Left Virtual Thumbstick (Steering / Walk) */}
      <div
        ref={stickRef}
        onPointerDown={(e) => {
          e.stopPropagation();
          stickPointerId.current = e.pointerId;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          updateStick(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (stickPointerId.current === e.pointerId) {
            updateStick(e.clientX, e.clientY);
          }
        }}
        onPointerUp={(e) => {
          if (stickPointerId.current === e.pointerId) resetStick();
        }}
        onPointerCancel={resetStick}
        className="relative w-32 h-32 rounded-full bg-zinc-950/75 border-2 border-zinc-700/80 flex items-center justify-center pointer-events-auto touch-none"
      >
        <div
          className="w-12 h-12 rounded-full bg-amber-500/90 border border-amber-300 shadow-lg"
          style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
        />
      </div>

      {/* Right Action Cluster */}
      <div className="flex flex-col items-end gap-2.5 pointer-events-auto">
        {/* Utility Row */}
        <div className="flex items-center gap-2">
          {(inVehicle || nearVehicle) && (
            <button
              onClick={onEnterExit}
              className="w-12 h-12 rounded-xl bg-amber-500 text-zinc-950 font-bold flex items-center justify-center shadow-lg active:scale-95"
              title={inVehicle ? 'Exit Car' : 'Enter Car'}
            >
              <Car className="w-5 h-5" />
            </button>
          )}

          {inVehicle && (
            <>
              <button
                onClick={onCycleCamera}
                className="w-11 h-11 rounded-xl bg-zinc-900/90 border border-zinc-700 text-zinc-100 flex items-center justify-center active:scale-95"
              >
                <Camera className="w-4 h-4" />
              </button>
              <button
                onClick={onToggleLights}
                className="w-11 h-11 rounded-xl bg-zinc-900/90 border border-zinc-700 text-zinc-100 flex items-center justify-center active:scale-95"
              >
                <Lightbulb className="w-4 h-4" />
              </button>
              <button
                onClick={onHorn}
                className="w-11 h-11 rounded-xl bg-zinc-900/90 border border-zinc-700 text-zinc-100 flex items-center justify-center active:scale-95"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Pedals / Foot Actions */}
        {inVehicle ? (
          <div className="flex items-end gap-2.5">
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                touchInput.handbrake = true;
              }}
              onPointerUp={() => {
                touchInput.handbrake = false;
              }}
              onPointerLeave={() => {
                touchInput.handbrake = false;
              }}
              className="w-14 h-14 rounded-xl bg-zinc-900/90 border border-amber-500/60 text-amber-400 text-xs font-bold flex flex-col items-center justify-center active:bg-amber-500 active:text-zinc-950"
            >
              <Flame className="w-4 h-4 mb-0.5" />
              DRIFT
            </button>
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                touchInput.brake = true;
              }}
              onPointerUp={() => {
                touchInput.brake = false;
              }}
              onPointerLeave={() => {
                touchInput.brake = false;
              }}
              className="w-16 h-16 rounded-xl bg-red-950/90 border border-red-600/70 text-red-200 text-xs font-bold flex items-center justify-center active:bg-red-600"
            >
              BRAKE
            </button>
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                touchInput.throttle = true;
              }}
              onPointerUp={() => {
                touchInput.throttle = false;
              }}
              onPointerLeave={() => {
                touchInput.throttle = false;
              }}
              className="w-16 h-20 rounded-xl bg-emerald-950/90 border border-emerald-500/70 text-emerald-200 text-xs font-bold flex items-center justify-center active:bg-emerald-500 active:text-zinc-950"
            >
              GAS
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-2.5">
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                touchInput.sprint = true;
              }}
              onPointerUp={() => {
                touchInput.sprint = false;
              }}
              onPointerLeave={() => {
                touchInput.sprint = false;
              }}
              className="w-16 h-14 rounded-xl bg-zinc-900/90 border border-zinc-700 text-zinc-100 text-xs font-bold active:bg-amber-500 active:text-zinc-950"
            >
              SPRINT
            </button>
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                touchInput.jump = true;
              }}
              onPointerUp={() => {
                touchInput.jump = false;
              }}
              onPointerLeave={() => {
                touchInput.jump = false;
              }}
              className="w-16 h-16 rounded-xl bg-zinc-900/90 border border-amber-500/60 text-amber-400 text-xs font-bold active:bg-amber-500 active:text-zinc-950"
            >
              JUMP
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
