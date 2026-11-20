import React from 'react';
import { ArrowLeft, ArrowRight, Fuel, Lightbulb } from 'lucide-react';
import { IndicatorMode, SpeedUnit } from '../game/types';

interface SpeedometerProps {
  speedKmh: number;
  rpm: number;
  gear: string;
  fuel: number;
  headlightsOn: boolean;
  indicatorMode: IndicatorMode;
  indicatorBlinkOn: boolean;
  isDrifting: boolean;
  units: SpeedUnit;
  vehicleLabel: string;
  compact?: boolean;
}

export const Speedometer: React.FC<SpeedometerProps> = ({
  speedKmh,
  rpm,
  gear,
  fuel,
  headlightsOn,
  indicatorMode,
  indicatorBlinkOn,
  isDrifting,
  units,
  vehicleLabel,
  compact = false,
}) => {
  const displaySpeed = units === 'mph' ? Math.round(speedKmh * 0.621371) : speedKmh;
  const rpmRatio = Math.min(1, Math.max(0, rpm / 8000));
  const radius = 54;
  const circumference = Math.PI * 1.4 * radius;
  const dashOffset = circumference * (1 - rpmRatio);

  const leftActive = (indicatorMode === 'left' || indicatorMode === 'hazard') && indicatorBlinkOn;
  const rightActive = (indicatorMode === 'right' || indicatorMode === 'hazard') && indicatorBlinkOn;

  if (compact) {
    return (
      <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl px-3 py-2 w-[156px] shadow-xl">
        <div className="flex items-center justify-between text-[10px] mb-1">
          <span className="text-zinc-400 truncate max-w-[76px]">{vehicleLabel}</span>
          <div className="flex items-center gap-1">
            <ArrowLeft className={`w-3 h-3 ${leftActive ? 'text-amber-400' : 'text-zinc-700'}`} />
            <Lightbulb className={`w-3 h-3 ${headlightsOn ? 'text-amber-400' : 'text-zinc-600'}`} />
            <ArrowRight className={`w-3 h-3 ${rightActive ? 'text-amber-400' : 'text-zinc-700'}`} />
          </div>
        </div>

        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1">
            <span className="font-display font-bold text-2xl text-zinc-50 tabular-nums leading-none">
              {displaySpeed}
            </span>
            <span className="text-[9px] text-zinc-400">{units === 'mph' ? 'MPH' : 'KM/H'}</span>
          </div>
          <span className="text-xs font-mono-num font-bold text-amber-400">
            {isDrifting ? 'DRIFT' : `G ${gear}`}
          </span>
        </div>

        {/* RPM Strip */}
        <div className="mt-1.5 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${rpmRatio > 0.84 ? 'bg-red-500' : 'bg-amber-500'}`}
            style={{ width: `${Math.round(rpmRatio * 100)}%` }}
          />
        </div>

        {/* Fuel Strip */}
        <div className="mt-1 flex items-center gap-1.5">
          <Fuel className={`w-3 h-3 shrink-0 ${fuel < 20 ? 'text-red-400' : 'text-emerald-400'}`} />
          <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${fuel < 20 ? 'bg-red-500' : 'bg-emerald-500'}`}
              style={{ width: `${fuel}%` }}
            />
          </div>
          <span className="text-[9px] font-mono-num text-zinc-400">{fuel}%</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-950/88 border border-zinc-800 rounded-2xl p-3.5 w-[214px] shadow-xl">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium text-zinc-400 truncate max-w-[125px]">
          {vehicleLabel}
        </span>
        <div className="flex items-center gap-1.5">
          <ArrowLeft className={`w-3.5 h-3.5 ${leftActive ? 'text-amber-400' : 'text-zinc-700'}`} />
          <Lightbulb className={`w-3.5 h-3.5 ${headlightsOn ? 'text-amber-400' : 'text-zinc-600'}`} />
          <ArrowRight className={`w-3.5 h-3.5 ${rightActive ? 'text-amber-400' : 'text-zinc-700'}`} />
          {isDrifting && <span className="text-[10px] font-bold text-amber-400">DRIFT</span>}
        </div>
      </div>

      <div className="relative flex items-center justify-center h-[120px]">
        <svg viewBox="0 0 140 120" className="w-[140px] h-[120px]">
          <circle
            cx="70"
            cy="68"
            r={radius}
            fill="none"
            stroke="#27272a"
            strokeWidth="8"
            strokeDasharray={`${circumference} ${Math.PI * 2 * radius}`}
            strokeLinecap="round"
            transform="rotate(144 70 68)"
          />
          <circle
            cx="70"
            cy="68"
            r={radius}
            fill="none"
            stroke={rpmRatio > 0.84 ? '#ef4444' : '#f59e0b'}
            strokeWidth="8"
            strokeDasharray={`${circumference} ${Math.PI * 2 * radius}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform="rotate(144 70 68)"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
          <span className="font-display font-bold text-3xl text-zinc-50 tabular-nums leading-none">
            {displaySpeed}
          </span>
          <span className="text-[10px] font-medium text-zinc-400 mt-0.5">
            {units === 'mph' ? 'MPH' : 'KM/H'}
          </span>
          <div className="mt-1.5 flex items-center gap-2 text-xs">
            <span className="font-mono-num font-bold text-amber-400">G {gear}</span>
            <span className="text-zinc-600">·</span>
            <span className="font-mono-num text-zinc-400">{Math.round(rpm / 100) / 10}k</span>
          </div>
        </div>
      </div>

      <div className="mt-1 flex items-center gap-2">
        <Fuel className={`w-3.5 h-3.5 shrink-0 ${fuel < 20 ? 'text-red-400' : 'text-emerald-400'}`} />
        <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${fuel < 20 ? 'bg-red-500' : 'bg-emerald-500'}`}
            style={{ width: `${fuel}%` }}
          />
        </div>
        <span className="text-[10px] font-mono-num text-zinc-400 w-7 text-right">{fuel}%</span>
      </div>
    </div>
  );
};
