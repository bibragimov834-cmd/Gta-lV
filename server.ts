import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocket, WebSocketServer } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const SAVE_DIR = path.resolve('/tmp', 'apex-horizon-saves');
if (!fs.existsSync(SAVE_DIR)) {
  fs.mkdirSync(SAVE_DIR, { recursive: true });
}

interface RemotePlayerRecord {
  id: string;
  name: string;
  roomId: string;
  x: number;
  y: number;
  z: number;
  heading: number;
  vx: number;
  vz: number;
  speedKmh: number;
  inVehicle: boolean;
  vehicleId: string;
  vehicleColor: string;
  headlightsOn: boolean;
  driftScore: number;
  wantedLevel: number;
  skinColor: string;
  jacketColor: string;
  lastUpdateMs: number;
  ws: WebSocket;
}

const DEFAULT_ROOMS = [
  { id: 'public-city', name: 'Metro Open City', mode: 'Open Exploration', maxPlayers: 32 },
  { id: 'car-meet', name: 'Harbor Concours Car Meet', mode: 'Car Meet & Show', maxPlayers: 24 },
  { id: 'drift-arena', name: 'Airport Drift & Sprint', mode: 'Online Drift Comp', maxPlayers: 16 },
];

const players = new Map<string, RemotePlayerRecord>();
const customRooms = new Map<string, { id: string; name: string; mode: string; maxPlayers: number }>();

function sanitizeId(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') return fallback;
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
  return cleaned || fallback;
}

function sanitizeName(raw: unknown): string {
  if (typeof raw !== 'string') return 'Driver';
  const cleaned = raw.replace(/[<>]/g, '').trim().slice(0, 20);
  return cleaned || 'Driver';
}

function clampWorld(n: unknown, min: number, max: number): number {
  const num = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return Math.max(min, Math.min(max, num));
}

function serializePlayer(p: RemotePlayerRecord) {
  return {
    id: p.id,
    name: p.name,
    roomId: p.roomId,
    x: Number(p.x.toFixed(2)),
    y: Number(p.y.toFixed(2)),
    z: Number(p.z.toFixed(2)),
    heading: Number(p.heading.toFixed(3)),
    vx: Number(p.vx.toFixed(2)),
    vz: Number(p.vz.toFixed(2)),
    speedKmh: Math.round(p.speedKmh),
    inVehicle: p.inVehicle,
    vehicleId: p.vehicleId,
    vehicleColor: p.vehicleColor,
    headlightsOn: p.headlightsOn,
    driftScore: p.driftScore,
    wantedLevel: p.wantedLevel,
    skinColor: p.skinColor,
    jacketColor: p.jacketColor,
  };
}

function broadcastRoom(roomId: string, payload: unknown, excludeId?: string) {
  const json = JSON.stringify(payload);
  for (const p of players.values()) {
    if (p.roomId === roomId && p.id !== excludeId && p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(json);
    }
  }
}

function getRoomListSummary() {
  const counts = new Map<string, number>();
  for (const p of players.values()) {
    counts.set(p.roomId, (counts.get(p.roomId) || 0) + 1);
  }
  const allRooms = [...DEFAULT_ROOMS, ...Array.from(customRooms.values())];
  return allRooms.map((r) => ({
    ...r,
    playerCount: counts.get(r.id) || 0,
  }));
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Health & Live Room Directory API
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      onlinePlayers: players.size,
      rooms: getRoomListSummary(),
    });
  });

  app.get('/api/rooms', (_req, res) => {
    res.json({ rooms: getRoomListSummary() });
  });

  // Server-backed Savegame Endpoints
  app.get('/api/save/:playerId', (req, res) => {
    const pid = sanitizeId(req.params.playerId, 'default');
    const file = path.join(SAVE_DIR, `${pid}.json`);
    if (!fs.existsSync(file)) {
      res.status(404).json({ error: 'No save found' });
      return;
    }
    try {
      const raw = fs.readFileSync(file, 'utf8');
      res.json(JSON.parse(raw));
    } catch {
      res.status(500).json({ error: 'Failed to read save' });
    }
  });

  app.post('/api/save/:playerId', (req, res) => {
    const pid = sanitizeId(req.params.playerId, 'default');
    const file = path.join(SAVE_DIR, `${pid}.json`);
    try {
      if (!req.body || typeof req.body !== 'object') {
        res.status(400).json({ error: 'Invalid save payload' });
        return;
      }
      fs.writeFileSync(file, JSON.stringify(req.body), 'utf8');
      res.json({ ok: true, savedAt: Date.now() });
    } catch {
      res.status(500).json({ error: 'Failed to write save' });
    }
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    let playerId = `drv_${Math.random().toString(36).slice(2, 8)}`;

    const safeSend = (data: unknown) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    };

    ws.on('message', (raw) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(raw.toString()) as Record<string, unknown>;
      } catch {
        return;
      }

      const type = msg.type;

      if (type === 'join') {
        playerId = sanitizeId(msg.playerId, playerId);
        const roomId = sanitizeId(msg.roomId, 'public-city');
        const roomName = sanitizeName(msg.roomName || `Private ${roomId}`);

        if (!DEFAULT_ROOMS.some((r) => r.id === roomId) && !customRooms.has(roomId)) {
          customRooms.set(roomId, {
            id: roomId,
            name: roomName,
            mode: 'Private Room',
            maxPlayers: 16,
          });
        }

        const now = Date.now();
        const prev = players.get(playerId);
        const oldRoom = prev?.roomId;

        const record: RemotePlayerRecord = {
          id: playerId,
          name: sanitizeName(msg.name),
          roomId,
          x: clampWorld(msg.x, -420, 420),
          y: clampWorld(msg.y, -20, 120),
          z: clampWorld(msg.z, -420, 420),
          heading: clampWorld(msg.heading, -Math.PI * 4, Math.PI * 4),
          vx: 0,
          vz: 0,
          speedKmh: 0,
          inVehicle: Boolean(msg.inVehicle),
          vehicleId: sanitizeId(msg.vehicleId, 'bmw_m4'),
          vehicleColor: typeof msg.vehicleColor === 'string' ? msg.vehicleColor.slice(0, 16) : '#059669',
          headlightsOn: Boolean(msg.headlightsOn),
          driftScore: Math.max(0, Math.min(10_000_000, Number(msg.driftScore) || 0)),
          wantedLevel: Math.max(0, Math.min(5, Number(msg.wantedLevel) || 0)),
          skinColor: typeof msg.skinColor === 'string' ? msg.skinColor.slice(0, 16) : '#e0ac8b',
          jacketColor: typeof msg.jacketColor === 'string' ? msg.jacketColor.slice(0, 16) : '#2563eb',
          lastUpdateMs: now,
          ws,
        };

        players.set(playerId, record);

        if (oldRoom && oldRoom !== roomId) {
          broadcastRoom(oldRoom, { type: 'player:left', playerId }, playerId);
        }

        safeSend({
          type: 'welcome',
          playerId,
          roomId,
          rooms: getRoomListSummary(),
          peers: Array.from(players.values())
            .filter((p) => p.roomId === roomId && p.id !== playerId)
            .map(serializePlayer),
        });

        broadcastRoom(
          roomId,
          { type: 'player:joined', player: serializePlayer(record) },
          playerId,
        );
      } else if (type === 'state') {
        const p = players.get(playerId);
        if (!p) return;

        const now = Date.now();
        const dtSec = Math.max(0.016, (now - p.lastUpdateMs) / 1000);
        const nextX = clampWorld(msg.x, -420, 420);
        const nextY = clampWorld(msg.y, -20, 120);
        const nextZ = clampWorld(msg.z, -420, 420);

        // Server-side speed & anti-cheat validation (max 125 m/s = 450 km/h tolerance)
        const dist = Math.hypot(nextX - p.x, nextZ - p.z);
        const impliedSpeed = dist / dtSec;
        if (impliedSpeed <= 135 || dist < 12) {
          p.x = nextX;
          p.y = nextY;
          p.z = nextZ;
        } else {
          // Teleport/speedhack guard: cap single-step displacement cleanly
          const scale = (115 * dtSec) / Math.max(0.001, dist);
          p.x += (nextX - p.x) * scale;
          p.z += (nextZ - p.z) * scale;
          p.y = nextY;
        }

        p.heading = clampWorld(msg.heading, -Math.PI * 4, Math.PI * 4);
        p.vx = clampWorld(msg.vx, -110, 110);
        p.vz = clampWorld(msg.vz, -110, 110);
        p.speedKmh = clampWorld(msg.speedKmh, 0, 420);
        p.inVehicle = Boolean(msg.inVehicle);
        p.vehicleId = sanitizeId(msg.vehicleId, p.vehicleId);
        if (typeof msg.vehicleColor === 'string') p.vehicleColor = msg.vehicleColor.slice(0, 16);
        p.headlightsOn = Boolean(msg.headlightsOn);
        p.driftScore = Math.max(0, Math.min(10_000_000, Number(msg.driftScore) || p.driftScore));
        p.wantedLevel = Math.max(0, Math.min(5, Number(msg.wantedLevel) || 0));
        if (typeof msg.skinColor === 'string') p.skinColor = msg.skinColor.slice(0, 16);
        if (typeof msg.jacketColor === 'string') p.jacketColor = msg.jacketColor.slice(0, 16);
        p.lastUpdateMs = now;
      } else if (type === 'chat') {
        const p = players.get(playerId);
        if (!p) return;
        const text = typeof msg.text === 'string' ? msg.text.replace(/[<>]/g, '').trim().slice(0, 120) : '';
        if (!text) return;
        broadcastRoom(p.roomId, {
          type: 'chat',
          playerId: p.id,
          name: p.name,
          text,
          ts: Date.now(),
        });
      } else if (type === 'ping') {
        safeSend({ type: 'pong', ts: msg.ts });
      }
    });

    ws.on('close', () => {
      const p = players.get(playerId);
      if (p) {
        players.delete(playerId);
        broadcastRoom(p.roomId, { type: 'player:left', playerId });
        if (p.roomId.startsWith('priv_')) {
          const stillOccupied = Array.from(players.values()).some((x) => x.roomId === p.roomId);
          if (!stillOccupied) customRooms.delete(p.roomId);
        }
      }
    });
  });

  // Server-authoritative 20Hz state broadcast loop per room
  setInterval(() => {
    if (players.size === 0) return;
    const byRoom = new Map<string, ReturnType<typeof serializePlayer>[]>();
    for (const p of players.values()) {
      const arr = byRoom.get(p.roomId) || [];
      arr.push(serializePlayer(p));
      byRoom.set(p.roomId, arr);
    }

    const roomList = getRoomListSummary();
    for (const [roomId, roomPeers] of byRoom.entries()) {
      const msg = JSON.stringify({
        type: 'snapshot',
        roomId,
        peers: roomPeers,
        rooms: roomList,
        ts: Date.now(),
      });
      for (const p of players.values()) {
        if (p.roomId === roomId && p.ws.readyState === WebSocket.OPEN) {
          p.ws.send(msg);
        }
      }
    }
  }, 50);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Apex Horizon Full-Stack & Multiplayer Server running on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
