import React from 'react';
import { CloudLightning, CloudRain, CloudSnow, Monitor, Moon, Sun, Sunrise, Sunset, X } from 'lucide-react';
import { GameSettings, GraphicsPreset, WeatherType } from '../game/types';

interface SettingsModalProps {
  settings: GameSettings;
  onChange: (next: GameSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onChange, onClose }) => {
  const update = <K extends keyof GameSettings>(key: K, val: GameSettings[K]) => {
    onChange({ ...settings, [key]: val });
  };

  const weatherOptions: { id: WeatherType; label: string }[] = [
    { id: 'sunny', label: 'Sunny' },
    { id: 'cloudy', label: 'Cloudy' },
    { id: 'rain', label: 'Rain' },
    { id: 'heavy-rain', label: 'Heavy Rain' },
    { id: 'fog', label: 'Dense Fog' },
    { id: 'snow', label: 'Winter Snow' },
    { id: 'thunderstorm', label: 'Thunderstorm' },
  ];

  const graphicsPresets: { id: GraphicsPreset; label: string }[] = [
    { id: 'low', label: 'LOW' },
    { id: 'medium', label: 'MEDIUM' },
    { id: 'high', label: 'HIGH' },
    { id: 'ultra', label: 'ULTRA' },
  ];

  const timePresets = [
    { label: 'Dawn', hour: 6.5, icon: <Sunrise className="w-3.5 h-3.5" /> },
    { label: 'Noon', hour: 13, icon: <Sun className="w-3.5 h-3.5" /> },
    { label: 'Sunset', hour: 18.2, icon: <Sunset className="w-3.5 h-3.5" /> },
    { label: 'Night', hour: 23, icon: <Moon className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-zinc-950/75">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="font-display font-bold text-xl text-zinc-50">Simulator Settings &amp; Controls</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Atmosphere: Time & Weather */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-zinc-200">World Time &amp; Dynamic Weather</h3>

            <div className="grid grid-cols-4 gap-2">
              {timePresets.map((p) => (
                <button
                  key={p.label}
                  onClick={() => update('timeOfDay', p.hour)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-amber-500/60 text-xs font-medium text-zinc-200 cursor-pointer"
                >
                  {p.icon}
                  <span>{p.label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <span className="text-xs text-zinc-400 w-24">Time ({Math.floor(settings.timeOfDay)}:00)</span>
              <input
                type="range"
                min={0}
                max={23.9}
                step={0.25}
                value={settings.timeOfDay}
                onChange={(e) => update('timeOfDay', parseFloat(e.target.value))}
                className="flex-1 accent-amber-500"
              />
              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoTimeCycle}
                  onChange={(e) => update('autoTimeCycle', e.target.checked)}
                  className="accent-amber-500"
                />
                Auto Cycle
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {weatherOptions.map((w) => (
                <button
                  key={w.id}
                  onClick={() => update('weather', w.id)}
                  className={`py-2 px-2.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    settings.weather === w.id
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {(w.id === 'rain' || w.id === 'heavy-rain') && <CloudRain className="w-3.5 h-3.5" />}
                  {w.id === 'snow' && <CloudSnow className="w-3.5 h-3.5" />}
                  {w.id === 'thunderstorm' && <CloudLightning className="w-3.5 h-3.5" />}
                  <span>{w.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Graphics Presets & Optimization */}
          <div className="space-y-3 pt-4 border-t border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-amber-400" />
              Graphics Preset &amp; Performance
            </h3>

            <div className="grid grid-cols-4 gap-2">
              {graphicsPresets.map((gp) => (
                <button
                  key={gp.id}
                  onClick={() => update('graphicsPreset', gp.id)}
                  className={`py-2 rounded-lg border text-xs font-bold cursor-pointer ${
                    settings.graphicsPreset === gp.id
                      ? 'bg-amber-500 text-zinc-950 border-amber-400'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  {gp.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-300 cursor-pointer">
                <span>Dynamic Shadows</span>
                <input
                  type="checkbox"
                  checked={settings.shadows}
                  onChange={(e) => update('shadows', e.target.checked)}
                  className="accent-amber-500"
                />
              </label>
              <label className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-300 cursor-pointer">
                <span>PBR Reflections</span>
                <input
                  type="checkbox"
                  checked={settings.reflections}
                  onChange={(e) => update('reflections', e.target.checked)}
                  className="accent-amber-500"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1.5">
                <div className="text-xs text-zinc-400">Traffic AI Density</div>
                <div className="flex gap-1">
                  {(['low', 'medium', 'high'] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => update('trafficDensity', d)}
                      className={`flex-1 py-1 rounded text-[11px] font-medium capitalize cursor-pointer ${
                        settings.trafficDensity === d
                          ? 'bg-amber-500 text-zinc-950'
                          : 'bg-zinc-900 text-zinc-400'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1.5">
                <div className="text-xs text-zinc-400">Speed Units</div>
                <div className="flex gap-1">
                  {(['kmh', 'mph'] as const).map((u) => (
                    <button
                      key={u}
                      onClick={() => update('units', u)}
                      className={`flex-1 py-1 rounded text-[11px] font-medium uppercase cursor-pointer ${
                        settings.units === u ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1.5">
                <div className="text-xs text-zinc-400">Touch Controls</div>
                <div className="flex gap-1">
                  {(['auto', 'always', 'off'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => update('touchControls', t)}
                      className={`flex-1 py-1 rounded text-[11px] font-medium capitalize cursor-pointer ${
                        settings.touchControls === t
                          ? 'bg-amber-500 text-zinc-950'
                          : 'bg-zinc-900 text-zinc-400'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-400 w-24">Audio Volume</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={settings.volume}
                  onChange={(e) => update('volume', parseFloat(e.target.value))}
                  className="flex-1 accent-amber-500"
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-400 w-24">Steering Sens.</span>
                <input
                  type="range"
                  min={0.6}
                  max={1.5}
                  step={0.05}
                  value={settings.steeringSensitivity}
                  onChange={(e) => update('steeringSensitivity', parseFloat(e.target.value))}
                  className="flex-1 accent-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Controls Cheat Sheet */}
          <div className="space-y-2 pt-4 border-t border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-200">PC Keyboard &amp; Mouse Controls</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-zinc-400">
              <div><span className="text-zinc-100 font-mono-num">W A S D / Arrows</span> — Move / Drive</div>
              <div><span className="text-zinc-100 font-mono-num">Space</span> — Jump / Handbrake Drift</div>
              <div><span className="text-zinc-100 font-mono-num">Shift</span> — Sprint (On Foot)</div>
              <div><span className="text-zinc-100 font-mono-num">E</span> — Enter / Exit Car &amp; Refuel</div>
              <div><span className="text-zinc-100 font-mono-num">F</span> — Interact / Enter Interior / NPC</div>
              <div><span className="text-zinc-100 font-mono-num">C</span> — Cycle Camera (3rd / Cockpit / Hood)</div>
              <div><span className="text-zinc-100 font-mono-num">Q / R / X</span> — Turn Signals &amp; Hazards</div>
              <div><span className="text-zinc-100 font-mono-num">O / B</span> — Open Doors / Engine Hood</div>
              <div><span className="text-zinc-100 font-mono-num">L / H / G / Tab</span> — Lights / Horn / Garage / Phone</div>
            </div>
          </div>
        </div>

        <div className="px-6 py-3.5 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
