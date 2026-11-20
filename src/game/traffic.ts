import * as THREE from 'three';
import { ROAD_COORDS } from './world';

interface TrafficVehicle {
  group: THREE.Group;
  x: number;
  z: number;
  axis: 'x' | 'z';
  dir: 1 | -1;
  laneCoord: number;
  speed: number;
  maxSpeed: number;
  headlightMat: THREE.MeshStandardMaterial;
  tailLightMat: THREE.MeshStandardMaterial;
  role: 'civilian' | 'police' | 'ambulance';
  lightBarRed?: THREE.MeshStandardMaterial;
  lightBarBlue?: THREE.MeshStandardMaterial;
  heading: number;
}

interface TrafficSignalNode {
  x: number;
  z: number;
  nsRed: THREE.MeshBasicMaterial;
  nsYellow: THREE.MeshBasicMaterial;
  nsGreen: THREE.MeshBasicMaterial;
  ewRed: THREE.MeshBasicMaterial;
  ewYellow: THREE.MeshBasicMaterial;
  ewGreen: THREE.MeshBasicMaterial;
}

interface PedestrianAgent {
  group: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  x: number;
  z: number;
  axis: 'x' | 'z';
  dir: 1 | -1;
  speed: number;
  phase: number;
}

export class TrafficAndPedestrians {
  public root = new THREE.Group();
  private cars: TrafficVehicle[] = [];
  private policeCars: TrafficVehicle[] = [];
  private signals: TrafficSignalNode[] = [];
  private pedestrians: PedestrianAgent[] = [];
  private activeCarCount = 14;
  private signalTimer = 0;

  constructor(
    contactShadowMap: THREE.Texture,
    intersections: { x: number; z: number }[] = [],
  ) {
    this.buildTrafficSignals(intersections);
    this.buildTraffic(contactShadowMap);
    this.buildPedestrians(contactShadowMap);
  }

  private buildTrafficSignals(intersections: { x: number; z: number }[]) {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.4, metalness: 0.7 });
    const housingMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.5 });

    for (const inter of intersections) {
      // Only place 3D poles on every second intersection or core grid to stay lean
      if (Math.abs(inter.x) > 160 || Math.abs(inter.z) > 160) continue;

      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6.2, 6), poleMat);
      pole.position.set(inter.x + 9.2, 3.1, inter.z + 9.2);
      this.root.add(pole);

      const arm = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.16, 0.16), poleMat);
      arm.position.set(inter.x + 6.8, 5.9, inter.z + 9.2);
      this.root.add(arm);

      const box = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.35, 0.55), housingMat);
      box.position.set(inter.x + 4.4, 5.5, inter.z + 9.2);
      this.root.add(box);

      const nsRed = new THREE.MeshBasicMaterial({ color: 0x3f1d1d });
      const nsYellow = new THREE.MeshBasicMaterial({ color: 0x3f3210 });
      const nsGreen = new THREE.MeshBasicMaterial({ color: 0x22c55e });

      const ewRed = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const ewYellow = new THREE.MeshBasicMaterial({ color: 0x3f3210 });
      const ewGreen = new THREE.MeshBasicMaterial({ color: 0x143321 });

      const lensGeo = new THREE.CircleGeometry(0.14, 10);
      const mkLens = (mat: THREE.MeshBasicMaterial, lx: number, ly: number, lz: number, ry: number) => {
        const m = new THREE.Mesh(lensGeo, mat);
        m.position.set(lx, ly, lz);
        m.rotation.y = ry;
        this.root.add(m);
      };

      mkLens(nsRed, inter.x + 4.4, 5.9, inter.z + 9.49, 0);
      mkLens(nsYellow, inter.x + 4.4, 5.5, inter.z + 9.49, 0);
      mkLens(nsGreen, inter.x + 4.4, 5.1, inter.z + 9.49, 0);

      mkLens(ewRed, inter.x + 4.11, 5.9, inter.z + 9.2, -Math.PI / 2);
      mkLens(ewYellow, inter.x + 4.11, 5.5, inter.z + 9.2, -Math.PI / 2);
      mkLens(ewGreen, inter.x + 4.11, 5.1, inter.z + 9.2, -Math.PI / 2);

      this.signals.push({
        x: inter.x,
        z: inter.z,
        nsRed,
        nsYellow,
        nsGreen,
        ewRed,
        ewYellow,
        ewGreen,
      });
    }
  }

  private buildTraffic(contactShadowMap: THREE.Texture) {
    const colors = [0xe4e4e7, 0x18181b, 0x3b82f6, 0x64748b, 0x991b1b, 0x0f766e, 0xd97706];
    const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 14).rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.15, metalness: 0.4 });
    const shadowGeo = new THREE.PlaneGeometry(2.3, 4.8).rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: contactShadowMap,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });

    // 18 Civilian + 3 Police Cruisers + 1 Ambulance
    const total = 22;
    for (let i = 0; i < total; i++) {
      const g = new THREE.Group();
      const role: TrafficVehicle['role'] =
        i >= 18 && i <= 20 ? 'police' : i === 21 ? 'ambulance' : 'civilian';

      const bodyColor =
        role === 'police' ? 0x09090b : role === 'ambulance' ? 0xf8fafc : colors[i % colors.length];
      const paintMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.28, metalness: 0.65 });

      const lower = new THREE.Mesh(
        new THREE.BoxGeometry(role === 'ambulance' ? 2.05 : 1.82, role === 'ambulance' ? 1.15 : 0.62, 4.45),
        paintMat,
      );
      lower.position.y = role === 'ambulance' ? 0.85 : 0.62;
      lower.castShadow = true;
      g.add(lower);

      if (role === 'police') {
        // White police cruiser doors
        const doorStripe = new THREE.Mesh(
          new THREE.BoxGeometry(1.86, 0.56, 1.8),
          new THREE.MeshStandardMaterial({ color: 0xf4f4f5, roughness: 0.35 }),
        );
        doorStripe.position.set(0, 0.64, 0.05);
        g.add(doorStripe);
      } else if (role === 'ambulance') {
        const stripe = new THREE.Mesh(
          new THREE.BoxGeometry(2.08, 0.26, 4.48),
          new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 }),
        );
        stripe.position.set(0, 0.85, 0);
        g.add(stripe);
      }

      if (role !== 'ambulance') {
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.52, 2.2), glassMat);
        cabin.position.set(0, 1.15, -0.15);
        g.add(cabin);

        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(1.52, 0.08, 1.85),
          role === 'police'
            ? new THREE.MeshStandardMaterial({ color: 0xf4f4f5, roughness: 0.3 })
            : paintMat,
        );
        roof.position.set(0, 1.43, -0.15);
        g.add(roof);
      }

      let lightBarRed: THREE.MeshStandardMaterial | undefined;
      let lightBarBlue: THREE.MeshStandardMaterial | undefined;
      if (role === 'police' || role === 'ambulance') {
        lightBarRed = new THREE.MeshStandardMaterial({
          color: 0xef4444,
          emissive: 0xef4444,
          emissiveIntensity: 0.3,
        });
        lightBarBlue = new THREE.MeshStandardMaterial({
          color: 0x3b82f6,
          emissive: 0x3b82f6,
          emissiveIntensity: 0.3,
        });
        const barY = role === 'ambulance' ? 1.52 : 1.54;
        const leftBeacon = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.14, 0.28), lightBarRed);
        leftBeacon.position.set(-0.32, barY, 0.0);
        g.add(leftBeacon);
        const rightBeacon = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.14, 0.28), lightBarBlue);
        rightBeacon.position.set(0.32, barY, 0.0);
        g.add(rightBeacon);
      }

      const headlightMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xfef3c7,
        emissiveIntensity: 0.2,
      });
      const tailLightMat = new THREE.MeshStandardMaterial({
        color: 0x991b1b,
        emissive: 0xef4444,
        emissiveIntensity: 0.2,
      });

      for (const sx of [-0.62, 0.62]) {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.06), headlightMat);
        hl.position.set(sx, 0.68, 2.24);
        g.add(hl);

        const tl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.06), tailLightMat);
        tl.position.set(sx, 0.72, -2.24);
        g.add(tl);
      }

      for (const [wx, wz] of [
        [-0.86, 1.32],
        [0.86, 1.32],
        [-0.86, -1.32],
        [0.86, -1.32],
      ]) {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.position.set(wx, 0.32, wz);
        g.add(w);
      }

      const sh = new THREE.Mesh(shadowGeo, shadowMat);
      sh.position.y = 0.025;
      g.add(sh);

      const axis: 'x' | 'z' = i % 2 === 0 ? 'x' : 'z';
      const road = ROAD_COORDS[(i * 3) % ROAD_COORDS.length];
      const dir: 1 | -1 = i % 4 < 2 ? 1 : -1;
      const laneOffset = 3.8;

      let x = 0;
      let z = 0;
      if (axis === 'z') {
        x = road + (dir === 1 ? -laneOffset : laneOffset);
        z = -210 + ((i * 53) % 420);
      } else {
        z = road + (dir === 1 ? laneOffset : -laneOffset);
        x = -210 + ((i * 61) % 420);
      }

      const heading = axis === 'z' ? (dir === 1 ? 0 : Math.PI) : dir === 1 ? Math.PI / 2 : -Math.PI / 2;
      g.position.set(x, 0, z);
      g.rotation.y = heading;
      this.root.add(g);

      const entry: TrafficVehicle = {
        group: g,
        x,
        z,
        axis,
        dir,
        laneCoord: road,
        speed: 8 + (i % 5) * 1.4,
        maxSpeed: role === 'police' ? 16 : 10 + (i % 4) * 1.6,
        headlightMat,
        tailLightMat,
        role,
        lightBarRed,
        lightBarBlue,
        heading,
      };
      this.cars.push(entry);
      if (role === 'police') {
        this.policeCars.push(entry);
      }
    }
  }

  private buildPedestrians(contactShadowMap: THREE.Texture) {
    const jacketColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xec4899, 0x14b8a6, 0x71717a];
    const skinTones = [0xf5d0b5, 0xe0ac8b, 0xc68642, 0x8d5524];
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const shGeo = new THREE.PlaneGeometry(0.7, 0.7).rotateX(-Math.PI / 2);
    const shMat = new THREE.MeshBasicMaterial({ map: contactShadowMap, transparent: true, opacity: 0.38, depthWrite: false });

    for (let i = 0; i < 28; i++) {
      const g = new THREE.Group();
      const torsoMat = new THREE.MeshStandardMaterial({ color: jacketColors[i % jacketColors.length], roughness: 0.7 });
      const skinMat = new THREE.MeshStandardMaterial({ color: skinTones[i % skinTones.length], roughness: 0.7 });

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.56, 0.2), torsoMat);
      torso.position.y = 1.15;
      torso.castShadow = true;
      g.add(torso);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.2), skinMat);
      head.position.y = 1.56;
      g.add(head);

      const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.76, 0.14), pantsMat);
      leftLeg.position.set(0.09, 0.45, 0);
      g.add(leftLeg);

      const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.76, 0.14), pantsMat);
      rightLeg.position.set(-0.09, 0.45, 0);
      g.add(rightLeg);

      const sh = new THREE.Mesh(shGeo, shMat);
      sh.position.y = 0.025;
      g.add(sh);

      const axis: 'x' | 'z' = i % 2 === 0 ? 'z' : 'x';
      const road = ROAD_COORDS[(i * 2 + 1) % ROAD_COORDS.length];
      const dir: 1 | -1 = i % 3 === 0 ? -1 : 1;
      const sidewalkOffset = i % 4 < 2 ? 10.5 : -10.5;
      const x = axis === 'z' ? road + sidewalkOffset : -210 + ((i * 47) % 420);
      const z = axis === 'x' ? road + sidewalkOffset : -210 + ((i * 59) % 420);

      g.position.set(x, 0.16, z);
      this.root.add(g);

      this.pedestrians.push({
        group: g,
        leftLeg,
        rightLeg,
        x,
        z,
        axis,
        dir,
        speed: 1.45 + (i % 3) * 0.25,
        phase: i * 0.9,
      });
    }
  }

  public setDensity(density: 'low' | 'medium' | 'high') {
    this.activeCarCount = density === 'low' ? 10 : density === 'medium' ? 16 : this.cars.length;
    this.cars.forEach((car, idx) => {
      // Always keep police & ambulance visible
      car.group.visible = car.role !== 'civilian' || idx < this.activeCarCount;
    });
  }

  public getCarPositions(): { x: number; z: number; heading: number; role: 'civilian' | 'police' | 'ambulance' }[] {
    const out: { x: number; z: number; heading: number; role: 'civilian' | 'police' | 'ambulance' }[] = [];
    for (const c of this.cars) {
      if (!c.group.visible) continue;
      out.push({ x: c.x, z: c.z, heading: c.group.rotation.y, role: c.role });
    }
    return out;
  }

  public getNearestPoliceDistance(px: number, pz: number): number {
    let minD = Infinity;
    for (const p of this.policeCars) {
      const d = Math.hypot(p.x - px, p.z - pz);
      if (d < minD) minD = d;
    }
    return minD;
  }

  public isRunningRedLight(x: number, z: number, heading: number, speedKmh: number): boolean {
    if (speedKmh < 38) return false;
    const cycle = this.signalTimer % 20;
    const nsRed = cycle >= 10;
    const ewRed = cycle < 10;

    for (const sig of this.signals) {
      const dx = Math.abs(x - sig.x);
      const dz = Math.abs(z - sig.z);
      if (dx < 8.5 && dz < 8.5) {
        const movingMostlyZ = Math.abs(Math.cos(heading)) >= Math.abs(Math.sin(heading));
        if (movingMostlyZ && nsRed) return true;
        if (!movingMostlyZ && ewRed) return true;
      }
    }
    return false;
  }

  public update(
    dt: number,
    playerX: number,
    playerZ: number,
    nightFactor: number,
    wantedLevel = 0,
    elapsed = 0,
  ) {
    this.signalTimer += dt;
    const phase = this.signalTimer % 20;
    // 0..8 NS green / EW red, 8..10 NS yellow / EW red, 10..18 NS red / EW green, 18..20 NS red / EW yellow
    const nsState: 'green' | 'yellow' | 'red' = phase < 8 ? 'green' : phase < 10 ? 'yellow' : 'red';
    const ewState: 'green' | 'yellow' | 'red' = phase < 10 ? 'red' : phase < 18 ? 'green' : 'yellow';

    for (const sig of this.signals) {
      sig.nsRed.color.setHex(nsState === 'red' ? 0xef4444 : 0x3f1d1d);
      sig.nsYellow.color.setHex(nsState === 'yellow' ? 0xfacc15 : 0x3f3210);
      sig.nsGreen.color.setHex(nsState === 'green' ? 0x22c55e : 0x143321);

      sig.ewRed.color.setHex(ewState === 'red' ? 0xef4444 : 0x3f1d1d);
      sig.ewYellow.color.setHex(ewState === 'yellow' ? 0xfacc15 : 0x3f3210);
      sig.ewGreen.color.setHex(ewState === 'green' ? 0x22c55e : 0x143321);
    }

    const flashSide = Math.floor(elapsed * 8) % 2 === 0;

    // Update AI Traffic + Police + Ambulance
    for (let i = 0; i < this.cars.length; i++) {
      const car = this.cars[i];
      if (!car.group.visible) continue;

      if (car.role === 'police' && wantedLevel > 0) {
        // Active Police Pursuit Steering toward player!
        const dx = playerX - car.x;
        const dz = playerZ - car.z;
        const dist = Math.hypot(dx, dz);
        const chaseAngle = Math.atan2(dx, dz);
        let diff = chaseAngle - car.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        car.heading += diff * Math.min(1, dt * 3.8);

        const targetSpd = dist > 9 ? 17 + wantedLevel * 2.4 : 0;
        car.speed = THREE.MathUtils.damp(car.speed, targetSpd, 4, dt);
        car.x += Math.sin(car.heading) * car.speed * dt;
        car.z += Math.cos(car.heading) * car.speed * dt;
        car.group.position.set(car.x, 0, car.z);
        car.group.rotation.y = car.heading;

        if (car.lightBarRed && car.lightBarBlue) {
          car.lightBarRed.emissiveIntensity = flashSide ? 3.0 : 0.2;
          car.lightBarBlue.emissiveIntensity = !flashSide ? 3.0 : 0.2;
        }
        car.headlightMat.emissiveIntensity = 1.8;
        car.tailLightMat.emissiveIntensity = targetSpd === 0 ? 2.2 : 0.9;
        continue;
      }

      // Snap heading back to patrol axis when not pursuing
      const patrolHeading =
        car.axis === 'z' ? (car.dir === 1 ? 0 : Math.PI) : car.dir === 1 ? Math.PI / 2 : -Math.PI / 2;
      car.heading = patrolHeading;

      let targetSpeed = car.maxSpeed;

      // Red-light check ahead of intersection
      const redForAxis = car.axis === 'z' ? nsState !== 'green' : ewState !== 'green';
      if (redForAxis) {
        const pos = car.axis === 'z' ? car.z : car.x;
        for (const interCoord of [-160, -80, 0, 80, 160]) {
          const distToStop = (interCoord - car.dir * 12 - pos) * car.dir;
          if (distToStop > 0 && distToStop < 11) {
            targetSpeed = 0;
            break;
          }
        }
      }

      // Yield to player
      const dxP = playerX - car.x;
      const dzP = playerZ - car.z;
      const distP = Math.hypot(dxP, dzP);
      if (distP < 12) {
        const forwardDot = car.axis === 'z' ? dzP * car.dir : dxP * car.dir;
        if (forwardDot > 0) targetSpeed = 0;
      }

      // Yield to vehicle ahead
      for (let j = 0; j < this.cars.length; j++) {
        if (i === j || !this.cars[j].group.visible) continue;
        const other = this.cars[j];
        if (other.axis !== car.axis || other.dir !== car.dir) continue;
        const lateral = car.axis === 'z' ? Math.abs(other.x - car.x) : Math.abs(other.z - car.z);
        if (lateral > 2.2) continue;
        const ahead = car.axis === 'z' ? (other.z - car.z) * car.dir : (other.x - car.x) * car.dir;
        if (ahead > 0 && ahead < 13) {
          targetSpeed = 0;
          break;
        }
      }

      car.speed = THREE.MathUtils.damp(car.speed, targetSpeed, targetSpeed === 0 ? 7 : 2.5, dt);

      if (car.axis === 'z') {
        car.z += car.dir * car.speed * dt;
        if (car.z > 255) car.z = -255;
        if (car.z < -255) car.z = 255;
      } else {
        car.x += car.dir * car.speed * dt;
        if (car.x > 255) car.x = -255;
        if (car.x < -255) car.x = 255;
      }

      car.group.position.set(car.x, 0, car.z);
      car.group.rotation.y = patrolHeading;
      car.headlightMat.emissiveIntensity = 0.2 + nightFactor * 1.9;
      car.tailLightMat.emissiveIntensity = targetSpeed === 0 ? 2.2 : 0.2 + nightFactor * 0.9;

      if (car.lightBarRed && car.lightBarBlue) {
        if (car.role === 'ambulance') {
          car.lightBarRed.emissiveIntensity = flashSide ? 2.2 : 0.25;
          car.lightBarBlue.emissiveIntensity = !flashSide ? 2.2 : 0.25;
        } else {
          car.lightBarRed.emissiveIntensity = 0.25;
          car.lightBarBlue.emissiveIntensity = 0.25;
        }
      }
    }

    // Update Pedestrians
    for (const p of this.pedestrians) {
      const distP = Math.hypot(playerX - p.x, playerZ - p.z);
      const spd = distP < 4.5 ? 0 : p.speed;

      if (spd > 0) {
        p.phase += dt * 7.5;
        if (p.axis === 'z') {
          p.z += p.dir * spd * dt;
          if (p.z > 248 || p.z < -248) p.dir = (p.dir * -1) as 1 | -1;
          p.group.rotation.y = p.dir === 1 ? 0 : Math.PI;
        } else {
          p.x += p.dir * spd * dt;
          if (p.x > 248 || p.x < -248) p.dir = (p.dir * -1) as 1 | -1;
          p.group.rotation.y = p.dir === 1 ? Math.PI / 2 : -Math.PI / 2;
        }
        p.group.position.set(p.x, 0.16, p.z);
        p.leftLeg.rotation.x = Math.sin(p.phase) * 0.55;
        p.rightLeg.rotation.x = -Math.sin(p.phase) * 0.55;
      } else {
        p.leftLeg.rotation.x = THREE.MathUtils.damp(p.leftLeg.rotation.x, 0, 8, dt);
        p.rightLeg.rotation.x = THREE.MathUtils.damp(p.rightLeg.rotation.x, 0, 8, dt);
      }
    }
  }
}
