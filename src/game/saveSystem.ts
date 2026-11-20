import {
  DEFAULT_APPEARANCE,
  SaveGameData,
  VEHICLE_CATALOG,
  VehicleId,
  VehicleTuningConfig,
  WeatherType,
  createDefaultTuning,
} from './types';

const SAVE_KEY = 'apex_horizon_ultimate_save_v1';
const PLAYER_ID_KEY = 'apex_horizon_player_id';

export function getOrCreatePlayerId(): string {
  try {
    let id = localStorage.getItem(PLAYER_ID_KEY);
    if (!id) {
      id = `drv_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(PLAYER_ID_KEY, id);
    }
    return id;
  } catch {
    return 'drv_local';
  }
}

export function normalizeWeather(w: string | undefined): WeatherType {
  if (w === 'clear') return 'sunny';
  if (w === 'overcast') return 'cloudy';
  if (
    w === 'sunny' ||
    w === 'cloudy' ||
    w === 'rain' ||
    w === 'heavy-rain' ||
    w === 'fog' ||
    w === 'snow' ||
    w === 'thunderstorm'
  ) {
    return w;
  }
  return 'sunny';
}

export function buildDefaultTuningsMap(): Record<VehicleId, VehicleTuningConfig> {
  const map = {} as Record<VehicleId, VehicleTuningConfig>;
  for (const spec of VEHICLE_CATALOG) {
    map[spec.id] = createDefaultTuning(spec);
  }
  return map;
}

export function createInitialSaveData(): SaveGameData {
  return {
    version: 1,
    savedAt: Date.now(),
    playerX: 3.5,
    playerZ: 6,
    playerHeading: 0,
    cash: 25000,
    bankBalance: 45000,
    hunger: 92,
    energy: 95,
    ownedVehicles: ['bmw_m4', 'chevy_cobalt'],
    activeVehicleId: 'bmw_m4',
    tunings: {},
    ownedProperties: [],
    appearance: { ...DEFAULT_APPEARANCE },
    inventory: [
      { id: 'espresso', name: 'Double Espresso', qty: 2, category: 'drink' },
      { id: 'repair_kit', name: 'Pro Roadside Repair Kit', qty: 1, category: 'utility' },
    ],
    transactions: [
      {
        id: 'tx_init',
        label: 'Horizon Welcome Signing Bonus',
        amount: 45000,
        account: 'bank',
        timestamp: 'Day 1 · 08:00',
      },
    ],
    discoveredLandmarks: [],
    bestDriftScore: 0,
    challengeBestTime: null,
    timeOfDay: 14.5,
    weather: 'sunny',
    friends: ['Marco_AMG', 'Elena_M4'],
  };
}

export function hasSavedGame(): boolean {
  try {
    return !!localStorage.getItem(SAVE_KEY);
  } catch {
    return false;
  }
}

export function loadLocalSave(): SaveGameData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SaveGameData>;
    const defaults = createInitialSaveData();
    return {
      ...defaults,
      ...parsed,
      weather: normalizeWeather(parsed.weather),
      appearance: { ...defaults.appearance, ...(parsed.appearance || {}) },
      ownedVehicles:
        Array.isArray(parsed.ownedVehicles) && parsed.ownedVehicles.length > 0
          ? parsed.ownedVehicles
          : defaults.ownedVehicles,
      ownedProperties: Array.isArray(parsed.ownedProperties) ? parsed.ownedProperties : [],
      inventory: Array.isArray(parsed.inventory) ? parsed.inventory : defaults.inventory,
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : defaults.transactions,
      friends: Array.isArray(parsed.friends) ? parsed.friends : defaults.friends,
    };
  } catch {
    return null;
  }
}

export function writeLocalSave(data: SaveGameData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch {
    // storage quota ignored
  }
}

export async function syncSaveToServer(data: SaveGameData): Promise<void> {
  const playerId = getOrCreatePlayerId();
  try {
    await fetch(`/api/save/${encodeURIComponent(playerId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch {
    // offline or unavailable; local save already preserved
  }
}
