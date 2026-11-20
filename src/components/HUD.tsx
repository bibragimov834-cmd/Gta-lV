import React from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  Camera,
  Car,
  CloudRain,
  Compass,
  DoorOpen,
  Fuel,
  Globe,
  Lightbulb,
  Pause,
  Power,
  Settings,
  ShieldAlert,
  Smartphone,
  Star,
  Sun,
  Volume2,
  VolumeX,
  Wrench,
} from 'lucide-react';
import { GameSettings, HudSnapshot } from '../game/types';
import { MiniMap } from './MiniMap';
import { Speedometer } from './Speedometer';

interface HUDProps {
  hud: HudSnapshot;
  settings: GameSettings;
  showTouchControls: boolean;
  onOpenGarage: () => void;
  onOpenModes: () => void;
  onOpenSettings: () => void;
  onOpenPause: () => void;
  onOpenMultiplayer: () => void;
  onOpenDealership: () => void;
  onOpenProperties: () => void;
  onOpenJobs: () => void;
  onOpenPhone: () => void;
  onToggleMute: () => void;
  onCycleCamera: () => void;
  onToggleLights: () => void;
  onToggleEngine: () => void;
  onToggleIndicator: (mode: 'left' | 'right' | 'hazard') => void;
  onToggleDoors: () => void;
  onToggleHood: () => void;
  onEnterExit: () => void;
  onInteract: () => void;
  onRefuel: () => void;
  onCycleWeather: () => void;
}

function formatClock(hourFloat: number): string {
  const h = Math.floor(hourFloat) % 24;
  const m = Math.floor((hourFloat - Math.floor(hourFloat)) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const HUD: React.FC<HUDProps> = ({
  hud,
  settings,
  showTouchControls,
  onOpenGarage,
  onOpenModes,
  onOpenSettings,
  onOpenPause,
  onOpenMultiplayer,
  onOpenDealership,
  onOpenProperties,
  onOpenJobs,
  onOpenPhone,
  onToggleMute,
  onCycleCamera,
  onToggleLights,
  onToggleEngine,
  onToggleIndicator,
  onToggleDoors,
  onToggleHood,
  onEnterExit,
  onInteract,
  onRefuel,
  onCycleWeather,
}) => {
  const modeLabels: Record<string, string> = {
    'free-roam': 'Free Roam',
    drift: 'Drift Mode',
    parking: 'Parking Mode',
    exploration: 'Exploration',
    challenges: 'Street Sprint',
  };

  return (
    <div className="fixed inset-0 z-10 pointer-events-none p-3 sm:p-4 flex flex-col justify-between">
      {/* Top Perimeter Bar */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="pointer-events-auto">
            <MiniMap
              playerX={hud.playerX}
              playerZ={hud.playerZ}
              playerHeading={hud.playerHeading}
              entities={hud.minimapEntities}
            />
          </div>

          <div className="hidden sm:flex flex-col gap-1.5 bg-zinc-950/84 border border-zinc-800/90 rounded-xl px-3.5 py-2.5">
            <div className="flex items-center gap-2 text-xs text-zinc-300 font-medium">
              <span className="font-mono-num text-zinc-100">{formatClock(hud.timeOfDay)}</span>
              <span className="text-zinc-600">·</span>
              <span className="capitalize">{hud.weather.replace('-', ' ')}</span>
              <span className="text-zinc-600">·</span>
              <span className="font-mono-num text-emerald-400">${hud.cash.toLocaleString()}</span>
              <span className="text-[11px] font-mono-num text-sky-400">(Bank ${hud.bankBalance.toLocaleString()})</span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-zinc-400">
              <span>
                Mode: <strong className="text-amber-400">{modeLabels[hud.mode]}</strong>
              </span>
              <span>Hunger {hud.hunger}%</span>
              <span>Energy {hud.energy}%</span>
            </div>

            {hud.wantedLevel > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-red-400 pt-0.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${
                        s <= hud.wantedLevel ? 'text-red-500 fill-red-500' : 'text-zinc-700'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[10px] tracking-wider ml-1">{hud.policeAlertStatus}</span>
              </div>
            )}
          </div>
        </div>

        {/* Top-Center Active Job / Mode Objective */}
        <div className="hidden md:flex flex-col items-center gap-1.5">
          {hud.activeJob !== 'none' && hud.jobStepLabel && (
            <div className="bg-emerald-950/90 border border-emerald-600/60 rounded-xl px-4 py-1.5 text-center">
              <div className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold">
                Active Career Contract (+${hud.jobPayout})
              </div>
              <div className="text-xs text-zinc-100 font-medium">{hud.jobStepLabel}</div>
            </div>
          )}

          {hud.inInterior && hud.interiorLabel && (
            <div className="bg-zinc-950/90 border border-amber-500/50 rounded-xl px-4 py-1.5 text-xs font-semibold text-amber-300">
              Inside: {hud.interiorLabel}
            </div>
          )}

          {hud.mode === 'drift' && (
            <div className="bg-zinc-950/88 border border-zinc-800 rounded-xl px-5 py-2 text-center">
              <div className="text-[11px] text-zinc-400">Drift Score</div>
              <div className="font-display font-bold text-xl text-amber-400 tabular-nums">
                {hud.driftScore.toLocaleString()}
                {hud.currentDriftPoints > 0 && (
                  <span className="text-sm text-zinc-100 ml-2">
                    +{hud.currentDriftPoints} ×{hud.driftCombo}
                  </span>
                )}
              </div>
            </div>
          )}

          {hud.mode === 'parking' && (
            <div className="bg-zinc-950/88 border border-zinc-800 rounded-xl px-5 py-2 text-center">
              <div className="text-xs text-zinc-300 font-medium">
                Bay {hud.parkingLevel}/{hud.parkingTotalLevels}: {hud.parkingStatus || 'Enter a vehicle'}
              </div>
              <div className="text-xs font-mono-num text-amber-400 mt-0.5">
                Alignment: {hud.parkingAlignment}%
              </div>
            </div>
          )}

          {hud.mode === 'exploration' && (
            <div className="bg-zinc-950/88 border border-zinc-800 rounded-xl px-5 py-2 text-center">
              <div className="text-xs text-zinc-300 font-medium">
                Landmarks:{' '}
                <span className="text-cyan-400 font-mono-num">
                  {hud.discoveredLandmarks.length}/{hud.totalLandmarks}
                </span>
              </div>
              {hud.nearestLandmark && (
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  Nearest: {hud.nearestLandmark.name} ({hud.nearestLandmark.distance}m)
                </div>
              )}
            </div>
          )}

          {hud.mode === 'challenges' && hud.challengeActive && (
            <div className="bg-zinc-950/88 border border-zinc-800 rounded-xl px-5 py-2 text-center">
              <div className="text-xs text-zinc-300 font-medium">
                Gate{' '}
                <span className="text-amber-400 font-mono-num">
                  {hud.challengeCheckpoint}/{hud.challengeTotalCheckpoints}
                </span>
                <span className="mx-2 text-zinc-600">·</span>
                <span className="font-mono-num text-zinc-100">{hud.challengeTime.toFixed(1)}s</span>
              </div>
            </div>
          )}
        </div>

        {/* Top-Right Action Bar */}
        <div className="flex flex-wrap items-center justify-end gap-1.5 pointer-events-auto max-w-md sm:max-w-none">
          <button
            onClick={onOpenPhone}
            className="flex items-center gap-1 px-2.5 py-2 bg-zinc-950/88 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-100 cursor-pointer"
            title="Smartphone & LifeOS (Tab)"
          >
            <Smartphone className="w-4 h-4 text-amber-400" />
            <span className="hidden lg:inline">Phone</span>
          </button>

          <button
            onClick={onOpenGarage}
            className="flex items-center gap-1 px-2.5 py-2 bg-zinc-950/88 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-100 cursor-pointer"
            title="Garage & Tuning (G)"
          >
            <Car className="w-4 h-4 text-amber-400" />
            <span className="hidden lg:inline">Garage</span>
          </button>

          <button
            onClick={onOpenDealership}
            className="p-2 bg-zinc-950/88 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs text-cyan-400 cursor-pointer"
            title="Car Dealership & Market"
          >
            <Car className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenProperties}
            className="p-2 bg-zinc-950/88 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs text-emerald-400 cursor-pointer"
            title="Real Estate Properties"
          >
            <Building2 className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenJobs}
            className="p-2 bg-zinc-950/88 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs text-purple-400 cursor-pointer"
            title="Jobs & Career Contracts"
          >
            <Briefcase className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenMultiplayer}
            className={`flex items-center gap-1 px-2.5 py-2 bg-zinc-950/88 hover:bg-zinc-800 border rounded-lg text-xs font-medium cursor-pointer ${
              hud.multiplayer.connected ? 'border-emerald-500/60 text-emerald-300' : 'border-zinc-800 text-zinc-200'
            }`}
            title="Multiplayer & Car Meets"
          >
            <Globe className="w-4 h-4 text-sky-400" />
            {hud.multiplayer.connected && (
              <span className="font-mono-num text-[11px]">{hud.multiplayer.peers.length + 1}</span>
            )}
          </button>

          <button
            onClick={onOpenModes}
            className="p-2 bg-zinc-950/88 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-amber-400 cursor-pointer"
            title="Game Modes (M)"
          >
            <Compass className="w-4 h-4" />
          </button>

          {hud.inVehicle && !showTouchControls && (
            <>
              <button
                onClick={onToggleDoors}
                className={`p-2 bg-zinc-950/88 hover:bg-zinc-800 border rounded-lg cursor-pointer ${
                  hud.doorsOpen ? 'border-amber-500 text-amber-400' : 'border-zinc-800 text-zinc-300'
                }`}
                title="Doors (O)"
              >
                <DoorOpen className="w-4 h-4" />
              </button>
              <button
                onClick={onToggleHood}
                className={`p-2 bg-zinc-950/88 hover:bg-zinc-800 border rounded-lg cursor-pointer ${
                  hud.hoodOpen ? 'border-amber-500 text-amber-400' : 'border-zinc-800 text-zinc-300'
                }`}
                title="Hood (B)"
              >
                <Wrench className="w-4 h-4" />
              </button>
              <button
                onClick={onCycleCamera}
                className="p-2 bg-zinc-950/88 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-200 cursor-pointer"
                title="Camera (C)"
              >
                <Camera className="w-4 h-4" />
              </button>
              <button
                onClick={onToggleEngine}
                className={`p-2 bg-zinc-950/88 hover:bg-zinc-800 border rounded-lg cursor-pointer ${
                  hud.engineRunning ? 'border-emerald-500/70 text-emerald-400' : 'border-red-500/70 text-red-400'
                }`}
                title="Engine (I)"
              >
                <Power className="w-4 h-4" />
              </button>
              <button
                onClick={onToggleLights}
                className="p-2 bg-zinc-950/88 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-200 cursor-pointer"
                title="Headlights (L)"
              >
                <Lightbulb className={`w-4 h-4 ${hud.headlightsOn ? 'text-amber-400' : 'text-zinc-400'}`} />
              </button>
              <button
                onClick={() => onToggleIndicator('left')}
                className={`p-2 bg-zinc-950/88 hover:bg-zinc-800 border rounded-lg cursor-pointer ${
                  hud.indicatorMode === 'left' ? 'border-amber-500 text-amber-400' : 'border-zinc-800 text-zinc-400'
                }`}
                title="Left Signal (Q)"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => onToggleIndicator('hazard')}
                className={`p-2 bg-zinc-950/88 hover:bg-zinc-800 border rounded-lg cursor-pointer ${
                  hud.indicatorMode === 'hazard' ? 'border-amber-500 text-amber-400' : 'border-zinc-800 text-zinc-400'
                }`}
                title="Hazard (X)"
              >
                <AlertTriangle className="w-4 h-4" />
              </button>
              <button
                onClick={() => onToggleIndicator('right')}
                className={`p-2 bg-zinc-950/88 hover:bg-zinc-800 border rounded-lg cursor-pointer ${
                  hud.indicatorMode === 'right' ? 'border-amber-500 text-amber-400' : 'border-zinc-800 text-zinc-400'
                }`}
                title="Right Signal (R)"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            onClick={onCycleWeather}
            className="p-2 bg-zinc-950/88 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-200 cursor-pointer"
            title="Cycle Weather"
          >
            {settings.weather === 'rain' || settings.weather === 'heavy-rain' || settings.weather === 'thunderstorm' ? (
              <CloudRain className="w-4 h-4 text-sky-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
          </button>

          <button
            onClick={onToggleMute}
            className="p-2 bg-zinc-950/88 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-200 cursor-pointer"
            title="Mute"
          >
            {settings.muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-zinc-300" />}
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 bg-zinc-950/88 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-200 cursor-pointer"
            title="Settings"
          >
            <Settings className="w-4 h-4 text-zinc-300" />
          </button>

          <button
            onClick={onOpenPause}
            className="p-2 bg-zinc-950/88 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-200 cursor-pointer"
            title="Pause (Esc)"
          >
            <Pause className="w-4 h-4 text-zinc-300" />
          </button>
        </div>
      </div>

      {/* Bottom Perimeter Row */}
      <div className="flex items-end justify-between gap-4">
        <div className="hidden md:block">
          {!showTouchControls && (
            <div className="text-[11px] text-zinc-400 bg-zinc-950/78 border border-zinc-800/80 rounded-lg px-3 py-1.5">
              {hud.inVehicle
                ? 'WASD Drive · Space Drift · E Exit/Refuel · F Interact · I Engine · C Cam · L Lights · G Garage'
                : 'WASD Walk · Shift Sprint · Space Jump · E Enter Car · F Interact / Building · Tab Phone · G Garage'}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-2 mx-auto pointer-events-auto">
          {hud.notification && (
            <div className="bg-zinc-950/90 border border-amber-500/50 text-zinc-100 text-xs font-medium px-4 py-2 rounded-lg shadow-lg text-center">
              {hud.notification}
            </div>
          )}

          {hud.inInterior && (
            <button
              onClick={onInteract}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs rounded-lg shadow-lg cursor-pointer"
            >
              <DoorOpen className="w-4 h-4" />
              <span>[F] Exit {hud.interiorLabel}</span>
            </button>
          )}

          {!hud.inInterior && hud.nearInteractZone && (
            <button
              onClick={onInteract}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs rounded-lg shadow-lg cursor-pointer"
            >
              <Building2 className="w-4 h-4" />
              <span>[F] {hud.nearInteractZone.name}</span>
            </button>
          )}

          {!hud.inVehicle && !hud.inInterior && hud.nearVehicleName && (
            <button
              onClick={onEnterExit}
              className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-zinc-950 font-semibold text-xs rounded-lg shadow-lg cursor-pointer"
            >
              <Car className="w-4 h-4" />
              <span>[E] Enter {hud.nearVehicleName}</span>
            </button>
          )}

          {hud.inVehicle && hud.nearGasStation && (
            <button
              onClick={onRefuel}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs rounded-lg shadow-lg cursor-pointer"
            >
              <Fuel className="w-4 h-4" />
              <span>[E] Refuel at {hud.nearGasStation.name}</span>
            </button>
          )}
        </div>

        <div className={`pointer-events-auto ${showTouchControls ? 'mb-36 sm:mb-40' : ''}`}>
          {hud.inVehicle && hud.activeVehicle && (
            <Speedometer
              speedKmh={hud.speedKmh}
              rpm={hud.rpm}
              gear={hud.gear}
              fuel={hud.fuel}
              headlightsOn={hud.headlightsOn}
              indicatorMode={hud.indicatorMode}
              indicatorBlinkOn={hud.indicatorBlinkOn}
              isDrifting={hud.isDrifting}
              units={settings.units}
              vehicleLabel={`${hud.activeVehicle.brand} ${hud.activeVehicle.model}`}
            />
          )}
        </div>
      </div>
    </div>
  );
};
