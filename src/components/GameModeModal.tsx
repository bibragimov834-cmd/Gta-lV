import React from 'react';
import { Car, Compass, Flag, Flame, ParkingSquare, X } from 'lucide-react';
import { GameMode } from '../game/types';

interface GameModeModalProps {
  currentMode: GameMode;
  bestDriftScore: number;
  discoveredCount: number;
  totalLandmarks: number;
  bestChallengeTime: number | null;
  onSelectMode: (mode: GameMode) => void;
  onClose: () => void;
}

const MODES: { id: GameMode; title: string; desc: string; icon: React.ReactNode }[] = [
  {
    id: 'free-roam',
    title: 'Free Roam',
    desc: 'Open-world city exploration. Walk, drive any of 7 vehicles, refuel at gas stations, and experience day-night weather.',
    icon: <Car className="w-5 h-5 text-amber-400" />,
  },
  {
    id: 'drift',
    title: 'Drift Mode',
    desc: 'Hold Space (Handbrake) into corners to chain high-angle drifts, lay skid marks, and multiply your drift score.',
    icon: <Flame className="w-5 h-5 text-amber-400" />,
  },
  {
    id: 'parking',
    title: 'Parking Mode',
    desc: 'Navigate to designated Midtown & Harbor bays and align your car cleanly inside the lines.',
    icon: <ParkingSquare className="w-5 h-5 text-amber-400" />,
  },
  {
    id: 'exploration',
    title: 'City Exploration',
    desc: 'Follow cyan sky beacons to discover all 10 city landmarks across Downtown, Airport, Mountain Ridge, Mall, Villas, and Harbor Pier.',
    icon: <Compass className="w-5 h-5 text-amber-400" />,
  },
  {
    id: 'challenges',
    title: 'Driving Challenges',
    desc: 'Race against the clock through a 6-checkpoint downtown street sprint circuit.',
    icon: <Flag className="w-5 h-5 text-amber-400" />,
  },
];

export const GameModeModal: React.FC<GameModeModalProps> = ({
  currentMode,
  bestDriftScore,
  discoveredCount,
  totalLandmarks,
  bestChallengeTime,
  onSelectMode,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-zinc-950/75">
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="font-display font-bold text-xl text-zinc-50">Select Game Mode</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-2.5">
          {MODES.map((m) => {
            const active = m.id === currentMode;
            let recordText = '';
            if (m.id === 'drift' && bestDriftScore > 0) recordText = `Best: ${bestDriftScore.toLocaleString()} pts`;
            if (m.id === 'exploration') recordText = `${discoveredCount} / ${totalLandmarks} Landmarks`;
            if (m.id === 'challenges' && bestChallengeTime !== null) recordText = `Best Sprint: ${bestChallengeTime}s`;

            return (
              <button
                key={m.id}
                onClick={() => {
                  onSelectMode(m.id);
                  onClose();
                }}
                className={`w-full p-4 rounded-xl border text-left transition-colors flex items-start gap-3.5 cursor-pointer ${
                  active
                    ? 'bg-amber-500/12 border-amber-500'
                    : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="mt-0.5">{m.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display font-bold text-base text-zinc-100">{m.title}</span>
                    {recordText && (
                      <span className="text-xs font-mono-num text-amber-400 shrink-0">{recordText}</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{m.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
