import React, { useRef, useState } from 'react';
import { Camera, Car, ChevronLeft, ChevronRight, Flame, Lightbulb, Volume2 } from 'lucide-react';
import { TouchInputState } from '../game/GameEngine';

interface MobileControlsProps {
  inVehicle: boolean;
  nearVehicle: boolean;
  compactLandscape?: boolean;
  touchInput: TouchInputState;
  onEnterExit: () => void;
  onCycleCamera: () => void;
  onToggleLights: () => void;
  onHorn: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  inVehicle,
  nearVehicle,
  compactLandscape = false,
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

  const stickSizeClass = compactLandscape ? 'w-26 h-26' : 'w-32 h-32';
  const knobSizeClass = compactLandscape ? 'w-10 h-10' : 'w-12 h-12';
  const utilBtnClass = compactLandscape ? 'w-10 h-10' : 'w-11 h-11';

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 safe-area-controls flex items-end justify-between pointer-events-none">
      {/* Left Cluster: Explicit Steering Pads + Analog Virtual Thumbstick */}
      <div className="flex flex-col items-start gap-1.5 pointer-events-auto">
        {inVehicle && (
          <div className="flex items-center gap-1.5">
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                touchInput.moveX = -1;
              }}
              onPointerUp={() => {
                touchInput.moveX = 0;
              }}
              onPointerLeave={() => {
                touchInput.moveX = 0;
              }}
              onPointerCancel={() => {
                touchInput.moveX = 0;
              }}
              className="w-12 h-9 rounded-lg bg-zinc-900/90 border border-zinc-700 text-zinc-100 flex items-center justify-center active:bg-amber-500 active:text-zinc-950 touch-none"
              aria-label="Steer Left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                touchInput.moveX = 1;
              }}
              onPointerUp={() => {
                touchInput.moveX = 0;
              }}
              onPointerLeave={() => {
                touchInput.moveX = 0;
              }}
              onPointerCancel={() => {
                touchInput.moveX = 0;
              }}
              className="w-12 h-9 rounded-lg bg-zinc-900/90 border border-zinc-700 text-zinc-100 flex items-center justify-center active:bg-amber-500 active:text-zinc-950 touch-none"
              aria-label="Steer Right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

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
          className={`relative ${stickSizeClass} rounded-full bg-zinc-950/78 border-2 border-zinc-700/80 flex items-center justify-center touch-none`}
        >
          <span className="absolute left-1.5 text-[10px] font-bold text-zinc-500 pointer-events-none">◀</span>
          <span className="absolute right-1.5 text-[10px] font-bold text-zinc-500 pointer-events-none">▶</span>
          <div
            className={`${knobSizeClass} rounded-full bg-amber-500/90 border border-amber-300 shadow-lg`}
            style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
          />
        </div>
      </div>

      {/* Right Action Cluster: Camera, Lights, Horn, Enter/Exit & Pedals */}
      <div className="flex flex-col items-end gap-2 pointer-events-auto">
        <div className="flex items-center gap-1.5">
          {(inVehicle || nearVehicle) && (
            <button
              onClick={onEnterExit}
              className={`${compactLandscape ? 'w-11 h-10' : 'w-12 h-12'} rounded-xl bg-amber-500 text-zinc-950 font-bold flex items-center justify-center shadow-lg active:scale-95`}
              title={inVehicle ? 'Exit Car' : 'Enter Car'}
            >
              <Car className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={onCycleCamera}
            className={`${utilBtnClass} rounded-xl bg-zinc-900/90 border border-zinc-700 text-zinc-100 flex items-center justify-center active:scale-95`}
            title="Switch Camera"
          >
            <Camera className="w-4 h-4" />
          </button>

          {inVehicle && (
            <>
              <button
                onClick={onToggleLights}
                className={`${utilBtnClass} rounded-xl bg-zinc-900/90 border border-zinc-700 text-zinc-100 flex items-center justify-center active:scale-95`}
                title="Headlights"
              >
                <Lightbulb className="w-4 h-4" />
              </button>
              <button
                onClick={onHorn}
                className={`${utilBtnClass} rounded-xl bg-zinc-900/90 border border-zinc-700 text-zinc-100 flex items-center justify-center active:scale-95`}
                title="Horn"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Pedals / Foot Actions */}
        {inVehicle ? (
          <div className="flex items-end gap-2">
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
              onPointerCancel={() => {
                touchInput.handbrake = false;
              }}
              className={`${
                compactLandscape ? 'w-12 h-12 text-[10px]' : 'w-14 h-14 text-xs'
              } rounded-xl bg-zinc-900/90 border border-amber-500/60 text-amber-400 font-bold flex flex-col items-center justify-center active:bg-amber-500 active:text-zinc-950 touch-none`}
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
              onPointerCancel={() => {
                touchInput.brake = false;
              }}
              className={`${
                compactLandscape ? 'w-14 h-14 text-[11px]' : 'w-16 h-16 text-xs'
              } rounded-xl bg-red-950/90 border border-red-600/70 text-red-200 font-bold flex items-center justify-center active:bg-red-600 touch-none`}
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
              onPointerCancel={() => {
                touchInput.throttle = false;
              }}
              className={`${
                compactLandscape ? 'w-14 h-16 text-[11px]' : 'w-16 h-20 text-xs'
              } rounded-xl bg-emerald-950/90 border border-emerald-500/70 text-emerald-200 font-bold flex items-center justify-center active:bg-emerald-500 active:text-zinc-950 touch-none`}
            >
              GAS
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-2">
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
              onPointerCancel={() => {
                touchInput.sprint = false;
              }}
              className={`${
                compactLandscape ? 'w-14 h-12 text-[11px]' : 'w-16 h-14 text-xs'
              } rounded-xl bg-zinc-900/90 border border-zinc-700 text-zinc-100 font-bold active:bg-amber-500 active:text-zinc-950 touch-none`}
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
              onPointerCancel={() => {
                touchInput.jump = false;
              }}
              className={`${
                compactLandscape ? 'w-14 h-14 text-[11px]' : 'w-16 h-16 text-xs'
              } rounded-xl bg-zinc-900/90 border border-amber-500/60 text-amber-400 font-bold active:bg-amber-500 active:text-zinc-950 touch-none`}
            >
              JUMP
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
