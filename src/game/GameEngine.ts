import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GarageShowroom } from './GarageShowroom';
import { AudioManager } from './audio';
import { CharacterRig, createCharacterRig } from './character';
import { InteriorStage } from './interiors';
import { MultiplayerClient } from './multiplayer';
import { EffectsManager } from './particles';
import {
  buildDefaultTuningsMap,
  createInitialSaveData,
  normalizeWeather,
  syncSaveToServer,
  writeLocalSave,
} from './saveSystem';
import { createProceduralTextures, ProceduralTextureSet } from './textures';
import { TrafficAndPedestrians } from './traffic';
import {
  CameraMode,
  CharacterAppearance,
  DEFAULT_APPEARANCE,
  FurnitureTheme,
  GameMode,
  GameSettings,
  GarageCameraPreset,
  GraphicsPreset,
  HudSnapshot,
  IndicatorMode,
  InventoryItem,
  JOB_CATALOG,
  JobType,
  MiniMapEntity,
  OwnedPropertyState,
  PROPERTY_CATALOG,
  SHOP_FOOD_MENU,
  SaveGameData,
  TransactionRecord,
  VEHICLE_CATALOG,
  VehicleId,
  VehicleSpec,
  VehicleTuningConfig,
  WorldInteractZone,
  createDefaultTuning,
  getEffectiveVehicleStats,
} from './types';
import {
  clearCustomGlb,
  registerCustomGlbBuffer,
  registerCustomGlbUrl,
  tryLoadGlbVehicle,
} from './vehicleLoader';
import { createVehicleMesh, VehicleMeshRig } from './vehicles';
import { BoxCollider, buildCityWorld, CityWorld } from './world';

interface WorldVehicle {
  id: string;
  spec: VehicleSpec;
  color: string;
  rig: VehicleMeshRig;
  x: number;
  z: number;
  heading: number;
  vx: number;
  vz: number;
  angularVel: number;
  steerAngle: number;
  wheelSpin: number;
  fuel: number;
  health: number;
  engineRunning: boolean;
  headlightsOn: boolean;
  indicatorMode: IndicatorMode;
  doorsOpen: boolean;
  hoodOpen: boolean;
  doorsAnim: number;
  hoodAnim: number;
  braking: boolean;
  reversing: boolean;
  gear: string;
  rpm: number;
  driftAngleDeg: number;
  isDrifting: boolean;
  lastAccel: number;
  lastLateral: number;
}

export interface TouchInputState {
  moveX: number;
  moveY: number;
  throttle: boolean;
  brake: boolean;
  handbrake: boolean;
  sprint: boolean;
  jump: boolean;
  lookDeltaX: number;
  lookDeltaY: number;
}

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _sunColor = new THREE.Color();
const _skyColor = new THREE.Color();
const _fogColor = new THREE.Color();

export class GameEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer | null = null;
  private renderPass: RenderPass | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private envTexture: THREE.Texture | null = null;
  private garage: GarageShowroom;
  private interiors: InteriorStage;
  private multiplayer: MultiplayerClient;
  private inGarage = false;
  private isSoftwareGl: boolean;
  private resizeObserver: ResizeObserver | null = null;
  private orientationTimers: number[] = [];

  private textures: ProceduralTextureSet;
  private world: CityWorld;
  private traffic: TrafficAndPedestrians;
  private effects: EffectsManager;
  public audio: AudioManager;

  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private fillLight: THREE.DirectionalLight;

  private playerChar: CharacterRig;
  private playerX = 3.5;
  private playerY = 0;
  private playerZ = 6;
  private playerVy = 0;
  private playerHeading = 0;
  private playerGrounded = true;
  private playerSpeed = 0;

  // Interior return coordinates
  private inInterior = false;
  private interiorLabel: string | null = null;
  private interiorPropertyId: string | null = null;
  private returnOutsidePos = { x: 3.5, z: 6, heading: 0 };

  private vehicles: WorldVehicle[] = [];
  private activeVehicle: WorldVehicle | null = null;
  private playerPrimaryVehicle: WorldVehicle;

  // Progression, Life Sim & Economy State
  private cash = 25000;
  private bankBalance = 45000;
  private hunger = 92;
  private energy = 95;
  private wantedLevel = 0;
  private wantedEscapeTimer = 0;
  private arrestHoldTimer = 0;
  private policeViolationCooldown = 0;
  private policeAlertStatus: string | null = null;

  private ownedVehicles: VehicleId[] = ['bmw_m4', 'chevy_cobalt'];
  private tunings: Record<VehicleId, VehicleTuningConfig>;
  private ownedProperties: OwnedPropertyState[] = [];
  private appearance: CharacterAppearance = { ...DEFAULT_APPEARANCE };
  private inventory: InventoryItem[] = [];
  private transactions: TransactionRecord[] = [];
  private passiveIncomeTimer = 0;

  // Active Job State
  private activeJob: JobType = 'none';
  private jobStage = 0;
  private jobStepLabel: string | null = null;
  private jobPayout = 0;
  private jobTarget = new THREE.Vector3();
  private jobBeaconGroup: THREE.Group;

  // Camera & Input
  private cameraMode: CameraMode = 'third-person';
  private camYaw = 0;
  private camPitch = 0.24;
  private camCurrentPos = new THREE.Vector3(0, 5, -10);
  private camCurrentLook = new THREE.Vector3(0, 1, 0);
  private shakeTimer = 0;
  private shakeIntensity = 0;
  private hitstopTimer = 0;
  private lightningTimer = 6;
  private lightningFlash = 0;

  private keys: Record<string, boolean> = {};
  private isDraggingLook = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private pointerDownX = 0;
  private pointerDownY = 0;
  public touchInput: TouchInputState = {
    moveX: 0,
    moveY: 0,
    throttle: false,
    brake: false,
    handbrake: false,
    sprint: false,
    jump: false,
    lookDeltaX: 0,
    lookDeltaY: 0,
  };

  private screen: 'title' | 'playing' = 'title';
  private mode: GameMode = 'free-roam';
  private settings: GameSettings;
  private notification: string | null = null;
  private notificationTimer = 0;

  private driftScore = 0;
  private bestDriftScore = 0;
  private currentDriftPoints = 0;
  private driftCombo = 1;
  private driftGraceTimer = 0;

  private parkingLevel = 0;
  private parkingHoldTimer = 0;
  private parkingMarkerGroup: THREE.Group;
  private parkingMarkerMat: THREE.MeshBasicMaterial;

  private discoveredLandmarks = new Set<string>();
  private landmarkBeacons: THREE.Mesh[] = [];

  private challengeActive = false;
  private challengeCheckpoint = 0;
  private challengeTime = 0;
  private challengeBestTime: number | null = null;
  private challengeGateGroup: THREE.Group;

  private clock = new THREE.Clock();
  private frameId = 0;
  private disposed = false;
  private hudTimer = 0;
  private autoSaveTimer = 0;
  private onHudUpdate: (snapshot: HudSnapshot) => void;
  private onZoneInteract?: (zone: WorldInteractZone) => void;

  constructor(
    container: HTMLElement,
    initialSettings: GameSettings,
    onHudUpdate: (snapshot: HudSnapshot) => void,
    onZoneInteract?: (zone: WorldInteractZone) => void,
  ) {
    this.container = container;
    this.settings = { ...initialSettings, weather: normalizeWeather(initialSettings.weather) };
    this.onHudUpdate = onHudUpdate;
    this.onZoneInteract = onZoneInteract;
    this.tunings = buildDefaultTuningsMap();

    const initSave = createInitialSaveData();
    this.inventory = initSave.inventory;
    this.transactions = initSave.transactions;

    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const w = Math.max(1, container.clientWidth || window.innerWidth);
    const h = Math.max(1, container.clientHeight || window.innerHeight);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.FogExp2(0x9bd3ef, 0.0022);

    this.camera = new THREE.PerspectiveCamera(64, w / h, 0.15, 950);

    if (!this.isSoftwareGl) {
      this.composer = new EffectComposer(this.renderer);
      this.renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(this.renderPass);
      this.bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.28, 0.35, 0.92);
      this.composer.addPass(this.bloomPass);
      this.composer.addPass(new OutputPass());
    }

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envTexture;
    pmrem.dispose();

    this.hemiLight = new THREE.HemisphereLight(0xa5d8ff, 0x3f3f46, 0.88);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff5dc, 2.35);
    this.sunLight.position.set(110, 160, 80);
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 360;
    const d = 120;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.normalBias = 0.025;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.fillLight = new THREE.DirectionalLight(0xbfdbfe, 0.48);
    this.fillLight.position.set(-90, 70, -80);
    this.scene.add(this.fillLight);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(maxAniso);

    this.garage = new GarageShowroom(w / h, this.textures, this.isSoftwareGl, this.envTexture);

    this.world = buildCityWorld(this.textures, this.isSoftwareGl);
    this.scene.add(this.world.root);

    this.interiors = new InteriorStage(this.textures, this.isSoftwareGl);
    this.scene.add(this.interiors.root);

    this.traffic = new TrafficAndPedestrians(
      this.textures.contactShadowMap,
      this.world.trafficLightIntersections,
    );
    this.traffic.setDensity(this.settings.trafficDensity);
    this.scene.add(this.traffic.root);

    this.multiplayer = new MultiplayerClient(initSave.friends);
    this.scene.add(this.multiplayer.root);

    this.effects = new EffectsManager(this.textures.smokeSpriteMap);
    this.scene.add(this.effects.root);

    this.audio = new AudioManager();
    this.audio.setVolume(this.settings.volume, this.settings.muted);

    this.playerChar = createCharacterRig(this.textures.contactShadowMap);
    this.playerChar.applyAppearance(this.appearance);
    this.playerChar.root.position.set(this.playerX, 0, this.playerZ);
    this.scene.add(this.playerChar.root);

    // Spawn all 7 vehicles
    const spawnCoords: { id: VehicleId; x: number; z: number; heading: number }[] = [
      { id: 'bmw_m4', x: -3.8, z: 10, heading: 0 },
      { id: 'bmw_m5', x: 80 - 3.8, z: -24, heading: 0 },
      { id: 'cls_63', x: -80 + 3.8, z: 32, heading: Math.PI },
      { id: 'g63_amg', x: 112, z: -28, heading: Math.PI / 2 },
      { id: 'e63_amg', x: -40, z: 150, heading: -Math.PI / 2 },
      { id: 'chevy_cobalt', x: 240 - 3.8, z: 12, heading: 0 },
      { id: 'chevy_gentra', x: -120, z: -102, heading: Math.PI / 2 },
    ];

    spawnCoords.forEach((sc, idx) => {
      const spec = VEHICLE_CATALOG.find((v) => v.id === sc.id)!;
      const tuning = this.tunings[spec.id];
      const rig = createVehicleMesh(spec, tuning.paintColor, this.textures, this.isSoftwareGl, null, tuning);
      rig.root.position.set(sc.x, 0, sc.z);
      rig.root.rotation.y = sc.heading;
      this.scene.add(rig.root);

      const wv: WorldVehicle = {
        id: `veh_${idx}_${spec.id}`,
        spec,
        color: tuning.paintColor,
        rig,
        x: sc.x,
        z: sc.z,
        heading: sc.heading,
        vx: 0,
        vz: 0,
        angularVel: 0,
        steerAngle: 0,
        wheelSpin: 0,
        fuel: 88 + (idx % 3) * 4,
        health: 100,
        engineRunning: true,
        headlightsOn: false,
        indicatorMode: 'off',
        doorsOpen: false,
        hoodOpen: false,
        doorsAnim: 0,
        hoodAnim: 0,
        braking: false,
        reversing: false,
        gear: 'N',
        rpm: 850,
        driftAngleDeg: 0,
        isDrifting: false,
        lastAccel: 0,
        lastLateral: 0,
      };
      this.vehicles.push(wv);
    });
    this.playerPrimaryVehicle = this.vehicles[0];

    // Parking Marker
    this.parkingMarkerGroup = new THREE.Group();
    this.parkingMarkerMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    const bayFloor = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 6.2).rotateX(-Math.PI / 2), this.parkingMarkerMat);
    bayFloor.position.y = 0.22;
    this.parkingMarkerGroup.add(bayFloor);
    const bayBorder = new THREE.Mesh(
      new THREE.RingGeometry(2.8, 3.1, 4).rotateX(-Math.PI / 2).rotateY(Math.PI / 4),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide }),
    );
    bayBorder.position.y = 0.24;
    bayBorder.scale.set(0.75, 1, 1.45);
    this.parkingMarkerGroup.add(bayBorder);
    this.parkingMarkerGroup.visible = false;
    this.scene.add(this.parkingMarkerGroup);

    // Landmark Beacons
    const beaconGeo = new THREE.CylinderGeometry(1.1, 1.1, 65, 16, 1, true);
    for (const lm of this.world.landmarks) {
      const bMat = new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const b = new THREE.Mesh(beaconGeo, bMat);
      b.position.set(lm.x, 32.5, lm.z);
      b.visible = false;
      this.scene.add(b);
      this.landmarkBeacons.push(b);
    }

    // Challenge Gate
    this.challengeGateGroup = new THREE.Group();
    const torusGate = new THREE.Mesh(
      new THREE.TorusGeometry(4.5, 0.32, 12, 32),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 1.2 }),
    );
    torusGate.position.y = 3.5;
    this.challengeGateGroup.add(torusGate);
    this.challengeGateGroup.visible = false;
    this.scene.add(this.challengeGateGroup);

    // Active Job Destination Waypoint Pillar
    this.jobBeaconGroup = new THREE.Group();
    const jobBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.2, 55, 18, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    jobBeam.position.y = 27.5;
    this.jobBeaconGroup.add(jobBeam);
    const jobRing = new THREE.Mesh(
      new THREE.RingGeometry(3.2, 3.8, 28).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide }),
    );
    jobRing.position.y = 0.25;
    this.jobBeaconGroup.add(jobRing);
    this.jobBeaconGroup.visible = false;
    this.scene.add(this.jobBeaconGroup);

    this.applyGraphicsPreset(this.settings.graphicsPreset);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.applyAtmosphere(0);
    this.pushHudSnapshot();
    this.startLoop();
  }

  private bindEvents() {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('orientationchange', this.handleOrientationResize);
    window.visualViewport?.addEventListener('resize', this.handleResize);
    window.screen?.orientation?.addEventListener('change', this.handleOrientationResize);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(this.container);
    }

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);

    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('wheel', this.handleWheel, { passive: true });
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('webglcontextlost', this.handleContextLost);
  }

  private handleContextLost = (e: Event) => {
    e.preventDefault();
  };

  private handleOrientationResize = () => {
    if (this.disposed) return;
    this.handleResize();
    requestAnimationFrame(() => {
      if (!this.disposed) this.handleResize();
    });
    const t = window.setTimeout(() => {
      if (!this.disposed) this.handleResize();
    }, 150);
    this.orientationTimers.push(t);
  };

  private handleResize = () => {
    if (this.disposed) return;
    const w = Math.max(1, this.container.clientWidth || window.innerWidth);
    const h = Math.max(1, this.container.clientHeight || window.innerHeight);
    const aspect = w / h;

    this.camera.aspect = aspect;
    this.camera.fov = aspect < 1 ? Math.min(82, (64 / Math.max(0.65, aspect)) * 0.78) : 64;
    this.camera.updateProjectionMatrix();

    this.garage.camera.aspect = aspect;
    this.garage.camera.updateProjectionMatrix();

    this.renderer.setSize(w, h, false);
    if (this.composer) this.composer.setSize(w, h);
    if (this.bloomPass) this.bloomPass.resolution.set(w, h);
  };

  private handleBlur = () => {
    this.keys = {};
    this.isDraggingLook = false;
  };

  private handleWheel = (e: WheelEvent) => {
    if (this.inGarage) {
      this.garage.handleWheel(e.deltaY);
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    // Ignore driving hotkeys while user types in inputs/chat
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    this.keys[e.code] = true;
    this.audio.init();

    if (this.screen !== 'playing') return;

    if (!e.repeat) {
      if (this.inGarage) {
        if (e.code === 'KeyO') this.toggleGarageDoors();
        else if (e.code === 'KeyB') this.toggleGarageHood();
        else if (e.code === 'KeyL') this.toggleGarageLights();
        else if (e.code === 'KeyI') this.toggleGarageEngine();
        else if (e.code === 'KeyC') {
          const order: GarageCameraPreset[] = ['orbit', 'closeup', 'interior', 'rear'];
          const next = order[(order.indexOf(this.garage.cameraPreset) + 1) % order.length];
          this.setGarageCameraPreset(next);
        }
        return;
      }

      if (e.code === 'KeyE') {
        if (this.inInterior) return;
        const gs = this.activeVehicle ? this.findNearestGasStation(this.activeVehicle.x, this.activeVehicle.z) : null;
        if (gs) {
          this.tryRefuel();
        } else {
          this.toggleEnterExitVehicle();
        }
      } else if (e.code === 'KeyF') {
        this.handleInteractAction();
      } else if (e.code === 'KeyC') {
        this.cycleCameraMode();
      } else if (e.code === 'KeyL') {
        this.toggleHeadlights();
      } else if (e.code === 'KeyI') {
        this.toggleEngineRunning();
      } else if (e.code === 'KeyH') {
        if (this.activeVehicle) this.audio.playHorn();
      } else if (e.code === 'KeyQ') {
        this.toggleIndicator('left');
      } else if (e.code === 'KeyR') {
        this.toggleIndicator('right');
      } else if (e.code === 'KeyX') {
        this.toggleIndicator('hazard');
      } else if (e.code === 'KeyO') {
        this.toggleDoors();
      } else if (e.code === 'KeyB') {
        this.toggleHood();
      }
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  private handlePointerDown = (e: PointerEvent) => {
    if (this.screen !== 'playing' && !this.inGarage) return;
    this.audio.init();
    this.isDraggingLook = true;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.pointerDownX = e.clientX;
    this.pointerDownY = e.clientY;
  };

  private handlePointerMove = (e: PointerEvent) => {
    if (!this.isDraggingLook) return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;

    if (this.inGarage) {
      this.garage.handleDrag(dx, dy);
      return;
    }

    if (this.screen !== 'playing') return;
    this.camYaw -= dx * 0.0055;
    this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * 0.004, 0.05, 0.95);
  };

  private handlePointerUp = (e: PointerEvent) => {
    if (this.inGarage && this.isDraggingLook) {
      const moved = Math.hypot(e.clientX - this.pointerDownX, e.clientY - this.pointerDownY);
      if (moved < 6) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const picked = this.garage.handlePickClick(e.clientX, e.clientY, rect);
        if (picked) {
          void this.selectGarageVehicle(picked);
        }
      }
    }
    this.isDraggingLook = false;
  };

  // --- Graphics & Settings ---
  private applyGraphicsPreset(preset: GraphicsPreset) {
    if (this.isSoftwareGl) {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
      this.sunLight.castShadow = false;
      this.scene.environmentIntensity = 0.45;
      return;
    }
    const maxDpr = preset === 'ultra' ? 2 : preset === 'high' ? 1.5 : preset === 'medium' ? 1.15 : 0.85;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));

    const enableShadows = this.settings.shadows && preset !== 'low';
    this.renderer.shadowMap.enabled = enableShadows;
    this.sunLight.castShadow = enableShadows;

    if (this.bloomPass) {
      this.bloomPass.enabled = preset === 'high' || preset === 'ultra';
    }
    this.scene.environmentIntensity = this.settings.reflections
      ? preset === 'low'
        ? 0.4
        : preset === 'medium'
          ? 0.8
          : 1.2
      : 0.25;
    this.world.updateZoneVisibility(this.playerX, this.playerZ, preset);
  }

  public updateSettings(next: GameSettings) {
    this.settings = { ...next, weather: normalizeWeather(next.weather) };
    this.audio.setVolume(next.volume, next.muted);
    this.traffic.setDensity(next.trafficDensity);
    this.applyGraphicsPreset(this.settings.graphicsPreset);
    this.pushHudSnapshot();
  }

  // --- Game Flow & Persistence ---
  public startGame() {
    this.audio.init();
    this.screen = 'playing';
    this.showNotification('Welcome to Apex Horizon Ultimate — [E] Enter/Exit Car · [F] Interact · [G] Garage');
    this.pushHudSnapshot();
  }

  public setScreen(screen: 'title' | 'playing') {
    if (screen === 'title') this.saveNow();
    this.screen = screen;
    this.pushHudSnapshot();
  }

  public getSaveData(): SaveGameData {
    return {
      version: 1,
      savedAt: Date.now(),
      playerX: this.inInterior ? this.returnOutsidePos.x : this.playerX,
      playerZ: this.inInterior ? this.returnOutsidePos.z : this.playerZ,
      playerHeading: this.playerHeading,
      cash: Math.round(this.cash),
      bankBalance: Math.round(this.bankBalance),
      hunger: Math.round(this.hunger),
      energy: Math.round(this.energy),
      ownedVehicles: [...this.ownedVehicles],
      activeVehicleId: (this.activeVehicle || this.playerPrimaryVehicle).spec.id,
      tunings: this.tunings,
      ownedProperties: [...this.ownedProperties],
      appearance: { ...this.appearance },
      inventory: [...this.inventory],
      transactions: this.transactions.slice(0, 30),
      discoveredLandmarks: Array.from(this.discoveredLandmarks),
      bestDriftScore: this.bestDriftScore,
      challengeBestTime: this.challengeBestTime,
      timeOfDay: this.settings.timeOfDay,
      weather: this.settings.weather,
      friends: [...this.multiplayer.friends],
    };
  }

  public saveNow() {
    const data = this.getSaveData();
    writeLocalSave(data);
    void syncSaveToServer(data);
  }

  public applySaveData(data: SaveGameData) {
    this.cash = data.cash;
    this.bankBalance = data.bankBalance;
    this.hunger = data.hunger;
    this.energy = data.energy;
    this.ownedVehicles = data.ownedVehicles.length > 0 ? [...data.ownedVehicles] : ['bmw_m4'];
    this.ownedProperties = [...data.ownedProperties];
    this.appearance = { ...DEFAULT_APPEARANCE, ...data.appearance };
    this.playerChar.applyAppearance(this.appearance);
    this.inventory = [...data.inventory];
    this.transactions = [...data.transactions];
    this.discoveredLandmarks = new Set(data.discoveredLandmarks || []);
    this.bestDriftScore = data.bestDriftScore || 0;
    this.challengeBestTime = data.challengeBestTime ?? null;
    this.multiplayer.friends = [...(data.friends || [])];

    const defaults = buildDefaultTuningsMap();
    for (const spec of VEHICLE_CATALOG) {
      const savedT = data.tunings?.[spec.id];
      this.tunings[spec.id] = savedT ? { ...defaults[spec.id], ...savedT } : defaults[spec.id];
    }

    for (const wv of this.vehicles) {
      const t = this.tunings[wv.spec.id];
      wv.color = t.paintColor;
      wv.rig.applyTuning(t);
    }

    this.playerX = data.playerX;
    this.playerZ = data.playerZ;
    this.playerHeading = data.playerHeading;
    this.playerChar.root.position.set(this.playerX, 0, this.playerZ);

    this.settings.timeOfDay = data.timeOfDay;
    this.settings.weather = normalizeWeather(data.weather);
    this.pushHudSnapshot();
  }

  public resetNewGame() {
    const fresh = createInitialSaveData();
    this.applySaveData(fresh);
    this.wantedLevel = 0;
    this.activeJob = 'none';
    this.jobBeaconGroup.visible = false;
    this.saveNow();
  }

  private addTransaction(label: string, amount: number, account: 'cash' | 'bank') {
    const h = String(Math.floor(this.settings.timeOfDay) % 24).padStart(2, '0');
    const m = String(Math.floor((this.settings.timeOfDay % 1) * 60)).padStart(2, '0');
    this.transactions.unshift({
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label,
      amount,
      account,
      timestamp: `${h}:${m}`,
    });
    if (this.transactions.length > 35) this.transactions.pop();
  }

  // --- Modes ---
  public setMode(mode: GameMode) {
    this.mode = mode;
    this.parkingMarkerGroup.visible = mode === 'parking';
    this.landmarkBeacons.forEach((b, idx) => {
      const lm = this.world.landmarks[idx];
      b.visible = mode === 'exploration' && !this.discoveredLandmarks.has(lm.id);
    });

    if (mode === 'parking') {
      this.parkingLevel = 0;
      this.parkingHoldTimer = 0;
      const bay = this.world.parkingBays[0];
      this.parkingMarkerGroup.position.set(bay.x, 0, bay.z);
      this.parkingMarkerGroup.rotation.y = bay.heading;
      this.showNotification(`Parking Mode: Drive to ${bay.title}`);
    } else if (mode === 'drift') {
      this.currentDriftPoints = 0;
      this.driftCombo = 1;
      this.showNotification('Drift Mode Active — Hold [Space] Handbrake into corners!');
    } else if (mode === 'exploration') {
      this.showNotification(`City Exploration: Follow cyan beacons to discover ${this.world.landmarks.length} landmarks!`);
    } else if (mode === 'challenges') {
      this.startChallenge();
    } else {
      this.challengeActive = false;
      this.challengeGateGroup.visible = false;
      this.showNotification('Free Roam Mode — Explore the expanded city & life sim!');
    }
    this.pushHudSnapshot();
  }

  private startChallenge() {
    this.challengeActive = true;
    this.challengeCheckpoint = 0;
    this.challengeTime = 0;
    this.challengeGateGroup.visible = true;
    const cp = this.world.challengeCheckpoints[0];
    this.challengeGateGroup.position.copy(cp);
    if (!this.activeVehicle) {
      this.enterSpecificVehicle(this.playerPrimaryVehicle);
    }
    this.showNotification('City Sprint Challenge Started! Hit all 6 amber gates!');
  }

  // --- Tuning, Dealership & Vehicle Actions ---
  public setVehicleTuning(vehicleId: VehicleId, next: VehicleTuningConfig) {
    this.tunings[vehicleId] = { ...next };
    for (const wv of this.vehicles) {
      if (wv.spec.id === vehicleId) {
        wv.color = next.paintColor;
        wv.rig.applyTuning(next);
      }
    }
    if (this.inGarage && this.garage.selectedId === vehicleId) {
      this.garage.setTuning(next);
    }
    this.audio.playChime(620);
    this.pushHudSnapshot();
  }

  public buyVehicle(vehicleId: VehicleId, used: boolean): boolean {
    const spec = VEHICLE_CATALOG.find((v) => v.id === vehicleId);
    if (!spec) return false;
    if (this.ownedVehicles.includes(vehicleId)) {
      this.showNotification(`You already own ${spec.brand} ${spec.model}`);
      return false;
    }
    const cost = used ? spec.usedPrice : spec.price;
    if (this.cash >= cost) {
      this.cash -= cost;
      this.addTransaction(`Purchased ${spec.brand} ${spec.model}`, -cost, 'cash');
    } else if (this.cash + this.bankBalance >= cost) {
      const rem = cost - this.cash;
      if (this.cash > 0) this.addTransaction(`Vehicle Downpayment`, -this.cash, 'cash');
      this.cash = 0;
      this.bankBalance -= rem;
      this.addTransaction(`Purchased ${spec.brand} ${spec.model}`, -rem, 'bank');
    } else {
      this.showNotification(`Need $${cost.toLocaleString()} (Cash + Bank) to buy ${spec.model}`);
      return false;
    }
    this.ownedVehicles.push(vehicleId);
    this.audio.playChime(840);
    this.showNotification(`Bought ${spec.brand} ${spec.model}! Delivered to your fleet.`);
    void this.spawnAndSelectVehicle(vehicleId, this.tunings[vehicleId].paintColor);
    this.saveNow();
    return true;
  }

  public sellVehicle(vehicleId: VehicleId): boolean {
    if (!this.ownedVehicles.includes(vehicleId)) return false;
    if (this.ownedVehicles.length <= 1) {
      this.showNotification('You must keep at least 1 vehicle in your collection');
      return false;
    }
    const spec = VEHICLE_CATALOG.find((v) => v.id === vehicleId);
    if (!spec) return false;
    const payout = Math.round(spec.usedPrice * 0.88);
    this.ownedVehicles = this.ownedVehicles.filter((id) => id !== vehicleId);
    this.cash += payout;
    this.addTransaction(`Sold ${spec.brand} ${spec.model}`, payout, 'cash');
    this.audio.playChime(720);
    this.showNotification(`Sold ${spec.brand} ${spec.model} for +$${payout.toLocaleString()}`);
    this.saveNow();
    this.pushHudSnapshot();
    return true;
  }

  public async testDriveVehicle(vehicleId: VehicleId) {
    const spec = VEHICLE_CATALOG.find((v) => v.id === vehicleId);
    if (!spec) return;
    await this.spawnAndSelectVehicle(vehicleId, this.tunings[vehicleId].paintColor);
    this.showNotification(`Test Driving ${spec.brand} ${spec.model}`);
  }

  public repairActiveVehicle(): boolean {
    const target = this.activeVehicle || this.playerPrimaryVehicle;
    if (target.health >= 99) {
      this.showNotification('Vehicle is already in mint condition');
      return false;
    }
    if (this.cash < 250) {
      this.showNotification('Need $250 cash for repair service');
      return false;
    }
    this.cash -= 250;
    target.health = 100;
    this.addTransaction('Vehicle Body & Chassis Repair', -250, 'cash');
    this.audio.playChime(760);
    this.showNotification('Vehicle repaired to 100%');
    this.pushHudSnapshot();
    return true;
  }

  // --- Property Ownership & Enterable 3D Interiors ---
  public buyProperty(propertyId: string): boolean {
    const prop = PROPERTY_CATALOG.find((p) => p.id === propertyId);
    if (!prop) return false;
    if (this.ownedProperties.some((o) => o.id === propertyId)) {
      this.showNotification(`You already own ${prop.name}`);
      return false;
    }
    if (this.cash + this.bankBalance < prop.price) {
      this.showNotification(`Need $${prop.price.toLocaleString()} total funds for ${prop.name}`);
      return false;
    }
    if (this.cash >= prop.price) {
      this.cash -= prop.price;
      this.addTransaction(`Real Estate: ${prop.name}`, -prop.price, 'cash');
    } else {
      const rem = prop.price - this.cash;
      if (this.cash > 0) this.addTransaction(`Property Cash Portion`, -this.cash, 'cash');
      this.cash = 0;
      this.bankBalance -= rem;
      this.addTransaction(`Real Estate: ${prop.name}`, -rem, 'bank');
    }
    this.ownedProperties.push({
      id: prop.id,
      furnitureTheme: 'modern-dark',
      accentLight: '#f59e0b',
      parkedVehicleId: this.ownedVehicles[0] || null,
    });
    this.audio.playChime(880);
    this.showNotification(`Purchased ${prop.name}! Earning +$${prop.dailyIncome}/day`);
    this.saveNow();
    this.pushHudSnapshot();
    return true;
  }

  public sellProperty(propertyId: string): boolean {
    const prop = PROPERTY_CATALOG.find((p) => p.id === propertyId);
    if (!prop) return false;
    if (!this.ownedProperties.some((o) => o.id === propertyId)) return false;
    const refund = Math.round(prop.price * 0.85);
    this.ownedProperties = this.ownedProperties.filter((o) => o.id !== propertyId);
    this.bankBalance += refund;
    this.addTransaction(`Sold Property: ${prop.name}`, refund, 'bank');
    if (this.inInterior && this.interiorPropertyId === propertyId) {
      this.exitInterior();
    }
    this.audio.playChime(650);
    this.showNotification(`Sold ${prop.name} (+$${refund.toLocaleString()} wired to Bank)`);
    this.saveNow();
    this.pushHudSnapshot();
    return true;
  }

  public updatePropertyDecor(propertyId: string, theme: FurnitureTheme, accentLight: string) {
    const own = this.ownedProperties.find((p) => p.id === propertyId);
    if (!own) return;
    own.furnitureTheme = theme;
    own.accentLight = accentLight;
    if (this.inInterior && this.interiorPropertyId === propertyId) {
      this.interiors.configure('property', own, this.tunings);
    }
    this.audio.playChime(600);
    this.saveNow();
    this.pushHudSnapshot();
  }

  public parkVehicleInProperty(propertyId: string, vehicleId: VehicleId | null) {
    const own = this.ownedProperties.find((p) => p.id === propertyId);
    if (!own) return;
    own.parkedVehicleId = vehicleId;
    if (this.inInterior && this.interiorPropertyId === propertyId) {
      this.interiors.configure('property', own, this.tunings);
    }
    this.saveNow();
    this.pushHudSnapshot();
  }

  public enterInterior(
    kind: 'property' | 'restaurant' | 'clothing' | 'barber' | 'dealership',
    label: string,
    propertyId?: string,
  ) {
    if (this.activeVehicle) {
      this.toggleEnterExitVehicle();
    }
    this.returnOutsidePos = { x: this.playerX, z: this.playerZ, heading: this.playerHeading };
    this.inInterior = true;
    this.interiorLabel = label;
    this.interiorPropertyId = propertyId || null;

    const own = propertyId ? this.ownedProperties.find((p) => p.id === propertyId) || null : null;
    this.interiors.configure(kind, own, this.tunings);

    this.playerX = 0;
    this.playerY = -120;
    this.playerZ = 5.5;
    this.playerHeading = Math.PI;
    this.playerChar.root.visible = true;
    this.playerChar.root.position.set(this.playerX, this.playerY, this.playerZ);
    this.camYaw = Math.PI;
    this.showNotification(`Entered ${label} — Walk to green floor ring + [F] to Exit`);
    this.pushHudSnapshot();
  }

  public exitInterior() {
    if (!this.inInterior) return;
    this.inInterior = false;
    this.interiorLabel = null;
    this.interiorPropertyId = null;
    this.interiors.hide();

    this.playerX = this.returnOutsidePos.x;
    this.playerY = 0;
    this.playerZ = this.returnOutsidePos.z;
    this.playerHeading = this.returnOutsidePos.heading;
    this.playerChar.root.position.set(this.playerX, 0, this.playerZ);
    this.showNotification('Stepped back outside into Metro City');
    this.pushHudSnapshot();
  }

  public teleportToLocation(x: number, z: number) {
    if (this.inInterior) this.exitInterior();
    if (this.activeVehicle) {
      this.activeVehicle.x = x;
      this.activeVehicle.z = z;
      this.activeVehicle.vx = 0;
      this.activeVehicle.vz = 0;
      this.playerX = x;
      this.playerZ = z;
    } else {
      this.playerX = x;
      this.playerZ = z;
      this.playerChar.root.position.set(x, 0, z);
    }
    this.pushHudSnapshot();
  }

  // --- Life Sim: Character, Shop, Inventory, Banking & Police ---
  public updateAppearance(next: CharacterAppearance) {
    this.appearance = { ...next };
    this.playerChar.applyAppearance(this.appearance);
    this.saveNow();
    this.pushHudSnapshot();
  }

  public buyFoodItem(foodId: string): boolean {
    const item = SHOP_FOOD_MENU.find((f) => f.id === foodId);
    if (!item) return false;
    if (this.cash < item.price) {
      this.showNotification(`Need $${item.price} cash for ${item.name}`);
      return false;
    }
    this.cash -= item.price;
    this.addTransaction(`${item.name}`, -item.price, 'cash');
    const existing = this.inventory.find((i) => i.id === item.id);
    if (existing) {
      existing.qty += 1;
    } else {
      this.inventory.push({ id: item.id, name: item.name, qty: 1, category: item.category });
    }
    this.audio.playChime(700);
    this.showNotification(`Purchased ${item.name} (-$${item.price})`);
    this.saveNow();
    this.pushHudSnapshot();
    return true;
  }

  public useInventoryItem(itemId: string) {
    const idx = this.inventory.findIndex((i) => i.id === itemId && i.qty > 0);
    if (idx === -1) return;
    const inv = this.inventory[idx];
    const spec = SHOP_FOOD_MENU.find((f) => f.id === inv.id);
    if (!spec) return;

    if (spec.category === 'utility') {
      const target = this.activeVehicle || this.playerPrimaryVehicle;
      target.health = 100;
      target.fuel = Math.min(100, target.fuel + 35);
      this.showNotification(`Used ${spec.name}: Car repaired & +35% fuel`);
    } else {
      this.hunger = Math.min(100, this.hunger + spec.hungerRestore);
      this.energy = Math.min(100, this.energy + spec.energyRestore);
      this.showNotification(`Consumed ${spec.name}: Hunger ${Math.round(this.hunger)}% · Energy ${Math.round(this.energy)}%`);
    }
    inv.qty -= 1;
    if (inv.qty <= 0) this.inventory.splice(idx, 1);
    this.audio.playChime(780);
    this.saveNow();
    this.pushHudSnapshot();
  }

  public bankDeposit(amount: number): boolean {
    const amt = Math.min(this.cash, Math.max(0, Math.round(amount)));
    if (amt <= 0) return false;
    this.cash -= amt;
    this.bankBalance += amt;
    this.addTransaction('ATM Cash Deposit', amt, 'bank');
    this.audio.playChime(750);
    this.saveNow();
    this.pushHudSnapshot();
    return true;
  }

  public bankWithdraw(amount: number): boolean {
    const amt = Math.min(this.bankBalance, Math.max(0, Math.round(amount)));
    if (amt <= 0) return false;
    this.bankBalance -= amt;
    this.cash += amt;
    this.addTransaction('ATM Cash Withdrawal', -amt, 'bank');
    this.audio.playChime(650);
    this.saveNow();
    this.pushHudSnapshot();
    return true;
  }

  public resolvePoliceFine() {
    if (this.wantedLevel === 0) return;
    const fine = this.wantedLevel * 350;
    const paid = Math.min(this.cash + this.bankBalance, fine);
    if (this.cash >= paid) {
      this.cash -= paid;
      this.addTransaction(`Police Citation Fine`, -paid, 'cash');
    } else {
      const rem = paid - this.cash;
      this.cash = 0;
      this.bankBalance -= rem;
      this.addTransaction(`Police Citation Fine`, -rem, 'bank');
    }
    this.wantedLevel = 0;
    this.arrestHoldTimer = 0;
    this.policeAlertStatus = null;
    this.audio.playChime(540);
    this.showNotification(`Cleared Wanted Status at Precinct (-$${paid.toLocaleString()})`);
    this.pushHudSnapshot();
  }

  // --- Jobs System ---
  public startJob(job: Exclude<JobType, 'none'>) {
    const spec = JOB_CATALOG.find((j) => j.id === job);
    if (!spec) return;
    if (spec.vehicleRequired && !this.activeVehicle) {
      this.enterSpecificVehicle(this.playerPrimaryVehicle);
    }
    this.activeJob = job;
    this.jobStage = 0;
    this.jobPayout = spec.basePay;
    this.assignNextJobWaypoint();
    this.audio.playChime(720);
    this.showNotification(`Job Active: ${spec.title} — Follow green beam!`);
    this.pushHudSnapshot();
  }

  public cancelJob() {
    this.activeJob = 'none';
    this.jobStepLabel = null;
    this.jobBeaconGroup.visible = false;
    this.pushHudSnapshot();
  }

  private assignNextJobWaypoint() {
    const stops: Record<Exclude<JobType, 'none'>, { x: number; z: number; label: string }[]> = {
      taxi: [
        { x: -40, z: 102, label: 'Pick up passenger at Grand Horizon Mall' },
        { x: 256, z: 0, label: 'Deliver VIP passenger to Harbor Pier' },
      ],
      delivery: [
        { x: -32, z: 142, label: 'Load parcels at Mall Loading Dock' },
        { x: 120, z: 222, label: 'Drop parcel in South Suburbs' },
      ],
      mechanic: [
        { x: 185, z: -120, label: 'Reach stranded sedan on East Ave' },
        { x: -120, z: 58, label: 'Return diagnostics to Horizon Service' },
      ],
      dealer: [
        { x: -120, z: 58, label: 'Pick up showroom car at Horizon Motors' },
        { x: 212, z: -186, label: 'Deliver collector car to Sunset Ridge Villa' },
      ],
      parking: [
        { x: 120, z: -40, label: 'Stage client coupe at Midtown Parking Deck' },
        { x: -200, z: 120, label: 'Park inside Westside Valet Lot' },
      ],
      courier: [
        { x: 0, z: -80, label: 'Collect priority pouch at Downtown Core' },
        { x: -275, z: 356, label: 'Hand off to Metro Airport Terminal' },
      ],
    };
    if (this.activeJob === 'none') return;
    const seq = stops[this.activeJob];
    const step = seq[this.jobStage % seq.length];
    this.jobTarget.set(step.x, 0, step.z);
    this.jobStepLabel = step.label;
    this.jobBeaconGroup.position.set(step.x, 0, step.z);
    this.jobBeaconGroup.visible = true;
  }

  // --- Multiplayer Controls ---
  public connectMultiplayer(roomId: string, roomName?: string) {
    const car = this.activeVehicle || this.playerPrimaryVehicle;
    this.multiplayer.connect(
      roomId,
      this.appearance.name,
      {
        x: this.playerX,
        y: this.playerY,
        z: this.playerZ,
        heading: this.playerHeading,
        inVehicle: !!this.activeVehicle,
        vehicleId: car.spec.id,
        vehicleColor: car.color,
        headlightsOn: car.headlightsOn,
        driftScore: this.bestDriftScore,
        wantedLevel: this.wantedLevel,
        skinColor: this.appearance.skinColor,
        jacketColor: this.appearance.jacketColor,
      },
      roomName,
    );
    this.pushHudSnapshot();
  }

  public disconnectMultiplayer() {
    this.multiplayer.disconnect();
    this.pushHudSnapshot();
  }

  public sendChatMessage(text: string) {
    this.multiplayer.sendChat(text);
    this.pushHudSnapshot();
  }

  public toggleFriend(name: string) {
    this.multiplayer.toggleFriend(name);
    this.saveNow();
    this.pushHudSnapshot();
  }

  // --- Custom GLB Loader ---
  public async loadCustomGlbForVehicle(vehicleId: VehicleId, file: File): Promise<boolean> {
    try {
      const buffer = await file.arrayBuffer();
      registerCustomGlbBuffer(vehicleId, buffer, file.name);
      if (this.inGarage) {
        await this.garage.selectVehicle(vehicleId, undefined, this.tunings[vehicleId]);
      } else {
        await this.spawnAndSelectVehicle(vehicleId, this.tunings[vehicleId].paintColor);
      }
      this.pushHudSnapshot();
      return true;
    } catch {
      return false;
    }
  }

  public async loadCustomGlbFromUrl(vehicleId: VehicleId, url: string): Promise<boolean> {
    try {
      registerCustomGlbUrl(vehicleId, url.trim());
      if (this.inGarage) {
        await this.garage.selectVehicle(vehicleId, undefined, this.tunings[vehicleId]);
      }
      const glbLoaded = this.garage.getSnapshotState().assetSource === 'glb';
      this.pushHudSnapshot();
      return glbLoaded;
    } catch {
      return false;
    }
  }

  public async revertVehicleToPlaceholder(vehicleId: VehicleId) {
    clearCustomGlb(vehicleId);
    if (this.inGarage) {
      await this.garage.selectVehicle(vehicleId, undefined, this.tunings[vehicleId]);
    }
    this.pushHudSnapshot();
  }

  // --- 3D Underground Showroom Garage Controller ---
  public async enterGarage() {
    this.audio.init();
    if (this.inInterior) this.exitInterior();
    const focus = this.activeVehicle || this.playerPrimaryVehicle;
    await this.garage.selectVehicle(focus.spec.id, focus.color, this.tunings[focus.spec.id]);
    this.inGarage = true;
    this.garage.engineRunning = false;
    this.garage.setCameraPreset('orbit');
    this.audio.updateDrivingAudio(false, 0, 0, 60, 'i4', 0, false);

    if (this.renderPass) {
      this.renderPass.scene = this.garage.scene;
      this.renderPass.camera = this.garage.camera;
    }
    this.pushHudSnapshot();
  }

  public async exitGarage(deliverAndDrive: boolean) {
    this.inGarage = false;
    this.garage.engineRunning = false;
    if (this.renderPass) {
      this.renderPass.scene = this.scene;
      this.renderPass.camera = this.camera;
    }
    this.audio.updateDrivingAudio(false, 0, 0, 60, 'i4', 0, false);

    if (deliverAndDrive) {
      const gState = this.garage.getSnapshotState();
      this.tunings[gState.selectedId] = { ...gState.tuning };
      await this.spawnAndSelectVehicle(gState.selectedId, gState.color);
    }
    this.saveNow();
    this.pushHudSnapshot();
  }

  public async selectGarageVehicle(id: VehicleId) {
    await this.garage.selectVehicle(id, undefined, this.tunings[id]);
    this.audio.playChime(580);
    this.pushHudSnapshot();
  }

  public setGarageColor(hex: string) {
    this.garage.setColor(hex);
    this.tunings[this.garage.selectedId] = { ...this.garage.getSnapshotState().tuning };
    this.pushHudSnapshot();
  }

  public setGarageCameraPreset(preset: GarageCameraPreset) {
    this.garage.setCameraPreset(preset);
    this.pushHudSnapshot();
  }

  public toggleGarageAutoRotate() {
    this.garage.autoRotate = !this.garage.autoRotate;
    this.pushHudSnapshot();
  }

  public toggleGarageDoors() {
    this.garage.doorsOpen = !this.garage.doorsOpen;
    this.audio.playDoorLatch();
    this.pushHudSnapshot();
  }

  public toggleGarageHood() {
    this.garage.hoodOpen = !this.garage.hoodOpen;
    this.audio.playDoorLatch();
    this.pushHudSnapshot();
  }

  public toggleGarageLights() {
    this.garage.headlightsOn = !this.garage.headlightsOn;
    this.pushHudSnapshot();
  }

  public toggleGarageEngine() {
    this.audio.init();
    this.garage.engineRunning = !this.garage.engineRunning;
    if (this.garage.engineRunning) {
      this.audio.playIgnition();
      this.garage.revBoost = 0.75;
    } else {
      this.audio.updateDrivingAudio(false, 0, 0, 60, 'i4', 0, false);
    }
    this.pushHudSnapshot();
  }

  public revGarageEngine() {
    this.audio.init();
    if (!this.garage.engineRunning) {
      this.garage.engineRunning = true;
      this.audio.playIgnition();
    }
    this.garage.revBoost = 1.0;
    this.pushHudSnapshot();
  }

  public async spawnAndSelectVehicle(vehicleId: VehicleId, colorHex: string) {
    const spec = VEHICLE_CATALOG.find((v) => v.id === vehicleId);
    if (!spec) return;
    if (this.inInterior) this.exitInterior();

    const tuning = this.tunings[vehicleId] || createDefaultTuning(spec, colorHex);
    tuning.paintColor = colorHex;
    this.tunings[vehicleId] = tuning;

    const target = this.activeVehicle || this.playerPrimaryVehicle;
    const pos = this.activeVehicle
      ? { x: target.x, z: target.z, heading: target.heading }
      : {
          x: this.playerX + Math.sin(this.playerHeading) * 4.5,
          z: this.playerZ + Math.cos(this.playerHeading) * 4.5,
          heading: this.playerHeading,
        };

    const glbModel = await tryLoadGlbVehicle(spec, colorHex);
    this.scene.remove(target.rig.root);

    const newRig = createVehicleMesh(spec, colorHex, this.textures, this.isSoftwareGl, glbModel, tuning);
    newRig.root.position.set(pos.x, 0, pos.z);
    newRig.root.rotation.y = pos.heading;
    this.scene.add(newRig.root);

    target.spec = spec;
    target.color = colorHex;
    target.rig = newRig;
    target.x = pos.x;
    target.z = pos.z;
    target.heading = pos.heading;
    target.vx = 0;
    target.vz = 0;
    target.fuel = 100;
    target.health = 100;
    target.engineRunning = true;
    target.doorsOpen = false;
    target.hoodOpen = false;
    target.doorsAnim = 0;
    target.hoodAnim = 0;

    if (!this.activeVehicle) {
      this.enterSpecificVehicle(target);
    }
    this.audio.playIgnition();
    this.showNotification(
      glbModel
        ? `Loaded Custom GLB: ${spec.brand} ${spec.model}`
        : `Delivered: ${spec.brand} ${spec.model} (Coachbuilt Placeholder)`,
    );
    this.pushHudSnapshot();
  }

  public updateActiveVehicleColor(colorHex: string) {
    const target = this.activeVehicle || this.playerPrimaryVehicle;
    target.color = colorHex;
    this.tunings[target.spec.id].paintColor = colorHex;
    target.rig.applyTuning(this.tunings[target.spec.id]);
    this.pushHudSnapshot();
  }

  public toggleEnterExitVehicle() {
    if (this.inInterior) return;
    if (this.activeVehicle) {
      const v = this.activeVehicle;
      v.braking = false;
      v.reversing = false;

      const cos = Math.cos(v.heading);
      const sin = Math.sin(v.heading);
      this.playerX = v.x + cos * (v.spec.width * 0.5 + 0.9);
      this.playerZ = v.z - sin * (v.spec.width * 0.5 + 0.9);
      this.playerY = 0;
      this.playerHeading = v.heading;
      this.playerChar.root.visible = true;
      this.playerChar.root.position.set(this.playerX, 0, this.playerZ);
      this.activeVehicle = null;
      this.cameraMode = 'third-person';
      this.audio.playDoorLatch();
      this.showNotification(`Exited ${v.spec.brand} ${v.spec.model}`);
    } else {
      const nearest = this.findNearestVehicle(5.2);
      if (nearest) {
        this.enterSpecificVehicle(nearest);
      }
    }
    this.pushHudSnapshot();
  }

  public handleInteractAction() {
    if (this.inInterior) {
      this.exitInterior();
      return;
    }
    const zone = this.findNearestInteractZone();
    if (zone) {
      if (zone.kind === 'showroom') {
        void this.enterGarage();
      } else if (zone.kind === 'police_station') {
        if (this.wantedLevel > 0) {
          this.resolvePoliceFine();
        } else {
          this.showNotification('Metro Police HQ: Your record is clean!');
        }
      } else if (this.onZoneInteract) {
        this.onZoneInteract(zone);
      } else if (zone.kind === 'npc' && zone.npcDialogue?.length) {
        this.showNotification(`${zone.name}: "${zone.npcDialogue[0]}"`);
      }
      return;
    }

    if (!this.activeVehicle) {
      const nearCar = this.findNearestVehicle(5.2);
      if (nearCar) {
        this.enterSpecificVehicle(nearCar);
        this.pushHudSnapshot();
      }
    }
  }

  private enterSpecificVehicle(v: WorldVehicle) {
    this.activeVehicle = v;
    v.doorsOpen = false;
    v.hoodOpen = false;
    this.playerChar.root.visible = false;
    this.camYaw = 0;
    this.audio.playDoorLatch();
    this.audio.playIgnition();
    const eff = getEffectiveVehicleStats(v.spec, this.tunings[v.spec.id]);
    this.showNotification(`Driving ${v.spec.brand} ${v.spec.model} (${eff.horsepower} HP)`);
  }

  public cycleCameraMode() {
    if (!this.activeVehicle) return;
    const order: CameraMode[] = ['third-person', 'cockpit', 'hood', 'orbit'];
    const idx = order.indexOf(this.cameraMode);
    this.cameraMode = order[(idx + 1) % order.length];
    const labels: Record<CameraMode, string> = {
      'third-person': 'Third-Person Chase',
      cockpit: 'First-Person Cockpit',
      hood: 'Hood Cam',
      orbit: 'Cinematic Orbit',
    };
    this.showNotification(`Camera: ${labels[this.cameraMode]}`);
    this.pushHudSnapshot();
  }

  public toggleHeadlights() {
    const v = this.activeVehicle || this.playerPrimaryVehicle;
    v.headlightsOn = !v.headlightsOn;
    this.pushHudSnapshot();
  }

  public toggleEngineRunning() {
    const v = this.activeVehicle;
    if (!v) return;
    v.engineRunning = !v.engineRunning;
    if (v.engineRunning) {
      this.audio.playIgnition();
      this.showNotification(`${v.spec.brand} ${v.spec.model} Engine Started`);
    } else {
      this.showNotification(`${v.spec.brand} ${v.spec.model} Engine Stopped`);
    }
    this.pushHudSnapshot();
  }

  public toggleIndicator(targetMode: 'left' | 'right' | 'hazard') {
    const v = this.activeVehicle || this.playerPrimaryVehicle;
    v.indicatorMode = v.indicatorMode === targetMode ? 'off' : targetMode;
    this.pushHudSnapshot();
  }

  public toggleDoors() {
    const v = this.activeVehicle || this.findNearestVehicle(6) || this.playerPrimaryVehicle;
    v.doorsOpen = !v.doorsOpen;
    this.audio.playDoorLatch();
    this.showNotification(v.doorsOpen ? 'Doors Opened' : 'Doors Closed');
    this.pushHudSnapshot();
  }

  public toggleHood() {
    const v = this.activeVehicle || this.findNearestVehicle(6) || this.playerPrimaryVehicle;
    v.hoodOpen = !v.hoodOpen;
    this.audio.playDoorLatch();
    this.showNotification(v.hoodOpen ? 'Engine Hood Opened' : 'Engine Hood Closed');
    this.pushHudSnapshot();
  }

  public tryRefuel() {
    if (!this.activeVehicle) return;
    const station = this.findNearestGasStation(this.activeVehicle.x, this.activeVehicle.z);
    if (!station) return;
    const needed = 100 - this.activeVehicle.fuel;
    if (needed < 2) {
      this.showNotification('Tank is already full!');
      return;
    }
    const cost = Math.round(needed * 1.4);
    if (this.cash < cost) {
      this.showNotification('Not enough cash for full tank!');
      return;
    }
    this.cash -= cost;
    this.addTransaction(`Fuel at ${station.name}`, -cost, 'cash');
    this.activeVehicle.fuel = 100;
    this.audio.playChime(740);
    this.showNotification(`Refueled at ${station.name} (-$${cost})`);
    this.pushHudSnapshot();
  }

  private showNotification(msg: string) {
    this.notification = msg;
    this.notificationTimer = 3.6;
  }

  private findNearestVehicle(maxDist: number): WorldVehicle | null {
    let best: WorldVehicle | null = null;
    let bestD = maxDist;
    for (const v of this.vehicles) {
      const d = Math.hypot(v.x - this.playerX, v.z - this.playerZ);
      if (d < bestD) {
        bestD = d;
        best = v;
      }
    }
    return best;
  }

  private findNearestGasStation(x: number, z: number) {
    for (const gs of this.world.gasStations) {
      if (Math.hypot(x - gs.x, z - gs.z) <= gs.radius) return gs;
    }
    return null;
  }

  private findNearestInteractZone(): WorldInteractZone | null {
    const cx = this.activeVehicle ? this.activeVehicle.x : this.playerX;
    const cz = this.activeVehicle ? this.activeVehicle.z : this.playerZ;
    let best: WorldInteractZone | null = null;
    let bestDist = Infinity;
    for (const z of this.world.interactZones) {
      const d = Math.hypot(cx - z.x, cz - z.z);
      if (d <= z.radius && d < bestDist) {
        bestDist = d;
        best = z;
      }
    }
    return best;
  }

  // --- Physics & Simulation ---
  private resolvePointColliders(x: number, z: number, radius: number): [number, number, boolean] {
    let rx = THREE.MathUtils.clamp(x, -395, 395);
    let rz = THREE.MathUtils.clamp(z, -395, 395);
    // Keep out of ocean (+X > 272, except waterfront pier)
    if (rx > 272 && Math.abs(rz) > 6.5) {
      rx = 272;
    } else if (rx > 322) {
      rx = 322;
    }
    let hit = rx !== x || rz !== z;

    for (let i = 0; i < this.world.colliders.length; i++) {
      const c: BoxCollider = this.world.colliders[i];
      const closestX = THREE.MathUtils.clamp(rx, c.minX, c.maxX);
      const closestZ = THREE.MathUtils.clamp(rz, c.minZ, c.maxZ);
      const dx = rx - closestX;
      const dz = rz - closestZ;
      const distSq = dx * dx + dz * dz;
      if (distSq < radius * radius) {
        hit = true;
        const dist = Math.sqrt(distSq);
        if (dist > 0.0001) {
          const push = radius - dist;
          rx += (dx / dist) * push;
          rz += (dz / dist) * push;
        } else {
          rx += radius;
        }
      }
    }
    return [rx, rz, hit];
  }

  private updatePlayerOnFoot(dt: number) {
    const fwdInput =
      (this.keys['KeyW'] || this.keys['ArrowUp'] ? 1 : 0) -
      (this.keys['KeyS'] || this.keys['ArrowDown'] ? 1 : 0) +
      this.touchInput.moveY;
    const sideInput =
      (this.keys['KeyD'] || this.keys['ArrowRight'] ? 1 : 0) -
      (this.keys['KeyA'] || this.keys['ArrowLeft'] ? 1 : 0) +
      this.touchInput.moveX;

    const fatigueFactor = this.energy < 15 ? 0.65 : 1.0;
    const isSprinting = !!(
      (this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.touchInput.sprint) &&
      this.energy > 5
    );
    const wantsJump = !!(this.keys['Space'] || this.touchInput.jump);

    const len = Math.hypot(fwdInput, sideInput);
    const moveMag = Math.min(1, len);
    const targetSpeed = moveMag * (isSprinting ? 8.6 : 4.2) * fatigueFactor;

    if (moveMag > 0.05) {
      const inputAngle = Math.atan2(sideInput, fwdInput);
      const worldAngle = this.camYaw + inputAngle;

      let angleDiff = worldAngle - this.playerHeading;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      this.playerHeading += angleDiff * Math.min(1, dt * 12);

      const nextX = this.playerX + Math.sin(worldAngle) * targetSpeed * dt;
      const nextZ = this.playerZ + Math.cos(worldAngle) * targetSpeed * dt;
      if (this.inInterior) {
        const [ix, iz] = this.interiors.clampInteriorPosition(nextX, nextZ);
        this.playerX = ix;
        this.playerZ = iz;
      } else {
        const [rx, rz] = this.resolvePointColliders(nextX, nextZ, 0.55);
        this.playerX = rx;
        this.playerZ = rz;
      }

      if (this.playerGrounded) {
        this.audio.playFootstep(isSprinting);
      }
      if (isSprinting) {
        this.energy = Math.max(0, this.energy - dt * 2.2);
      }
    }

    this.playerSpeed = THREE.MathUtils.damp(this.playerSpeed, targetSpeed, 12, dt);

    const groundFloor = this.inInterior ? -120 : 0;
    if (wantsJump && this.playerGrounded) {
      this.playerVy = 6.4;
      this.playerGrounded = false;
    }
    if (!this.playerGrounded) {
      this.playerVy -= 18.5 * dt;
      this.playerY += this.playerVy * dt;
      if (this.playerY <= groundFloor) {
        this.playerY = groundFloor;
        this.playerVy = 0;
        this.playerGrounded = true;
      }
    }

    this.playerChar.root.position.set(this.playerX, this.playerY, this.playerZ);
    this.playerChar.root.rotation.y = this.playerHeading;
    this.playerChar.updateAnimation(dt, this.playerSpeed, isSprinting, this.playerGrounded);
  }

  private updateVehiclePhysics(v: WorldVehicle, dt: number, isNight: boolean, elapsed: number) {
    const isPlayerDriving = this.activeVehicle === v;
    const tuning = this.tunings[v.spec.id];
    const eff = getEffectiveVehicleStats(v.spec, tuning);

    let throttle = 0;
    let brakeInput = 0;
    let steerInput = 0;
    let handbrake = false;

    if (isPlayerDriving) {
      if (this.keys['KeyW'] || this.keys['ArrowUp'] || this.touchInput.throttle || this.touchInput.moveY > 0.25) {
        throttle = 1;
      }
      if (this.keys['KeyS'] || this.keys['ArrowDown'] || this.touchInput.brake || this.touchInput.moveY < -0.25) {
        brakeInput = 1;
      }
      steerInput =
        (this.keys['KeyA'] || this.keys['ArrowLeft'] ? 1 : 0) -
        (this.keys['KeyD'] || this.keys['ArrowRight'] ? 1 : 0) -
        this.touchInput.moveX;
      steerInput = THREE.MathUtils.clamp(steerInput, -1, 1);
      handbrake = !!(this.keys['Space'] || this.touchInput.handbrake);
    }

    const fwdX = Math.sin(v.heading);
    const fwdZ = Math.cos(v.heading);
    const rightX = Math.cos(v.heading);
    const rightZ = -Math.sin(v.heading);

    let vForward = v.vx * fwdX + v.vz * fwdZ;
    let vLateral = v.vx * rightX + v.vz * rightZ;
    const speedMs = Math.hypot(v.vx, v.vz);
    const speedKmh = speedMs * 3.6;

    if (speedKmh > 10) {
      v.doorsOpen = false;
      v.hoodOpen = false;
    }

    const maxSteer = 0.52 * THREE.MathUtils.clamp(1.15 - speedKmh / 240, 0.38, 1);
    const targetSteer = steerInput * maxSteer * this.settings.steeringSensitivity;
    v.steerAngle = THREE.MathUtils.damp(v.steerAngle, targetSteer, 10, dt);

    const maxSpeedMs = eff.topSpeedKmh / 3.6;
    let accel = 0;
    let braking = false;
    let reversing = false;

    if (v.fuel <= 0.1 && throttle > 0) throttle = 0;
    if (!v.engineRunning) {
      if (isPlayerDriving && throttle > 0 && !this.notification) {
        this.showNotification('Engine Stopped — Press [I] or Engine button to Start');
      }
      throttle = 0;
    }

    if (throttle > 0) {
      if (vForward < -1) {
        accel = eff.brakeForce;
        braking = true;
      } else {
        const speedRatio = Math.min(1, Math.max(0, vForward / maxSpeedMs));
        accel = eff.accelForce * (1 - speedRatio * 0.72);
      }
    } else if (brakeInput > 0) {
      if (vForward > 1.2) {
        accel = -eff.brakeForce;
        braking = true;
      } else {
        accel = -12.5;
        reversing = true;
      }
    } else {
      accel = -vForward * 0.48;
    }

    if (handbrake) {
      braking = true;
      vForward *= Math.max(0, 1 - 1.35 * dt);
    }

    vForward += accel * dt;
    vForward = THREE.MathUtils.clamp(vForward, -16, maxSpeedMs);

    if (isPlayerDriving && throttle > 0) {
      v.fuel = Math.max(0, v.fuel - dt * 0.24);
    }

    const steerSign = vForward >= -0.2 ? 1 : -1;
    const turnFactor = Math.min(1, speedMs / 4.5);
    const driftBoost = handbrake ? 1.48 : 1.0;
    const targetAngularVel = v.steerAngle * 2.55 * steerSign * turnFactor * driftBoost * (vForward < 0 ? 0.75 : 1);
    v.angularVel = THREE.MathUtils.damp(v.angularVel, targetAngularVel, 9, dt);
    v.heading += v.angularVel * dt;

    const w = this.settings.weather;
    const weatherGrip =
      w === 'snow' ? 0.58 : w === 'heavy-rain' || w === 'thunderstorm' ? 0.65 : w === 'rain' ? 0.78 : 1.0;
    const baseGrip = handbrake
      ? 1.45
      : THREE.MathUtils.lerp(7.5, 4.2, eff.driftFactor) * eff.gripMultiplier * weatherGrip;
    vLateral = THREE.MathUtils.damp(vLateral, 0, baseGrip, dt);

    const nFwdX = Math.sin(v.heading);
    const nFwdZ = Math.cos(v.heading);
    const nRightX = Math.cos(v.heading);
    const nRightZ = -Math.sin(v.heading);

    v.vx = nFwdX * vForward + nRightX * vLateral;
    v.vz = nFwdZ * vForward + nRightZ * vLateral;
    v.vx *= Math.max(0, 1 - 0.12 * dt);
    v.vz *= Math.max(0, 1 - 0.12 * dt);

    const nextX = v.x + v.vx * dt;
    const nextZ = v.z + v.vz * dt;
    const [rx, rz, hit] = this.resolvePointColliders(nextX, nextZ, v.spec.width * 0.62);
    if (hit) {
      if (isPlayerDriving && speedMs > 6) {
        this.audio.playImpact(Math.min(1.5, speedMs / 18));
        this.shakeTimer = 0.25;
        this.shakeIntensity = Math.min(0.45, speedMs / 55);
        this.hitstopTimer = 0.035;
        v.health = Math.max(15, v.health - Math.min(14, speedMs * 0.35));
      }
      v.vx *= -0.32;
      v.vz *= -0.32;
    }
    v.x = rx;
    v.z = rz;

    const slipAngle = speedMs > 4 ? Math.atan2(Math.abs(vLateral), Math.abs(vForward) + 0.1) : 0;
    v.driftAngleDeg = Math.round(THREE.MathUtils.radToDeg(slipAngle));
    v.isDrifting = speedMs > 6.5 && (v.driftAngleDeg > 13 || (handbrake && Math.abs(steerInput) > 0.2));

    if (v.isDrifting) {
      const rearDist = -v.spec.wheelBase * 0.5;
      const trackHalf = v.spec.trackWidth * 0.5;
      for (const side of [-1, 1]) {
        const wx = v.x + nFwdX * rearDist + nRightX * side * trackHalf;
        const wz = v.z + nFwdZ * rearDist + nRightZ * side * trackHalf;
        if (Math.random() < 0.75) {
          this.effects.emitTireSmoke(wx, 0.1, wz, v.vx, v.vz);
        }
        this.effects.addSkidMark(wx, wz, v.heading);
      }
    }

    const prevGear = v.gear;
    const gearThresholds = [0, 38, 74, 118, 168, 225, 340];
    if (!v.engineRunning) {
      v.gear = 'OFF';
      v.rpm = 0;
    } else if (reversing) {
      v.gear = 'R';
      v.rpm = 1200 + Math.min(4500, speedKmh * 90);
    } else if (speedKmh < 1.5 && throttle === 0) {
      v.gear = 'N';
      v.rpm = 850;
    } else {
      let g = 1;
      for (let i = 1; i <= 6; i++) {
        if (speedKmh > gearThresholds[i]) g = Math.min(6, i + 1);
      }
      v.gear = String(g);
      const low = gearThresholds[g - 1];
      const high = gearThresholds[g];
      const ratio = THREE.MathUtils.clamp((speedKmh - low) / Math.max(10, high - low), 0, 1);
      v.rpm = Math.round(1800 + ratio * 5600 + throttle * 550);
    }

    if (isPlayerDriving && prevGear !== v.gear && v.gear !== 'N' && v.gear !== 'OFF' && prevGear !== 'N') {
      this.audio.playGearShift(tuning.turboLv > 0);
    }

    v.rig.root.position.set(v.x, 0, v.z);
    v.rig.root.rotation.y = v.heading;
    v.rig.lod.update(this.camera);

    v.lastAccel = THREE.MathUtils.damp(v.lastAccel, accel, 8, dt);
    v.lastLateral = THREE.MathUtils.damp(v.lastLateral, vLateral, 8, dt);

    const targetRoll = THREE.MathUtils.clamp(-v.lastLateral * 0.014, -0.085, 0.085);
    const targetPitch = THREE.MathUtils.clamp(-v.lastAccel * 0.0024, -0.055, 0.055);
    v.rig.chassisGroup.rotation.z = targetRoll;
    v.rig.chassisGroup.rotation.x = targetPitch;

    const roadRippleF = speedMs > 1 ? Math.sin(elapsed * 18 + v.x * 0.4) * Math.min(0.018, speedMs * 0.0008) : 0;
    const roadRippleR = speedMs > 1 ? Math.sin(elapsed * 18 + v.z * 0.4 + 1.2) * Math.min(0.018, speedMs * 0.0008) : 0;
    const pitchDrop = targetPitch * 0.35;
    const rollDrop = targetRoll * 0.35;
    v.rig.setSuspension(
      roadRippleF - pitchDrop + rollDrop - eff.rideDrop,
      roadRippleF - pitchDrop - rollDrop - eff.rideDrop,
      roadRippleR + pitchDrop + rollDrop - eff.rideDrop,
      roadRippleR + pitchDrop - rollDrop - eff.rideDrop,
    );

    v.rig.wheelPivots.fl.rotation.y = v.steerAngle;
    v.rig.wheelPivots.fr.rotation.y = v.steerAngle;
    v.wheelSpin += (vForward / v.spec.wheelRadius) * dt;
    for (const wMesh of v.rig.wheelRollMeshes) {
      wMesh.rotation.x = v.wheelSpin;
    }
    v.rig.steeringWheel.rotation.z = -v.steerAngle * 3.4;

    v.doorsAnim = THREE.MathUtils.damp(v.doorsAnim, v.doorsOpen ? 1 : 0, 7, dt);
    v.hoodAnim = THREE.MathUtils.damp(v.hoodAnim, v.hoodOpen ? 1 : 0, 7, dt);
    v.rig.setOpenables(v.doorsAnim, v.hoodAnim);

    v.braking = braking;
    v.reversing = reversing;
    const autoLights = isNight || v.headlightsOn;
    const blinkOn = Math.floor(elapsed * 2.2) % 2 === 0;
    v.rig.setLights(autoLights, braking, reversing, v.indicatorMode, blinkOn);

    if (isPlayerDriving) {
      this.playerX = v.x;
      this.playerZ = v.z;
      this.playerHeading = v.heading;
      const isRaining = w === 'rain' || w === 'heavy-rain' || w === 'thunderstorm';
      this.audio.updateDrivingAudio(
        v.engineRunning,
        v.rpm,
        throttle,
        v.spec.enginePitchBase,
        v.spec.engineType,
        v.isDrifting ? Math.min(1, v.driftAngleDeg / 38) : 0,
        isRaining,
        w === 'heavy-rain' || w === 'thunderstorm' ? 0.11 : 0.055,
        this.wantedLevel > 0,
        elapsed,
      );
    }
  }

  private updatePoliceAndLifeSim(dt: number) {
    // Hunger & Energy gradual burn
    this.hunger = Math.max(0, this.hunger - dt * 0.12);
    this.energy = Math.max(0, this.energy - dt * 0.06);

    // Passive Property Rental Income every 45 seconds
    if (this.ownedProperties.length > 0) {
      this.passiveIncomeTimer += dt;
      if (this.passiveIncomeTimer >= 45) {
        this.passiveIncomeTimer = 0;
        let totalRent = 0;
        for (const own of this.ownedProperties) {
          const spec = PROPERTY_CATALOG.find((p) => p.id === own.id);
          if (spec) totalRent += spec.dailyIncome;
        }
        if (totalRent > 0) {
          this.bankBalance += totalRent;
          this.addTransaction('Property Daily Rental Income', totalRent, 'bank');
          this.showNotification(`Property Income Credited: +$${totalRent.toLocaleString()} to Bank`);
        }
      }
    }

    // Active Job Checkpoints
    if (this.activeJob !== 'none' && !this.inInterior) {
      this.jobBeaconGroup.rotation.y += dt * 1.2;
      const dist = Math.hypot(this.playerX - this.jobTarget.x, this.playerZ - this.jobTarget.z);
      if (dist < 6.5) {
        if (this.jobStage === 0) {
          this.jobStage = 1;
          this.audio.playChime(700);
          this.assignNextJobWaypoint();
          this.showNotification(`Step Complete! ${this.jobStepLabel}`);
        } else {
          this.cash += this.jobPayout;
          this.addTransaction(`Job Payout (${this.activeJob})`, this.jobPayout, 'cash');
          this.audio.playChime(920);
          this.showNotification(`Job Complete! Earned +$${this.jobPayout.toLocaleString()}`);
          this.jobStage = 0;
          this.assignNextJobWaypoint();
          this.saveNow();
        }
      }
    }

    // Police Wanted & Traffic Violations
    if (this.policeViolationCooldown > 0) {
      this.policeViolationCooldown -= dt;
    }

    const nearestPoliceDist = this.traffic.getNearestPoliceDistance(this.playerX, this.playerZ);

    if (this.activeVehicle && !this.inInterior && this.policeViolationCooldown <= 0) {
      const speedKmh = Math.hypot(this.activeVehicle.vx, this.activeVehicle.vz) * 3.6;
      const ranRed = this.traffic.isRunningRedLight(
        this.activeVehicle.x,
        this.activeVehicle.z,
        this.activeVehicle.heading,
        speedKmh,
      );
      if ((ranRed || speedKmh > 165) && nearestPoliceDist < 95) {
        this.wantedLevel = Math.min(5, this.wantedLevel + 1);
        this.policeViolationCooldown = 9;
        this.wantedEscapeTimer = 0;
        this.showNotification(
          ranRed
            ? `Police Alert: Ran Red Light! Wanted ★${this.wantedLevel}`
            : `Police Alert: Extreme Speeding! Wanted ★${this.wantedLevel}`,
        );
      }
    }

    if (this.wantedLevel > 0) {
      this.policeAlertStatus = nearestPoliceDist < 45 ? 'POLICE IN PURSUIT' : 'EVADING PATROL';
      const playerSpeedKmh = this.activeVehicle
        ? Math.hypot(this.activeVehicle.vx, this.activeVehicle.vz) * 3.6
        : this.playerSpeed * 3.6;

      if (nearestPoliceDist < 9 && playerSpeedKmh < 14 && !this.inInterior) {
        this.arrestHoldTimer += dt;
        if (this.arrestHoldTimer >= 2.2) {
          this.resolvePoliceFine();
          this.teleportToLocation(40, -96);
          this.showNotification('Pulled Over by Metro Police — Fine Paid at Precinct');
        }
      } else {
        this.arrestHoldTimer = 0;
      }

      if (nearestPoliceDist > 85) {
        this.wantedEscapeTimer += dt;
        if (this.wantedEscapeTimer >= 12) {
          this.wantedLevel = 0;
          this.wantedEscapeTimer = 0;
          this.policeAlertStatus = null;
          this.showNotification('Evaded Police Patrol — Record Cleared!');
        }
      } else {
        this.wantedEscapeTimer = 0;
      }
    } else {
      this.policeAlertStatus = null;
    }
  }

  private updateGameModes(dt: number) {
    if (this.mode === 'drift' && this.activeVehicle) {
      if (this.activeVehicle.isDrifting) {
        const pts = (this.activeVehicle.driftAngleDeg * 2.2 + Math.hypot(this.activeVehicle.vx, this.activeVehicle.vz) * 3) * dt;
        this.currentDriftPoints += pts;
        this.driftCombo = Math.min(5, 1 + Math.floor(this.currentDriftPoints / 250));
        this.driftGraceTimer = 1.4;
      } else if (this.currentDriftPoints > 0) {
        this.driftGraceTimer -= dt;
        if (this.driftGraceTimer <= 0) {
          const banked = Math.round(this.currentDriftPoints * this.driftCombo);
          this.driftScore += banked;
          this.bestDriftScore = Math.max(this.bestDriftScore, this.driftScore);
          const reward = Math.round(banked * 0.15);
          this.cash += reward;
          this.addTransaction('Drift Combo Reward', reward, 'cash');
          this.currentDriftPoints = 0;
          this.driftCombo = 1;
          this.audio.playChime(680);
        }
      }
    }

    if (this.mode === 'parking' && this.activeVehicle) {
      const bay = this.world.parkingBays[this.parkingLevel];
      const dist = Math.hypot(this.activeVehicle.x - bay.x, this.activeVehicle.z - bay.z);
      const speedKmh = Math.hypot(this.activeVehicle.vx, this.activeVehicle.vz) * 3.6;
      const angleDiff = Math.abs(Math.atan2(Math.sin(this.activeVehicle.heading - bay.heading), Math.cos(this.activeVehicle.heading - bay.heading)));
      const aligned = dist < 2.2 && (angleDiff < 0.35 || Math.abs(angleDiff - Math.PI) < 0.35);

      if (aligned && speedKmh < 1.8) {
        this.parkingHoldTimer += dt;
        this.parkingMarkerMat.color.setHex(0x22c55e);
        if (this.parkingHoldTimer >= 1.2) {
          this.cash += 750;
          this.addTransaction('Precision Parking Bonus', 750, 'cash');
          this.audio.playChime(880);
          this.parkingLevel = (this.parkingLevel + 1) % this.world.parkingBays.length;
          const nextBay = this.world.parkingBays[this.parkingLevel];
          this.parkingMarkerGroup.position.set(nextBay.x, 0, nextBay.z);
          this.parkingMarkerGroup.rotation.y = nextBay.heading;
          this.parkingHoldTimer = 0;
          this.showNotification(`Parked! +$750 · Next: ${nextBay.title}`);
        }
      } else {
        this.parkingHoldTimer = 0;
        this.parkingMarkerMat.color.setHex(dist < 5 ? 0xfacc15 : 0x38bdf8);
      }
    }

    if (this.mode === 'exploration' && !this.inInterior) {
      this.world.landmarks.forEach((lm, idx) => {
        if (this.discoveredLandmarks.has(lm.id)) return;
        const d = Math.hypot(this.playerX - lm.x, this.playerZ - lm.z);
        if (d < lm.radius) {
          this.discoveredLandmarks.add(lm.id);
          this.landmarkBeacons[idx].visible = false;
          this.cash += 500;
          this.addTransaction(`Landmark: ${lm.name}`, 500, 'cash');
          this.audio.playChime(780);
          this.showNotification(`Discovered ${lm.name}! (+$500)`);
        }
      });
    }

    if (this.mode === 'challenges' && this.challengeActive && this.activeVehicle) {
      this.challengeTime += dt;
      const target = this.world.challengeCheckpoints[this.challengeCheckpoint];
      this.challengeGateGroup.rotation.y += dt * 1.4;
      const dist = Math.hypot(this.activeVehicle.x - target.x, this.activeVehicle.z - target.z);
      if (dist < 8.5) {
        this.audio.playChime(620 + this.challengeCheckpoint * 60);
        this.challengeCheckpoint++;
        if (this.challengeCheckpoint >= this.world.challengeCheckpoints.length) {
          const finalTime = Number(this.challengeTime.toFixed(1));
          if (this.challengeBestTime === null || finalTime < this.challengeBestTime) {
            this.challengeBestTime = finalTime;
          }
          this.cash += 1500;
          this.addTransaction('Street Sprint Finish', 1500, 'cash');
          this.showNotification(`Sprint Finished in ${finalTime}s! (+$1,500)`);
          this.startChallenge();
        } else {
          this.challengeGateGroup.position.copy(this.world.challengeCheckpoints[this.challengeCheckpoint]);
        }
      }
    }
  }

  private applyAtmosphere(elapsed: number, dt = 0): number {
    const h = this.settings.timeOfDay;
    const sunAngle = ((h - 6) / 24) * Math.PI * 2;
    const sunElev = Math.sin(sunAngle);
    const nightFactor = THREE.MathUtils.clamp(-sunElev * 2.2 + 0.15, 0, 1);

    const sunX = Math.cos(sunAngle) * 160;
    const sunY = Math.max(12, sunElev * 180);
    this.sunLight.position.set(this.playerX + sunX, sunY, this.playerZ + 70);
    this.sunLight.target.position.set(this.playerX, 0, this.playerZ);

    const dayRatio = THREE.MathUtils.clamp(sunElev * 1.6 + 0.35, 0, 1);
    const weather = this.settings.weather;
    const isRain = weather === 'rain' || weather === 'heavy-rain' || weather === 'thunderstorm';
    const isSnow = weather === 'snow';

    // Thunderstorm lightning trigger
    if (weather === 'thunderstorm' && dt > 0) {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        this.lightningTimer = 7 + Math.random() * 10;
        this.lightningFlash = 1.0;
        this.audio.playThunder();
      }
      this.lightningFlash = Math.max(0, this.lightningFlash - dt * 4.5);
    } else {
      this.lightningFlash = 0;
    }

    if (isRain || weather === 'cloudy') {
      _skyColor.setRGB(
        THREE.MathUtils.lerp(0.04, 0.36, dayRatio),
        THREE.MathUtils.lerp(0.06, 0.42, dayRatio),
        THREE.MathUtils.lerp(0.11, 0.49, dayRatio),
      );
    } else if (weather === 'fog') {
      _skyColor.setRGB(
        THREE.MathUtils.lerp(0.07, 0.68, dayRatio),
        THREE.MathUtils.lerp(0.09, 0.72, dayRatio),
        THREE.MathUtils.lerp(0.14, 0.76, dayRatio),
      );
    } else if (isSnow) {
      _skyColor.setRGB(
        THREE.MathUtils.lerp(0.10, 0.78, dayRatio),
        THREE.MathUtils.lerp(0.12, 0.84, dayRatio),
        THREE.MathUtils.lerp(0.18, 0.90, dayRatio),
      );
    } else {
      const sunsetGlow = Math.max(0, 1 - Math.abs(sunElev) * 3.5);
      _skyColor.setRGB(
        THREE.MathUtils.lerp(0.04, 0.48, dayRatio) + sunsetGlow * 0.25,
        THREE.MathUtils.lerp(0.06, 0.74, dayRatio) + sunsetGlow * 0.05,
        THREE.MathUtils.lerp(0.13, 0.94, dayRatio) - sunsetGlow * 0.15,
      );
    }

    if (this.lightningFlash > 0) {
      _skyColor.lerp(new THREE.Color(0xe0f2fe), this.lightningFlash * 0.75);
    }

    (this.scene.background as THREE.Color).copy(_skyColor);
    _fogColor.copy(_skyColor);
    const fog = this.scene.fog as THREE.FogExp2;
    fog.color.copy(_fogColor);
    fog.density =
      weather === 'fog'
        ? 0.011
        : weather === 'heavy-rain' || weather === 'thunderstorm'
          ? 0.0055
          : weather === 'rain' || isSnow
            ? 0.0042
            : 0.0019;

    _sunColor.setHSL(0.1, THREE.MathUtils.clamp(0.45 - sunElev * 0.35, 0.08, 0.6), THREE.MathUtils.lerp(0.65, 0.97, dayRatio));
    this.sunLight.color.copy(_sunColor);
    this.sunLight.intensity =
      (isRain ? 0.72 * dayRatio : 0.22 + dayRatio * 2.25) + this.lightningFlash * 3.5;
    this.hemiLight.intensity = 0.34 + dayRatio * 0.68 + this.lightningFlash * 0.8;
    this.fillLight.intensity = 0.18 + dayRatio * 0.35;

    this.world.updateDayNight(nightFactor, isRain, isSnow, elapsed);
    return nightFactor;
  }

  private updateCamera(dt: number, elapsed: number) {
    if (this.touchInput.lookDeltaX !== 0 || this.touchInput.lookDeltaY !== 0) {
      this.camYaw -= this.touchInput.lookDeltaX * 0.005;
      this.camPitch = THREE.MathUtils.clamp(this.camPitch + this.touchInput.lookDeltaY * 0.004, 0.05, 0.95);
      this.touchInput.lookDeltaX = 0;
      this.touchInput.lookDeltaY = 0;
    }

    if (this.screen === 'title') {
      const angle = elapsed * 0.22;
      _v1.set(-3.8 + Math.sin(angle) * 7.2, 2.2 + Math.sin(elapsed * 0.3) * 0.35, 10 + Math.cos(angle) * 7.2);
      _v2.set(-3.8, 0.95, 10);
      this.camera.position.lerp(_v1, 1 - Math.exp(-3 * dt));
      this.camera.lookAt(_v2);
      return;
    }

    if (this.activeVehicle) {
      const v = this.activeVehicle;
      const speedKmh = Math.hypot(v.vx, v.vz) * 3.6;

      if (this.cameraMode === 'cockpit') {
        v.rig.cockpitCameraAnchor.getWorldPosition(_v1);
        const fwdX = Math.sin(v.heading);
        const fwdZ = Math.cos(v.heading);
        _v2.set(_v1.x + fwdX * 22, _v1.y - 0.15, _v1.z + fwdZ * 22);
        this.camera.position.copy(_v1);
        this.camera.lookAt(_v2);
        this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 72, 8, dt);
        this.camera.updateProjectionMatrix();
        return;
      }

      if (this.cameraMode === 'hood') {
        v.rig.hoodCameraAnchor.getWorldPosition(_v1);
        const fwdX = Math.sin(v.heading);
        const fwdZ = Math.cos(v.heading);
        _v2.set(_v1.x + fwdX * 26, _v1.y - 0.25, _v1.z + fwdZ * 26);
        this.camera.position.copy(_v1);
        this.camera.lookAt(_v2);
        this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 68 + Math.min(10, speedKmh / 25), 6, dt);
        this.camera.updateProjectionMatrix();
        return;
      }

      if (this.cameraMode === 'orbit') {
        const orbitYaw = this.camYaw + elapsed * 0.22;
        const dist = 7.4;
        _v1.set(
          v.x - Math.sin(v.heading + orbitYaw) * dist,
          2.6 + this.camPitch * 3.8,
          v.z - Math.cos(v.heading + orbitYaw) * dist,
        );
        _v2.set(v.x, 1.0, v.z);
        this.camCurrentPos.lerp(_v1, 1 - Math.exp(-8 * dt));
        this.camCurrentLook.lerp(_v2, 1 - Math.exp(-10 * dt));
        this.camera.position.copy(this.camCurrentPos);
        this.camera.lookAt(this.camCurrentLook);
        return;
      }

      if (!this.isDraggingLook) {
        this.camYaw = THREE.MathUtils.damp(this.camYaw, 0, 2.2, dt);
      }
      const chaseYaw = v.heading + this.camYaw;
      const dist = 6.4 + Math.min(1.8, speedKmh / 140);
      const height = 2.25 + this.camPitch * 2.3;

      _v1.set(v.x - Math.sin(chaseYaw) * dist, height, v.z - Math.cos(chaseYaw) * dist);
      _v2.set(v.x + Math.sin(v.heading) * 4.2, 1.1, v.z + Math.cos(v.heading) * 4.2);

      this.camCurrentPos.lerp(_v1, 1 - Math.exp(-10 * dt));
      this.camCurrentLook.lerp(_v2, 1 - Math.exp(-14 * dt));

      const targetFov = 62 + Math.min(15, speedKmh / 18);
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 6, dt);
      this.camera.updateProjectionMatrix();
    } else {
      const dist = this.inInterior ? 3.5 : 4.6;
      const height = 1.65 + this.camPitch * (this.inInterior ? 1.8 : 3.2);
      _v1.set(
        this.playerX - Math.sin(this.camYaw) * dist,
        this.playerY + height,
        this.playerZ - Math.cos(this.camYaw) * dist,
      );
      _v2.set(this.playerX, this.playerY + 1.35, this.playerZ);

      this.camCurrentPos.lerp(_v1, 1 - Math.exp(-11 * dt));
      this.camCurrentLook.lerp(_v2, 1 - Math.exp(-14 * dt));

      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 62, 8, dt);
      this.camera.updateProjectionMatrix();
    }

    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      _v3.set(
        (Math.random() - 0.5) * this.shakeIntensity,
        (Math.random() - 0.5) * this.shakeIntensity,
        (Math.random() - 0.5) * this.shakeIntensity,
      );
      this.camera.position.copy(this.camCurrentPos).add(_v3);
    } else {
      this.camera.position.copy(this.camCurrentPos);
    }
    this.camera.lookAt(this.camCurrentLook);
  }

  private pushHudSnapshot() {
    const v = this.activeVehicle;
    const focusCar = v || this.playerPrimaryVehicle;
    const speedKmh = v ? Math.round(Math.hypot(v.vx, v.vz) * 3.6) : Math.round(this.playerSpeed * 3.6);
    const nearCar = !v && !this.inInterior ? this.findNearestVehicle(5.2) : null;
    const nearGas = v ? this.findNearestGasStation(v.x, v.z) : null;
    const nearZone = this.inInterior ? null : this.findNearestInteractZone();

    let nearestLandmark: { name: string; distance: number } | null = null;
    let bestLmDist = Infinity;
    for (const lm of this.world.landmarks) {
      if (this.discoveredLandmarks.has(lm.id)) continue;
      const d = Math.round(Math.hypot(lm.x - this.playerX, lm.z - this.playerZ));
      if (d < bestLmDist) {
        bestLmDist = d;
        nearestLandmark = { name: lm.name, distance: d };
      }
    }

    let parkingAlignment = 0;
    let parkingStatus = '';
    if (this.mode === 'parking' && v) {
      const bay = this.world.parkingBays[this.parkingLevel];
      const dist = Math.hypot(v.x - bay.x, v.z - bay.z);
      parkingAlignment = Math.round(THREE.MathUtils.clamp(100 - dist * 8, 0, 100));
      parkingStatus = bay.title;
    }

    const minimapEntities: MiniMapEntity[] = [
      { x: this.playerX, z: this.playerZ, heading: this.playerHeading, type: 'player' },
    ];
    for (const car of this.vehicles) {
      if (car === this.activeVehicle) continue;
      minimapEntities.push({ x: car.x, z: car.z, heading: car.heading, type: 'car' });
    }
    for (const tc of this.traffic.getCarPositions()) {
      minimapEntities.push({
        x: tc.x,
        z: tc.z,
        heading: tc.heading,
        type: tc.role === 'police' ? 'police' : 'traffic',
      });
    }
    for (const gs of this.world.gasStations) {
      minimapEntities.push({ x: gs.x, z: gs.z, heading: 0, type: 'gas', label: 'Fuel' });
    }
    for (const own of this.ownedProperties) {
      const spec = PROPERTY_CATALOG.find((p) => p.id === own.id);
      if (spec) minimapEntities.push({ x: spec.x, z: spec.z, heading: 0, type: 'property' });
    }
    for (const peer of this.multiplayer.getPeerSnapshots()) {
      minimapEntities.push({ x: peer.x, z: peer.z, heading: peer.heading, type: 'remote' });
    }
    if (this.activeJob !== 'none') {
      minimapEntities.push({ x: this.jobTarget.x, z: this.jobTarget.z, heading: 0, type: 'target' });
    } else if (this.mode === 'exploration') {
      for (const lm of this.world.landmarks) {
        if (!this.discoveredLandmarks.has(lm.id)) {
          minimapEntities.push({ x: lm.x, z: lm.z, heading: 0, type: 'landmark' });
        }
      }
    } else if (this.mode === 'parking') {
      const bay = this.world.parkingBays[this.parkingLevel];
      minimapEntities.push({ x: bay.x, z: bay.z, heading: 0, type: 'target' });
    } else if (this.mode === 'challenges' && this.challengeActive) {
      const cp = this.world.challengeCheckpoints[this.challengeCheckpoint];
      minimapEntities.push({ x: cp.x, z: cp.z, heading: 0, type: 'target' });
    }

    const blinkOn = Math.floor(this.clock.elapsedTime * 2.2) % 2 === 0;
    const checkX = v ? v.x : this.playerX;
    const checkZ = v ? v.z : this.playerZ;
    const nearShowroom =
      !this.inInterior &&
      this.world.showroomPortals.some((p) => Math.hypot(checkX - p.x, checkZ - p.z) <= p.radius);

    this.onHudUpdate({
      screen: this.screen,
      inGarage: this.inGarage,
      inInterior: this.inInterior,
      interiorLabel: this.interiorLabel,
      interiorPropertyId: this.interiorPropertyId,
      inVehicle: !!v,
      engineRunning: this.inGarage ? this.garage.engineRunning : v ? v.engineRunning : false,
      activeVehicle: v ? v.spec : null,
      activeVehicleColor: focusCar.color,
      activeVehicleHealth: Math.round(focusCar.health),
      activeAssetSource: focusCar.rig.assetSource,
      speedKmh,
      rpm: v ? v.rpm : 0,
      gear: v ? v.gear : 'N',
      fuel: v ? Math.round(v.fuel) : 100,
      headlightsOn: this.inGarage ? this.garage.headlightsOn : v ? v.headlightsOn : false,
      indicatorMode: focusCar.indicatorMode,
      indicatorBlinkOn: blinkOn,
      doorsOpen: this.inGarage ? this.garage.doorsOpen : focusCar.doorsOpen,
      hoodOpen: this.inGarage ? this.garage.hoodOpen : focusCar.hoodOpen,
      isDrifting: v ? v.isDrifting : false,
      driftAngleDeg: v ? v.driftAngleDeg : 0,
      cameraMode: this.cameraMode,
      playerX: this.playerX,
      playerZ: this.playerZ,
      playerHeading: this.playerHeading,
      timeOfDay: this.settings.timeOfDay,
      weather: this.settings.weather,
      cash: Math.round(this.cash),
      bankBalance: Math.round(this.bankBalance),
      hunger: Math.round(this.hunger),
      energy: Math.round(this.energy),
      wantedLevel: this.wantedLevel,
      policeAlertStatus: this.policeAlertStatus,
      ownedVehicles: [...this.ownedVehicles],
      ownedProperties: [...this.ownedProperties],
      tunings: this.tunings,
      appearance: { ...this.appearance },
      inventory: [...this.inventory],
      transactions: [...this.transactions],
      activeJob: this.activeJob,
      jobStepLabel: this.jobStepLabel,
      jobPayout: this.jobPayout,
      nearVehicleName: nearCar ? `${nearCar.spec.brand} ${nearCar.spec.model}` : null,
      nearGasStation: nearGas,
      nearShowroom,
      nearInteractZone: nearZone,
      refueling: false,
      mode: this.mode,
      driftScore: this.driftScore,
      driftCombo: this.driftCombo,
      currentDriftPoints: Math.round(this.currentDriftPoints),
      bestDriftScore: this.bestDriftScore,
      parkingLevel: this.parkingLevel + 1,
      parkingTotalLevels: this.world.parkingBays.length,
      parkingAlignment,
      parkingStatus,
      discoveredLandmarks: Array.from(this.discoveredLandmarks),
      totalLandmarks: this.world.landmarks.length,
      nearestLandmark,
      challengeActive: this.challengeActive,
      challengeCheckpoint: this.challengeCheckpoint + 1,
      challengeTotalCheckpoints: this.world.challengeCheckpoints.length,
      challengeTime: Number(this.challengeTime.toFixed(1)),
      challengeBestTime: this.challengeBestTime,
      notification: this.notification,
      minimapEntities,
      garageState: this.garage.getSnapshotState(),
      multiplayer: this.multiplayer.getSnapshot(),
    });
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private startLoop() {
    const tick = () => {
      if (this.disposed) return;

      const rawDt = this.clock.getDelta();
      const dt = Math.min(rawDt, 0.05);
      const elapsed = this.clock.elapsedTime;

      if (this.inGarage) {
        this.garage.update(dt, elapsed);
        if (this.garage.engineRunning) {
          const spec = VEHICLE_CATALOG.find((c) => c.id === this.garage.selectedId) || VEHICLE_CATALOG[0];
          const revRpm = 900 + this.garage.revBoost * 5800;
          this.audio.updateDrivingAudio(true, revRpm, this.garage.revBoost, spec.enginePitchBase, spec.engineType, 0, false);
        }

        if (this.isSoftwareGl || !this.composer) {
          this.renderer.render(this.garage.scene, this.garage.camera);
        } else {
          this.composer.render();
        }
      } else {
        if (this.hitstopTimer > 0) {
          this.hitstopTimer -= dt;
        } else {
          if (this.settings.autoTimeCycle && this.screen === 'playing') {
            this.settings.timeOfDay = (this.settings.timeOfDay + dt / 18) % 24;
          }

          const nightFactor = this.applyAtmosphere(elapsed, dt);
          const isNight = nightFactor > 0.45;
          const w = this.settings.weather;
          const isRaining = w === 'rain' || w === 'heavy-rain' || w === 'thunderstorm';

          if (this.screen === 'playing') {
            if (!this.activeVehicle) {
              this.updatePlayerOnFoot(dt);
              this.audio.updateDrivingAudio(
                false,
                0,
                0,
                60,
                'i4',
                0,
                isRaining,
                w === 'heavy-rain' || w === 'thunderstorm' ? 0.1 : 0.05,
                this.wantedLevel > 0,
                elapsed,
              );
            }

            if (!this.inInterior) {
              for (const car of this.vehicles) {
                this.updateVehiclePhysics(car, dt, isNight, elapsed);
              }
              this.updateGameModes(dt);
              this.updatePoliceAndLifeSim(dt);
            }

            this.world.updateZoneVisibility(this.playerX, this.playerZ, this.settings.graphicsPreset);

            this.autoSaveTimer += dt;
            if (this.autoSaveTimer >= 20) {
              this.autoSaveTimer = 0;
              this.saveNow();
            }
          } else {
            this.playerPrimaryVehicle.rig.lod.update(this.camera);
          }

          if (!this.inInterior) {
            this.traffic.update(dt, this.playerX, this.playerZ, nightFactor, this.wantedLevel, elapsed);
            this.effects.update(dt, this.playerX, this.playerZ, w, elapsed);
          }

          const focusCar = this.activeVehicle || this.playerPrimaryVehicle;
          this.multiplayer.update(dt, {
            x: this.playerX,
            y: this.playerY,
            z: this.playerZ,
            heading: this.playerHeading,
            vx: this.activeVehicle ? this.activeVehicle.vx : 0,
            vz: this.activeVehicle ? this.activeVehicle.vz : 0,
            speedKmh: this.activeVehicle ? Math.round(Math.hypot(this.activeVehicle.vx, this.activeVehicle.vz) * 3.6) : 0,
            inVehicle: !!this.activeVehicle,
            vehicleId: focusCar.spec.id,
            vehicleColor: focusCar.color,
            headlightsOn: focusCar.headlightsOn,
            driftScore: this.bestDriftScore,
            wantedLevel: this.wantedLevel,
            skinColor: this.appearance.skinColor,
            jacketColor: this.appearance.jacketColor,
          });

          this.updateCamera(dt, elapsed);

          if (this.notificationTimer > 0) {
            this.notificationTimer -= dt;
            if (this.notificationTimer <= 0) this.notification = null;
          }

          this.hudTimer += dt;
          if (this.hudTimer >= 0.066) {
            this.hudTimer = 0;
            this.pushHudSnapshot();
          }
        }

        if (this.isSoftwareGl || !this.composer) {
          this.renderer.render(this.scene, this.camera);
        } else {
          this.composer.render();
        }
      }

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    this.frameId = requestAnimationFrame(tick);
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.multiplayer.disconnect();

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('orientationchange', this.handleOrientationResize);
    window.visualViewport?.removeEventListener('resize', this.handleResize);
    window.screen?.orientation?.removeEventListener('change', this.handleOrientationResize);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    for (const id of this.orientationTimers) {
      clearTimeout(id);
    }
    this.orientationTimers = [];
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.removeEventListener('wheel', this.handleWheel);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);

    this.audio.dispose();
    this.composer?.dispose();
    const disposeScene = (sc: THREE.Scene) => {
      sc.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => mat.dispose());
          } else {
            m.material?.dispose();
          }
        }
      });
    };
    disposeScene(this.scene);
    disposeScene(this.garage.scene);
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
