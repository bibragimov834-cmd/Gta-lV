import * as THREE from 'three';
import { ProceduralTextureSet } from './textures';
import {
  GasStationInfo,
  GraphicsPreset,
  LandmarkInfo,
  PROPERTY_CATALOG,
  WorldInteractZone,
} from './types';

export interface BoxCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
}

export interface ParkingBay {
  id: number;
  title: string;
  x: number;
  z: number;
  heading: number;
}

export interface ShowroomPortal {
  name: string;
  x: number;
  z: number;
  radius: number;
}

export interface ZoneGroup {
  x: number;
  z: number;
  group: THREE.Group;
}

export interface CityWorld {
  root: THREE.Group;
  colliders: BoxCollider[];
  roadCoords: number[];
  landmarks: LandmarkInfo[];
  gasStations: GasStationInfo[];
  showroomPortals: ShowroomPortal[];
  interactZones: WorldInteractZone[];
  trafficLightIntersections: { x: number; z: number }[];
  parkingBays: ParkingBay[];
  challengeCheckpoints: THREE.Vector3[];
  asphaltMat: THREE.MeshPhysicalMaterial;
  waterMesh: THREE.Mesh;
  lampBulbMat: THREE.MeshStandardMaterial;
  skyscraperMats: THREE.MeshStandardMaterial[];
  updateDayNight: (nightFactor: number, isRaining: boolean, isSnow: boolean, elapsed: number) => void;
  updateZoneVisibility: (playerX: number, playerZ: number, preset: GraphicsPreset) => void;
}

export const ROAD_COORDS = [-240, -160, -80, 0, 80, 160, 240];
export const ROAD_WIDTH = 16;

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildCityWorld(textures: ProceduralTextureSet, isSoftwareGl: boolean): CityWorld {
  const rand = mulberry32(20261120);
  const root = new THREE.Group();
  const colliders: BoxCollider[] = [];
  const zoneGroups: ZoneGroup[] = [];

  const registerZoneGroup = (x: number, z: number): THREE.Group => {
    const g = new THREE.Group();
    root.add(g);
    zoneGroups.push({ x, z, group: g });
    return g;
  };

  // 1. Base Horizon Terrain
  const terrainGeo = new THREE.PlaneGeometry(2800, 2800);
  terrainGeo.rotateX(-Math.PI / 2);
  const terrainMat = new THREE.MeshStandardMaterial({
    color: 0x3b4d32,
    roughness: 0.95,
    metalness: 0.0,
  });
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.position.y = -0.22;
  terrain.receiveShadow = true;
  root.add(terrain);

  // Distant rolling hills on the West, North, and South horizons
  const hillGeo = new THREE.ConeGeometry(92, 52, 7);
  const hillMat = new THREE.MeshStandardMaterial({ color: 0x33412d, roughness: 0.92 });
  const hillInst = new THREE.InstancedMesh(hillGeo, hillMat, 36);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 36; i++) {
    const angle = (i / 36) * Math.PI * 1.45 + Math.PI * 0.28;
    const dist = 590 + rand() * 260;
    dummy.position.set(Math.cos(angle) * dist, 18 + rand() * 16, Math.sin(angle) * dist);
    dummy.scale.set(1.2 + rand() * 1.4, 0.75 + rand() * 1.2, 1.2 + rand() * 1.4);
    dummy.rotation.y = rand() * Math.PI;
    dummy.updateMatrix();
    hillInst.setMatrixAt(i, dummy.matrix);
  }
  hillInst.instanceMatrix.needsUpdate = true;
  hillInst.computeBoundingSphere();
  root.add(hillInst);

  // 2. Coastal Harbor Ocean on +X side (x > 282)
  const waterGeo = new THREE.PlaneGeometry(1400, 2600);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshPhysicalMaterial({
    color: 0x0c4a6e,
    roughness: 0.14,
    metalness: 0.18,
    normalMap: textures.waterNormalMap,
    normalScale: new THREE.Vector2(0.45, 0.45),
    clearcoat: isSoftwareGl ? 0.2 : 0.85,
    envMapIntensity: 1.4,
  });
  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.position.set(982, -0.8, 0);
  root.add(waterMesh);

  const seawall = new THREE.Mesh(
    new THREE.BoxGeometry(10, 1.4, 840),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85 }),
  );
  seawall.position.set(278, -0.5, 0);
  seawall.receiveShadow = true;
  root.add(seawall);

  // Waterfront Pier
  const pier = new THREE.Mesh(
    new THREE.BoxGeometry(46, 0.7, 14),
    new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.82 }),
  );
  pier.position.set(304, -0.18, 0);
  pier.receiveShadow = true;
  root.add(pier);

  // 3. City Asphalt Base Pad + Outer Suburban/Highway Apron
  const asphaltMat = new THREE.MeshPhysicalMaterial({
    map: textures.asphaltMap,
    normalMap: textures.asphaltNormalMap,
    normalScale: new THREE.Vector2(0.4, 0.4),
    roughnessMap: textures.asphaltRoughnessMap,
    roughness: 0.72,
    metalness: 0.08,
    clearcoat: isSoftwareGl ? 0.0 : 0.14,
    clearcoatRoughness: 0.42,
    envMapIntensity: 1.25,
  });
  const roadGridPad = new THREE.Mesh(new THREE.PlaneGeometry(560, 560).rotateX(-Math.PI / 2), asphaltMat);
  roadGridPad.position.y = 0.0;
  roadGridPad.receiveShadow = true;
  root.add(roadGridPad);

  // 4. Outer Highway Perimeter Loop (North z=-318, South z=318, West x=-318) + Connectors
  const hwyNorth = new THREE.Mesh(new THREE.PlaneGeometry(590, 18).rotateX(-Math.PI / 2), asphaltMat);
  hwyNorth.position.set(-15, 0.004, -318);
  hwyNorth.receiveShadow = true;
  root.add(hwyNorth);

  const hwySouth = new THREE.Mesh(new THREE.PlaneGeometry(590, 18).rotateX(-Math.PI / 2), asphaltMat);
  hwySouth.position.set(-15, 0.004, 318);
  hwySouth.receiveShadow = true;
  root.add(hwySouth);

  const hwyWest = new THREE.Mesh(new THREE.PlaneGeometry(18, 654).rotateX(-Math.PI / 2), asphaltMat);
  hwyWest.position.set(-318, 0.004, 0);
  hwyWest.receiveShadow = true;
  root.add(hwyWest);

  // Highway Connectors from City Grid to Outer Loop
  for (const cx of [-240, 0, 240]) {
    const connN = new THREE.Mesh(new THREE.PlaneGeometry(16, 78).rotateX(-Math.PI / 2), asphaltMat);
    connN.position.set(cx, 0.005, -279);
    root.add(connN);
    const connS = new THREE.Mesh(new THREE.PlaneGeometry(16, 78).rotateX(-Math.PI / 2), asphaltMat);
    connS.position.set(cx, 0.005, 279);
    root.add(connS);
  }
  for (const cz of [-240, 0, 240]) {
    const connW = new THREE.Mesh(new THREE.PlaneGeometry(78, 16).rotateX(-Math.PI / 2), asphaltMat);
    connW.position.set(-279, 0.005, cz);
    root.add(connW);
  }

  // 5. Road Markings
  const dashGeo = new THREE.PlaneGeometry(0.24, 3.6).rotateX(-Math.PI / 2);
  const whiteLineMat = new THREE.MeshStandardMaterial({
    color: 0xe4e4e7,
    roughness: 0.75,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const yellowLineMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.75,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const dashPositions: { x: number; z: number; rotY: number; yellow: boolean }[] = [];
  for (const rc of ROAD_COORDS) {
    for (let i = 0; i < ROAD_COORDS.length - 1; i++) {
      const start = ROAD_COORDS[i] + 10;
      const end = ROAD_COORDS[i + 1] - 10;
      for (let d = start + 2; d <= end - 2; d += 7) {
        dashPositions.push({ x: rc, z: d, rotY: 0, yellow: true });
        dashPositions.push({ x: rc - 3.8, z: d, rotY: 0, yellow: false });
        dashPositions.push({ x: rc + 3.8, z: d, rotY: 0, yellow: false });
        dashPositions.push({ x: d, z: rc, rotY: Math.PI / 2, yellow: true });
        dashPositions.push({ x: d, z: rc - 3.8, rotY: Math.PI / 2, yellow: false });
        dashPositions.push({ x: d, z: rc + 3.8, rotY: Math.PI / 2, yellow: false });
      }
    }
  }
  // Outer highway dashes
  for (let d = -290; d <= 250; d += 8) {
    dashPositions.push({ x: d, z: -318, rotY: Math.PI / 2, yellow: true });
    dashPositions.push({ x: d, z: 318, rotY: Math.PI / 2, yellow: true });
    dashPositions.push({ x: -318, z: d, rotY: 0, yellow: true });
  }

  const whiteDashes = dashPositions.filter((p) => !p.yellow);
  const yellowDashes = dashPositions.filter((p) => p.yellow);

  const whiteInst = new THREE.InstancedMesh(dashGeo, whiteLineMat, whiteDashes.length);
  whiteDashes.forEach((p, idx) => {
    dummy.position.set(p.x, 0.02, p.z);
    dummy.rotation.set(0, p.rotY, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    whiteInst.setMatrixAt(idx, dummy.matrix);
  });
  whiteInst.instanceMatrix.needsUpdate = true;
  whiteInst.computeBoundingSphere();
  root.add(whiteInst);

  const yellowInst = new THREE.InstancedMesh(dashGeo, yellowLineMat, yellowDashes.length);
  yellowDashes.forEach((p, idx) => {
    dummy.position.set(p.x, 0.02, p.z);
    dummy.rotation.set(0, p.rotY, 0);
    dummy.scale.set(1, 1, 1.65);
    dummy.updateMatrix();
    yellowInst.setMatrixAt(idx, dummy.matrix);
  });
  yellowInst.instanceMatrix.needsUpdate = true;
  yellowInst.computeBoundingSphere();
  root.add(yellowInst);

  // Crosswalks
  const zebraGeo = new THREE.PlaneGeometry(0.65, 2.8).rotateX(-Math.PI / 2);
  const zebraTransforms: { x: number; z: number; rotY: number }[] = [];
  for (const rx of ROAD_COORDS) {
    for (const rz of ROAD_COORDS) {
      if (Math.abs(rx) > 160 || Math.abs(rz) > 160) continue;
      for (let s = -5.5; s <= 5.5; s += 2.2) {
        zebraTransforms.push({ x: rx + s, z: rz + 9.5, rotY: 0 });
        zebraTransforms.push({ x: rx + s, z: rz - 9.5, rotY: 0 });
        zebraTransforms.push({ x: rx + 9.5, z: rz + s, rotY: Math.PI / 2 });
        zebraTransforms.push({ x: rx - 9.5, z: rz + s, rotY: Math.PI / 2 });
      }
    }
  }
  const zebraInst = new THREE.InstancedMesh(zebraGeo, whiteLineMat, zebraTransforms.length);
  zebraTransforms.forEach((p, idx) => {
    dummy.position.set(p.x, 0.02, p.z);
    dummy.rotation.set(0, p.rotY, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    zebraInst.setMatrixAt(idx, dummy.matrix);
  });
  zebraInst.instanceMatrix.needsUpdate = true;
  zebraInst.computeBoundingSphere();
  root.add(zebraInst);

  // Shared Materials
  const sidewalkMat = new THREE.MeshStandardMaterial({
    map: textures.sidewalkMap,
    roughness: 0.88,
    metalness: 0.02,
  });
  const grassMat = new THREE.MeshStandardMaterial({
    map: textures.grassMap,
    roughness: 0.92,
  });
  const skyscraperMats = textures.buildingFacades.map((map, idx) => {
    return new THREE.MeshStandardMaterial({
      map,
      emissiveMap: textures.buildingEmissives[idx],
      emissive: new THREE.Color(0xffe8b5),
      emissiveIntensity: 0.0,
      roughness: 0.25,
      metalness: 0.55,
    });
  });

  const houseWallMat = new THREE.MeshStandardMaterial({
    map: textures.houseWallMap,
    roughness: 0.82,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    map: textures.roofTileMap,
    roughness: 0.78,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x27272a,
    roughness: 0.4,
    metalness: 0.7,
  });
  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.85,
  });
  const lampBulbMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfde68a,
    emissiveIntensity: 0.2,
    roughness: 0.2,
  });

  const addBoxCollider = (cx: number, cz: number, w: number, d: number, h: number) => {
    colliders.push({
      minX: cx - w * 0.5,
      maxX: cx + w * 0.5,
      minZ: cz - d * 0.5,
      maxZ: cz + d * 0.5,
      height: h,
    });
  };

  const treePositions: { x: number; z: number; scale: number; tint: number }[] = [];
  const lampPositions: { x: number; z: number; rotY: number }[] = [];

  const gasStations: GasStationInfo[] = [];
  const landmarks: LandmarkInfo[] = [];
  const parkingBays: ParkingBay[] = [];
  const interactZones: WorldInteractZone[] = [];

  // Map property lookup by (x, z)
  const propertyAtBlock = new Map<string, (typeof PROPERTY_CATALOG)[number]>();
  for (const prop of PROPERTY_CATALOG) {
    propertyAtBlock.set(`${prop.x},${prop.z}`, prop);
  }

  const addZoneBeaconPad = (
    parent: THREE.Group,
    x: number,
    z: number,
    colorHex: number,
    radius = 2.6,
  ) => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(radius * 0.78, radius, 28).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide }),
    );
    ring.position.set(x, 0.25, z);
    parent.add(ring);

    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(radius * 0.78, 28).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.22 }),
    );
    disc.position.set(x, 0.24, z);
    parent.add(disc);
  };

  // 6. Build all 36 City Blocks (6x6 grid)
  const blockCenters = [-200, -120, -40, 40, 120, 200];

  for (let bxIdx = 0; bxIdx < blockCenters.length; bxIdx++) {
    for (let bzIdx = 0; bzIdx < blockCenters.length; bzIdx++) {
      const bx = blockCenters[bxIdx];
      const bz = blockCenters[bzIdx];
      const blockSize = 64;
      const zg = registerZoneGroup(bx, bz);

      const pad = new THREE.Mesh(new THREE.BoxGeometry(blockSize, 0.16, blockSize), sidewalkMat);
      pad.position.set(bx, 0.08, bz);
      pad.receiveShadow = true;
      zg.add(pad);

      if (bxIdx % 2 === 0 || bzIdx % 2 === 0) {
        lampPositions.push({ x: bx - 29, z: bz - 29, rotY: Math.PI / 4 });
        lampPositions.push({ x: bx + 29, z: bz + 29, rotY: -Math.PI * 0.75 });
      }

      const ownProp = propertyAtBlock.get(`${bx},${bz}`);

      if (ownProp) {
        // BUYABLE PROPERTY / VILLA / APARTMENT / HOUSE WITH ENTERABLE PORTAL
        const lawn = new THREE.Mesh(new THREE.BoxGeometry(58, 0.17, 58), grassMat);
        lawn.position.set(bx, 0.09, bz);
        lawn.receiveShadow = true;
        zg.add(lawn);

        if (ownProp.category === 'Luxury Villa') {
          // Modern Cantilevered Villa + Pool + Gate
          const villaBase = new THREE.Mesh(
            new THREE.BoxGeometry(28, 5.5, 22),
            new THREE.MeshStandardMaterial({ color: 0xf4f4f5, roughness: 0.5 }),
          );
          villaBase.position.set(bx, 2.9, bz - 8);
          villaBase.castShadow = true;
          villaBase.receiveShadow = true;
          zg.add(villaBase);

          const upperCantilever = new THREE.Mesh(
            new THREE.BoxGeometry(34, 4.4, 16),
            new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.35, metalness: 0.4 }),
          );
          upperCantilever.position.set(bx - 2, 7.6, bz - 6);
          upperCantilever.castShadow = true;
          zg.add(upperCantilever);

          const pool = new THREE.Mesh(
            new THREE.BoxGeometry(16, 0.25, 9),
            new THREE.MeshPhysicalMaterial({ color: 0x06b6d4, roughness: 0.1, clearcoat: 1 }),
          );
          pool.position.set(bx - 6, 0.22, bz + 12);
          zg.add(pool);

          addBoxCollider(bx, bz - 8, 28, 22, 10);
          addZoneBeaconPad(zg, bx + 12, bz + 14, 0xf59e0b, 3.0);
          interactZones.push({
            id: `zone_${ownProp.id}`,
            kind: 'property',
            name: ownProp.name,
            subtitle: `${ownProp.category} · $${ownProp.price.toLocaleString()}`,
            x: bx + 12,
            z: bz + 14,
            radius: 5.2,
            propertyId: ownProp.id,
          });
        } else if (ownProp.category === 'Apartment') {
          // Glass Tower Residence with Lobby Canopy
          const tower = new THREE.Mesh(new THREE.BoxGeometry(32, 34, 28), skyscraperMats[1]);
          tower.position.set(bx, 17.16, bz - 6);
          tower.castShadow = true;
          tower.receiveShadow = true;
          zg.add(tower);

          const canopy = new THREE.Mesh(
            new THREE.BoxGeometry(14, 0.5, 6),
            new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 }),
          );
          canopy.position.set(bx, 4.2, bz + 10);
          zg.add(canopy);

          addBoxCollider(bx, bz - 6, 32, 28, 34);
          addZoneBeaconPad(zg, bx, bz + 16, 0xf59e0b, 3.0);
          interactZones.push({
            id: `zone_${ownProp.id}`,
            kind: 'property',
            name: ownProp.name,
            subtitle: `${ownProp.category} · $${ownProp.price.toLocaleString()}`,
            x: bx,
            z: bz + 16,
            radius: 5.2,
            propertyId: ownProp.id,
          });
        } else {
          // Suburban Home + Detached Garage Bay
          const home = new THREE.Mesh(new THREE.BoxGeometry(20, 6.2, 14), houseWallMat);
          home.position.set(bx - 5, 3.25, bz - 8);
          home.castShadow = true;
          zg.add(home);

          const roof = new THREE.Mesh(new THREE.ConeGeometry(15.5, 4.2, 4), roofMat);
          roof.rotation.y = Math.PI / 4;
          roof.position.set(bx - 5, 8.3, bz - 8);
          zg.add(roof);

          const garageWing = new THREE.Mesh(
            new THREE.BoxGeometry(10, 4.2, 11),
            new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 }),
          );
          garageWing.position.set(bx + 12, 2.25, bz - 7);
          garageWing.castShadow = true;
          zg.add(garageWing);

          addBoxCollider(bx - 5, bz - 8, 20, 14, 7);
          addBoxCollider(bx + 12, bz - 7, 10, 11, 4.5);
          addZoneBeaconPad(zg, bx - 4, bz + 10, 0xf59e0b, 2.8);
          interactZones.push({
            id: `zone_${ownProp.id}`,
            kind: 'property',
            name: ownProp.name,
            subtitle: `${ownProp.category} · $${ownProp.price.toLocaleString()}`,
            x: bx - 4,
            z: bz + 10,
            radius: 5.2,
            propertyId: ownProp.id,
          });
        }

        treePositions.push({ x: bx - 22, z: bz + 18, scale: 0.9, tint: 0.35 });
        treePositions.push({ x: bx + 22, z: bz - 20, scale: 0.85, tint: 0.65 });
      } else if ((bx === 40 && bz === 40) || (bx === 120 && bz === 40)) {
        // CENTRAL CITY PARK & PLAYGROUND
        const lawn = new THREE.Mesh(new THREE.BoxGeometry(58, 0.18, 58), grassMat);
        lawn.position.set(bx, 0.1, bz);
        lawn.receiveShadow = true;
        zg.add(lawn);

        const pathH = new THREE.Mesh(new THREE.BoxGeometry(58, 0.19, 4.5), sidewalkMat);
        pathH.position.set(bx, 0.11, bz);
        zg.add(pathH);
        const pathV = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.19, 58), sidewalkMat);
        pathV.position.set(bx, 0.11, bz);
        zg.add(pathV);

        if (bx === 40) {
          const basin = new THREE.Mesh(
            new THREE.CylinderGeometry(7.2, 7.6, 0.85, 24),
            new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.6 }),
          );
          basin.position.set(bx, 0.55, bz);
          basin.castShadow = true;
          zg.add(basin);

          const fountainWater = new THREE.Mesh(
            new THREE.CylinderGeometry(6.5, 6.5, 0.15, 24),
            new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, roughness: 0.08, metalness: 0.1, clearcoat: 1 }),
          );
          fountainWater.position.set(bx, 0.92, bz);
          zg.add(fountainWater);

          const spire = new THREE.Mesh(
            new THREE.CylinderGeometry(0.8, 1.4, 3.2, 12),
            new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5 }),
          );
          spire.position.set(bx, 1.8, bz);
          zg.add(spire);
          addBoxCollider(bx, bz, 14.5, 14.5, 4);

          landmarks.push({
            id: 'central_park',
            name: 'Central Horizon Park',
            district: 'Midtown Green',
            x: bx,
            z: bz,
            radius: 30,
          });
        } else {
          // Playground & Sports Court at (120, 40)
          const court = new THREE.Mesh(
            new THREE.BoxGeometry(22, 0.21, 14),
            new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.78 }),
          );
          court.position.set(bx - 12, 0.12, bz - 12);
          zg.add(court);

          const slideFrame = new THREE.Mesh(
            new THREE.BoxGeometry(4, 2.8, 3),
            new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 }),
          );
          slideFrame.position.set(bx + 12, 1.5, bz + 12);
          zg.add(slideFrame);
          addBoxCollider(bx + 12, bz + 12, 4, 3, 2.8);
        }

        for (let t = 0; t < 12; t++) {
          const tx = bx + (rand() - 0.5) * 48;
          const tz = bz + (rand() - 0.5) * 48;
          if (Math.hypot(tx - bx, tz - bz) > 10 && Math.abs(tx - bx) > 4 && Math.abs(tz - bz) > 4) {
            treePositions.push({ x: tx, z: tz, scale: 0.85 + rand() * 0.35, tint: rand() });
          }
        }
      } else if ((bx === -120 && bz === -120) || (bx === 200 && bz === 120)) {
        // INTERACTIVE GAS STATION
        const stName = bx < 0 ? 'Apex Energy North' : 'Harbor Fuel & Service';
        const stId = bx < 0 ? 'gas_north' : 'gas_harbor';

        const forecourt = new THREE.Mesh(new THREE.BoxGeometry(58, 0.17, 58), asphaltMat);
        forecourt.position.set(bx, 0.09, bz);
        forecourt.receiveShadow = true;
        zg.add(forecourt);

        const canopy = new THREE.Mesh(
          new THREE.BoxGeometry(28, 1.2, 16),
          new THREE.MeshStandardMaterial({ color: 0xf4f4f5, roughness: 0.4 }),
        );
        canopy.position.set(bx, 6.2, bz - 4);
        canopy.castShadow = true;
        zg.add(canopy);

        const brandTrim = new THREE.Mesh(
          new THREE.BoxGeometry(28.3, 0.55, 16.3),
          new THREE.MeshStandardMaterial({
            color: 0xdc2626,
            emissive: 0xef4444,
            emissiveIntensity: 0.55,
            roughness: 0.3,
          }),
        );
        brandTrim.position.set(bx, 6.55, bz - 4);
        zg.add(brandTrim);

        for (const px of [-9, 9]) {
          const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 6.0, 12), darkMetalMat);
          pillar.position.set(bx + px, 3.0, bz - 4);
          pillar.castShadow = true;
          zg.add(pillar);
          addBoxCollider(bx + px, bz - 4, 1.1, 1.1, 6);
        }

        for (const px of [-4.5, 4.5]) {
          const pump = new THREE.Mesh(
            new THREE.BoxGeometry(1.1, 1.8, 0.7),
            new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.4 }),
          );
          pump.position.set(bx + px, 1.0, bz - 4);
          pump.castShadow = true;
          zg.add(pump);
          addBoxCollider(bx + px, bz - 4, 1.3, 0.9, 2);
        }

        const store = new THREE.Mesh(
          new THREE.BoxGeometry(24, 5.2, 11),
          new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.55 }),
        );
        store.position.set(bx, 2.7, bz - 19);
        store.castShadow = true;
        store.receiveShadow = true;
        zg.add(store);
        addBoxCollider(bx, bz - 19, 24, 11, 5.2);

        const ring = new THREE.Mesh(
          new THREE.RingGeometry(4.2, 4.7, 32).rotateX(-Math.PI / 2),
          new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide }),
        );
        ring.position.set(bx, 0.2, bz + 3.5);
        zg.add(ring);

        gasStations.push({ id: stId, name: stName, x: bx, z: bz + 3.5, radius: 10.5 });
        landmarks.push({ id: stId, name: stName, district: 'Service Plaza', x: bx, z: bz, radius: 22 });
      } else if ((bx === 120 && bz === -40) || (bx === -200 && bz === 120)) {
        // MULTI-BAY PARKING GARAGE & DECK
        const lot = new THREE.Mesh(new THREE.BoxGeometry(58, 0.17, 58), asphaltMat);
        lot.position.set(bx, 0.09, bz);
        lot.receiveShadow = true;
        zg.add(lot);

        for (let row = -1; row <= 1; row += 2) {
          for (let col = -18; col <= 18; col += 6) {
            const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 6.2).rotateX(-Math.PI / 2), whiteLineMat);
            stripe.position.set(bx + col, 0.2, bz + row * 12);
            zg.add(stripe);
          }
        }

        const booth = new THREE.Mesh(
          new THREE.BoxGeometry(4, 3.2, 4),
          new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 }),
        );
        booth.position.set(bx - 24, 1.7, bz - 24);
        booth.castShadow = true;
        zg.add(booth);
        addBoxCollider(bx - 24, bz - 24, 4, 4, 3.2);

        if (bx === 120 && bz === -40) {
          landmarks.push({
            id: 'midtown_parking',
            name: 'Midtown Parking Deck',
            district: 'East Commercial',
            x: bx,
            z: bz,
            radius: 26,
          });
          parkingBays.push(
            { id: 1, title: 'Bay A1 — Straight Entry', x: bx - 15, z: bz + 12, heading: 0 },
            { id: 2, title: 'Bay B4 — Reverse Angle', x: bx + 9, z: bz - 12, heading: Math.PI },
            { id: 3, title: 'Harbor Pier VIP Bay', x: 268, z: 0, heading: Math.PI / 2 },
          );
        }
      } else if (bx === -40 && bz === 40) {
        // APEX UNDERGROUND SHOWROOM GARAGE PAVILION
        const plaza = new THREE.Mesh(
          new THREE.BoxGeometry(52, 0.25, 52),
          new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.45, metalness: 0.3 }),
        );
        plaza.position.set(bx, 0.14, bz);
        plaza.receiveShadow = true;
        zg.add(plaza);

        const pavilion = new THREE.Mesh(
          new THREE.BoxGeometry(28, 11, 44),
          new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.35, metalness: 0.55 }),
        );
        pavilion.position.set(bx - 12, 5.6, bz);
        pavilion.castShadow = true;
        pavilion.receiveShadow = true;
        zg.add(pavilion);
        addBoxCollider(bx - 12, bz, 28, 44, 11);

        const canopy = new THREE.Mesh(
          new THREE.BoxGeometry(16, 0.6, 22),
          new THREE.MeshPhysicalMaterial({ color: 0x09111e, roughness: 0.1, metalness: 0.5, clearcoat: 1 }),
        );
        canopy.position.set(bx + 10, 6.2, bz);
        zg.add(canopy);

        const amberHeader = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 1.3, 22.2),
          new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 1.2 }),
        );
        amberHeader.position.set(bx + 18, 6.2, bz);
        zg.add(amberHeader);

        addZoneBeaconPad(zg, bx + 15, bz, 0xf59e0b, 3.9);
        interactZones.push({
          id: 'zone_showroom_main',
          kind: 'showroom',
          name: 'Apex Underground Showroom',
          subtitle: '3D Garage & Tuning Workshop',
          x: bx + 15,
          z: bz,
          radius: 5.5,
        });

        landmarks.push({
          id: 'apex_showroom',
          name: 'Apex Underground Showroom',
          district: 'Downtown Main Ave',
          x: bx + 15,
          z: bz,
          radius: 26,
        });
      } else if (bx === -120 && bz === 40) {
        // SKYLINE NEW & USED CAR DEALERSHIP + TUNING
        const showroom = new THREE.Mesh(
          new THREE.BoxGeometry(44, 10, 28),
          new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.3, metalness: 0.6 }),
        );
        showroom.position.set(bx, 5.1, bz - 6);
        showroom.castShadow = true;
        zg.add(showroom);

        const neonStrip = new THREE.Mesh(
          new THREE.BoxGeometry(44.4, 0.55, 28.4),
          new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x06b6d4, emissiveIntensity: 0.9 }),
        );
        neonStrip.position.set(bx, 9.8, bz - 6);
        zg.add(neonStrip);

        // Two outdoor display plinths for Dealership
        for (const px of [bx - 12, bx + 12]) {
          const plinth = new THREE.Mesh(
            new THREE.CylinderGeometry(3.2, 3.4, 0.4, 24),
            new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.3 }),
          );
          plinth.position.set(px, 0.25, bz + 16);
          zg.add(plinth);
        }

        addBoxCollider(bx, bz - 6, 44, 28, 10);
        addZoneBeaconPad(zg, bx, bz + 18, 0x06b6d4, 3.2);
        interactZones.push({
          id: 'zone_dealer_new',
          kind: 'dealership_new',
          name: 'Horizon Motors Dealership',
          subtitle: 'Buy New Cars, Compare & Test Drive',
          x: bx,
          z: bz + 18,
          radius: 5.5,
        });

        landmarks.push({
          id: 'skyline_garage',
          name: 'Horizon Motors & Tuning',
          district: 'West Auto Row',
          x: bx,
          z: bz,
          radius: 28,
        });
      } else if (bx === -120 && bz === 120) {
        // USED CAR MARKET LOT + SERVICE CENTER
        const lot = new THREE.Mesh(new THREE.BoxGeometry(58, 0.17, 58), asphaltMat);
        lot.position.set(bx, 0.09, bz);
        zg.add(lot);

        const office = new THREE.Mesh(
          new THREE.BoxGeometry(22, 5.5, 14),
          new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.55 }),
        );
        office.position.set(bx, 2.9, bz - 16);
        office.castShadow = true;
        zg.add(office);
        addBoxCollider(bx, bz - 16, 22, 14, 5.5);

        const sign = new THREE.Mesh(
          new THREE.BoxGeometry(16, 1.5, 0.6),
          new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.7 }),
        );
        sign.position.set(bx, 6.2, bz - 8.8);
        zg.add(sign);

        addZoneBeaconPad(zg, bx, bz + 8, 0x10b981, 3.0);
        interactZones.push({
          id: 'zone_dealer_used',
          kind: 'dealership_used',
          name: 'Westside Certified Pre-Owned',
          subtitle: 'Buy Used Cars & Sell Owned Vehicles',
          x: bx,
          z: bz + 8,
          radius: 5.5,
        });
      } else if (bx === 40 && bz === -120) {
        // METRO POLICE PRECINCT HQ
        const hq = new THREE.Mesh(
          new THREE.BoxGeometry(42, 14, 30),
          new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 }),
        );
        hq.position.set(bx, 7.1, bz - 4);
        hq.castShadow = true;
        zg.add(hq);

        const blueBand = new THREE.Mesh(
          new THREE.BoxGeometry(42.4, 0.9, 30.4),
          new THREE.MeshStandardMaterial({ color: 0x2563eb, emissive: 0x3b82f6, emissiveIntensity: 0.95 }),
        );
        blueBand.position.set(bx, 13.6, bz - 4);
        zg.add(blueBand);

        addBoxCollider(bx, bz - 4, 42, 30, 14);
        addZoneBeaconPad(zg, bx, bz + 18, 0x3b82f6, 2.8);
        interactZones.push({
          id: 'zone_police_hq',
          kind: 'police_station',
          name: 'Metro Police Precinct',
          subtitle: 'Pay Fines & Clear Wanted Status',
          x: bx,
          z: bz + 18,
          radius: 5.2,
        });

        landmarks.push({
          id: 'police_hq',
          name: 'Metro Police HQ',
          district: 'Civic North',
          x: bx,
          z: bz,
          radius: 26,
        });
      } else if (bx === -40 && bz === 120) {
        // GRAND SHOPPING MALL + BISTRO RESTAURANT + CLOTHING & BARBER SHOPS
        const mall = new THREE.Mesh(
          new THREE.BoxGeometry(50, 14, 34),
          new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.45, metalness: 0.2 }),
        );
        mall.position.set(bx, 7.1, bz - 7);
        mall.castShadow = true;
        mall.receiveShadow = true;
        zg.add(mall);

        const glassFacade = new THREE.Mesh(
          new THREE.BoxGeometry(42, 9, 1.2),
          new THREE.MeshPhysicalMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.3, clearcoat: 1 }),
        );
        glassFacade.position.set(bx, 5.5, bz + 10.1);
        zg.add(glassFacade);

        const marquee = new THREE.Mesh(
          new THREE.BoxGeometry(28, 2.2, 2.5),
          new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.45 }),
        );
        marquee.position.set(bx, 12.2, bz + 11);
        zg.add(marquee);

        addBoxCollider(bx, bz - 7, 50, 34, 14);

        // 3 Enterable Life-Sim Shops right along the Mall Promenade!
        addZoneBeaconPad(zg, bx - 16, bz + 18, 0xf97316, 2.2);
        interactZones.push({
          id: 'zone_restaurant_mall',
          kind: 'restaurant',
          name: 'Bistro Horizon Cafe',
          subtitle: 'Dine In & Buy Energy/Meals',
          x: bx - 16,
          z: bz + 18,
          radius: 4.5,
        });

        addZoneBeaconPad(zg, bx, bz + 18, 0xec4899, 2.2);
        interactZones.push({
          id: 'zone_clothing_mall',
          kind: 'clothing',
          name: 'Atelier Apparel Boutique',
          subtitle: 'Customize Jackets & Outfits',
          x: bx,
          z: bz + 18,
          radius: 4.5,
        });

        addZoneBeaconPad(zg, bx + 16, bz + 18, 0xa855f7, 2.2);
        interactZones.push({
          id: 'zone_barber_mall',
          kind: 'barber',
          name: 'Razor & Crown Barber',
          subtitle: 'Hairstyles, Beard & Shades',
          x: bx + 16,
          z: bz + 18,
          radius: 4.5,
        });

        landmarks.push({
          id: 'grand_mall',
          name: 'Grand Horizon Mall',
          district: 'Retail Quarter',
          x: bx,
          z: bz,
          radius: 30,
        });
      } else if (Math.abs(bx) <= 120 && Math.abs(bz) <= 120) {
        // DOWNTOWN SKYSCRAPER DISTRICT
        if (bx === -40 && bz === -40) {
          const h = 112;
          const mat = skyscraperMats[0];
          const podium = new THREE.Mesh(new THREE.BoxGeometry(48, 12, 48), darkMetalMat);
          podium.position.set(bx, 6, bz);
          podium.castShadow = true;
          podium.receiveShadow = true;
          zg.add(podium);

          const tower = new THREE.Mesh(new THREE.BoxGeometry(36, h, 36), mat);
          tower.position.set(bx, h * 0.5 + 12, bz);
          tower.castShadow = true;
          tower.receiveShadow = true;
          zg.add(tower);

          const crown = new THREE.Mesh(new THREE.BoxGeometry(24, 14, 24), mat);
          crown.position.set(bx, h + 18, bz);
          zg.add(crown);

          const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 1.2, 22, 8), darkMetalMat);
          spire.position.set(bx, h + 34, bz);
          zg.add(spire);

          addBoxCollider(bx, bz, 48, 48, h + 20);
          landmarks.push({
            id: 'apex_tower',
            name: 'Apex Financial Tower',
            district: 'Downtown Core',
            x: bx,
            z: bz,
            radius: 34,
          });
        } else {
          for (const offset of [-13.5, 13.5]) {
            const w = 22 + rand() * 4;
            const d = 44 + rand() * 6;
            const h = 38 + rand() * 52;
            const mat = skyscraperMats[Math.floor(rand() * skyscraperMats.length)];
            const bldg = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
            bldg.position.set(bx + offset, h * 0.5 + 0.16, bz);
            bldg.castShadow = true;
            bldg.receiveShadow = true;
            zg.add(bldg);

            const roofTrim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 1.2, d + 0.6), darkMetalMat);
            roofTrim.position.set(bx + offset, h + 0.6, bz);
            zg.add(roofTrim);

            addBoxCollider(bx + offset, bz, w, d, h);
          }
        }
      } else {
        // RESIDENTIAL HOUSES, RESTAURANTS, SHOPS & SUBURBS
        const isShopBlock = (bxIdx + bzIdx) % 3 === 0;
        if (isShopBlock) {
          const awningColors = [0xdc2626, 0x0284c7, 0x059669, 0xd97706];
          let idx = 0;
          for (const ox of [-14, 14]) {
            for (const oz of [-14, 14]) {
              const w = 18;
              const d = 18;
              const h = 8 + rand() * 6;
              const shop = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), skyscraperMats[2 + (idx % 2)]);
              shop.position.set(bx + ox, h * 0.5 + 0.16, bz + oz);
              shop.castShadow = true;
              shop.receiveShadow = true;
              zg.add(shop);

              const awning = new THREE.Mesh(
                new THREE.BoxGeometry(12, 0.5, 2.5),
                new THREE.MeshStandardMaterial({ color: awningColors[idx % awningColors.length], roughness: 0.6 }),
              );
              awning.position.set(bx + ox, 3.6, bz + oz + d * 0.5 + 1.0);
              zg.add(awning);

              addBoxCollider(bx + ox, bz + oz, w, d, h);
              idx++;
            }
          }

          if (bx === 200 && bz === 40) {
            addZoneBeaconPad(zg, bx, bz + 26, 0xf97316, 2.3);
            interactZones.push({
              id: 'zone_harbor_cafe',
              kind: 'restaurant',
              name: 'Harbor Espresso & Grill',
              subtitle: 'Waterfront Dining & Energy Drinks',
              x: bx,
              z: bz + 26,
              radius: 4.5,
            });
          }
        } else {
          const subLawn = new THREE.Mesh(new THREE.BoxGeometry(56, 0.17, 56), grassMat);
          subLawn.position.set(bx, 0.09, bz);
          subLawn.receiveShadow = true;
          zg.add(subLawn);

          for (const ox of [-14, 14]) {
            for (const oz of [-14, 14]) {
              const w = 13 + rand() * 3;
              const d = 11 + rand() * 3;
              const h = 4.6 + rand() * 1.4;
              const house = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), houseWallMat);
              house.position.set(bx + ox, h * 0.5 + 0.16, bz + oz);
              house.castShadow = true;
              house.receiveShadow = true;
              zg.add(house);

              const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, 3.4, 4), roofMat);
              roof.rotation.y = Math.PI / 4;
              roof.position.set(bx + ox, h + 1.85, bz + oz);
              roof.castShadow = true;
              zg.add(roof);

              addBoxCollider(bx + ox, bz + oz, w, d, h);
              treePositions.push({
                x: bx + ox + (ox > 0 ? 9 : -9),
                z: bz + oz + 7,
                scale: 0.75 + rand() * 0.3,
                tint: rand(),
              });
            }
          }
        }
      }
    }
  }

  // 7. METRO INTERNATIONAL AIRPORT (Southwest Perimeter: x -345..-265, z 335..405 + Runway)
  const airportGroup = registerZoneGroup(-310, 368);
  const tarmac = new THREE.Mesh(new THREE.BoxGeometry(165, 0.2, 68), asphaltMat);
  tarmac.position.set(-295, 0.06, 368);
  tarmac.receiveShadow = true;
  airportGroup.add(tarmac);

  // Runway 09L/27R markings
  for (let rx = -360; rx <= -225; rx += 14) {
    const rwDash = new THREE.Mesh(new THREE.PlaneGeometry(7, 0.9).rotateX(-Math.PI / 2), whiteLineMat);
    rwDash.position.set(rx, 0.17, 378);
    airportGroup.add(rwDash);
  }
  const terminal = new THREE.Mesh(
    new THREE.BoxGeometry(46, 9, 18),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.25 }),
  );
  terminal.position.set(-275, 4.6, 344);
  terminal.castShadow = true;
  airportGroup.add(terminal);
  addBoxCollider(-275, 344, 46, 18, 9);

  const atcTower = new THREE.Mesh(
    new THREE.CylinderGeometry(2.8, 3.6, 26, 12),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 }),
  );
  atcTower.position.set(-312, 13, 344);
  atcTower.castShadow = true;
  airportGroup.add(atcTower);
  const atcCab = new THREE.Mesh(
    new THREE.CylinderGeometry(5.2, 3.5, 4.2, 12),
    new THREE.MeshPhysicalMaterial({ color: 0x0284c7, roughness: 0.1, clearcoat: 1 }),
  );
  atcCab.position.set(-312, 27, 344);
  airportGroup.add(atcCab);
  addBoxCollider(-312, 344, 8, 8, 28);

  // Parked Jetliner on Apron
  const jetGroup = new THREE.Group();
  jetGroup.position.set(-335, 3.0, 366);
  const fuselage = new THREE.Mesh(
    new THREE.CylinderGeometry(2.0, 2.0, 28, 16).rotateZ(Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.4 }),
  );
  jetGroup.add(fuselage);
  const wing = new THREE.Mesh(
    new THREE.BoxGeometry(5.5, 0.35, 24),
    new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.35 }),
  );
  wing.position.set(1, -0.3, 0);
  jetGroup.add(wing);
  const tailFin = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 5.2, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35 }),
  );
  tailFin.position.set(-12, 2.6, 0);
  jetGroup.add(tailFin);
  airportGroup.add(jetGroup);
  addBoxCollider(-335, 366, 26, 10, 6);

  landmarks.push({
    id: 'metro_airport',
    name: 'Metro International Airport',
    district: 'South Aviation Zone',
    x: -290,
    z: 365,
    radius: 34,
  });

  // 8. CONCRETE DRIVE-THROUGH TUNNEL & HIGHWAY OVERPASS ARCH (North Highway z = -318)
  const tunnelGroup = registerZoneGroup(-120, -318);
  const tunnelLength = 72;
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });
  const roofTunnel = new THREE.Mesh(new THREE.BoxGeometry(tunnelLength, 1.4, 21), wallMat);
  roofTunnel.position.set(-120, 7.6, -318);
  tunnelGroup.add(roofTunnel);
  for (const tz of [-328, -308]) {
    const tWall = new THREE.Mesh(new THREE.BoxGeometry(tunnelLength, 7.4, 1.6), wallMat);
    tWall.position.set(-120, 3.7, tz);
    tWall.castShadow = true;
    tunnelGroup.add(tWall);
    addBoxCollider(-120, tz, tunnelLength, 1.8, 7.5);
  }
  const tunnelLed = new THREE.Mesh(
    new THREE.BoxGeometry(tunnelLength - 4, 0.2, 0.6),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfde047, emissiveIntensity: 1.5 }),
  );
  tunnelLed.position.set(-120, 6.75, -318);
  tunnelGroup.add(tunnelLed);

  // Suspended Cable Bridge Portal Frame on North-East Highway (x = 120, z = -318)
  const bridgeGroup = registerZoneGroup(120, -318);
  for (const bxOff of [90, 150]) {
    for (const bzOff of [-328.5, -307.5]) {
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(2.2, 22, 2.2), darkMetalMat);
      pylon.position.set(bxOff, 11, bzOff);
      bridgeGroup.add(pylon);
      addBoxCollider(bxOff, bzOff, 2.4, 2.4, 22);
    }
    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.0, 23), darkMetalMat);
    crossBeam.position.set(bxOff, 20, -318);
    bridgeGroup.add(crossBeam);
  }

  // 9. SCENIC MOUNTAIN RIDGE ROAD & OVERLOOK (Northwest x: -380..-280, z: -380..-270)
  const mountainGroup = registerZoneGroup(-340, -340);
  const mtnRoadMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
  const mtnLoop = new THREE.Mesh(new THREE.RingGeometry(44, 58, 36).rotateX(-Math.PI / 2), mtnRoadMat);
  mtnLoop.position.set(-345, 0.015, -345);
  mountainGroup.add(mtnLoop);

  const mtnPeak = new THREE.Mesh(
    new THREE.ConeGeometry(34, 46, 8),
    new THREE.MeshStandardMaterial({ color: 0x3f4f3a, roughness: 0.94 }),
  );
  mtnPeak.position.set(-345, 22, -345);
  mountainGroup.add(mtnPeak);
  addBoxCollider(-345, -345, 58, 58, 46);

  landmarks.push({
    id: 'mountain_overlook',
    name: 'Emerald Ridge Mountain Loop',
    district: 'North Highlands',
    x: -345,
    z: -292,
    radius: 30,
  });

  // Harbor Pier Landmark
  landmarks.push({
    id: 'harbor_pier',
    name: 'Harbor Waterfront Pier',
    district: 'East Coast',
    x: 272,
    z: 0,
    radius: 26,
  });

  // Interactive NPCs at key spots
  interactZones.push(
    {
      id: 'npc_marco',
      kind: 'npc',
      name: 'Marco (Tuner Mechanic)',
      subtitle: 'Talk [F] — Pro Tuning Tips',
      x: -24,
      z: 34,
      radius: 4.2,
      npcDialogue: [
        'Welcome to Apex Underground! Upgrade your Turbo & Engine inside the Garage Tuning Workshop.',
        'Switch to Drift Tires and raise Drift Mode multiplier on wet rain asphalt for huge combos.',
      ],
    },
    {
      id: 'npc_elena',
      kind: 'npc',
      name: 'Elena (Real Estate Broker)',
      subtitle: 'Talk [F] — City Properties',
      x: 28,
      z: 48,
      radius: 4.2,
      npcDialogue: [
        'Buying Apartments and Luxury Villas gives you enterable furnished interiors plus daily passive rent!',
        'You can customize your interior furniture theme and park your favorite car right inside.',
      ],
    },
    {
      id: 'npc_captain',
      kind: 'npc',
      name: 'Captain Reed (Airport Dispatch)',
      subtitle: 'Talk [F] — Courier Contracts',
      x: -275,
      z: 356,
      radius: 4.6,
      npcDialogue: [
        'Metro International Runway 09L is active. Open your Jobs app on the smartphone to run Airport Courier contracts!',
      ],
    },
  );

  // Visual 3D NPC standees for the 3 interactive NPCs
  for (const npc of interactZones.filter((z) => z.kind === 'npc')) {
    const npcGroup = new THREE.Group();
    npcGroup.position.set(npc.x, 0.16, npc.z);
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.62, 0.22),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.6 }),
    );
    body.position.y = 1.15;
    npcGroup.add(body);
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.24, 0.22),
      new THREE.MeshStandardMaterial({ color: 0xe0ac8b, roughness: 0.65 }),
    );
    head.position.y = 1.62;
    npcGroup.add(head);
    const legs = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.8, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 }),
    );
    legs.position.y = 0.42;
    npcGroup.add(legs);
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.65, 0.8, 20).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide }),
    );
    halo.position.y = 0.08;
    npcGroup.add(halo);
    root.add(npcGroup);
  }

  // 10. Instanced Trees
  if (treePositions.length > 0) {
    const trunkGeo = new THREE.CylinderGeometry(0.24, 0.36, 2.8, 7);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.92 });
    const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treePositions.length);

    const canopyGeo = new THREE.DodecahedronGeometry(2.1, 1);
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
    const canopyInst = new THREE.InstancedMesh(canopyGeo, canopyMat, treePositions.length);

    const color = new THREE.Color();
    treePositions.forEach((tp, idx) => {
      dummy.position.set(tp.x, 1.4 * tp.scale, tp.z);
      dummy.rotation.set(0, tp.tint * Math.PI * 2, 0);
      dummy.scale.set(tp.scale, tp.scale, tp.scale);
      dummy.updateMatrix();
      trunkInst.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(tp.x, 3.7 * tp.scale, tp.z);
      dummy.scale.set(tp.scale * 1.1, tp.scale * 1.25, tp.scale * 1.1);
      dummy.updateMatrix();
      canopyInst.setMatrixAt(idx, dummy.matrix);

      color.setHSL(0.28 + tp.tint * 0.06, 0.45, 0.25 + tp.tint * 0.14);
      canopyInst.setColorAt(idx, color);
    });
    trunkInst.instanceMatrix.needsUpdate = true;
    trunkInst.computeBoundingSphere();
    canopyInst.instanceMatrix.needsUpdate = true;
    if (canopyInst.instanceColor) canopyInst.instanceColor.needsUpdate = true;
    canopyInst.computeBoundingSphere();
    trunkInst.castShadow = true;
    canopyInst.castShadow = true;
    root.add(trunkInst);
    root.add(canopyInst);
  }

  // 11. Instanced Streetlamps
  if (lampPositions.length > 0) {
    const poleGeo = new THREE.CylinderGeometry(0.11, 0.16, 6.8, 8);
    const poleInst = new THREE.InstancedMesh(poleGeo, darkMetalMat, lampPositions.length);
    const bulbGeo = new THREE.BoxGeometry(0.9, 0.18, 0.45);
    const bulbInst = new THREE.InstancedMesh(bulbGeo, lampBulbMat, lampPositions.length);

    lampPositions.forEach((lp, idx) => {
      dummy.position.set(lp.x, 3.4, lp.z);
      dummy.rotation.set(0, lp.rotY, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      poleInst.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(lp.x + Math.sin(lp.rotY) * 0.65, 6.8, lp.z + Math.cos(lp.rotY) * 0.65);
      dummy.updateMatrix();
      bulbInst.setMatrixAt(idx, dummy.matrix);
    });
    poleInst.instanceMatrix.needsUpdate = true;
    poleInst.computeBoundingSphere();
    bulbInst.instanceMatrix.needsUpdate = true;
    bulbInst.computeBoundingSphere();
    root.add(poleInst);
    root.add(bulbInst);
  }

  // Major Traffic Light Intersections (inner grid)
  const trafficLightIntersections: { x: number; z: number }[] = [];
  for (const ix of [-160, -80, 0, 80, 160]) {
    for (const iz of [-160, -80, 0, 80, 160]) {
      trafficLightIntersections.push({ x: ix, z: iz });
    }
  }

  // Driving Challenge Checkpoints
  const challengeCheckpoints = [
    new THREE.Vector3(0, 0, -80),
    new THREE.Vector3(160, 0, -80),
    new THREE.Vector3(240, 0, 80),
    new THREE.Vector3(80, 0, 160),
    new THREE.Vector3(-160, 0, 160),
    new THREE.Vector3(-160, 0, 0),
  ];

  const updateDayNight = (nightFactor: number, isRaining: boolean, isSnow: boolean, elapsed: number) => {
    const windowGlow = THREE.MathUtils.clamp(nightFactor * 1.15, 0, 1.1);
    for (const mat of skyscraperMats) {
      mat.emissiveIntensity = windowGlow;
    }
    lampBulbMat.emissiveIntensity = 0.15 + nightFactor * 2.2;

    asphaltMat.roughness = isRaining ? 0.16 : isSnow ? 0.84 : 0.72;
    asphaltMat.metalness = isRaining ? 0.28 : 0.08;
    asphaltMat.clearcoat = isSoftwareGl ? 0.0 : isRaining ? 0.88 : 0.14;
    asphaltMat.clearcoatRoughness = isRaining ? 0.08 : 0.42;
    asphaltMat.envMapIntensity = isRaining ? 2.1 : 1.25;

    terrainMat.color.setHex(isSnow ? 0xdbeafe : 0x3b4d32);
    grassMat.color.setHex(isSnow ? 0xe2e8f0 : 0xffffff);

    textures.waterNormalMap.offset.x = elapsed * 0.025;
    textures.waterNormalMap.offset.y = elapsed * 0.018;
  };

  const updateZoneVisibility = (playerX: number, playerZ: number, preset: GraphicsPreset) => {
    if (preset === 'high' || preset === 'ultra') {
      for (const z of zoneGroups) z.group.visible = true;
      return;
    }
    const maxDist = preset === 'low' ? 235 : 330;
    const maxSq = maxDist * maxDist;
    for (const z of zoneGroups) {
      const dx = z.x - playerX;
      const dz = z.z - playerZ;
      z.group.visible = dx * dx + dz * dz <= maxSq;
    }
  };

  const showroomPortals: ShowroomPortal[] = [
    { name: 'Apex Underground Showroom', x: -25, z: 40, radius: 5.5 },
    { name: 'Horizon Motors Dealership', x: -120, z: 58, radius: 5.5 },
  ];

  return {
    root,
    colliders,
    roadCoords: ROAD_COORDS,
    landmarks,
    gasStations,
    showroomPortals,
    interactZones,
    trafficLightIntersections,
    parkingBays,
    challengeCheckpoints,
    asphaltMat,
    waterMesh,
    lampBulbMat,
    skyscraperMats,
    updateDayNight,
    updateZoneVisibility,
  };
}
