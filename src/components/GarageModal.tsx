import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  Car,
  Check,
  ChevronDown,
  ChevronUp,
  CircleDot,
  DoorOpen,
  Flame,
  Gauge,
  Lightbulb,
  Link2,
  Paintbrush,
  Play,
  Power,
  RotateCcw,
  RotateCw,
  Upload,
  Wrench,
} from 'lucide-react';
import {
  BodyKitStyle,
  ExhaustStyle,
  FrontBumperStyle,
  GarageCameraPreset,
  GarageSnapshotState,
  GrilleStyle,
  HeadlightStyle,
  MirrorStyle,
  RearBumperStyle,
  SideSkirtStyle,
  SpoilerStyle,
  TireCompound,
  VEHICLE_CATALOG,
  VehicleId,
  VehicleTuningConfig,
  WheelDesignStyle,
  getEffectiveVehicleStats,
} from '../game/types';

interface GarageModalProps {
  garageState: GarageSnapshotState;
  engineRunning: boolean;
  headlightsOn: boolean;
  doorsOpen: boolean;
  hoodOpen: boolean;
  onSelectVehicle: (id: VehicleId) => void;
  onSelectColor: (hex: string) => void;
  onUpdateTuning: (id: VehicleId, next: VehicleTuningConfig) => void;
  onSelectCameraPreset: (preset: GarageCameraPreset) => void;
  onToggleAutoRotate: () => void;
  onToggleDoors: () => void;
  onToggleHood: () => void;
  onToggleLights: () => void;
  onToggleEngine: () => void;
  onRevEngine: () => void;
  onUploadGlb: (id: VehicleId, file: File) => Promise<boolean>;
  onLoadGlbUrl: (id: VehicleId, url: string) => Promise<boolean>;
  onRevertPlaceholder: (id: VehicleId) => void;
  onDriveOut: () => void;
  onClose: () => void;
}

const CAMERA_MODES: { id: GarageCameraPreset; label: string }[] = [
  { id: 'orbit', label: '360° Orbit' },
  { id: 'closeup', label: 'Close-Up' },
  { id: 'interior', label: 'Interior' },
  { id: 'rear', label: 'Rear' },
];

type WorkshopTab = 'showroom' | 'exterior' | 'wheels' | 'performance' | 'lighting';

const WHEEL_COLORS = ['#d4d4d8', '#18181b', '#f59e0b', '#71717a', '#f8fafc'];
const CALIPER_COLORS = ['#dc2626', '#eab308', '#38bdf8', '#22c55e', '#71717a'];
const NEON_COLORS = ['#06b6d4', '#f59e0b', '#a855f7', '#22c55e', '#ef4444'];

export const GarageModal: React.FC<GarageModalProps> = ({
  garageState,
  engineRunning,
  headlightsOn,
  doorsOpen,
  hoodOpen,
  onSelectVehicle,
  onSelectColor,
  onUpdateTuning,
  onSelectCameraPreset,
  onToggleAutoRotate,
  onToggleDoors,
  onToggleHood,
  onToggleLights,
  onToggleEngine,
  onRevEngine,
  onUploadGlb,
  onLoadGlbUrl,
  onRevertPlaceholder,
  onDriveOut,
  onClose,
}) => {
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [workshopTab, setWorkshopTab] = useState<WorkshopTab>('showroom');
  const [showGlbPanel, setShowGlbPanel] = useState(false);
  const [glbUrlInput, setGlbUrlInput] = useState('');
  const [glbMessage, setGlbMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const spec = VEHICLE_CATALOG.find((v) => v.id === garageState.selectedId) || VEHICLE_CATALOG[0];
  const tuning = garageState.tuning;
  const eff = getEffectiveVehicleStats(spec, tuning);
  const isGlb = garageState.assetSource === 'glb';

  const patchTuning = <K extends keyof VehicleTuningConfig>(key: K, val: VehicleTuningConfig[K]) => {
    onUpdateTuning(spec.id, { ...tuning, [key]: val });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGlbMessage('Loading .GLB/.GLTF model...');
    const ok = await onUploadGlb(spec.id, file);
    setGlbMessage(ok ? `Loaded GLB: ${file.name}` : 'Failed to parse GLB/GLTF asset');
    e.target.value = '';
  };

  const handleUrlLoad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!glbUrlInput.trim()) return;
    setGlbMessage('Fetching remote GLB/GLTF...');
    const ok = await onLoadGlbUrl(spec.id, glbUrlInput.trim());
    setGlbMessage(
      ok
        ? 'External GLB/GLTF loaded cleanly'
        : 'Could not load URL (check CORS or valid .glb/.gltf URL)',
    );
  };

  return (
    <div className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between safe-area-hud sm:p-5">
      {/* Top Perimeter Header */}
      <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-3">
        <div className="pointer-events-auto bg-zinc-950/90 border border-zinc-800 rounded-xl px-3 py-2 sm:px-4 sm:py-3 max-w-md shadow-xl">
          <div className="flex items-center gap-2 text-[11px] font-medium text-amber-400">
            <span>APEX SHOWROOM &amp; TUNING WORKSHOP</span>
            <span className="text-zinc-600">·</span>
            <span>DRAG TO ROTATE 360°</span>
          </div>

          <div className="flex items-baseline gap-2.5 mt-1">
            <h2 className="font-display font-bold text-xl sm:text-2xl text-zinc-50">
              {spec.brand} {spec.model}
            </h2>
            <span className="text-xs font-mono-num text-amber-400">
              {eff.horsepower} HP · {eff.topSpeedKmh} km/h · {spec.drivetrain}
            </span>
          </div>

          {/* Honest Asset Source & Placeholder Notice */}
          <div
            className={`mt-2 px-2.5 py-1.5 rounded-lg border text-[11px] flex items-center justify-between gap-2 ${
              isGlb
                ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
                : 'bg-amber-950/50 border-amber-700/50 text-amber-200'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {isGlb
                  ? `Real GLB Loaded: ${garageState.glbLabel || 'External Asset'}`
                  : 'Procedural Coachbuilt Placeholder — No external .GLB asset loaded'}
              </span>
            </div>
            <button
              onClick={() => setShowGlbPanel((v) => !v)}
              className="shrink-0 px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[10px] font-semibold text-zinc-100 cursor-pointer"
            >
              {showGlbPanel ? 'Hide GLB' : 'Load .GLB'}
            </button>
          </div>

          {showGlbPanel && (
            <div className="mt-2 p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-300">
                  Import `.glb` / `.gltf` file or CORS URL:
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".glb,.gltf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 text-[11px] font-bold cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>File</span>
                  </button>
                  {isGlb && (
                    <button
                      onClick={() => onRevertPlaceholder(spec.id)}
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              <form onSubmit={handleUrlLoad} className="flex gap-1.5">
                <input
                  type="url"
                  value={glbUrlInput}
                  onChange={(e) => setGlbUrlInput(e.target.value)}
                  placeholder="https://.../car.glb"
                  className="flex-1 px-2.5 py-1 rounded bg-zinc-950 border border-zinc-700 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs text-zinc-100 cursor-pointer"
                >
                  <Link2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Load</span>
                </button>
              </form>
              {glbMessage && <div className="text-[11px] text-zinc-400">{glbMessage}</div>}
            </div>
          )}
        </div>

        {/* Top-Right Showroom Navigation Actions */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-zinc-950/90 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to City</span>
          </button>

          <button
            onClick={onDriveOut}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display font-bold text-sm shadow-xl transition-colors cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Save &amp; Drive Out</span>
          </button>
        </div>
      </div>

      {/* Collapsible Unified Bottom Showroom & Tuning Dock */}
      <div className="flex flex-col items-center w-full pointer-events-none">
        <button
          onClick={() => setDockCollapsed((c) => !c)}
          className="pointer-events-auto mb-1.5 flex items-center gap-1.5 px-3 py-1 rounded-t-lg bg-zinc-950/92 border border-zinc-800 text-[11px] font-medium text-zinc-300 hover:text-zinc-50 cursor-pointer"
        >
          {dockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{dockCollapsed ? 'Show Showroom & Tuning Controls' : 'Hide Controls'}</span>
        </button>

        {!dockCollapsed && (
          <div className="pointer-events-auto w-full max-w-5xl bg-zinc-950/94 border border-zinc-800 rounded-2xl p-2.5 sm:p-4 shadow-2xl space-y-2 landscape-garage-dock">
            {/* Workshop Tabs + Vehicle Selector Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-800/80">
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    { id: 'showroom', label: 'Showroom', icon: <Car className="w-3.5 h-3.5" /> },
                    { id: 'exterior', label: 'Exterior Aero', icon: <Paintbrush className="w-3.5 h-3.5" /> },
                    { id: 'wheels', label: 'Wheels & Brakes', icon: <CircleDot className="w-3.5 h-3.5" /> },
                    { id: 'performance', label: 'Performance', icon: <Gauge className="w-3.5 h-3.5" /> },
                    { id: 'lighting', label: 'Lighting & Neon', icon: <Lightbulb className="w-3.5 h-3.5" /> },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setWorkshopTab(t.id)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                      workshopTab === t.id
                        ? 'bg-amber-500 text-zinc-950'
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white'
                    }`}
                  >
                    {t.icon}
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>

              {/* Camera Quick Presets Always Visible */}
              <div className="flex flex-wrap items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-zinc-400 mr-0.5" />
                {CAMERA_MODES.map((cam) => (
                  <button
                    key={cam.id}
                    onClick={() => onSelectCameraPreset(cam.id)}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium border cursor-pointer ${
                      garageState.cameraPreset === cam.id
                        ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold'
                        : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                    }`}
                  >
                    {cam.label}
                  </button>
                ))}
                <button
                  onClick={onToggleAutoRotate}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] border cursor-pointer ${
                    garageState.autoRotate
                      ? 'bg-sky-500/15 border-sky-500 text-sky-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
                >
                  {garageState.autoRotate ? <RotateCw className="w-3 h-3" /> : <RotateCcw className="w-3 h-3" />}
                  <span>Spin</span>
                </button>
              </div>
            </div>

            {workshopTab === 'showroom' && (
              <>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {VEHICLE_CATALOG.map((car) => {
                    const active = car.id === garageState.selectedId;
                    return (
                      <button
                        key={car.id}
                        onClick={() => onSelectVehicle(car.id)}
                        className={`shrink-0 px-3 py-1.5 rounded-lg border text-left transition-colors cursor-pointer ${
                          active
                            ? 'bg-amber-500/18 border-amber-500 text-zinc-50'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                        }`}
                      >
                        <div className="text-[10px] text-zinc-400 flex items-center justify-between gap-2">
                          <span>{car.brand}</span>
                          <span className="font-mono-num text-amber-400">{car.horsepower}HP</span>
                        </div>
                        <div className="text-xs font-semibold whitespace-nowrap">{car.model}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={onToggleEngine}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border cursor-pointer ${
                        engineRunning
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{engineRunning ? 'Engine On' : 'Start Engine'}</span>
                    </button>
                    <button
                      onClick={onRevEngine}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-amber-400 cursor-pointer"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      <span>Rev</span>
                    </button>
                    <button
                      onClick={onToggleDoors}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border cursor-pointer ${
                        doorsOpen
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      <DoorOpen className="w-3.5 h-3.5" />
                      <span>Doors</span>
                    </button>
                    <button
                      onClick={onToggleHood}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border cursor-pointer ${
                        hoodOpen
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Hood</span>
                    </button>
                    <button
                      onClick={onToggleLights}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border cursor-pointer ${
                        headlightsOn
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span>Lights</span>
                    </button>
                  </div>

                  {/* Paint Swatches */}
                  <div className="flex items-center gap-1.5">
                    {spec.palette.map((swatch) => {
                      const picked = garageState.color.toLowerCase() === swatch.hex.toLowerCase();
                      return (
                        <button
                          key={swatch.hex}
                          onClick={() => onSelectColor(swatch.hex)}
                          title={swatch.name}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer ${
                            picked ? 'border-amber-400 scale-110' : 'border-zinc-700'
                          }`}
                          style={{ backgroundColor: swatch.hex }}
                        >
                          {picked && <Check className="w-3 h-3 text-white drop-shadow" />}
                        </button>
                      );
                    })}
                    <label className="w-6 h-6 rounded-full border border-zinc-600 overflow-hidden cursor-pointer flex items-center justify-center bg-zinc-900 text-[10px] text-zinc-300">
                      +
                      <input
                        type="color"
                        value={garageState.color}
                        onChange={(e) => onSelectColor(e.target.value)}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>
              </>
            )}

            {workshopTab === 'exterior' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 text-xs">
                <div className="space-y-1">
                  <div className="text-[11px] text-zinc-400">Front Bumper</div>
                  <div className="flex gap-1">
                    {(['stock', 'sport', 'gt-aero'] as FrontBumperStyle[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => patchTuning('frontBumper', s)}
                        className={`flex-1 py-1 rounded text-[11px] uppercase cursor-pointer ${
                          tuning.frontBumper === s ? 'bg-amber-500 text-zinc-950 font-bold' : 'bg-zinc-900 text-zinc-300'
                        }`}
                      >
                        {s === 'gt-aero' ? 'GT' : s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-zinc-400">Rear Diffuser</div>
                  <div className="flex gap-1">
                    {(['stock', 'diffuser', 'track'] as RearBumperStyle[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => patchTuning('rearBumper', s)}
                        className={`flex-1 py-1 rounded text-[11px] capitalize cursor-pointer ${
                          tuning.rearBumper === s ? 'bg-amber-500 text-zinc-950 font-bold' : 'bg-zinc-900 text-zinc-300'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-zinc-400">Rear Spoiler</div>
                  <div className="flex gap-1">
                    {(['none', 'lip', 'gt-wing'] as SpoilerStyle[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => patchTuning('spoiler', s)}
                        className={`flex-1 py-1 rounded text-[11px] capitalize cursor-pointer ${
                          tuning.spoiler === s ? 'bg-amber-500 text-zinc-950 font-bold' : 'bg-zinc-900 text-zinc-300'
                        }`}
                      >
                        {s === 'gt-wing' ? 'GT' : s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-zinc-400">Side Skirts &amp; Body Kit</div>
                  <div className="flex gap-1">
                    {(['stock', 'carbon'] as SideSkirtStyle[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => patchTuning('sideSkirts', s)}
                        className={`flex-1 py-1 rounded text-[11px] capitalize cursor-pointer ${
                          tuning.sideSkirts === s ? 'bg-amber-500 text-zinc-950 font-bold' : 'bg-zinc-900 text-zinc-300'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                    {(['oem', 'widebody'] as BodyKitStyle[]).map((b) => (
                      <button
                        key={b}
                        onClick={() => patchTuning('bodyKit', b)}
                        className={`flex-1 py-1 rounded text-[11px] uppercase cursor-pointer ${
                          tuning.bodyKit === b ? 'bg-sky-500 text-zinc-950 font-bold' : 'bg-zinc-900 text-zinc-300'
                        }`}
                      >
                        {b === 'widebody' ? 'Wide' : 'OEM'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-zinc-400">Exhaust &amp; Mirrors</div>
                  <div className="flex gap-1">
                    {(['stock', 'quad-ti', 'side-exit'] as ExhaustStyle[]).map((ex) => (
                      <button
                        key={ex}
                        onClick={() => patchTuning('exhaust', ex)}
                        className={`flex-1 py-1 rounded text-[10px] capitalize cursor-pointer ${
                          tuning.exhaust === ex ? 'bg-amber-500 text-zinc-950 font-bold' : 'bg-zinc-900 text-zinc-300'
                        }`}
                      >
                        {ex === 'quad-ti' ? 'Quad' : ex === 'side-exit' ? 'Side' : 'Std'}
                      </button>
                    ))}
                    {(['paint', 'carbon'] as MirrorStyle[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => patchTuning('mirrors', m)}
                        className={`flex-1 py-1 rounded text-[10px] capitalize cursor-pointer ${
                          tuning.mirrors === m ? 'bg-sky-500 text-zinc-950 font-bold' : 'bg-zinc-900 text-zinc-300'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-zinc-400">Grille Trim</div>
                  <div className="flex gap-1">
                    {(['stock', 'blackout', 'chrome'] as GrilleStyle[]).map((g) => (
                      <button
                        key={g}
                        onClick={() => patchTuning('grille', g)}
                        className={`flex-1 py-1 rounded text-[11px] capitalize cursor-pointer ${
                          tuning.grille === g ? 'bg-amber-500 text-zinc-950 font-bold' : 'bg-zinc-900 text-zinc-300'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-zinc-400">Window Tint ({Math.round(tuning.windowTint * 100)}%)</div>
                  <input
                    type="range"
                    min={0.1}
                    max={0.85}
                    step={0.05}
                    value={tuning.windowTint}
                    onChange={(e) => patchTuning('windowTint', parseFloat(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>

                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <div className="text-[11px] text-zinc-400">Custom License Plate</div>
                  <input
                    type="text"
                    maxLength={9}
                    value={tuning.licensePlate}
                    onChange={(e) => patchTuning('licensePlate', e.target.value.toUpperCase())}
                    className="w-full px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-xs font-mono-num text-zinc-100"
                  />
                </div>
              </div>
            )}

            {workshopTab === 'wheels' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="space-y-1">
                  <div className="text-[11px] text-zinc-400">Wheel Design</div>
                  <div className="grid grid-cols-2 gap-1">
                    {(['y-mesh', '5-spoke', 'deep-dish', 'offroad'] as WheelDesignStyle[]).map((wd) => (
                      <button
                        key={wd}
                        onClick={() => patchTuning('wheelDesign', wd)}
                        className={`py-1 rounded text-[11px] capitalize cursor-pointer ${
                          tuning.wheelDesign === wd ? 'bg-amber-500 text-zinc-950 font-bold' : 'bg-zinc-900 text-zinc-300'
                        }`}
                      >
                        {wd}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-zinc-400">Rim Diameter &amp; Tires</div>
                  <div className="flex gap-1">
                    {[
                      { v: 0.92, l: '18"' },
                      { v: 1.0, l: '20"' },
                      { v: 1.08, l: '22"' },
                    ].map((r) => (
                      <button
                        key={r.l}
                        onClick={() => patchTuning('rimScale', r.v)}
                        className={`flex-1 py-1 rounded text-[11px] cursor-pointer ${
                          tuning.rimScale === r.v ? 'bg-amber-500 text-zinc-950 font-bold' : 'bg-zinc-900 text-zinc-300'
                        }`}
                      >
                        {r.l}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1 pt-1">
                    {(['street', 'sport', 'drift', 'offroad'] as TireCompound[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => patchTuning('tireType', t)}
                        className={`flex-1 py-1 rounded text-[10px] capitalize cursor-pointer ${
                          tuning.tireType === t ? 'bg-sky-500 text-zinc-950 font-bold' : 'bg-zinc-900 text-zinc-300'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-zinc-400">Rim Finish Color</div>
                  <div className="flex gap-1.5 pt-1">
                    {WHEEL_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => patchTuning('wheelColor', c)}
                        className={`w-6 h-6 rounded-full border-2 cursor-pointer ${
                          tuning.wheelColor === c ? 'border-amber-400 scale-110' : 'border-zinc-700'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-zinc-400">Brake Caliper Color</div>
                  <div className="flex gap-1.5 pt-1">
                    {CALIPER_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => patchTuning('caliperColor', c)}
                        className={`w-6 h-6 rounded-full border-2 cursor-pointer ${
                          tuning.caliperColor === c ? 'border-white scale-110' : 'border-zinc-700'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {workshopTab === 'performance' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                {[
                  { label: 'Engine ECU', key: 'engineLv' as const, levels: [1, 2, 3], names: ['Stock', 'Stage 1', 'Stage 2'] },
                  { label: 'Twin-Turbo', key: 'turboLv' as const, levels: [0, 1, 2], names: ['NA', 'Sport', 'Pro Twin'] },
                  { label: 'Gearbox', key: 'transLv' as const, levels: [1, 2, 3], names: ['OEM', 'Quick', 'Race DCT'] },
                  { label: 'Suspension', key: 'suspLv' as const, levels: [1, 2, 3], names: ['Comfort', 'Lowered', 'Track Coil'] },
                  { label: 'Brakes', key: 'brakeLv' as const, levels: [1, 2, 3], names: ['OEM', 'Slotted', 'Carbon'] },
                  { label: 'Tire Grip', key: 'gripLv' as const, levels: [1, 2, 3], names: ['Street', 'Semi', 'Slick'] },
                ].map((mod) => (
                  <div key={mod.key} className="space-y-1 bg-zinc-900/70 p-2 rounded-lg border border-zinc-800">
                    <div className="text-[11px] text-zinc-400">{mod.label}</div>
                    <div className="flex gap-1">
                      {mod.levels.map((lv, idx) => (
                        <button
                          key={lv}
                          onClick={() => patchTuning(mod.key, lv as never)}
                          className={`flex-1 py-1 rounded text-[10px] font-semibold cursor-pointer ${
                            tuning[mod.key] === lv ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-950 text-zinc-400'
                          }`}
                        >
                          {mod.names[idx]}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {workshopTab === 'lighting' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="space-y-1">
                  <div className="text-[11px] text-zinc-400">Headlight Projector Tint</div>
                  <div className="flex gap-1.5">
                    {(['xenon', 'laser-blue', 'gt-yellow'] as HeadlightStyle[]).map((hs) => (
                      <button
                        key={hs}
                        onClick={() => patchTuning('headlightStyle', hs)}
                        className={`flex-1 py-1.5 rounded capitalize cursor-pointer ${
                          tuning.headlightStyle === hs
                            ? 'bg-amber-500 text-zinc-950 font-bold'
                            : 'bg-zinc-900 text-zinc-300'
                        }`}
                      >
                        {hs}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg border border-zinc-800 cursor-pointer">
                  <span className="text-zinc-200 font-medium">Signature LED DRL Strips</span>
                  <input
                    type="checkbox"
                    checked={tuning.ledDrl}
                    onChange={(e) => patchTuning('ledDrl', e.target.checked)}
                    className="accent-amber-500"
                  />
                </label>

                <div className="flex items-center justify-between p-2.5 bg-zinc-900 rounded-lg border border-zinc-800">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tuning.neonEnabled}
                      onChange={(e) => patchTuning('neonEnabled', e.target.checked)}
                      className="accent-amber-500"
                    />
                    <span className="text-zinc-200 font-medium">Neon Underglow</span>
                  </label>
                  <div className="flex gap-1">
                    {NEON_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          onUpdateTuning(spec.id, { ...tuning, neonEnabled: true, neonColor: c });
                        }}
                        className={`w-5 h-5 rounded-full border cursor-pointer ${
                          tuning.neonColor === c ? 'border-white scale-110' : 'border-zinc-700'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
