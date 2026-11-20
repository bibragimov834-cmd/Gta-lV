export type VehicleId =
  | 'bmw_m4'
  | 'bmw_m5'
  | 'cls_63'
  | 'g63_amg'
  | 'e63_amg'
  | 'chevy_cobalt'
  | 'chevy_gentra';

export type GameMode =
  | 'free-roam'
  | 'drift'
  | 'parking'
  | 'exploration'
  | 'challenges';

export type WeatherType =
  | 'sunny'
  | 'cloudy'
  | 'rain'
  | 'heavy-rain'
  | 'fog'
  | 'snow'
  | 'thunderstorm';

export type GraphicsPreset = 'low' | 'medium' | 'high' | 'ultra';

export type CameraMode = 'third-person' | 'cockpit' | 'hood' | 'orbit';

export type SpeedUnit = 'kmh' | 'mph';

export type TouchControlsMode = 'auto' | 'always' | 'off';

export type IndicatorMode = 'off' | 'left' | 'right' | 'hazard';

export type AssetSourceType = 'procedural-placeholder' | 'glb';

export type GarageCameraPreset = 'orbit' | 'closeup' | 'interior' | 'rear';

export type FrontBumperStyle = 'stock' | 'sport' | 'gt-aero';
export type RearBumperStyle = 'stock' | 'diffuser' | 'track';
export type SpoilerStyle = 'none' | 'lip' | 'gt-wing';
export type SideSkirtStyle = 'stock' | 'carbon';
export type ExhaustStyle = 'stock' | 'quad-ti' | 'side-exit';
export type GrilleStyle = 'stock' | 'blackout' | 'chrome';
export type MirrorStyle = 'paint' | 'carbon';
export type BodyKitStyle = 'oem' | 'widebody';
export type WheelDesignStyle = 'y-mesh' | '5-spoke' | 'deep-dish' | 'offroad';
export type TireCompound = 'street' | 'sport' | 'drift' | 'offroad';
export type HeadlightStyle = 'xenon' | 'laser-blue' | 'gt-yellow';

export interface VehicleTuningConfig {
  frontBumper: FrontBumperStyle;
  rearBumper: RearBumperStyle;
  spoiler: SpoilerStyle;
  sideSkirts: SideSkirtStyle;
  exhaust: ExhaustStyle;
  grille: GrilleStyle;
  mirrors: MirrorStyle;
  bodyKit: BodyKitStyle;
  windowTint: number; // 0 .. 0.85
  paintColor: string;
  licensePlate: string;
  wheelDesign: WheelDesignStyle;
  rimScale: number; // 0.92 | 1.0 | 1.08
  tireType: TireCompound;
  wheelColor: string;
  caliperColor: string;
  engineLv: 1 | 2 | 3;
  turboLv: 0 | 1 | 2;
  transLv: 1 | 2 | 3;
  suspLv: 1 | 2 | 3;
  brakeLv: 1 | 2 | 3;
  gripLv: 1 | 2 | 3;
  headlightStyle: HeadlightStyle;
  ledDrl: boolean;
  neonEnabled: boolean;
  neonColor: string;
}

export function createDefaultTuning(spec: VehicleSpec, colorOverride?: string): VehicleTuningConfig {
  return {
    frontBumper: 'stock',
    rearBumper: 'stock',
    spoiler: spec.horsepower >= 500 ? 'lip' : 'none',
    sideSkirts: 'stock',
    exhaust: spec.horsepower >= 500 ? 'quad-ti' : 'stock',
    grille: 'stock',
    mirrors: spec.horsepower >= 500 ? 'carbon' : 'paint',
    bodyKit: 'oem',
    windowTint: 0.35,
    paintColor: colorOverride || spec.defaultColor,
    licensePlate: 'APEX 001',
    wheelDesign: spec.bodyStyle === 'suv' ? '5-spoke' : 'y-mesh',
    rimScale: 1.0,
    tireType: spec.horsepower >= 500 ? 'sport' : 'street',
    wheelColor: '#d4d4d8',
    caliperColor: spec.caliperColor,
    engineLv: 1,
    turboLv: 0,
    transLv: 1,
    suspLv: 1,
    brakeLv: 1,
    gripLv: 1,
    headlightStyle: 'xenon',
    ledDrl: true,
    neonEnabled: false,
    neonColor: '#06b6d4',
  };
}

export interface EffectiveVehicleStats {
  horsepower: number;
  topSpeedKmh: number;
  accelForce: number;
  brakeForce: number;
  driftFactor: number;
  gripMultiplier: number;
  rideDrop: number;
}

export function getEffectiveVehicleStats(
  spec: VehicleSpec,
  tuning: VehicleTuningConfig,
): EffectiveVehicleStats {
  const hpMult = 1 + (tuning.engineLv - 1) * 0.14 + tuning.turboLv * 0.16;
  const horsepower = Math.round(spec.horsepower * hpMult);
  const topSpeedKmh = Math.round(
    spec.topSpeedKmh * (1 + (tuning.engineLv - 1) * 0.06 + tuning.turboLv * 0.07 + (tuning.transLv - 1) * 0.04),
  );
  const accelForce =
    spec.accelForce * (1 + (tuning.engineLv - 1) * 0.12 + tuning.turboLv * 0.14 + (tuning.transLv - 1) * 0.08);
  const brakeForce = spec.brakeForce * (1 + (tuning.brakeLv - 1) * 0.16);
  const tireDriftMod =
    tuning.tireType === 'drift' ? 0.14 : tuning.tireType === 'sport' ? -0.05 : tuning.tireType === 'offroad' ? -0.04 : 0;
  const driftFactor = Math.min(0.95, Math.max(0.2, spec.driftFactor + tireDriftMod));
  const gripMultiplier =
    (1 + (tuning.gripLv - 1) * 0.14) *
    (tuning.tireType === 'sport' ? 1.12 : tuning.tireType === 'drift' ? 0.84 : 1.0);
  const rideDrop = (tuning.suspLv - 1) * 0.025;
  return { horsepower, topSpeedKmh, accelForce, brakeForce, driftFactor, gripMultiplier, rideDrop };
}

export interface GarageSnapshotState {
  selectedId: VehicleId;
  color: string;
  cameraPreset: GarageCameraPreset;
  autoRotate: boolean;
  assetSource: AssetSourceType;
  glbLabel: string | null;
  tuning: VehicleTuningConfig;
}

export interface VehicleSpec {
  id: VehicleId;
  brand: string;
  model: string;
  category: 'Sports Coupe' | 'Performance Sedan' | '4-Door Coupe' | 'Luxury SUV' | 'City Sedan';
  price: number;
  usedPrice: number;
  horsepower: number;
  topSpeedKmh: number;
  accelForce: number;
  brakeForce: number;
  driftFactor: number;
  drivetrain: 'RWD' | 'AWD' | 'FWD';
  mass: number;
  width: number;
  length: number;
  bodyHeight: number;
  wheelRadius: number;
  wheelBase: number;
  trackWidth: number;
  rideHeight: number;
  defaultColor: string;
  palette: { name: string; hex: string }[];
  enginePitchBase: number;
  engineType: 'i6' | 'v8' | 'i4';
  zeroToHundred: string;
  bodyStyle: 'coupe' | 'sedan' | 'fastback' | 'suv' | 'compact';
  interiorLeather: string;
  caliperColor: string;
}

export const VEHICLE_CATALOG: VehicleSpec[] = [
  {
    id: 'bmw_m4',
    brand: 'BMW',
    model: 'M4 Competition G82',
    category: 'Sports Coupe',
    price: 84500,
    usedPrice: 67800,
    horsepower: 503,
    topSpeedKmh: 290,
    accelForce: 32,
    brakeForce: 48,
    driftFactor: 0.78,
    drivetrain: 'RWD',
    mass: 1725,
    width: 1.89,
    length: 4.79,
    bodyHeight: 1.38,
    wheelRadius: 0.355,
    wheelBase: 2.86,
    trackWidth: 1.64,
    rideHeight: 0.13,
    defaultColor: '#059669',
    palette: [
      { name: 'Isle of Man Green', hex: '#059669' },
      { name: 'Sao Paulo Yellow', hex: '#eab308' },
      { name: 'Toronto Red', hex: '#dc2626' },
      { name: 'Frozen Portimao Blue', hex: '#2563eb' },
      { name: 'Sapphire Black', hex: '#141417' },
      { name: 'Alpine White', hex: '#f4f4f5' },
    ],
    enginePitchBase: 62,
    engineType: 'i6',
    zeroToHundred: '3.8s',
    bodyStyle: 'coupe',
    interiorLeather: '#9a3412',
    caliperColor: '#dc2626',
  },
  {
    id: 'bmw_m5',
    brand: 'BMW',
    model: 'M5',
    category: 'Performance Sedan',
    price: 114000,
    usedPrice: 89500,
    horsepower: 627,
    topSpeedKmh: 305,
    accelForce: 36,
    brakeForce: 52,
    driftFactor: 0.65,
    drivetrain: 'AWD',
    mass: 1865,
    width: 1.91,
    length: 4.98,
    bodyHeight: 1.45,
    wheelRadius: 0.365,
    wheelBase: 2.98,
    trackWidth: 1.66,
    rideHeight: 0.14,
    defaultColor: '#1e3a8a',
    palette: [
      { name: 'Marina Bay Blue', hex: '#1d4ed8' },
      { name: 'Frozen Brands Hatch', hex: '#52525b' },
      { name: 'Motegi Red', hex: '#b91c1c' },
      { name: 'Frozen Deep Green', hex: '#14532d' },
      { name: 'Black Sapphire', hex: '#111827' },
      { name: 'Alpinweiss', hex: '#e4e4e7' },
    ],
    enginePitchBase: 52,
    engineType: 'v8',
    zeroToHundred: '3.0s',
    bodyStyle: 'sedan',
    interiorLeather: '#1c1917',
    caliperColor: '#eab308',
  },
  {
    id: 'cls_63',
    brand: 'Mercedes-Benz',
    model: 'CLS 63 AMG',
    category: '4-Door Coupe',
    price: 108000,
    usedPrice: 82000,
    horsepower: 577,
    topSpeedKmh: 300,
    accelForce: 34,
    brakeForce: 50,
    driftFactor: 0.72,
    drivetrain: 'AWD',
    mass: 1920,
    width: 1.89,
    length: 4.96,
    bodyHeight: 1.41,
    wheelRadius: 0.365,
    wheelBase: 2.92,
    trackWidth: 1.64,
    rideHeight: 0.135,
    defaultColor: '#18181b',
    palette: [
      { name: 'Obsidian Black', hex: '#18181b' },
      { name: 'Designo Diamond White', hex: '#f4f4f5' },
      { name: 'Selenite Grey', hex: '#64748b' },
      { name: 'Hyacinth Red', hex: '#991b1b' },
      { name: 'Cavansite Blue', hex: '#1e40af' },
      { name: 'Iridium Silver', hex: '#cbd5e1' },
    ],
    enginePitchBase: 48,
    engineType: 'v8',
    zeroToHundred: '3.6s',
    bodyStyle: 'fastback',
    interiorLeather: '#7c2d12',
    caliperColor: '#dc2626',
  },
  {
    id: 'g63_amg',
    brand: 'Mercedes-Benz',
    model: 'G63 AMG',
    category: 'Luxury SUV',
    price: 185000,
    usedPrice: 149000,
    horsepower: 577,
    topSpeedKmh: 240,
    accelForce: 31,
    brakeForce: 45,
    driftFactor: 0.52,
    drivetrain: 'AWD',
    mass: 2485,
    width: 1.98,
    length: 4.87,
    bodyHeight: 1.96,
    wheelRadius: 0.43,
    wheelBase: 2.89,
    trackWidth: 1.70,
    rideHeight: 0.27,
    defaultColor: '#27272a',
    palette: [
      { name: 'Night Magno Matte', hex: '#27272a' },
      { name: 'Polar White', hex: '#f8fafc' },
      { name: 'Emerald Green', hex: '#064e3b' },
      { name: 'China Blue', hex: '#38bdf8' },
      { name: 'Jupiter Red', hex: '#dc2626' },
      { name: 'Desert Gold', hex: '#ca8a04' },
    ],
    enginePitchBase: 45,
    engineType: 'v8',
    zeroToHundred: '4.5s',
    bodyStyle: 'suv',
    interiorLeather: '#991b1b',
    caliperColor: '#dc2626',
  },
  {
    id: 'e63_amg',
    brand: 'Mercedes-Benz',
    model: 'E63 S AMG',
    category: 'Performance Sedan',
    price: 118000,
    usedPrice: 92500,
    horsepower: 603,
    topSpeedKmh: 300,
    accelForce: 35,
    brakeForce: 52,
    driftFactor: 0.74,
    drivetrain: 'AWD',
    mass: 1935,
    width: 1.90,
    length: 4.95,
    bodyHeight: 1.45,
    wheelRadius: 0.365,
    wheelBase: 2.94,
    trackWidth: 1.65,
    rideHeight: 0.135,
    defaultColor: '#52525b',
    palette: [
      { name: 'Graphite Grey Magno', hex: '#52525b' },
      { name: 'Obsidian Black', hex: '#18181b' },
      { name: 'Polar White', hex: '#f4f4f5' },
      { name: 'Brilliant Blue', hex: '#2563eb' },
      { name: 'Cardinal Red', hex: '#b91c1c' },
      { name: 'High-Tech Silver', hex: '#94a3b8' },
    ],
    enginePitchBase: 49,
    engineType: 'v8',
    zeroToHundred: '3.3s',
    bodyStyle: 'sedan',
    interiorLeather: '#292524',
    caliperColor: '#dc2626',
  },
  {
    id: 'chevy_cobalt',
    brand: 'Chevrolet',
    model: 'Cobalt LTZ',
    category: 'City Sedan',
    price: 14500,
    usedPrice: 8900,
    horsepower: 106,
    topSpeedKmh: 185,
    accelForce: 19,
    brakeForce: 36,
    driftFactor: 0.35,
    drivetrain: 'FWD',
    mass: 1185,
    width: 1.76,
    length: 4.48,
    bodyHeight: 1.50,
    wheelRadius: 0.325,
    wheelBase: 2.62,
    trackWidth: 1.52,
    rideHeight: 0.16,
    defaultColor: '#e4e4e7',
    palette: [
      { name: 'Summit White', hex: '#f4f4f5' },
      { name: 'Switchblade Silver', hex: '#94a3b8' },
      { name: 'Dark Moon Blue', hex: '#1e3a8a' },
      { name: 'Satin Steel', hex: '#52525b' },
      { name: 'Carbon Flash', hex: '#18181b' },
      { name: 'Pull Me Over Red', hex: '#dc2626' },
    ],
    enginePitchBase: 76,
    engineType: 'i4',
    zeroToHundred: '11.4s',
    bodyStyle: 'compact',
    interiorLeather: '#3f3f46',
    caliperColor: '#71717a',
  },
  {
    id: 'chevy_gentra',
    brand: 'Chevrolet',
    model: 'Gentra CDX',
    category: 'City Sedan',
    price: 16200,
    usedPrice: 9800,
    horsepower: 107,
    topSpeedKmh: 190,
    accelForce: 20,
    brakeForce: 37,
    driftFactor: 0.38,
    drivetrain: 'FWD',
    mass: 1215,
    width: 1.77,
    length: 4.52,
    bodyHeight: 1.45,
    wheelRadius: 0.325,
    wheelBase: 2.60,
    trackWidth: 1.53,
    rideHeight: 0.15,
    defaultColor: '#18181b',
    palette: [
      { name: 'Black Pearl', hex: '#18181b' },
      { name: 'Pure White', hex: '#f4f4f5' },
      { name: 'Sterling Silver', hex: '#a1a1aa' },
      { name: 'Velvet Burgundy', hex: '#7f1d1d' },
      { name: 'Midnight Blue', hex: '#1e293b' },
      { name: 'Champagne Gold', hex: '#a16207' },
    ],
    enginePitchBase: 74,
    engineType: 'i4',
    zeroToHundred: '11.2s',
    bodyStyle: 'sedan',
    interiorLeather: '#57534e',
    caliperColor: '#71717a',
  },
];

// --- Properties & Real Estate ---
export type PropertyCategory = 'Apartment' | 'Suburban House' | 'Luxury Villa';
export type FurnitureTheme = 'modern-dark' | 'warm-oak' | 'minimal-white';

export interface PropertySpec {
  id: string;
  name: string;
  category: PropertyCategory;
  district: string;
  price: number;
  dailyIncome: number;
  garageSlots: number;
  x: number;
  z: number;
  description: string;
}

export interface OwnedPropertyState {
  id: string;
  furnitureTheme: FurnitureTheme;
  accentLight: string;
  parkedVehicleId: VehicleId | null;
}

export const PROPERTY_CATALOG: PropertySpec[] = [
  {
    id: 'prop_midtown_loft',
    name: 'Midtown Skyline Apartment',
    category: 'Apartment',
    district: 'Retail Quarter',
    price: 55000,
    dailyIncome: 380,
    garageSlots: 1,
    x: 40,
    z: 120,
    description: 'Modern glass corner apartment near Grand Horizon Mall with underground bay.',
  },
  {
    id: 'prop_maple_house',
    name: 'Maple Street Residence',
    category: 'Suburban House',
    district: 'Oakwood Suburbs',
    price: 120000,
    dailyIncome: 680,
    garageSlots: 2,
    x: -120,
    z: -200,
    description: 'Warm two-story family home with private driveway, lawn, and 2-car garage.',
  },
  {
    id: 'prop_pine_house',
    name: 'Pinecrest Contemporary House',
    category: 'Suburban House',
    district: 'South Suburbs',
    price: 165000,
    dailyIncome: 920,
    garageSlots: 2,
    x: 120,
    z: 200,
    description: 'Architectural suburban home close to the airport highway and green park.',
  },
  {
    id: 'prop_harbor_penthouse',
    name: 'Harbor Marina Penthouse',
    category: 'Apartment',
    district: 'East Coastline',
    price: 235000,
    dailyIncome: 1350,
    garageSlots: 2,
    x: 200,
    z: -40,
    description: 'Waterfront penthouse overlooking the harbor pier with private valet garage.',
  },
  {
    id: 'prop_sunset_villa',
    name: 'Sunset Ridge Luxury Villa',
    category: 'Luxury Villa',
    district: 'Hillside Estates',
    price: 410000,
    dailyIncome: 2250,
    garageSlots: 3,
    x: 200,
    z: -200,
    description: 'Cantilevered glass villa with infinity pool, terrace lounge, and 3-car bay.',
  },
  {
    id: 'prop_crest_mansion',
    name: 'Beverly Crest Manor Villa',
    category: 'Luxury Villa',
    district: 'Mountain Overlook',
    price: 680000,
    dailyIncome: 3800,
    garageSlots: 4,
    x: -200,
    z: -200,
    description: 'Flagship gated hillside estate with panoramic city views and 4-car collector gallery.',
  },
];

// --- Life Simulation, Character & Inventory ---
export interface CharacterAppearance {
  name: string;
  skinColor: string;
  jacketColor: string;
  pantsColor: string;
  hairColor: string;
  hairStyle: 'short' | 'fade' | 'cap';
  glasses: boolean;
}

export const DEFAULT_APPEARANCE: CharacterAppearance = {
  name: 'Alex Mercer',
  skinColor: '#e0ac8b',
  jacketColor: '#2563eb',
  pantsColor: '#1e293b',
  hairColor: '#18181b',
  hairStyle: 'short',
  glasses: true,
};

export interface FoodItemSpec {
  id: string;
  name: string;
  price: number;
  hungerRestore: number;
  energyRestore: number;
  category: 'meal' | 'drink' | 'utility';
}

export const SHOP_FOOD_MENU: FoodItemSpec[] = [
  { id: 'espresso', name: 'Double Espresso', price: 6, hungerRestore: 5, energyRestore: 28, category: 'drink' },
  { id: 'energy_can', name: 'Apex Volt Energy', price: 9, hungerRestore: 8, energyRestore: 45, category: 'drink' },
  { id: 'burger', name: 'Gourmet Wagyu Burger', price: 24, hungerRestore: 42, energyRestore: 18, category: 'meal' },
  { id: 'steak', name: 'Ribeye Bistro Platter', price: 58, hungerRestore: 75, energyRestore: 35, category: 'meal' },
  { id: 'repair_kit', name: 'Pro Roadside Repair Kit', price: 180, hungerRestore: 0, energyRestore: 0, category: 'utility' },
];

export interface InventoryItem {
  id: string;
  name: string;
  qty: number;
  category: 'meal' | 'drink' | 'utility';
}

export interface TransactionRecord {
  id: string;
  label: string;
  amount: number; // + or -
  account: 'cash' | 'bank';
  timestamp: string;
}

// --- Jobs & Missions ---
export type JobType = 'none' | 'taxi' | 'delivery' | 'mechanic' | 'dealer' | 'parking' | 'courier';

export interface JobSpec {
  id: Exclude<JobType, 'none'>;
  title: string;
  payRange: string;
  basePay: number;
  description: string;
  vehicleRequired: boolean;
}

export const JOB_CATALOG: JobSpec[] = [
  {
    id: 'taxi',
    title: 'Executive Taxi Driver',
    payRange: '$450 - $900',
    basePay: 550,
    description: 'Pick up passengers downtown and deliver them across districts smoothly.',
    vehicleRequired: true,
  },
  {
    id: 'delivery',
    title: 'City Express Delivery',
    payRange: '$400 - $820',
    basePay: 480,
    description: 'Transport cargo parcels from the Shopping Mall to Harbor & Suburbs.',
    vehicleRequired: true,
  },
  {
    id: 'mechanic',
    title: 'Mobile Pit Mechanic',
    payRange: '$520 - $950',
    basePay: 620,
    description: 'Reach stranded service points and perform rapid diagnostics & tune-ups.',
    vehicleRequired: false,
  },
  {
    id: 'dealer',
    title: 'Luxury Car Concierge',
    payRange: '$700 - $1,250',
    basePay: 850,
    description: 'Deliver high-end showroom vehicles safely between dealerships and villas.',
    vehicleRequired: true,
  },
  {
    id: 'parking',
    title: 'VIP Valet Attendant',
    payRange: '$360 - $700',
    basePay: 420,
    description: 'Precision park client vehicles inside tight hotel and mall parking bays.',
    vehicleRequired: true,
  },
  {
    id: 'courier',
    title: 'Airport Runway Courier',
    payRange: '$600 - $1,100',
    basePay: 720,
    description: 'Rush priority parcels to the Metro International Airport terminal.',
    vehicleRequired: false,
  },
];

// --- World Interactive Zones & NPCs ---
export type InteractZoneKind =
  | 'showroom'
  | 'dealership_new'
  | 'dealership_used'
  | 'restaurant'
  | 'clothing'
  | 'barber'
  | 'police_station'
  | 'property'
  | 'npc';

export interface WorldInteractZone {
  id: string;
  kind: InteractZoneKind;
  name: string;
  subtitle: string;
  x: number;
  z: number;
  radius: number;
  propertyId?: string;
  npcDialogue?: string[];
}

export interface RoomSummary {
  id: string;
  name: string;
  mode: string;
  maxPlayers: number;
  playerCount: number;
}

export interface RemotePeerSnapshot {
  id: string;
  name: string;
  roomId: string;
  x: number;
  y: number;
  z: number;
  heading: number;
  speedKmh: number;
  inVehicle: boolean;
  vehicleId: string;
  vehicleColor: string;
  driftScore: number;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  name: string;
  text: string;
  ts: number;
}

export interface MultiplayerSnapshot {
  connected: boolean;
  connecting: boolean;
  playerId: string;
  roomId: string;
  rooms: RoomSummary[];
  peers: RemotePeerSnapshot[];
  chat: ChatMessage[];
  friends: string[];
  pingMs: number;
}

export interface GameSettings {
  graphicsPreset: GraphicsPreset;
  shadows: boolean;
  reflections: boolean;
  trafficDensity: 'low' | 'medium' | 'high';
  weather: WeatherType;
  timeOfDay: number;
  autoTimeCycle: boolean;
  volume: number;
  muted: boolean;
  steeringSensitivity: number;
  units: SpeedUnit;
  touchControls: TouchControlsMode;
}

export interface LandmarkInfo {
  id: string;
  name: string;
  district: string;
  x: number;
  z: number;
  radius: number;
}

export interface GasStationInfo {
  id: string;
  name: string;
  x: number;
  z: number;
  radius: number;
}

export interface MiniMapEntity {
  x: number;
  z: number;
  heading: number;
  type: 'player' | 'car' | 'traffic' | 'police' | 'gas' | 'landmark' | 'target' | 'property' | 'remote';
  label?: string;
}

export interface SaveGameData {
  version: number;
  savedAt: number;
  playerX: number;
  playerZ: number;
  playerHeading: number;
  cash: number;
  bankBalance: number;
  hunger: number;
  energy: number;
  ownedVehicles: VehicleId[];
  activeVehicleId: VehicleId;
  tunings: Partial<Record<VehicleId, VehicleTuningConfig>>;
  ownedProperties: OwnedPropertyState[];
  appearance: CharacterAppearance;
  inventory: InventoryItem[];
  transactions: TransactionRecord[];
  discoveredLandmarks: string[];
  bestDriftScore: number;
  challengeBestTime: number | null;
  timeOfDay: number;
  weather: WeatherType;
  friends: string[];
}

export interface HudSnapshot {
  screen: 'title' | 'playing';
  inGarage: boolean;
  inInterior: boolean;
  interiorLabel: string | null;
  interiorPropertyId: string | null;
  inVehicle: boolean;
  engineRunning: boolean;
  activeVehicle: VehicleSpec | null;
  activeVehicleColor: string;
  activeVehicleHealth: number;
  activeAssetSource: AssetSourceType;
  speedKmh: number;
  rpm: number;
  gear: string;
  fuel: number;
  headlightsOn: boolean;
  indicatorMode: IndicatorMode;
  indicatorBlinkOn: boolean;
  doorsOpen: boolean;
  hoodOpen: boolean;
  isDrifting: boolean;
  driftAngleDeg: number;
  cameraMode: CameraMode;
  playerX: number;
  playerZ: number;
  playerHeading: number;
  timeOfDay: number;
  weather: WeatherType;
  cash: number;
  bankBalance: number;
  hunger: number;
  energy: number;
  wantedLevel: number;
  policeAlertStatus: string | null;
  ownedVehicles: VehicleId[];
  ownedProperties: OwnedPropertyState[];
  tunings: Record<VehicleId, VehicleTuningConfig>;
  appearance: CharacterAppearance;
  inventory: InventoryItem[];
  transactions: TransactionRecord[];
  activeJob: JobType;
  jobStepLabel: string | null;
  jobPayout: number;
  nearVehicleName: string | null;
  nearGasStation: GasStationInfo | null;
  nearShowroom: boolean;
  nearInteractZone: WorldInteractZone | null;
  refueling: boolean;
  mode: GameMode;
  driftScore: number;
  driftCombo: number;
  currentDriftPoints: number;
  bestDriftScore: number;
  parkingLevel: number;
  parkingTotalLevels: number;
  parkingAlignment: number;
  parkingStatus: string;
  discoveredLandmarks: string[];
  totalLandmarks: number;
  nearestLandmark: { name: string; distance: number } | null;
  challengeActive: boolean;
  challengeCheckpoint: number;
  challengeTotalCheckpoints: number;
  challengeTime: number;
  challengeBestTime: number | null;
  notification: string | null;
  minimapEntities: MiniMapEntity[];
  garageState: GarageSnapshotState;
  multiplayer: MultiplayerSnapshot;
}
