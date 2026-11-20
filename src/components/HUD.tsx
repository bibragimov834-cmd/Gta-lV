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
  compactLandscape?: boolean;
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
  compactLandscape = false,
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

  const btnPad = compactLandscape ? 'p-1.5' : 'p-2';
  const iconCls = compactLandscape ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <div className="fixed inset-0 z-10 pointer-events-none safe-area-hud flex flex-col justify-between">
      {/* Top Perimeter Bar */}
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="flex items-start gap-2 sm:gap-3 min-w-0">
          <div className="pointer-events-auto">
            <MiniMap
              playerX={hud.playerX}
              playerZ={hud.playerZ}
              playerHeading={hud.playerHeading}
              entities={hud.minimapEntities}
              compact={compactLandscape}
            />
          </div>

          <div
            className={`flex flex-col gap-1 bg-zinc-950/84 border border-zinc-800/90 rounded-xl ${
              compactLandscape ? 'px-2.5 py-1.5' : 'hidden sm:flex px-3.5 py-2.5'
            }`}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-zinc-300 font-medium whitespace-nowrap">
              <span className="font-mono-num text-zinc-100">{formatClock(hud.timeOfDay)}</span>
              {!compactLandscape && (
                <>
                  <span className="text-zinc-600">·</span>
                  <span className="capitalize">{hud.weather.replace('-', ' ')}</span>
                </>
              )}
              <span className="text-zinc-600">·</span>
              <span className="font-mono-num text-emerald-400">${hud.cash.toLocaleString()}</span>
              {!compactLandscape && (
                <span className="text-[11px] font-mono-num text-sky-400">
                  (Bank ${hud.bankBalance.toLocaleString()})
                </span>
              )}
            </div>

            {!compactLandscape && (
              <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                <span>
                  Mode: <strong className="text-amber-400">{modeLabels[hud.mode]}</strong>
                </span>
                <span>Hunger {hud.hunger}%</span>
                <span>Energy {hud.energy}%</span>
              </div>
            )}

            {hud.wantedLevel > 0 && (
              <div className="flex items-center gap-1 text-[11px] font-bold text-red-400 pt-0.5">
                <ShieldAlert className="w-3 h-3" />
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3 h-3 ${
                        s <= hud.wantedLevel ? 'text-red-500 fill-red-500' : 'text-zinc-700'
                      }`}
                    />
                  ))}
                </div>
                {!compactLandscape && (
                  <span className="text-[10px] tracking-wider ml-1">{hud.policeAlertStatus}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Top-Center Active Job / Mode Objective */}
        <div className="hidden md:flex flex-col items-center gap-1.5 shrink-0">
          {hud.activeJob !== 'none' && hud.jobStepLabel && (
            <div
              className={`bg-emerald-950/90 border border-emerald-600/60 rounded-xl text-center ${
                compactLandscape ? 'px-3 py-1' : 'px-4 py-1.5'
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold">
                Contract (+${hud.jobPayout})
              </div>
              <div className="text-[11px] text-zinc-100 font-medium max-w-[230px] truncate">
                {hud.jobStepLabel}
              </div>
            </div>
          )}

          {hud.inInterior && hud.interiorLabel && (
            <div className="bg-zinc-950/90 border border-amber-500/50 rounded-xl px-3.5 py-1 text-xs font-semibold text-amber-300">
              Inside: {hud.interiorLabel}
            </div>
          )}

          {hud.mode === 'drift' && (
            <div className="bg-zinc-950/88 border border-zinc-800 rounded-xl px-4 py-1.5 text-center">
              <div className="text-[10px] text-zinc-400">Drift Score</div>
              <div className="font-display font-bold text-lg text-amber-400 tabular-nums">
                {hud.driftScore.toLocaleString()}
                {hud.currentDriftPoints > 0 && (
                  <span className="text-xs text-zinc-100 ml-1.5">
                    +{hud.currentDriftPoints} ×{hud.driftCombo}
                  </span>
                )}
              </div>
            </div>
          )}

          {hud.mode === 'parking' && (
            <div className="bg-zinc-950/88 border border-zinc-800 rounded-xl px-4 py-1.5 text-center">
              <div className="text-xs text-zinc-300 font-medium">
                Bay {hud.parkingLevel}/{hud.parkingTotalLevels}: {hud.parkingStatus || 'Enter a vehicle'}
              </div>
              <div className="text-xs font-mono-num text-amber-400 mt-0.5">
                Alignment: {hud.parkingAlignment}%
              </div>
            </div>
          )}

          {hud.mode === 'exploration' && (
            <div className="bg-zinc-950/88 border border-zinc-800 rounded-xl px-4 py-1.5 text-center">
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
            <div className="bg-zinc-950/88 border border-zinc-800 rounded-xl px-4 py-1.5 text-center">
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
        <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-1.5 pointer-events-auto max-w-[54vw] sm:max-w-none">
          <button
            onClick={onOpenPhone}
            className={`flex items-center gap-1 ${
              compactLandscape ? 'px-2 py-1.5' : 'px-2.5 py-2'
            } bg-zinc-950/88 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-100 cursor-pointer`}
            title="Smartphone & LifeOS (Tab)"
          >
            <Smartphone className={`${iconCls} text-amber-400`} />
            {!compactLandscape && <span className="hidden lg:inline">Phone</span>}
          </button>

          <button
            onClick={onOpenGarage}
            className={`flex items-center gap-1 ${
              compactLandscape ? 'px-2 py-1.5' : 'px-2.5 py-2'
            } bg-zinc-950/88 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-100 cursor-pointer`}
            title="Garage & Tuning (G)"
          >
            <Car className={`${iconCls} text-amber-400`} />
            {!compactLandscape && <span className="hidden lg:inline">Garage</span>}
          </button>

          <button
            onClick={onOpenDealership}
            className={`${btnPad} bg-zinc-950/88 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs text-cyan-400 cursor-pointer`}
            title="Car Dealership & Market"
          >
            <Car className={iconCls} />
          </button>

          <button
            onClick={onOpenProperties}
            className={`${btnPad} bg-zinc-950/88 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs text-emerald-400 cursor-pointer`}
            title="Real Estate Properties"
          >
            <Building2 className={iconCls} />
          </button>

          <button
            onClick={onOpenJobs}
            className={`${btnPad} bg-zinc-950/88 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs text-purple-400 cursor-pointer`}
            title="Jobs & Career Contracts"
          >
            <Briefcase className={iconCls} />
          </button>

          <button
            onClick={onOpenMultiplayer}
            className={`flex items-center gap-1 ${
              compactLandscape ? 'px-2 py-1.5' : 'px-2.5 py-2'
            } bg-zinc-950/88 hover:bg-zinc-800 border rounded-lg text-xs font-medium cursor-pointer ${
              hud.multiplayer.connected ? 'border-emerald-500/60 text-emerald-300' : 'border-zinc-800 text-zinc-200'
            }`}
            title="Multiplayer & Car Meets"
          >
            <Globe className={`${iconCls} text-sky-400`} />
            {hud.multiplayer.connected && (
              <span className="font-mono-num text-[11px]">{hud.multiplayer.peers.length + 1}</span>
            )}
          </button>

          <button
            onClick={onOpenModes}
            className={`${btnPad} bg-zinc-950/88 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-amber-400 cursor-pointer`}
            title="Game Modes (M)"
          >
            <Compass className={iconCls} />
          </button>

          {hud.inVehicle && !showTouchControls && (
            <>
              <button
                onClick={onToggleDoors}
                className={`${btnPad} bg-zinc-950/88 hover:bg-zinc-800 border rounded-lg cursor-pointer ${
                  hud.doorsOpen ? 'border-amber-500 text-amber-400' : 'border-zinc-800 text-zinc-300'
                }`}
                title="Doors (O)"
              >
                <DoorOpen className={iconCls} />
              </button>
              <button
                onClick={onToggleHood}
                className={`${btnPad} bg-zinc-950/88 hover:bg-zinc-800 border rounded-lg cursor-pointer ${
                  hud.hoodOpen ? 'border-amber-500 text-amber-400' : 'border-zinc-800 text-zinc-300'
                }`}
                title="Hood (B)"
              >
                <Wrench className={iconCls} />
              </button>
              <button
                onClick={onCycleCamera}
                className={`${btnPad} bg-zinc-950/88 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-200 cursor-pointer`}
                title="Camera (C)"
              >
                <Camera className={iconCls} />
              </button>
              <button
                onClick={onToggleEngine}
                className={`${btnPad} bg-zinc-950/88 hover:bg-zinc-800 border rounded-lg cursor-pointer ${
                  hud.engineRunning ? 'border-emerald-500/70 text-emerald-400' : 'border-red-500/70 text-red-400'
                }`}
                title="Engine (I)"
              >
                <Power className={iconCls} />
              </button>
              <button
                onClick={onToggleLights}
                className={`${btnPad} bg-zinc-950/88 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-200 cursor-pointer`}
                title="Headlights (L)"
              >
                <Lightbulb className={`${iconCls} ${hud.headlightsOn ? 'text-amber-400' : 'text-zinc-400'}`} />
              </button>
              <button
                onClick={() => onToggleIndicator('left')}
                className={`${btnPad} bg-zinc-950/88 hover:bg-zinc-800 border rounded-lg cursor-pointer ${
                  hud.indicatorMode === 'left' ? 'border-amber-500 text-amber-400' : 'border-zinc-800 text-zinc-400'
                }`}
                title="Left Signal (Q)"
              >
                <ArrowLeft className={iconCls} />
              </button>
              <button
                onClick={() => onToggleIndicator('hazard')}
                className={`${btnPad} bg-zinc-950/88 hover:bg-zinc-800 border rounded-lg cursor-pointer ${
                  hud.indicatorMode === 'hazard' ? 'border-amber-500 text-amber-400' : 'border-zinc-800 text-zinc-400'
                }`}
                title="Hazard (X)"
              >
                <AlertTriangle className={iconCls} />
              </button>
              <button
                onClick={() => onToggleIndicator('right')}
                className={`${btnPad} bg-zinc-950/88 hover:bg-zinc-800 border rounded-lg cursor-pointer ${
                  hud.indicatorMode === 'right' ? 'border-amber-500 text-amber-400' : 'border-zinc-800 text-zinc-400'
                }`}
                title="Right Signal (R)"
              >
                <ArrowRight className={iconCls} />
              </button>
            </>
          )}

          <button
            onClick={onCycleWeather}
            className={`${btnPad} bg-zinc-950/88 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-200 cursor-pointer`}
            title="Cycle Weather"
          >
            {settings.weather === 'rain' || settings.weather === 'heavy-rain' || settings.weather === 'thunderstorm' ? (
              <CloudRain className={`${iconCls} text-sky-400`} />
            ) : (
              <Sun className={`${iconCls} text-amber-400`} />
            )}
          </button>

          <button
            onClick={onToggleMute}
            className={`${btnPad} bg-zinc-950/88 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-200 cursor-pointer`}
            title="Mute"
          >
            {settings.muted ? (
              <VolumeX className={`${iconCls} text-red-400`} />
            ) : (
              <Volume2 className={`${iconCls} text-zinc-300`} />
            )}
          </button>

          <button
            onClick={onOpenSettings}
            className={`${btnPad} bg-zinc-950/88 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-200 cursor-pointer`}
            title="Settings"
          >
            <Settings className={`${iconCls} text-zinc-300`} />
          </button>

          <button
            onClick={onOpenPause}
            className={`${btnPad} bg-zinc-950/88 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-200 cursor-pointer`}
            title="Pause (Esc)"
          >
            <Pause className={`${iconCls} text-zinc-300`} />
          </button>
        </div>
      </div>

      {/* Bottom Perimeter Row */}
      <div className="flex items-end justify-between gap-4">
        <div className="hidden md:block landscape-hide-kbd">
          {!showTouchControls && (
            <div className="text-[11px] text-zinc-400 bg-zinc-950/78 border border-zinc-800/80 rounded-lg px-3 py-1.5">
              {hud.inVehicle
                ? 'WASD Drive · Space Drift · E Exit/Refuel · F Interact · I Engine · C Cam · L Lights · G Garage'
                : 'WASD Walk · Shift Sprint · Space Jump · E Enter Car · F Interact / Building · Tab Phone · G Garage'}
            </div>
          )}
        </div>

        {/* Center Prompts + Notifications + Compact Mobile Landscape Speedometer */}
        <div className="flex flex-col items-center gap-1.5 mx-auto pointer-events-auto">
          {hud.notification && (
            <div className="bg-zinc-950/90 border border-amber-500/50 text-zinc-100 text-[11px] sm:text-xs font-medium px-3.5 py-1.5 rounded-lg shadow-lg text-center max-w-[60vw]">
              {hud.notification}
            </div>
          )}

          {hud.inInterior && (
            <button
              onClick={onInteract}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs rounded-lg shadow-lg cursor-pointer"
            >
              <DoorOpen className="w-4 h-4" />
              <span>[F] Exit {hud.interiorLabel}</span>
            </button>
          )}

          {!hud.inInterior && hud.nearInteractZone && (
            <button
              onClick={onInteract}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs rounded-lg shadow-lg cursor-pointer"
            >
              <Building2 className="w-4 h-4" />
              <span>[F] {hud.nearInteractZone.name}</span>
            </button>
          )}

          {!hud.inVehicle && !hud.inInterior && hud.nearVehicleName && (
            <button
              onClick={onEnterExit}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-sky-500 hover:bg-sky-400 text-zinc-950 font-semibold text-xs rounded-lg shadow-lg cursor-pointer"
            >
              <Car className="w-4 h-4" />
              <span>[E] Enter {hud.nearVehicleName}</span>
            </button>
          )}

          {hud.inVehicle && hud.nearGasStation && (
            <button
              onClick={onRefuel}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs rounded-lg shadow-lg cursor-pointer"
            >
              <Fuel className="w-4 h-4" />
              <span>[E] Refuel at {hud.nearGasStation.name}</span>
            </button>
          )}

          {showTouchControls && compactLandscape && hud.inVehicle && hud.activeVehicle && (
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
              compact={true}
            />
          )}
        </div>

        {!(showTouchControls && compactLandscape) && (
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
        )}
      </div>
    </div>
  );
};
