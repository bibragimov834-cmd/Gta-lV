import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, Play, RotateCcw, Save, Settings, X } from 'lucide-react';
import { GameEngine } from './game/GameEngine';
import { buildDefaultTuningsMap, hasSavedGame, loadLocalSave } from './game/saveSystem';
import {
  DEFAULT_APPEARANCE,
  GameMode,
  GameSettings,
  HudSnapshot,
  VEHICLE_CATALOG,
  VehicleId,
  WeatherType,
  WorldInteractZone,
  createDefaultTuning,
} from './game/types';
import { DealershipModal } from './components/DealershipModal';
import { GameModeModal } from './components/GameModeModal';
import { GarageModal } from './components/GarageModal';
import { HUD } from './components/HUD';
import { JobsModal } from './components/JobsModal';
import { LifeSimModal, LifeSimTab } from './components/LifeSimModal';
import { MobileControls } from './components/MobileControls';
import { MultiplayerModal } from './components/MultiplayerModal';
import { PropertyModal } from './components/PropertyModal';
import { SettingsModal } from './components/SettingsModal';
import { TitleScreen } from './components/TitleScreen';
import {
  isCompactLandscapeViewport,
  isMobileTouchDevice,
  requestLandscapeOrientation,
} from './utils/orientation';

const INITIAL_SETTINGS: GameSettings = {
  graphicsPreset: 'high',
  shadows: true,
  reflections: true,
  trafficDensity: 'medium',
  weather: 'sunny',
  timeOfDay: 14.5,
  autoTimeCycle: true,
  volume: 0.65,
  muted: false,
  steeringSensitivity: 1.0,
  units: 'kmh',
  touchControls: 'auto',
};

const INITIAL_HUD: HudSnapshot = {
  screen: 'title',
  inGarage: false,
  inInterior: false,
  interiorLabel: null,
  interiorPropertyId: null,
  inVehicle: false,
  engineRunning: false,
  activeVehicle: null,
  activeVehicleColor: VEHICLE_CATALOG[0].defaultColor,
  activeVehicleHealth: 100,
  activeAssetSource: 'procedural-placeholder',
  speedKmh: 0,
  rpm: 0,
  gear: 'N',
  fuel: 100,
  headlightsOn: false,
  indicatorMode: 'off',
  indicatorBlinkOn: false,
  doorsOpen: false,
  hoodOpen: false,
  isDrifting: false,
  driftAngleDeg: 0,
  cameraMode: 'third-person',
  playerX: 3.5,
  playerZ: 6,
  playerHeading: 0,
  timeOfDay: 14.5,
  weather: 'sunny',
  cash: 25000,
  bankBalance: 45000,
  hunger: 92,
  energy: 95,
  wantedLevel: 0,
  policeAlertStatus: null,
  ownedVehicles: ['bmw_m4', 'chevy_cobalt'],
  ownedProperties: [],
  tunings: buildDefaultTuningsMap(),
  appearance: { ...DEFAULT_APPEARANCE },
  inventory: [],
  transactions: [],
  activeJob: 'none',
  jobStepLabel: null,
  jobPayout: 0,
  nearVehicleName: null,
  nearGasStation: null,
  nearShowroom: false,
  nearInteractZone: null,
  refueling: false,
  mode: 'free-roam',
  driftScore: 0,
  driftCombo: 1,
  currentDriftPoints: 0,
  bestDriftScore: 0,
  parkingLevel: 1,
  parkingTotalLevels: 3,
  parkingAlignment: 0,
  parkingStatus: '',
  discoveredLandmarks: [],
  totalLandmarks: 10,
  nearestLandmark: null,
  challengeActive: false,
  challengeCheckpoint: 1,
  challengeTotalCheckpoints: 6,
  challengeTime: 0,
  challengeBestTime: null,
  notification: null,
  minimapEntities: [],
  garageState: {
    selectedId: 'bmw_m4',
    color: VEHICLE_CATALOG[0].defaultColor,
    cameraPreset: 'orbit',
    autoRotate: true,
    assetSource: 'procedural-placeholder',
    glbLabel: null,
    tuning: createDefaultTuning(VEHICLE_CATALOG[0]),
  },
  multiplayer: {
    connected: false,
    connecting: false,
    playerId: '',
    roomId: 'city-public-1',
    rooms: [
      { id: 'city-public-1', name: 'Metro Free Roam #1', mode: 'Open City & Life Sim', maxPlayers: 24, playerCount: 0 },
      { id: 'drift-meet-1', name: 'Midnight Drift Meet', mode: 'Drift Competition', maxPlayers: 16, playerCount: 0 },
      { id: 'airport-drag-1', name: 'Airport Runway Strip', mode: 'Car Meet & Top Speed', maxPlayers: 16, playerCount: 0 },
    ],
    peers: [],
    chat: [],
    friends: ['Marco_AMG', 'Elena_M4'],
    pingMs: 0,
  },
};

interface NpcDialogState {
  name: string;
  subtitle: string;
  lines: string[];
  index: number;
}

function isTextInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [settings, setSettings] = useState<GameSettings>(INITIAL_SETTINGS);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const ownedPropsRef = useRef(hud.ownedProperties);
  ownedPropsRef.current = hud.ownedProperties;

  const [starterVehicleId, setStarterVehicleId] = useState<VehicleId>('bmw_m4');
  const [saveAvailable, setSaveAvailable] = useState<boolean>(() => hasSavedGame());

  const [showModes, setShowModes] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPause, setShowPause] = useState(false);
  const [showMultiplayer, setShowMultiplayer] = useState(false);
  const [showProperties, setShowProperties] = useState(false);
  const [showDealership, setShowDealership] = useState(false);
  const [dealershipMarket, setDealershipMarket] = useState<'new' | 'used'>('new');
  const [showJobs, setShowJobs] = useState(false);
  const [showLifeSim, setShowLifeSim] = useState(false);
  const [lifeSimTab, setLifeSimTab] = useState<LifeSimTab>('phone');
  const [npcDialog, setNpcDialog] = useState<NpcDialogState | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [compactLandscape, setCompactLandscape] = useState<boolean>(() => isCompactLandscapeViewport());

  const closeAllOverlays = useCallback(() => {
    setShowModes(false);
    setShowSettings(false);
    setShowPause(false);
    setShowMultiplayer(false);
    setShowProperties(false);
    setShowDealership(false);
    setShowJobs(false);
    setShowLifeSim(false);
    setNpcDialog(null);
  }, []);

  useEffect(() => {
    const syncViewportState = () => {
      setIsTouchDevice(isMobileTouchDevice());
      setCompactLandscape(isCompactLandscapeViewport());
    };
    const onOrientationChange = () => {
      syncViewportState();
      requestAnimationFrame(syncViewportState);
      window.setTimeout(syncViewportState, 160);
    };

    syncViewportState();
    window.addEventListener('resize', syncViewportState);
    window.addEventListener('orientationchange', onOrientationChange);
    window.visualViewport?.addEventListener('resize', syncViewportState);
    window.screen?.orientation?.addEventListener('change', onOrientationChange);

    return () => {
      window.removeEventListener('resize', syncViewportState);
      window.removeEventListener('orientationchange', onOrientationChange);
      window.visualViewport?.removeEventListener('resize', syncViewportState);
      window.screen?.orientation?.removeEventListener('change', onOrientationChange);
    };
  }, []);

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const handleZoneInteract = (zone: WorldInteractZone) => {
      closeAllOverlays();
      if (zone.kind === 'dealership_new') {
        setDealershipMarket('new');
        setShowDealership(true);
      } else if (zone.kind === 'dealership_used') {
        setDealershipMarket('used');
        setShowDealership(true);
      } else if (zone.kind === 'restaurant') {
        setLifeSimTab('dining');
        setShowLifeSim(true);
      } else if (zone.kind === 'clothing' || zone.kind === 'barber') {
        setLifeSimTab('character');
        setShowLifeSim(true);
      } else if (zone.kind === 'property') {
        const owned = zone.propertyId && ownedPropsRef.current.some((p) => p.id === zone.propertyId);
        if (owned && zone.propertyId) {
          engineRef.current?.enterInterior('property', zone.name, zone.propertyId);
        } else {
          setShowProperties(true);
        }
      } else if (zone.kind === 'npc') {
        setNpcDialog({
          name: zone.name,
          subtitle: zone.subtitle,
          lines: zone.npcDialogue && zone.npcDialogue.length > 0 ? zone.npcDialogue : ['Welcome to Apex Horizon!'],
          index: 0,
        });
      }
    };

    const engine = new GameEngine(
      mount,
      INITIAL_SETTINGS,
      (snapshot) => {
        setHud(snapshot);
      },
      handleZoneInteract,
    );
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [closeAllOverlays]);

  const anyModalOpen =
    showModes ||
    showSettings ||
    showPause ||
    showMultiplayer ||
    showProperties ||
    showDealership ||
    showJobs ||
    showLifeSim ||
    !!npcDialog;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTextInputTarget(e.target)) return;

      if (e.code === 'Escape' && !e.repeat) {
        if (hud.inGarage) {
          void engineRef.current?.exitGarage(false);
        } else if (anyModalOpen) {
          closeAllOverlays();
        } else if (hud.screen === 'playing') {
          setShowPause(true);
        }
        return;
      }

      if (hud.screen !== 'playing') return;

      if (e.code === 'KeyG' && !e.repeat) {
        if (hud.inGarage) {
          void engineRef.current?.exitGarage(false);
        } else {
          closeAllOverlays();
          void engineRef.current?.enterGarage();
        }
      } else if (e.code === 'KeyM' && !e.repeat && !hud.inGarage) {
        const next = !showModes;
        closeAllOverlays();
        setShowModes(next);
      } else if (e.code === 'Tab' && !e.repeat && !hud.inGarage) {
        e.preventDefault();
        const next = !showLifeSim;
        closeAllOverlays();
        setLifeSimTab('phone');
        setShowLifeSim(next);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hud.screen, hud.inGarage, anyModalOpen, showModes, showLifeSim, closeAllOverlays]);

  const handleSettingsChange = useCallback((next: GameSettings) => {
    setSettings(next);
    engineRef.current?.updateSettings(next);
  }, []);

  const handleContinueGame = useCallback(() => {
    const engine = engineRef.current;
    const saved = loadLocalSave();
    if (!engine || !saved) return;
    void requestLandscapeOrientation();
    engine.applySaveData(saved);
    setSettings((prev) => ({
      ...prev,
      timeOfDay: saved.timeOfDay,
      weather: saved.weather,
    }));
    setStarterVehicleId(saved.activeVehicleId);
    engine.startGame();
  }, []);

  const handleStartPlay = useCallback(
    (mode: GameMode) => {
      const engine = engineRef.current;
      if (!engine) return;
      void requestLandscapeOrientation();
      const spec = VEHICLE_CATALOG.find((v) => v.id === starterVehicleId) || VEHICLE_CATALOG[0];
      if (starterVehicleId !== 'bmw_m4') {
        void engine.spawnAndSelectVehicle(spec.id, spec.defaultColor);
      }
      engine.setMode(mode);
      engine.startGame();
      engine.saveNow();
      setSaveAvailable(true);
    },
    [starterVehicleId],
  );

  const handleCycleWeather = useCallback(() => {
    const order: WeatherType[] = ['sunny', 'cloudy', 'rain', 'heavy-rain', 'fog', 'snow', 'thunderstorm'];
    const idx = order.indexOf(settings.weather);
    const nextWeather = order[(idx + 1) % order.length];
    handleSettingsChange({ ...settings, weather: nextWeather });
  }, [settings, handleSettingsChange]);

  const handleToggleMute = useCallback(() => {
    handleSettingsChange({ ...settings, muted: !settings.muted });
  }, [settings, handleSettingsChange]);

  const handleOpenGarage = useCallback(() => {
    closeAllOverlays();
    void requestLandscapeOrientation();
    if (hud.screen === 'title') {
      engineRef.current?.startGame();
    }
    void engineRef.current?.enterGarage();
  }, [closeAllOverlays, hud.screen]);

  const showTouchControls =
    hud.screen === 'playing' &&
    !hud.inGarage &&
    !anyModalOpen &&
    (settings.touchControls === 'always' || (settings.touchControls === 'auto' && isTouchDevice));

  return (
    <div className="relative w-full h-full overflow-hidden bg-zinc-950">
      <div ref={canvasMountRef} className="fixed inset-0 w-full h-full z-0" />

      {hud.screen === 'title' && !hud.inGarage && (
        <TitleScreen
          selectedVehicleId={starterVehicleId}
          hasSave={saveAvailable}
          onSelectVehicle={setStarterVehicleId}
          onContinueGame={handleContinueGame}
          onStartPlay={handleStartPlay}
          onOpenGarage={handleOpenGarage}
          onOpenMultiplayer={() => {
            closeAllOverlays();
            setShowMultiplayer(true);
          }}
          onOpenDealership={() => {
            closeAllOverlays();
            setDealershipMarket('new');
            setShowDealership(true);
          }}
          onOpenProperties={() => {
            closeAllOverlays();
            setShowProperties(true);
          }}
          onOpenJobs={() => {
            closeAllOverlays();
            engineRef.current?.startGame();
            setShowJobs(true);
          }}
          onOpenSettings={() => {
            closeAllOverlays();
            setShowSettings(true);
          }}
        />
      )}

      {hud.screen === 'playing' && !hud.inGarage && (
        <HUD
          hud={hud}
          settings={settings}
          showTouchControls={showTouchControls}
          compactLandscape={compactLandscape}
          onOpenGarage={handleOpenGarage}
          onOpenModes={() => {
            closeAllOverlays();
            setShowModes(true);
          }}
          onOpenSettings={() => {
            closeAllOverlays();
            setShowSettings(true);
          }}
          onOpenPause={() => {
            closeAllOverlays();
            setShowPause(true);
          }}
          onOpenMultiplayer={() => {
            closeAllOverlays();
            setShowMultiplayer(true);
          }}
          onOpenDealership={() => {
            closeAllOverlays();
            setDealershipMarket('new');
            setShowDealership(true);
          }}
          onOpenProperties={() => {
            closeAllOverlays();
            setShowProperties(true);
          }}
          onOpenJobs={() => {
            closeAllOverlays();
            setShowJobs(true);
          }}
          onOpenPhone={() => {
            closeAllOverlays();
            setLifeSimTab('phone');
            setShowLifeSim(true);
          }}
          onToggleMute={handleToggleMute}
          onCycleCamera={() => engineRef.current?.cycleCameraMode()}
          onToggleLights={() => engineRef.current?.toggleHeadlights()}
          onToggleEngine={() => engineRef.current?.toggleEngineRunning()}
          onToggleIndicator={(m) => engineRef.current?.toggleIndicator(m)}
          onToggleDoors={() => engineRef.current?.toggleDoors()}
          onToggleHood={() => engineRef.current?.toggleHood()}
          onEnterExit={() => engineRef.current?.toggleEnterExitVehicle()}
          onInteract={() => engineRef.current?.handleInteractAction()}
          onRefuel={() => engineRef.current?.tryRefuel()}
          onCycleWeather={handleCycleWeather}
        />
      )}

      {showTouchControls && engineRef.current && (
        <MobileControls
          inVehicle={hud.inVehicle}
          nearVehicle={!!hud.nearVehicleName}
          compactLandscape={compactLandscape}
          touchInput={engineRef.current.touchInput}
          onEnterExit={() => engineRef.current?.toggleEnterExitVehicle()}
          onCycleCamera={() => engineRef.current?.cycleCameraMode()}
          onToggleLights={() => engineRef.current?.toggleHeadlights()}
          onHorn={() => engineRef.current?.audio.playHorn()}
        />
      )}

      {hud.inGarage && (
        <GarageModal
          garageState={hud.garageState}
          engineRunning={hud.engineRunning}
          headlightsOn={hud.headlightsOn}
          doorsOpen={hud.doorsOpen}
          hoodOpen={hud.hoodOpen}
          onSelectVehicle={(id) => {
            setStarterVehicleId(id);
            void engineRef.current?.selectGarageVehicle(id);
          }}
          onSelectColor={(hex) => engineRef.current?.setGarageColor(hex)}
          onUpdateTuning={(id, next) => engineRef.current?.setVehicleTuning(id, next)}
          onSelectCameraPreset={(p) => engineRef.current?.setGarageCameraPreset(p)}
          onToggleAutoRotate={() => engineRef.current?.toggleGarageAutoRotate()}
          onToggleDoors={() => engineRef.current?.toggleGarageDoors()}
          onToggleHood={() => engineRef.current?.toggleGarageHood()}
          onToggleLights={() => engineRef.current?.toggleGarageLights()}
          onToggleEngine={() => engineRef.current?.toggleGarageEngine()}
          onRevEngine={() => engineRef.current?.revGarageEngine()}
          onUploadGlb={async (id, file) => {
            if (!engineRef.current) return false;
            setStarterVehicleId(id);
            return engineRef.current.loadCustomGlbForVehicle(id, file);
          }}
          onLoadGlbUrl={async (id, url) => {
            if (!engineRef.current) return false;
            setStarterVehicleId(id);
            return engineRef.current.loadCustomGlbFromUrl(id, url);
          }}
          onRevertPlaceholder={(id) => void engineRef.current?.revertVehicleToPlaceholder(id)}
          onDriveOut={() => void engineRef.current?.exitGarage(true)}
          onClose={() => void engineRef.current?.exitGarage(false)}
        />
      )}

      {showMultiplayer && (
        <MultiplayerModal
          mp={hud.multiplayer}
          playerName={hud.appearance.name}
          onConnectRoom={(roomId, roomName) => {
            engineRef.current?.connectMultiplayer(roomId, roomName);
          }}
          onDisconnect={() => engineRef.current?.disconnectMultiplayer()}
          onSendChat={(text) => engineRef.current?.sendChatMessage(text)}
          onToggleFriend={(name) => engineRef.current?.toggleFriend(name)}
          onClose={() => setShowMultiplayer(false)}
        />
      )}

      {showProperties && (
        <PropertyModal
          cash={hud.cash}
          bankBalance={hud.bankBalance}
          ownedProperties={hud.ownedProperties}
          ownedVehicles={hud.ownedVehicles}
          onBuyProperty={(id) => engineRef.current?.buyProperty(id)}
          onSellProperty={(id) => engineRef.current?.sellProperty(id)}
          onEnterProperty={(id, name) => {
            if (hud.screen === 'title') engineRef.current?.startGame();
            engineRef.current?.enterInterior('property', name, id);
          }}
          onTeleportProperty={(x, z) => {
            if (hud.screen === 'title') engineRef.current?.startGame();
            engineRef.current?.teleportToLocation(x, z);
          }}
          onUpdateDecor={(id, theme, accentLight) =>
            engineRef.current?.updatePropertyDecor(id, theme, accentLight)
          }
          onParkVehicle={(id, vid) => engineRef.current?.parkVehicleInProperty(id, vid)}
          onClose={() => setShowProperties(false)}
        />
      )}

      {showDealership && (
        <DealershipModal
          cash={hud.cash}
          bankBalance={hud.bankBalance}
          ownedVehicles={hud.ownedVehicles}
          activeVehicleId={hud.activeVehicle?.id || null}
          initialMarket={dealershipMarket}
          onBuyVehicle={(id, used) => engineRef.current?.buyVehicle(id, used)}
          onSellVehicle={(id) => engineRef.current?.sellVehicle(id)}
          onTestDrive={(id) => {
            if (hud.screen === 'title') engineRef.current?.startGame();
            void engineRef.current?.testDriveVehicle(id);
          }}
          onOpenGarage={handleOpenGarage}
          onRepairActive={() => engineRef.current?.repairActiveVehicle()}
          onClose={() => setShowDealership(false)}
        />
      )}

      {showJobs && (
        <JobsModal
          activeJob={hud.activeJob}
          jobStepLabel={hud.jobStepLabel}
          onStartJob={(job) => {
            if (hud.screen === 'title') engineRef.current?.startGame();
            engineRef.current?.startJob(job);
          }}
          onCancelJob={() => engineRef.current?.cancelJob()}
          onClose={() => setShowJobs(false)}
        />
      )}

      {showLifeSim && (
        <LifeSimModal
          initialTab={lifeSimTab}
          cash={hud.cash}
          bankBalance={hud.bankBalance}
          hunger={hud.hunger}
          energy={hud.energy}
          appearance={hud.appearance}
          inventory={hud.inventory}
          transactions={hud.transactions}
          onUpdateAppearance={(next) => engineRef.current?.updateAppearance(next)}
          onBuyFood={(foodId) => engineRef.current?.buyFoodItem(foodId)}
          onUseItem={(itemId) => engineRef.current?.useInventoryItem(itemId)}
          onDeposit={(amt) => engineRef.current?.bankDeposit(amt)}
          onWithdraw={(amt) => engineRef.current?.bankWithdraw(amt)}
          onQuickOpen={(target) => {
            if (target === 'garage') handleOpenGarage();
            else if (target === 'dealership') {
              setDealershipMarket('new');
              setShowDealership(true);
            } else if (target === 'properties') setShowProperties(true);
            else if (target === 'jobs') setShowJobs(true);
            else if (target === 'multiplayer') setShowMultiplayer(true);
          }}
          onClose={() => setShowLifeSim(false)}
        />
      )}

      {npcDialog && (
        <div className="fixed inset-x-0 bottom-8 z-40 flex justify-center px-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-amber-500/60 rounded-2xl p-4 shadow-2xl space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div className="font-display font-bold text-sm text-zinc-50">{npcDialog.name}</div>
                  <div className="text-[11px] text-amber-400">{npcDialog.subtitle}</div>
                </div>
              </div>
              <button
                onClick={() => setNpcDialog(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-200 leading-relaxed bg-zinc-950 border border-zinc-800 rounded-xl p-3">
              &ldquo;{npcDialog.lines[npcDialog.index]}&rdquo;
            </p>
            <div className="flex justify-end gap-2">
              {npcDialog.index < npcDialog.lines.length - 1 ? (
                <button
                  onClick={() =>
                    setNpcDialog((prev) => (prev ? { ...prev, index: prev.index + 1 } : null))
                  }
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs cursor-pointer"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={() => setNpcDialog(null)}
                  className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold text-xs cursor-pointer"
                >
                  End Conversation
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showModes && (
        <GameModeModal
          currentMode={hud.mode}
          bestDriftScore={hud.bestDriftScore}
          discoveredCount={hud.discoveredLandmarks.length}
          totalLandmarks={hud.totalLandmarks}
          bestChallengeTime={hud.challengeBestTime}
          onSelectMode={(m) => engineRef.current?.setMode(m)}
          onClose={() => setShowModes(false)}
        />
      )}

      {showSettings && (
        <SettingsModal
          settings={settings}
          onChange={handleSettingsChange}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showPause && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-zinc-950/75">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-2xl text-center">
            <h2 className="font-display font-bold text-2xl text-zinc-50">Simulation Paused</h2>
            <p className="text-xs text-zinc-400">
              {hud.inVehicle && hud.activeVehicle
                ? `Currently driving ${hud.activeVehicle.brand} ${hud.activeVehicle.model}`
                : hud.inInterior && hud.interiorLabel
                  ? `Inside ${hud.interiorLabel}`
                  : 'Exploring Apex Horizon on foot'}
            </p>
            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => setShowPause(false)}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm rounded-lg cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Resume Driving</span>
              </button>
              <button
                onClick={() => {
                  engineRef.current?.saveNow();
                  setSaveAvailable(true);
                  setShowPause(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 font-semibold text-sm rounded-lg cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save City Progress</span>
              </button>
              <button
                onClick={() => {
                  setShowPause(false);
                  setShowSettings(true);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium text-sm rounded-lg cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                <span>Settings, Weather &amp; Graphics</span>
              </button>
              <button
                onClick={() => {
                  setShowPause(false);
                  engineRef.current?.setScreen('title');
                  setSaveAvailable(hasSavedGame());
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-medium text-sm rounded-lg cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Return to Title Screen</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
