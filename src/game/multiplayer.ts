import * as THREE from 'three';
import { getOrCreatePlayerId } from './saveSystem';
import { ChatMessage, MultiplayerSnapshot, RemotePeerSnapshot, RoomSummary } from './types';

interface PeerRigEntry {
  group: THREE.Group;
  carGroup: THREE.Group;
  charGroup: THREE.Group;
  carPaintMat: THREE.MeshStandardMaterial;
  labelSprite: THREE.Sprite;
  targetX: number;
  targetY: number;
  targetZ: number;
  targetHeading: number;
  snapshot: RemotePeerSnapshot;
}

function createNameplateTexture(name: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(9, 9, 11, 0.82)';
  ctx.beginPath();
  ctx.roundRect(8, 10, 240, 44, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.75)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#fafafa';
  ctx.font = '700 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name.slice(0, 18), 128, 32);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class MultiplayerClient {
  public root = new THREE.Group();
  private ws: WebSocket | null = null;
  private peerRigs = new Map<string, PeerRigEntry>();

  public connected = false;
  public connecting = false;
  public playerId = getOrCreatePlayerId();
  public roomId = 'public-city';
  public rooms: RoomSummary[] = [
    { id: 'public-city', name: 'Metro Open City', mode: 'Open Exploration', maxPlayers: 32, playerCount: 0 },
    { id: 'car-meet', name: 'Harbor Concours Car Meet', mode: 'Car Meet & Show', maxPlayers: 24, playerCount: 0 },
    { id: 'drift-arena', name: 'Airport Drift & Sprint', mode: 'Online Drift Comp', maxPlayers: 16, playerCount: 0 },
  ];
  public chat: ChatMessage[] = [];
  public friends: string[] = [];
  public pingMs = 0;

  private reconnectTimer: number | null = null;
  private pingTimer: number | null = null;
  private sendAccumulator = 0;
  private wantsConnection = false;
  private latestJoinPayload: Record<string, unknown> = {};

  constructor(initialFriends: string[] = []) {
    this.friends = [...initialFriends];
  }

  public connect(
    roomId: string,
    playerName: string,
    state: {
      x: number;
      y: number;
      z: number;
      heading: number;
      inVehicle: boolean;
      vehicleId: string;
      vehicleColor: string;
      headlightsOn: boolean;
      driftScore: number;
      wantedLevel: number;
      skinColor: string;
      jacketColor: string;
    },
    roomName?: string,
  ) {
    this.wantsConnection = true;
    this.roomId = roomId;
    this.latestJoinPayload = {
      playerId: this.playerId,
      roomId,
      roomName,
      name: playerName,
      ...state,
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'join', ...this.latestJoinPayload }));
      return;
    }

    if (this.connecting) return;
    this.openSocket();
  }

  private openSocket() {
    if (!this.wantsConnection) return;
    this.connecting = true;

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(url);
      this.ws = ws;

      ws.onopen = () => {
        this.connected = true;
        this.connecting = false;
        ws.send(JSON.stringify({ type: 'join', ...this.latestJoinPayload }));
        if (this.pingTimer) clearInterval(this.pingTimer);
        this.pingTimer = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', ts: performance.now() }));
          }
        }, 4000);
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as Record<string, unknown>;
          const type = msg.type;
          if (type === 'welcome') {
            this.roomId = String(msg.roomId || this.roomId);
            if (Array.isArray(msg.rooms)) this.rooms = msg.rooms as RoomSummary[];
            if (Array.isArray(msg.peers)) this.syncPeerList(msg.peers as RemotePeerSnapshot[]);
          } else if (type === 'snapshot') {
            if (Array.isArray(msg.rooms)) this.rooms = msg.rooms as RoomSummary[];
            if (Array.isArray(msg.peers)) this.syncPeerList(msg.peers as RemotePeerSnapshot[]);
          } else if (type === 'player:joined') {
            const p = msg.player as RemotePeerSnapshot;
            if (p && p.id !== this.playerId) this.upsertPeer(p);
          } else if (type === 'player:left') {
            this.removePeer(String(msg.playerId));
          } else if (type === 'chat') {
            this.chat.push({
              id: `${msg.ts}_${Math.random()}`,
              playerId: String(msg.playerId || ''),
              name: String(msg.name || 'Driver'),
              text: String(msg.text || ''),
              ts: Number(msg.ts || Date.now()),
            });
            if (this.chat.length > 40) this.chat.shift();
          } else if (type === 'pong') {
            const sent = Number(msg.ts || 0);
            if (sent > 0) this.pingMs = Math.max(1, Math.round(performance.now() - sent));
          }
        } catch {
          // ignore malformed frames
        }
      };

      ws.onclose = () => {
        this.connected = false;
        this.connecting = false;
        if (this.pingTimer) {
          clearInterval(this.pingTimer);
          this.pingTimer = null;
        }
        this.clearAllPeers();
        if (this.wantsConnection) {
          this.reconnectTimer = window.setTimeout(() => this.openSocket(), 2500);
        }
      };

      ws.onerror = () => {
        this.connecting = false;
      };
    } catch {
      this.connecting = false;
      this.connected = false;
    }
  }

  public disconnect() {
    this.wantsConnection = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.connecting = false;
    this.clearAllPeers();
  }

  public sendChat(text: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: 'chat', text }));
  }

  public toggleFriend(name: string) {
    const clean = name.trim();
    if (!clean) return;
    if (this.friends.includes(clean)) {
      this.friends = this.friends.filter((f) => f !== clean);
    } else {
      this.friends = [...this.friends, clean];
    }
  }

  private syncPeerList(peers: RemotePeerSnapshot[]) {
    const seen = new Set<string>();
    for (const p of peers) {
      if (!p.id || p.id === this.playerId) continue;
      seen.add(p.id);
      this.upsertPeer(p);
    }
    for (const existingId of Array.from(this.peerRigs.keys())) {
      if (!seen.has(existingId)) {
        this.removePeer(existingId);
      }
    }
  }

  private upsertPeer(p: RemotePeerSnapshot) {
    let entry = this.peerRigs.get(p.id);
    if (!entry) {
      const group = new THREE.Group();
      const carGroup = new THREE.Group();
      const charGroup = new THREE.Group();

      const carPaintMat = new THREE.MeshStandardMaterial({
        color: p.vehicleColor || '#059669',
        roughness: 0.25,
        metalness: 0.72,
      });
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.65, 4.55), carPaintMat);
      chassis.position.y = 0.62;
      carGroup.add(chassis);
      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(1.56, 0.52, 2.2),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.12 }),
      );
      cabin.position.set(0, 1.15, -0.1);
      carGroup.add(cabin);

      const torso = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.58, 0.22),
        new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.7 }),
      );
      torso.position.y = 1.15;
      charGroup.add(torso);
      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.22, 0.22),
        new THREE.MeshStandardMaterial({ color: 0xe0ac8b, roughness: 0.7 }),
      );
      head.position.y = 1.56;
      charGroup.add(head);

      const labelTex = createNameplateTexture(p.name);
      const labelSprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthTest: false }),
      );
      labelSprite.scale.set(3.2, 0.8, 1);
      labelSprite.position.y = 2.4;

      group.add(carGroup, charGroup, labelSprite);
      group.position.set(p.x, p.y, p.z);
      this.root.add(group);

      entry = {
        group,
        carGroup,
        charGroup,
        carPaintMat,
        labelSprite,
        targetX: p.x,
        targetY: p.y,
        targetZ: p.z,
        targetHeading: p.heading,
        snapshot: p,
      };
      this.peerRigs.set(p.id, entry);
    }

    entry.targetX = p.x;
    entry.targetY = p.y;
    entry.targetZ = p.z;
    entry.targetHeading = p.heading;
    entry.snapshot = p;
    entry.carGroup.visible = p.inVehicle;
    entry.charGroup.visible = !p.inVehicle;
    entry.carPaintMat.color.set(p.vehicleColor || '#059669');
  }

  private removePeer(id: string) {
    const entry = this.peerRigs.get(id);
    if (!entry) return;
    this.root.remove(entry.group);
    this.peerRigs.delete(id);
  }

  private clearAllPeers() {
    for (const id of Array.from(this.peerRigs.keys())) {
      this.removePeer(id);
    }
  }

  public update(
    dt: number,
    localState: {
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
    },
  ) {
    // Interpolate remote peer positions smoothly
    const alpha = 1 - Math.exp(-12 * dt);
    for (const entry of this.peerRigs.values()) {
      entry.group.position.x = THREE.MathUtils.lerp(entry.group.position.x, entry.targetX, alpha);
      entry.group.position.y = THREE.MathUtils.lerp(entry.group.position.y, entry.targetY, alpha);
      entry.group.position.z = THREE.MathUtils.lerp(entry.group.position.z, entry.targetZ, alpha);
      let dH = entry.targetHeading - entry.group.rotation.y;
      while (dH > Math.PI) dH -= Math.PI * 2;
      while (dH < -Math.PI) dH += Math.PI * 2;
      entry.group.rotation.y += dH * alpha;
    }

    // Send local state at ~15Hz
    if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendAccumulator += dt;
      if (this.sendAccumulator >= 0.066) {
        this.sendAccumulator = 0;
        this.ws.send(JSON.stringify({ type: 'state', ...localState }));
      }
    }
  }

  public getPeerSnapshots(): RemotePeerSnapshot[] {
    return Array.from(this.peerRigs.values()).map((e) => e.snapshot);
  }

  public getSnapshot(): MultiplayerSnapshot {
    return {
      connected: this.connected,
      connecting: this.connecting,
      playerId: this.playerId,
      roomId: this.roomId,
      rooms: this.rooms,
      peers: this.getPeerSnapshots(),
      chat: [...this.chat],
      friends: [...this.friends],
      pingMs: this.pingMs,
    };
  }
}
