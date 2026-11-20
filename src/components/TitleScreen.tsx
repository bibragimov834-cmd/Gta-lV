import React, { useEffect } from 'react';
import {
  Briefcase,
  Building2,
  Car,
  Compass,
  Flag,
  Flame,
  Globe,
  ParkingSquare,
  Play,
  RotateCcw,
  Settings,
  SlidersHorizontal,
} from 'lucide-react';
import { GameMode, VEHICLE_CATALOG, VehicleId } from '../game/types';

interface TitleScreenProps {
  selectedVehicleId: VehicleId;
  hasSave: boolean;
  onSelectVehicle: (id: VehicleId) => void;
  onContinueGame: () => void;
  onStartPlay: (mode: GameMode) => void;
  onOpenGarage: () => void;
  onOpenMultiplayer: () => void;
  onOpenDealership: () => void;
  onOpenProperties: () => void;
  onOpenJobs: () => void;
  onOpenSettings: () => void;
}

const MODE_CARDS: { id: GameMode; label: string; desc: string; icon: React.ReactNode }[] = [
  { id: 'free-roam', label: 'Free Roam', desc: 'Open city & life sim', icon: <Car className="w-4 h-4" /> },
  { id: 'drift', label: 'Drift Mode', desc: 'Combo score & tire smoke', icon: <Flame className="w-4 h-4" /> },
  { id: 'parking', label: 'Parking Mode', desc: 'Precision bay challenge', icon: <ParkingSquare className="w-4 h-4" /> },
  { id: 'exploration', label: 'Exploration', desc: 'Discover 10 landmarks', icon: <Compass className="w-4 h-4" /> },
  { id: 'challenges', label: 'Street Sprint', desc: 'Timed checkpoint race', icon: <Flag className="w-4 h-4" /> },
];

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedVehicleId,
  hasSave,
  onSelectVehicle,
  onContinueGame,
  onStartPlay,
  onOpenGarage,
  onOpenMultiplayer,
  onOpenDealership,
  onOpenProperties,
  onOpenJobs,
  onOpenSettings,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        if (hasSave) onContinueGame();
        else onStartPlay('free-roam');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasSave, onContinueGame, onStartPlay]);

  const activeSpec = VEHICLE_CATALOG.find((v) => v.id === selectedVehicleId) || VEHICLE_CATALOG[0];

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-5 md:p-9 pointer-events-none bg-gradient-to-r from-zinc-950/92 via-zinc-950/50 to-transparent overflow-y-auto">
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-3 pointer-events-auto">
        <div>
          <svg
            viewBox="0 0 460 74"
            className="w-[290px] sm:w-[400px] h-auto"
            aria-label="Apex Horizon Ultimate Realistic Edition"
          >
            <path d="M4 12 L24 12 L16 62 L4 62 Z" fill="#f59e0b" />
            <path d="M28 12 L38 12 L30 62 L20 62 Z" fill="#f4f4f5" opacity="0.9" />
            <text
              x="50"
              y="40"
              fill="#fafafa"
              fontFamily="'Chakra Petch', sans-serif"
              fontWeight="700"
              fontSize="33"
              letterSpacing="2"
            >
              APEX HORIZON
            </text>
            <text
              x="52"
              y="60"
              fill="#f59e0b"
              fontFamily="'Chakra Petch', sans-serif"
              fontWeight="600"
              fontSize="13.5"
              letterSpacing="4.2"
            >
              OPEN WORLD LIFE SIMULATOR
            </text>
          </svg>
        </div>

        <button
          onClick={onOpenSettings}
          className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 rounded-lg text-sm font-medium text-zinc-200 transition-colors cursor-pointer whitespace-nowrap"
        >
          <Settings className="w-4 h-4 text-amber-400" />
          <span>Settings</span>
        </button>
      </div>

      {/* Main Left Column Selection & Actions */}
      <div className="max-w-xl space-y-5 pointer-events-auto my-auto py-3">
        <p className="text-sm text-zinc-300 leading-relaxed max-w-md">
          Drive tuned performance machines across downtown, airport, highways, tunnels, and mountain roads. Own luxury villas, run city careers, evade police chases, and join online car meets.
        </p>

        {/* Starter Vehicle Selector */}
        <div className="bg-zinc-950/88 border border-zinc-800 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              Starting Vehicle
            </span>
            <span className="text-xs font-mono-num text-amber-400">
              {activeSpec.horsepower} HP · {activeSpec.drivetrain} · {activeSpec.topSpeedKmh} km/h
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {VEHICLE_CATALOG.map((car) => {
              const selected = car.id === selectedVehicleId;
              return (
                <button
                  key={car.id}
                  onClick={() => onSelectVehicle(car.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-left transition-colors border cursor-pointer ${
                    selected
                      ? 'bg-amber-500/15 border-amber-500 text-zinc-50'
                      : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  <div className="text-[10px] text-zinc-400 truncate">{car.brand}</div>
                  <div className="text-xs font-semibold truncate">{car.model}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary Play & Quick Hub Launchers */}
        <div className="space-y-2.5">
          <div className="flex flex-wrap gap-2">
            {hasSave && (
              <button
                onClick={onContinueGame}
                className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display font-bold text-base tracking-wide rounded-lg transition-colors cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Continue Saved Life</span>
              </button>
            )}

            <button
              onClick={() => onStartPlay('free-roam')}
              className={`flex items-center gap-2 px-6 py-3 font-display font-bold text-base tracking-wide rounded-lg transition-colors cursor-pointer ${
                hasSave
                  ? 'bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-100'
                  : 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
              }`}
            >
              {hasSave ? <RotateCcw className="w-4 h-4 text-amber-400" /> : <Play className="w-5 h-5 fill-current" />}
              <span>{hasSave ? 'New City Session' : 'Enter City'}</span>
            </button>

            <button
              onClick={onOpenMultiplayer}
              className="flex items-center gap-2 px-4 py-3 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/60 text-sky-200 font-display font-semibold text-sm rounded-lg transition-colors cursor-pointer"
            >
              <Globe className="w-4 h-4 text-sky-400" />
              <span>Multiplayer</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={onOpenGarage}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-semibold text-zinc-200 cursor-pointer"
            >
              <Car className="w-3.5 h-3.5 text-amber-400" />
              <span>3D Garage &amp; Tuning</span>
            </button>
            <button
              onClick={onOpenDealership}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-semibold text-zinc-200 cursor-pointer"
            >
              <Car className="w-3.5 h-3.5 text-cyan-400" />
              <span>Car Dealership</span>
            </button>
            <button
              onClick={onOpenProperties}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-semibold text-zinc-200 cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Properties</span>
            </button>
            <button
              onClick={onOpenJobs}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-semibold text-zinc-200 cursor-pointer"
            >
              <Briefcase className="w-3.5 h-3.5 text-purple-400" />
              <span>Jobs</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            {MODE_CARDS.map((m) => (
              <button
                key={m.id}
                onClick={() => onStartPlay(m.id)}
                className="flex flex-col gap-1 p-2.5 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/60 rounded-lg text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-amber-400">
                  {m.icon}
                  <span className="text-xs font-semibold text-zinc-100 truncate">{m.label}</span>
                </div>
                <span className="text-[11px] text-zinc-400 truncate">{m.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Control Hint */}
      <div className="text-xs text-zinc-400 font-medium tracking-wide pointer-events-none">
        WASD Move &amp; Drive · Space Jump / Handbrake · E Enter/Exit Car · F Interact / Enter Building · Tab Phone · G Garage
      </div>
    </div>
  );
};
