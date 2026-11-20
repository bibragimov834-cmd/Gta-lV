import * as THREE from 'three';
import { createLicensePlateTexture, ProceduralTextureSet } from './textures';
import {
  AssetSourceType,
  createDefaultTuning,
  IndicatorMode,
  VehicleSpec,
  VehicleTuningConfig,
} from './types';
import { LoadedGlbVehicle } from './vehicleLoader';

export interface VehicleMeshRig {
  root: THREE.Group;
  lod: THREE.LOD;
  chassisGroup: THREE.Group;
  assetSource: AssetSourceType;
  bodyPaintMaterials: THREE.MeshPhysicalMaterial[];
  wheelPivots: {
    fl: THREE.Group;
    fr: THREE.Group;
    rl: THREE.Group;
    rr: THREE.Group;
  };
  wheelRollMeshes: THREE.Group[];
  wheelBaseYs: number[];
  steeringWheel: THREE.Group;
  doorLPivot: THREE.Group;
  doorRPivot: THREE.Group;
  hoodPivot: THREE.Group;
  cockpitCameraAnchor: THREE.Object3D;
  hoodCameraAnchor: THREE.Object3D;
  headlightMat: THREE.MeshStandardMaterial;
  tailLightMat: THREE.MeshStandardMaterial;
  reverseLightMat: THREE.MeshStandardMaterial;
  indicatorLeftMat: THREE.MeshStandardMaterial;
  indicatorRightMat: THREE.MeshStandardMaterial;
  spotLightLeft: THREE.SpotLight;
  spotLightRight: THREE.SpotLight;
  contactShadow: THREE.Mesh;
  setColor: (hex: string) => void;
  applyTuning: (tuning: VehicleTuningConfig) => void;
  setLights: (
    headlights: boolean,
    braking: boolean,
    reversing: boolean,
    indicator: IndicatorMode,
    blinkOn: boolean,
  ) => void;
  setOpenables: (doorsProgress: number, hoodProgress: number) => void;
  setSuspension: (fl: number, fr: number, rl: number, rr: number) => void;
}

interface LoftStation {
  z: number;       // normalized -1 (rear) .. +1 (front)
  halfW: number;   // beltline half-width multiplier (0..1)
  sillY: number;   // bottom rocker height (0..1)
  beltY: number;   // waist/beltline height (0..1)
  roofY: number;   // hood/roof deck height (0..1)
  roofW: number;   // tumblehome roof half-width multiplier (0..1)
  hoodCrown?: number; // center dome elevation
}

function getControlStations(spec: VehicleSpec): LoftStation[] {
  if (spec.id === 'g63_amg') {
    // Mercedes-Benz G63 AMG: Upright iconic G-Class architecture with flat hood & vertical greenhouse
    return [
      { z: -1.00, halfW: 0.90, sillY: 0.10, beltY: 0.50, roofY: 0.90, roofW: 0.85, hoodCrown: 0.01 },
      { z: -0.92, halfW: 0.97, sillY: 0.05, beltY: 0.53, roofY: 0.96, roofW: 0.88, hoodCrown: 0.02 },
      { z: -0.50, halfW: 0.99, sillY: 0.04, beltY: 0.54, roofY: 0.99, roofW: 0.89, hoodCrown: 0.02 },
      { z: 0.14, halfW: 0.99, sillY: 0.04, beltY: 0.54, roofY: 0.99, roofW: 0.89, hoodCrown: 0.02 },
      { z: 0.35, halfW: 0.97, sillY: 0.05, beltY: 0.55, roofY: 0.62, roofW: 0.89, hoodCrown: 0.03 },
      { z: 0.68, halfW: 0.95, sillY: 0.06, beltY: 0.53, roofY: 0.58, roofW: 0.85, hoodCrown: 0.03 },
      { z: 0.93, halfW: 0.92, sillY: 0.08, beltY: 0.49, roofY: 0.52, roofW: 0.81, hoodCrown: 0.015 },
      { z: 1.00, halfW: 0.84, sillY: 0.13, beltY: 0.43, roofY: 0.45, roofW: 0.74, hoodCrown: 0.0 },
    ];
  }

  if (spec.id === 'bmw_m4') {
    // BMW M4 Competition G82: Wide rear haunches, low swept roofline, long sculpted power-dome hood, low aggressive nose
    return [
      { z: -1.00, halfW: 0.85, sillY: 0.13, beltY: 0.56, roofY: 0.62, roofW: 0.72, hoodCrown: 0.02 },
      { z: -0.88, halfW: 1.00, sillY: 0.04, beltY: 0.61, roofY: 0.67, roofW: 0.80, hoodCrown: 0.025 },
      { z: -0.58, halfW: 1.03, sillY: 0.03, beltY: 0.62, roofY: 0.80, roofW: 0.77, hoodCrown: 0.02 },
      { z: -0.22, halfW: 0.99, sillY: 0.03, beltY: 0.60, roofY: 0.99, roofW: 0.74, hoodCrown: 0.025 },
      { z: 0.12, halfW: 0.98, sillY: 0.03, beltY: 0.58, roofY: 0.97, roofW: 0.75, hoodCrown: 0.02 },
      { z: 0.43, halfW: 0.99, sillY: 0.04, beltY: 0.54, roofY: 0.59, roofW: 0.84, hoodCrown: 0.04 },
      { z: 0.75, halfW: 0.97, sillY: 0.04, beltY: 0.45, roofY: 0.50, roofW: 0.82, hoodCrown: 0.035 },
      { z: 0.94, halfW: 0.91, sillY: 0.05, beltY: 0.34, roofY: 0.38, roofW: 0.76, hoodCrown: 0.015 },
      { z: 1.00, halfW: 0.78, sillY: 0.08, beltY: 0.26, roofY: 0.28, roofW: 0.66, hoodCrown: 0.0 },
    ];
  }

  if (spec.id === 'cls_63') {
    // Mercedes-Benz CLS 63 AMG: Banana-line 4-door coupe sweeping fastback arch
    return [
      { z: -1.00, halfW: 0.82, sillY: 0.14, beltY: 0.53, roofY: 0.57, roofW: 0.68, hoodCrown: 0.02 },
      { z: -0.88, halfW: 0.97, sillY: 0.05, beltY: 0.58, roofY: 0.64, roofW: 0.78, hoodCrown: 0.025 },
      { z: -0.58, halfW: 1.01, sillY: 0.03, beltY: 0.60, roofY: 0.87, roofW: 0.75, hoodCrown: 0.03 },
      { z: -0.20, halfW: 1.00, sillY: 0.03, beltY: 0.59, roofY: 1.00, roofW: 0.72, hoodCrown: 0.03 },
      { z: 0.14, halfW: 0.99, sillY: 0.03, beltY: 0.58, roofY: 0.96, roofW: 0.74, hoodCrown: 0.025 },
      { z: 0.42, halfW: 0.98, sillY: 0.04, beltY: 0.54, roofY: 0.59, roofW: 0.83, hoodCrown: 0.035 },
      { z: 0.74, halfW: 0.96, sillY: 0.05, beltY: 0.46, roofY: 0.50, roofW: 0.81, hoodCrown: 0.03 },
      { z: 0.94, halfW: 0.89, sillY: 0.06, beltY: 0.35, roofY: 0.38, roofW: 0.74, hoodCrown: 0.015 },
      { z: 1.00, halfW: 0.77, sillY: 0.09, beltY: 0.27, roofY: 0.29, roofW: 0.65, hoodCrown: 0.0 },
    ];
  }

  if (spec.id === 'chevy_cobalt' || spec.id === 'chevy_gentra') {
    // Compact everyday sedans with taller greenhouse & practical notchback rear deck
    const tallCabin = spec.id === 'chevy_cobalt' ? 1.02 : 0.99;
    return [
      { z: -1.00, halfW: 0.85, sillY: 0.13, beltY: 0.55, roofY: 0.60, roofW: 0.76, hoodCrown: 0.01 },
      { z: -0.88, halfW: 0.96, sillY: 0.05, beltY: 0.58, roofY: 0.64, roofW: 0.82, hoodCrown: 0.015 },
      { z: -0.58, halfW: 0.98, sillY: 0.04, beltY: 0.58, roofY: 0.74, roofW: 0.80, hoodCrown: 0.015 },
      { z: -0.30, halfW: 0.98, sillY: 0.04, beltY: 0.58, roofY: tallCabin, roofW: 0.78, hoodCrown: 0.02 },
      { z: 0.16, halfW: 0.98, sillY: 0.04, beltY: 0.57, roofY: tallCabin * 0.98, roofW: 0.78, hoodCrown: 0.02 },
      { z: 0.44, halfW: 0.97, sillY: 0.04, beltY: 0.54, roofY: 0.59, roofW: 0.84, hoodCrown: 0.025 },
      { z: 0.76, halfW: 0.94, sillY: 0.05, beltY: 0.48, roofY: 0.52, roofW: 0.82, hoodCrown: 0.02 },
      { z: 0.94, halfW: 0.88, sillY: 0.07, beltY: 0.39, roofY: 0.42, roofW: 0.76, hoodCrown: 0.01 },
      { z: 1.00, halfW: 0.78, sillY: 0.10, beltY: 0.32, roofY: 0.34, roofW: 0.67, hoodCrown: 0.0 },
    ];
  }

  // Performance Executive Sedans: BMW M5 & Mercedes E63 S AMG
  return [
    { z: -1.00, halfW: 0.86, sillY: 0.13, beltY: 0.55, roofY: 0.59, roofW: 0.75, hoodCrown: 0.015 },
    { z: -0.88, halfW: 0.98, sillY: 0.04, beltY: 0.59, roofY: 0.65, roofW: 0.83, hoodCrown: 0.02 },
    { z: -0.56, halfW: 1.00, sillY: 0.03, beltY: 0.60, roofY: 0.78, roofW: 0.79, hoodCrown: 0.02 },
    { z: -0.26, halfW: 1.00, sillY: 0.03, beltY: 0.59, roofY: 1.00, roofW: 0.76, hoodCrown: 0.025 },
    { z: 0.15, halfW: 0.99, sillY: 0.03, beltY: 0.58, roofY: 0.98, roofW: 0.76, hoodCrown: 0.02 },
    { z: 0.41, halfW: 0.99, sillY: 0.04, beltY: 0.55, roofY: 0.60, roofW: 0.85, hoodCrown: 0.035 },
    { z: 0.75, halfW: 0.97, sillY: 0.05, beltY: 0.48, roofY: 0.52, roofW: 0.83, hoodCrown: 0.03 },
    { z: 0.94, halfW: 0.91, sillY: 0.06, beltY: 0.38, roofY: 0.42, roofW: 0.76, hoodCrown: 0.015 },
    { z: 1.00, halfW: 0.79, sillY: 0.09, beltY: 0.30, roofY: 0.32, roofW: 0.66, hoodCrown: 0.0 },
  ];
}

/**
 * Resamples control stations via smooth Catmull-Rom curves to eliminate angular facets.
 */
function sampleSmoothStations(control: LoftStation[], sampleCount: number): LoftStation[] {
  const cHalfW = new THREE.SplineCurve(control.map((s) => new THREE.Vector2(s.z, s.halfW)));
  const cSill = new THREE.SplineCurve(control.map((s) => new THREE.Vector2(s.z, s.sillY)));
  const cBelt = new THREE.SplineCurve(control.map((s) => new THREE.Vector2(s.z, s.beltY)));
  const cRoof = new THREE.SplineCurve(control.map((s) => new THREE.Vector2(s.z, s.roofY)));
  const cRoofW = new THREE.SplineCurve(control.map((s) => new THREE.Vector2(s.z, s.roofW)));
  const cCrown = new THREE.SplineCurve(control.map((s) => new THREE.Vector2(s.z, s.hoodCrown ?? 0.02)));

  const out: LoftStation[] = [];
  for (let i = 0; i < sampleCount; i++) {
    const t = i / (sampleCount - 1);
    const pt = cHalfW.getPoint(t);
    out.push({
      z: pt.x,
      halfW: pt.y,
      sillY: cSill.getPoint(t).y,
      beltY: cBelt.getPoint(t).y,
      roofY: cRoof.getPoint(t).y,
      roofW: cRoofW.getPoint(t).y,
      hoodCrown: cCrown.getPoint(t).y,
    });
  }
  return out;
}

/**
 * Builds a smooth 26-station organic automotive coachwork shell with recessed
 * fender wheel-well arches, sculpted door character lines, and curved tumblehome.
 */
function buildSculptedBodyGeometry(spec: VehicleSpec, stations: LoftStation[]): THREE.BufferGeometry {
  const halfL = spec.length * 0.5;
  const halfW = spec.width * 0.5;
  const h = spec.bodyHeight;
  const r = spec.rideHeight;
  const wbHalf = spec.wheelBase * 0.5;

  // 17 points around cross-section perimeter (smooth curved side profile + roof crown)
  const ringCount = 17;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let s = 0; s < stations.length; s++) {
    const st = stations[s];
    const z = st.z * halfL;
    const w = st.halfW * halfW;
    const rw = st.roofW * halfW;
    const sill = r + st.sillY * h;
    const lowerCrease = r + (st.sillY + (st.beltY - st.sillY) * 0.28) * h;
    const midDoor = r + (st.sillY + (st.beltY - st.sillY) * 0.62) * h;
    const belt = r + st.beltY * h;
    const shoulderTop = r + (st.beltY + (st.roofY - st.beltY) * 0.34) * h;
    const roof = r + st.roofY * h;
    const crown = (st.hoodCrown ?? 0.02) * h;

    // Fender arch flare & wheel-well lower tuck
    const distF = Math.abs(z - wbHalf);
    const distR = Math.abs(z + wbHalf);
    const archR = spec.wheelRadius * 1.18;
    const inFrontArch = Math.max(0, 1 - (distF / archR) ** 2);
    const inRearArch = Math.max(0, 1 - (distR / archR) ** 2);
    const archLipLift = Math.max(inFrontArch, inRearArch) * (spec.wheelRadius * 0.72);
    const archTuck = Math.max(inFrontArch, inRearArch) * 0.14;
    const flare =
      (Math.max(0, 1 - Math.abs(z - wbHalf) / (archR * 1.6)) +
        Math.max(0, 1 - Math.abs(z + wbHalf) / (archR * 1.6))) *
      0.042;

    const ringPts: [number, number][] = [
      [0, sill],
      [-w * 0.76, sill + 0.015],
      [-(w * 0.94 + flare * 0.4 - archTuck), sill + 0.03 + archLipLift * 0.65],
      [-(w * 1.00 + flare - archTuck * 0.4), lowerCrease + archLipLift * 0.35],
      [-(w * 0.98 + flare * 0.8), midDoor],
      [-(w * 0.96 + flare * 0.35), belt],
      [-(THREE.MathUtils.lerp(w, rw, 0.45)), shoulderTop],
      [-rw * 0.94, roof - 0.025],
      [0, roof + crown],
      [rw * 0.94, roof - 0.025],
      [THREE.MathUtils.lerp(w, rw, 0.45), shoulderTop],
      [w * 0.96 + flare * 0.35, belt],
      [w * 0.98 + flare * 0.8, midDoor],
      [w * 1.00 + flare - archTuck * 0.4, lowerCrease + archLipLift * 0.35],
      [w * 0.94 + flare * 0.4 - archTuck, sill + 0.03 + archLipLift * 0.65],
      [w * 0.76, sill + 0.015],
      [0, sill],
    ];

    const vCoord = (st.z + 1) * 0.5;
    for (let k = 0; k < ringCount; k++) {
      positions.push(ringPts[k][0], ringPts[k][1], z);
      uvs.push(k / (ringCount - 1), vCoord);
    }
  }

  for (let s = 0; s < stations.length - 1; s++) {
    for (let k = 0; k < ringCount - 1; k++) {
      const a = s * ringCount + k;
      const b = (s + 1) * ringCount + k;
      const c = (s + 1) * ringCount + (k + 1);
      const d = s * ringCount + (k + 1);
      indices.push(a, d, b);
      indices.push(b, d, c);
    }
  }

  // Cap front & rear cleanly
  const rearCenterIdx = positions.length / 3;
  const st0 = stations[0];
  positions.push(0, r + ((st0.sillY + st0.roofY) * 0.5) * h, st0.z * halfL);
  uvs.push(0.5, 0);
  for (let k = 0; k < ringCount - 1; k++) {
    indices.push(rearCenterIdx, k, k + 1);
  }

  const frontCenterIdx = positions.length / 3;
  const stN = stations[stations.length - 1];
  const baseN = (stations.length - 1) * ringCount;
  positions.push(0, r + ((stN.sillY + stN.roofY) * 0.5) * h, stN.z * halfL);
  uvs.push(0.5, 1);
  for (let k = 0; k < ringCount - 1; k++) {
    indices.push(frontCenterIdx, baseN + k + 1, baseN + k);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds flush curved greenhouse glazing matching the sculpted stations.
 */
function buildCurvedGreenhouse(
  spec: VehicleSpec,
  stations: LoftStation[],
  glassMat: THREE.Material,
  pillarMat: THREE.Material,
): THREE.Group {
  const grp = new THREE.Group();
  const halfL = spec.length * 0.5;
  const halfW = spec.width * 0.5;
  const h = spec.bodyHeight;
  const r = spec.rideHeight;

  // Filter cabin stations where roofY > beltY + 0.14
  const cabinStations = stations.filter((st) => st.roofY - st.beltY > 0.14);
  if (cabinStations.length < 3) return grp;

  const ringCount = 5;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let s = 0; s < cabinStations.length; s++) {
    const st = cabinStations[s];
    const z = st.z * halfL;
    const bw = st.halfW * halfW * 0.93;
    const rw = st.roofW * halfW * 0.91;
    const belt = r + (st.beltY + 0.02) * h;
    const roof = r + (st.roofY - 0.025) * h;

    const ring: [number, number][] = [
      [-bw, belt],
      [-rw, roof],
      [0, roof + (st.hoodCrown ?? 0.015) * h * 0.8],
      [rw, roof],
      [bw, belt],
    ];
    for (const [x, y] of ring) {
      positions.push(x, y, z);
    }
  }

  for (let s = 0; s < cabinStations.length - 1; s++) {
    for (let k = 0; k < ringCount - 1; k++) {
      const a = s * ringCount + k;
      const b = (s + 1) * ringCount + k;
      const c = (s + 1) * ringCount + (k + 1);
      const d = s * ringCount + (k + 1);
      indices.push(a, d, b);
      indices.push(b, d, c);
    }
  }

  // Front & rear glass caps
  const fBase = (cabinStations.length - 1) * ringCount;
  indices.push(fBase + 0, fBase + 1, fBase + 2);
  indices.push(fBase + 0, fBase + 2, fBase + 3);
  indices.push(fBase + 0, fBase + 3, fBase + 4);

  indices.push(0, 2, 1);
  indices.push(0, 3, 2);
  indices.push(0, 4, 3);

  const glassGeo = new THREE.BufferGeometry();
  glassGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  glassGeo.setIndex(indices);
  glassGeo.computeVertexNormals();

  const glassMesh = new THREE.Mesh(glassGeo, glassMat);
  glassMesh.scale.set(1.01, 1.0, 1.01);
  grp.add(glassMesh);

  // Subtle curved A-pillars and B-pillars
  const frontSt = cabinStations[cabinStations.length - 1];
  const midSt = cabinStations[Math.floor(cabinStations.length * 0.55)];
  for (const side of [-1, 1]) {
    const aCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * frontSt.halfW * halfW * 0.94, r + frontSt.beltY * h, frontSt.z * halfL),
      new THREE.Vector3(side * midSt.roofW * halfW * 0.93, r + midSt.roofY * h, midSt.z * halfL + 0.35),
    ]);
    const aPillar = new THREE.Mesh(new THREE.TubeGeometry(aCurve, 8, 0.028, 6, false), pillarMat);
    grp.add(aPillar);
  }

  return grp;
}

/**
 * Curved-sidewall Tire + Forged Twin-Spoke Alloy Rim + Cross-Drilled Brake Rotor.
 */
function createDetailedWheel(
  radius: number,
  width: number,
  isSport: boolean,
  isSuv: boolean,
  textures: ProceduralTextureSet,
  alloyMat: THREE.MeshPhysicalMaterial,
): {
  rollGroup: THREE.Group;
  yMeshGroup: THREE.Group;
  fiveSpokeGroup: THREE.Group;
  deepDishGroup: THREE.Group;
  offroadGroup: THREE.Group;
  tireMesh: THREE.Mesh;
} {
  const rollGroup = new THREE.Group();

  const rimR = radius * (isSuv ? 0.69 : isSport ? 0.76 : 0.65);
  const hw = width * 0.5;
  const lathePts = [
    new THREE.Vector2(rimR * 0.95, -hw * 0.86),
    new THREE.Vector2(radius * 0.93, -hw),
    new THREE.Vector2(radius, -hw * 0.75),
    new THREE.Vector2(radius, hw * 0.75),
    new THREE.Vector2(radius * 0.93, hw),
    new THREE.Vector2(rimR * 0.95, hw * 0.86),
  ];
  const tireGeo = new THREE.LatheGeometry(lathePts, 32);
  tireGeo.rotateZ(Math.PI / 2);

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    map: textures.tireTreadMap,
    roughness: 0.84,
    metalness: 0.04,
  });
  const tireMesh = new THREE.Mesh(tireGeo, tireMat);
  tireMesh.castShadow = true;
  rollGroup.add(tireMesh);

  const innerBarrelMat = new THREE.MeshStandardMaterial({
    color: 0x111114,
    roughness: 0.36,
    metalness: 0.82,
  });

  const rimLipGeo = new THREE.TorusGeometry(rimR * 0.97, 0.017, 10, 28);
  rimLipGeo.rotateY(Math.PI / 2);
  for (const side of [-1, 1]) {
    const lip = new THREE.Mesh(rimLipGeo, alloyMat);
    lip.position.x = side * (hw * 0.85);
    rollGroup.add(lip);
  }

  const barrelGeo = new THREE.CylinderGeometry(rimR * 0.95, rimR * 0.95, width * 0.82, 24, 1, true);
  barrelGeo.rotateZ(Math.PI / 2);
  rollGroup.add(new THREE.Mesh(barrelGeo, innerBarrelMat));

  // Spoke Pattern 1: Forged Y-Mesh (default)
  const yMeshGroup = new THREE.Group();
  const spokeShape = new THREE.Shape();
  spokeShape.moveTo(-0.018, 0.04);
  spokeShape.lineTo(0.018, 0.04);
  spokeShape.lineTo(0.011, rimR * 0.94);
  spokeShape.lineTo(-0.011, rimR * 0.94);
  spokeShape.closePath();
  const spokeGeo = new THREE.ExtrudeGeometry(spokeShape, {
    depth: 0.022,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
  });
  spokeGeo.rotateY(Math.PI / 2);

  for (let i = 0; i < 5; i++) {
    const baseAngle = (i / 5) * Math.PI * 2;
    for (const splay of [-0.15, 0.15]) {
      const ang = baseAngle + splay;
      for (const side of [-1, 1]) {
        const spoke = new THREE.Mesh(spokeGeo, alloyMat);
        spoke.position.x = side * (hw * 0.78);
        spoke.rotation.x = -(ang + splay * 1.1);
        yMeshGroup.add(spoke);
      }
    }
  }
  rollGroup.add(yMeshGroup);

  // Spoke Pattern 2: Classic Wide 5-Spoke Monoblock
  const fiveSpokeGroup = new THREE.Group();
  const wideGeo = new THREE.BoxGeometry(0.024, rimR * 0.92, 0.068);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    for (const side of [-1, 1]) {
      const sp = new THREE.Mesh(wideGeo, alloyMat);
      sp.position.set(side * (hw * 0.78), Math.cos(a) * rimR * 0.48, Math.sin(a) * rimR * 0.48);
      sp.rotation.x = -a;
      fiveSpokeGroup.add(sp);
    }
  }
  fiveSpokeGroup.visible = false;
  rollGroup.add(fiveSpokeGroup);

  // Spoke Pattern 3: Deep-Dish Multi-Spoke Drift
  const deepDishGroup = new THREE.Group();
  const deepRing = new THREE.Mesh(new THREE.TorusGeometry(rimR * 0.94, 0.028, 10, 28).rotateY(Math.PI / 2), alloyMat);
  deepRing.position.x = hw * 0.88;
  deepDishGroup.add(deepRing);
  const thinGeo = new THREE.BoxGeometry(0.018, rimR * 0.88, 0.026);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    for (const side of [-1, 1]) {
      const sp = new THREE.Mesh(thinGeo, alloyMat);
      sp.position.set(side * (hw * 0.62), Math.cos(a) * rimR * 0.45, Math.sin(a) * rimR * 0.45);
      sp.rotation.x = -a;
      deepDishGroup.add(sp);
    }
  }
  deepDishGroup.visible = false;
  rollGroup.add(deepDishGroup);

  // Spoke Pattern 4: Offroad Beadlock 6-Slot
  const offroadGroup = new THREE.Group();
  const beadRing = new THREE.Mesh(
    new THREE.TorusGeometry(rimR * 0.96, 0.026, 8, 12).rotateY(Math.PI / 2),
    innerBarrelMat,
  );
  beadRing.position.x = hw * 0.88;
  offroadGroup.add(beadRing);
  const offGeo = new THREE.BoxGeometry(0.026, rimR * 0.88, 0.08);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    for (const side of [-1, 1]) {
      const sp = new THREE.Mesh(offGeo, alloyMat);
      sp.position.set(side * (hw * 0.74), Math.cos(a) * rimR * 0.45, Math.sin(a) * rimR * 0.45);
      sp.rotation.x = -a;
      offroadGroup.add(sp);
    }
  }
  offroadGroup.visible = false;
  rollGroup.add(offroadGroup);

  const hubGeo = new THREE.CylinderGeometry(rimR * 0.22, rimR * 0.24, width * 0.86, 16).rotateZ(Math.PI / 2);
  rollGroup.add(
    new THREE.Mesh(hubGeo, new THREE.MeshStandardMaterial({ color: 0x09090b, metalness: 0.85, roughness: 0.22 })),
  );

  // Cross-drilled rotor
  const rotorGeo = new THREE.CylinderGeometry(rimR * 0.79, rimR * 0.79, 0.028, 28).rotateZ(Math.PI / 2);
  const rotorMat = new THREE.MeshStandardMaterial({
    map: textures.brakeDiscMap,
    color: 0xd4d4d8,
    metalness: 0.92,
    roughness: 0.25,
  });
  rollGroup.add(new THREE.Mesh(rotorGeo, rotorMat));

  return { rollGroup, yMeshGroup, fiveSpokeGroup, deepDishGroup, offroadGroup, tireMesh };
}

/**
 * Ergonomic Bolstered Sport Bucket Seat built from beveled ExtrudeGeometry curves (no cubes!).
 */
function createContouredSeat(leatherMat: THREE.Material, trimMat: THREE.Material): THREE.Group {
  const seat = new THREE.Group();

  // Side silhouette curve of cushion + reclined backrest
  const prof = new THREE.Shape();
  prof.moveTo(-0.24, 0.02);
  prof.quadraticCurveTo(0.05, 0.0, 0.25, 0.04);
  prof.quadraticCurveTo(0.27, 0.12, 0.18, 0.14);
  prof.lineTo(-0.08, 0.13);
  prof.quadraticCurveTo(-0.18, 0.38, -0.27, 0.66);
  prof.quadraticCurveTo(-0.28, 0.82, -0.22, 0.84);
  prof.quadraticCurveTo(-0.16, 0.84, -0.15, 0.72);
  prof.quadraticCurveTo(-0.22, 0.42, -0.24, 0.02);

  const centerGeo = new THREE.ExtrudeGeometry(prof, {
    depth: 0.34,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.02,
    bevelSegments: 3,
  });
  centerGeo.rotateY(Math.PI / 2);
  centerGeo.translate(-0.17, 0, 0);
  const centerMesh = new THREE.Mesh(centerGeo, leatherMat);
  seat.add(centerMesh);

  // Bolster side wings
  const wingGeo = new THREE.ExtrudeGeometry(prof, {
    depth: 0.06,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
  wingGeo.rotateY(Math.PI / 2);
  for (const s of [-1, 1]) {
    const wing = new THREE.Mesh(wingGeo, trimMat);
    wing.position.set(s * 0.21 - 0.03, 0.025, 0.01);
    seat.add(wing);
  }

  return seat;
}

/**
 * Helper to create a beveled rounded-kidney or trapezoidal shape extruded along Z.
 */
function makeExtrudedTrim(shape: THREE.Shape, depth: number, bevel = 0.012): THREE.ExtrudeGeometry {
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
  });
}

function addEmblemBadge(
  parent: THREE.Group,
  brand: string,
  textures: ProceduralTextureSet,
  x: number,
  y: number,
  z: number,
  rotX: number,
  radius = 0.044,
) {
  const isChevy = brand === 'Chevrolet';
  const map =
    brand === 'BMW'
      ? textures.bmwRoundelMap
      : brand === 'Mercedes-Benz'
        ? textures.mercedesStarMap
        : textures.chevyBowtieMap;

  const geo = isChevy ? new THREE.PlaneGeometry(radius * 2.6, radius * 1.25) : new THREE.CircleGeometry(radius, 24);
  const mat = new THREE.MeshStandardMaterial({
    map,
    metalness: 0.65,
    roughness: 0.22,
  });
  const badge = new THREE.Mesh(geo, mat);
  badge.position.set(x, y, z);
  badge.rotation.x = rotX;
  parent.add(badge);
}

export function createVehicleMesh(
  spec: VehicleSpec,
  colorHex: string,
  textures: ProceduralTextureSet,
  isSoftwareGl = false,
  glbOverride?: LoadedGlbVehicle | null,
  initialTuning?: VehicleTuningConfig,
): VehicleMeshRig {
  const activeTuning = initialTuning ? { ...initialTuning } : createDefaultTuning(spec, colorHex);
  const root = new THREE.Group();
  const lod = new THREE.LOD();
  root.add(lod);

  const chassisGroup = new THREE.Group();
  const highDetailGroup = new THREE.Group();
  const midDetailGroup = new THREE.Group();
  const lowDetailGroup = new THREE.Group();

  lod.addLevel(highDetailGroup, 0);
  lod.addLevel(midDetailGroup, 46);
  lod.addLevel(lowDetailGroup, 112);
  highDetailGroup.add(chassisGroup);

  const isSport = spec.horsepower >= 500;
  const isSuv = spec.bodyStyle === 'suv';
  const isMatte = colorHex === '#27272a' && spec.id === 'g63_amg';

  const paintMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colorHex),
    metalness: isMatte ? 0.35 : 0.86,
    roughness: isMatte ? 0.52 : 0.15,
    clearcoat: isMatte ? 0.18 : 1.0,
    clearcoatRoughness: 0.04,
    envMapIntensity: 1.7,
  });
  const bodyPaintMaterials: THREE.MeshPhysicalMaterial[] = [paintMat];

  const trimDarkMat = new THREE.MeshStandardMaterial({
    color: 0x131316,
    roughness: 0.55,
    metalness: 0.28,
  });
  const carbonMat = new THREE.MeshPhysicalMaterial({
    map: textures.carbonWeaveMap,
    color: 0xffffff,
    roughness: 0.24,
    metalness: 0.45,
    clearcoat: 0.9,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xf4f4f5,
    roughness: 0.09,
    metalness: 0.96,
  });
  const bronzeCsMat = new THREE.MeshStandardMaterial({
    color: 0xb48a3e,
    roughness: 0.22,
    metalness: 0.88,
  });
  const leatherMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(spec.interiorLeather),
    normalMap: textures.leatherNormalMap,
    normalScale: new THREE.Vector2(0.35, 0.35),
    roughness: 0.62,
    metalness: 0.05,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x09111e,
    roughness: 0.04,
    metalness: 0.14,
    transparent: true,
    opacity: isSoftwareGl ? 0.42 : 0.5,
    clearcoat: 1.0,
    ior: 1.52,
    envMapIntensity: 1.85,
    depthWrite: false,
  });

  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0xe0f2fe,
    emissiveIntensity: 0.4,
    roughness: 0.06,
  });
  const drlMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: spec.id === 'bmw_m5' ? 0xfacc15 : 0xe0f2fe,
    emissiveIntensity: 1.4,
    roughness: 0.1,
  });
  const tailLightMat = new THREE.MeshStandardMaterial({
    color: 0x991b1b,
    emissive: 0xef4444,
    emissiveIntensity: 0.35,
    roughness: 0.15,
  });
  const reverseLightMat = new THREE.MeshStandardMaterial({
    color: 0xe4e4e7,
    emissive: 0xffffff,
    emissiveIntensity: 0.0,
    roughness: 0.18,
  });
  const indicatorLeftMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.0,
    roughness: 0.2,
  });
  const indicatorRightMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.0,
    roughness: 0.2,
  });

  const halfL = spec.length * 0.5;
  const halfW = spec.width * 0.5;
  const h = spec.bodyHeight;
  const r = spec.rideHeight;
  const wbHalf = spec.wheelBase * 0.5;
  const trackHalf = spec.trackWidth * 0.5;

  const doorLPivot = new THREE.Group();
  const doorRPivot = new THREE.Group();
  const hoodPivot = new THREE.Group();
  const steeringWheel = new THREE.Group();
  const cockpitCameraAnchor = new THREE.Object3D();
  const hoodCameraAnchor = new THREE.Object3D();
  let assetSource: AssetSourceType = 'procedural-placeholder';

  if (glbOverride) {
    assetSource = 'glb';
    bodyPaintMaterials.push(...glbOverride.paintMaterials);
    chassisGroup.add(glbOverride.scene);
    cockpitCameraAnchor.position.set(0.34, r + h * 0.78, -0.15);
    hoodCameraAnchor.position.set(0, r + h * 0.65, halfL * 0.3);
    chassisGroup.add(cockpitCameraAnchor);
    chassisGroup.add(hoodCameraAnchor);

    // Low-poly sculpted proxy for LOD 1/2 so custom GLBs remain crisp at long range
    const control = getControlStations(spec);
    const proxyGeo = buildSculptedBodyGeometry(spec, sampleSmoothStations(control, 12));
    const midProxy = new THREE.Mesh(proxyGeo, paintMat);
    midProxy.castShadow = true;
    midDetailGroup.add(midProxy);

    const lowGeo = buildSculptedBodyGeometry(spec, sampleSmoothStations(control, 7));
    lowDetailGroup.add(new THREE.Mesh(lowGeo, paintMat));
  } else {
    // --- HIGH-DETAIL SCULPTED PROCEDURAL COACHBUILT PLACEHOLDER (LOD 0/1/2) ---
    const controlStations = getControlStations(spec);
    const smoothStations = sampleSmoothStations(controlStations, 26);
    const midStations = sampleSmoothStations(controlStations, 12);
    const lowStations = sampleSmoothStations(controlStations, 7);

    const bodyGeo = buildSculptedBodyGeometry(spec, smoothStations);
    const bodyMesh = new THREE.Mesh(bodyGeo, paintMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    chassisGroup.add(bodyMesh);

    const midBody = new THREE.Mesh(buildSculptedBodyGeometry(spec, midStations), paintMat);
    midBody.castShadow = true;
    midDetailGroup.add(midBody);

    const lowBody = new THREE.Mesh(buildSculptedBodyGeometry(spec, lowStations), paintMat);
    lowDetailGroup.add(lowBody);

    // Flush Curved Greenhouse Glass + Pillars
    const greenhouse = buildCurvedGreenhouse(spec, smoothStations, glassMat, trimDarkMat);
    chassisGroup.add(greenhouse);

    // Dark recessed wheel-well liners (4 arches)
    const archGeo = new THREE.CylinderGeometry(
      spec.wheelRadius * 1.18,
      spec.wheelRadius * 1.18,
      0.34,
      18,
      1,
      false,
      0,
      Math.PI,
    );
    archGeo.rotateZ(Math.PI / 2);
    for (const [wx, wz] of [
      [trackHalf - 0.08, wbHalf],
      [-trackHalf + 0.08, wbHalf],
      [trackHalf - 0.08, -wbHalf],
      [-trackHalf + 0.08, -wbHalf],
    ]) {
      const well = new THREE.Mesh(archGeo, trimDarkMat);
      well.position.set(wx, spec.wheelRadius * 0.96, wz);
      chassisGroup.add(well);
    }

    // G63 Flared Fender Wheel Arch Extensions
    if (isSuv) {
      const flareGeo = new THREE.TorusGeometry(spec.wheelRadius * 1.24, 0.065, 8, 20, Math.PI * 0.92);
      flareGeo.rotateY(Math.PI / 2);
      for (const [fx, fz] of [
        [halfW * 0.94, wbHalf],
        [-halfW * 0.94, wbHalf],
        [halfW * 0.94, -wbHalf],
        [-halfW * 0.94, -wbHalf],
      ]) {
        const archFlare = new THREE.Mesh(flareGeo, isMatte ? trimDarkMat : paintMat);
        archFlare.position.set(fx, spec.wheelRadius * 0.98, fz);
        archFlare.rotation.x = -Math.PI * 0.04;
        chassisGroup.add(archFlare);
      }
      // Side Running Boards
      for (const side of [-1, 1]) {
        const step = new THREE.Mesh(
          new THREE.CylinderGeometry(0.055, 0.055, spec.wheelBase * 0.62, 10).rotateX(Math.PI / 2),
          chromeMat,
        );
        step.position.set(side * (halfW + 0.03), r + 0.04, 0);
        chassisGroup.add(step);
      }
    }

    // Sculpted Contoured Aero Front Splitter + Rear Diffuser with Vertical Strakes
    const splitShape = new THREE.Shape();
    splitShape.moveTo(-halfW * 0.88, 0);
    splitShape.quadraticCurveTo(0, 0.24, halfW * 0.88, 0);
    splitShape.lineTo(halfW * 0.82, -0.14);
    splitShape.lineTo(-halfW * 0.82, -0.14);
    splitShape.closePath();
    const splitterGeo = makeExtrudedTrim(splitShape, 0.035, 0.01);
    splitterGeo.rotateX(Math.PI / 2);
    const splitter = new THREE.Mesh(splitterGeo, isSport ? carbonMat : trimDarkMat);
    splitter.position.set(0, r + 0.075, halfL - 0.18);
    chassisGroup.add(splitter);

    const diffShape = new THREE.Shape();
    diffShape.moveTo(-halfW * 0.78, 0);
    diffShape.lineTo(halfW * 0.78, 0);
    diffShape.lineTo(halfW * 0.68, 0.14);
    diffShape.lineTo(-halfW * 0.68, 0.14);
    diffShape.closePath();
    const diffGeo = makeExtrudedTrim(diffShape, 0.12, 0.015);
    const diffuser = new THREE.Mesh(diffGeo, isSport ? carbonMat : trimDarkMat);
    diffuser.position.set(0, r + 0.04, -halfL + 0.02);
    chassisGroup.add(diffuser);

    // Carbon Roof Skin on M4 G82 & M5
    if ((spec.id === 'bmw_m4' || spec.id === 'bmw_m5') && !isSuv) {
      const roofShape = new THREE.Shape();
      roofShape.moveTo(-halfW * 0.66, -0.45);
      roofShape.quadraticCurveTo(0, -0.52, halfW * 0.66, -0.45);
      roofShape.lineTo(halfW * 0.62, 0.45);
      roofShape.quadraticCurveTo(0, 0.5, -halfW * 0.62, 0.45);
      roofShape.closePath();
      const roofGeo = makeExtrudedTrim(roofShape, 0.02, 0.01);
      roofGeo.rotateX(Math.PI / 2);
      const roofPanel = new THREE.Mesh(roofGeo, carbonMat);
      roofPanel.position.set(0, r + h * 1.005, -0.08);
      chassisGroup.add(roofPanel);
    }

    // --- SCULPTED OPENABLE DOORS & AERODYNAMIC WING MIRRORS ---
    const cabinCenterZ = isSuv ? -0.35 : -0.16;
    const cabinLen = isSuv ? spec.length * 0.52 : spec.length * 0.44;
    const doorLen = isSuv ? 1.12 : 1.24;
    const doorH = h * 0.40;
    const doorY = r + h * 0.35;
    const doorHingeZ = cabinCenterZ + cabinLen * 0.42;

    const buildDoor = (side: number, pivot: THREE.Group) => {
      pivot.position.set(side * (halfW * 0.96), doorY, doorHingeZ);

      // Curved Door Skin Profile
      const dShape = new THREE.Shape();
      dShape.moveTo(0, -doorH * 0.46);
      dShape.lineTo(-doorLen * 0.95, -doorH * 0.42);
      dShape.quadraticCurveTo(-doorLen, 0, -doorLen * 0.92, doorH * 0.48);
      dShape.lineTo(-0.04, doorH * 0.45);
      dShape.quadraticCurveTo(0.03, 0, 0, -doorH * 0.46);

      const dGeo = makeExtrudedTrim(dShape, 0.038, 0.014);
      dGeo.rotateY(Math.PI / 2);
      const panel = new THREE.Mesh(dGeo, paintMat);
      panel.position.x = side > 0 ? -0.025 : -0.015;
      panel.castShadow = true;
      pivot.add(panel);

      // Inner sculpted leather door card
      const card = new THREE.Mesh(dGeo, leatherMat);
      card.scale.set(0.65, 0.86, 0.92);
      card.position.x = side > 0 ? -0.055 : 0.025;
      pivot.add(card);

      // Sleek Flush Door Handle
      const handleCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.024, doorH * 0.25, -doorLen * 0.72),
        new THREE.Vector3(side * 0.045, doorH * 0.25, -doorLen * 0.79),
        new THREE.Vector3(side * 0.024, doorH * 0.25, -doorLen * 0.86),
      ]);
      pivot.add(new THREE.Mesh(new THREE.TubeGeometry(handleCurve, 6, 0.014, 6, false), chromeMat));

      // Aerodynamic Wing Mirror (Extruded teardrop shell + stalk)
      const stalkCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.01, doorH * 0.42, -0.12),
        new THREE.Vector3(side * 0.13, doorH * 0.48, -0.18),
      ]);
      pivot.add(new THREE.Mesh(new THREE.TubeGeometry(stalkCurve, 6, 0.018, 8, false), trimDarkMat));

      const mirShape = new THREE.Shape();
      mirShape.moveTo(0, -0.038);
      mirShape.quadraticCurveTo(0.15, -0.045, 0.17, 0);
      mirShape.quadraticCurveTo(0.15, 0.048, 0, 0.038);
      mirShape.closePath();
      const mirGeo = makeExtrudedTrim(mirShape, 0.075, 0.016);
      mirGeo.rotateY(side > 0 ? 0.15 : Math.PI - 0.15);
      const mirrorCap = new THREE.Mesh(mirGeo, isSport ? carbonMat : paintMat);
      mirrorCap.position.set(side * 0.06, doorH * 0.49, -0.2);
      mirrorCap.userData.isMirrorCap = true;
      pivot.add(mirrorCap);

      chassisGroup.add(pivot);
    };
    buildDoor(1, doorLPivot);
    buildDoor(-1, doorRPivot);

    // --- CONTOURED OPENABLE HOOD & TWIN-TURBO ENGINE BAY ---
    const hoodCowlZ = cabinCenterZ + cabinLen * 0.50;
    const hoodLen = halfL - hoodCowlZ - 0.22;
    const engineBayY = r + h * 0.44;

    const engineBlock = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.34, 0.65, 12).rotateX(Math.PI / 2),
      trimDarkMat,
    );
    engineBlock.position.set(0, engineBayY - 0.12, hoodCowlZ + hoodLen * 0.45);
    chassisGroup.add(engineBlock);

    const plenumShape = new THREE.Shape();
    plenumShape.moveTo(-0.22, -0.26);
    plenumShape.lineTo(0.22, -0.26);
    plenumShape.lineTo(0.18, 0.26);
    plenumShape.lineTo(-0.18, 0.26);
    plenumShape.closePath();
    const engineCover = new THREE.Mesh(
      makeExtrudedTrim(plenumShape, 0.07, 0.015).rotateX(Math.PI / 2),
      isSport ? carbonMat : new THREE.MeshStandardMaterial({ color: 0x52525b, roughness: 0.38, metalness: 0.72 }),
    );
    engineCover.position.set(0, engineBayY + 0.06, hoodCowlZ + hoodLen * 0.44);
    chassisGroup.add(engineCover);

    // Curved Strut Tower Cross-Brace
    const braceCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-halfW * 0.65, engineBayY + 0.04, hoodCowlZ + 0.22),
      new THREE.Vector3(0, engineBayY + 0.11, hoodCowlZ + 0.38),
      new THREE.Vector3(halfW * 0.65, engineBayY + 0.04, hoodCowlZ + 0.22),
    ]);
    const strutBrace = new THREE.Mesh(
      new THREE.TubeGeometry(braceCurve, 12, 0.018, 8, false),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(spec.caliperColor), metalness: 0.85, roughness: 0.2 }),
    );
    chassisGroup.add(strutBrace);

    // Hinged Tapered Hood Panel
    hoodPivot.position.set(0, r + h * 0.56, hoodCowlZ);
    const hoodShape = new THREE.Shape();
    hoodShape.moveTo(-halfW * 0.78, 0);
    hoodShape.lineTo(halfW * 0.78, 0);
    hoodShape.quadraticCurveTo(halfW * 0.74, hoodLen * 0.65, halfW * 0.62, hoodLen);
    hoodShape.quadraticCurveTo(0, hoodLen + 0.06, -halfW * 0.62, hoodLen);
    hoodShape.quadraticCurveTo(-halfW * 0.74, hoodLen * 0.65, -halfW * 0.78, 0);
    const hoodGeo = makeExtrudedTrim(hoodShape, 0.032, 0.014);
    hoodGeo.rotateX(Math.PI / 2);
    const hoodLid = new THREE.Mesh(hoodGeo, paintMat);
    hoodLid.rotation.x = isSuv ? 0.03 : 0.09;
    hoodLid.castShadow = true;
    hoodPivot.add(hoodLid);

    if (isSport) {
      const domeCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.02, 0.08),
        new THREE.Vector3(0, 0.055, hoodLen * 0.45),
        new THREE.Vector3(0, 0.01, hoodLen * 0.85),
      ]);
      const dome = new THREE.Mesh(new THREE.TubeGeometry(domeCurve, 10, 0.14, 10, false), paintMat);
      dome.scale.set(1.6, 0.32, 1.0);
      dome.rotation.x = isSuv ? 0.03 : 0.09;
      hoodPivot.add(dome);
    }
    chassisGroup.add(hoodPivot);

    // Brand Hood & Trunk Emblems
    const noseEmblemZ = halfL - 0.14;
    const noseEmblemY = r + h * (isSuv ? 0.51 : 0.39);
    addEmblemBadge(chassisGroup, spec.brand, textures, 0, noseEmblemY, noseEmblemZ, -Math.PI * 0.42, 0.044);
    addEmblemBadge(chassisGroup, spec.brand, textures, 0, r + h * 0.57, -halfL + 0.015, Math.PI, 0.042);

    // --- FULLY MODELED SCULPTED COCKPIT INTERIOR ---
    const seatL = createContouredSeat(leatherMat, trimDarkMat);
    seatL.position.set(0.36, r + 0.14, cabinCenterZ - 0.10);
    chassisGroup.add(seatL);

    const seatR = createContouredSeat(leatherMat, trimDarkMat);
    seatR.position.set(-0.36, r + 0.14, cabinCenterZ - 0.10);
    chassisGroup.add(seatR);

    // Contoured rear seats
    for (const s of [-0.36, 0.36]) {
      const rSeat = createContouredSeat(leatherMat, trimDarkMat);
      rSeat.scale.set(0.92, 0.85, 0.85);
      rSeat.position.set(s, r + 0.16, cabinCenterZ - 0.78);
      chassisGroup.add(rSeat);
    }

    // Curved Center Tunnel Console + Gear Selector
    const consoleShape = new THREE.Shape();
    consoleShape.moveTo(-0.55, 0);
    consoleShape.lineTo(0.55, 0);
    consoleShape.quadraticCurveTo(0.60, 0.22, 0.32, 0.25);
    consoleShape.lineTo(-0.48, 0.22);
    consoleShape.closePath();
    const consoleGeo = makeExtrudedTrim(consoleShape, 0.22, 0.02).rotateY(Math.PI / 2);
    const consoleMesh = new THREE.Mesh(consoleGeo, leatherMat);
    consoleMesh.position.set(-0.11, r + 0.12, cabinCenterZ + 0.05);
    chassisGroup.add(consoleMesh);

    const shifterKnob = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 12), chromeMat);
    shifterKnob.position.set(0, r + 0.42, cabinCenterZ + 0.24);
    chassisGroup.add(shifterKnob);

    // Curved Wraparound Dashboard + Digital Cluster + Wide Infotainment Display
    const dashY = r + h * 0.54;
    const dashZ = cabinCenterZ + cabinLen * 0.36;
    const dashShape = new THREE.Shape();
    dashShape.moveTo(-halfW * 0.82, 0);
    dashShape.quadraticCurveTo(0, 0.14, halfW * 0.82, 0);
    dashShape.lineTo(halfW * 0.78, -0.34);
    dashShape.quadraticCurveTo(0, -0.26, -halfW * 0.78, -0.34);
    dashShape.closePath();
    const dashGeo = makeExtrudedTrim(dashShape, 0.18, 0.025).rotateX(Math.PI / 2);
    const dashPad = new THREE.Mesh(dashGeo, trimDarkMat);
    dashPad.position.set(0, dashY + 0.08, dashZ + 0.18);
    chassisGroup.add(dashPad);

    // Crisp Digital Instrument Cluster
    const gaugeCluster = new THREE.Mesh(
      new THREE.PlaneGeometry(0.34, 0.12),
      new THREE.MeshStandardMaterial({
        map: textures.dashboardClusterMap,
        emissiveMap: textures.dashboardClusterMap,
        emissive: 0xffffff,
        emissiveIntensity: 0.75,
        roughness: 0.1,
      }),
    );
    gaugeCluster.position.set(0.36, dashY + 0.06, dashZ - 0.16);
    gaugeCluster.rotation.y = Math.PI;
    chassisGroup.add(gaugeCluster);

    // Wide Center Infotainment Display
    const navScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.32, 0.14),
      new THREE.MeshStandardMaterial({
        map: textures.navScreenMap,
        emissiveMap: textures.navScreenMap,
        emissive: 0xffffff,
        emissiveIntensity: 0.65,
        roughness: 0.1,
      }),
    );
    navScreen.position.set(0, dashY + 0.11, dashZ - 0.14);
    navScreen.rotation.y = Math.PI;
    chassisGroup.add(navScreen);

    // Flat-Bottom 3-Spoke Sport Steering Wheel + Brand Hub Emblem
    steeringWheel.position.set(0.36, dashY + 0.08, dashZ - 0.28);
    steeringWheel.rotation.x = -0.32;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.019, 12, 32), leatherMat);
    steeringWheel.add(rim);
    const spokeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.15, 0.01, 0),
      new THREE.Vector3(0, -0.01, 0.015),
      new THREE.Vector3(0.15, 0.01, 0),
    ]);
    steeringWheel.add(new THREE.Mesh(new THREE.TubeGeometry(spokeCurve, 10, 0.013, 6, false), chromeMat));
    const spokeVCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.01, 0.015),
      new THREE.Vector3(0, -0.15, 0),
    ]);
    steeringWheel.add(new THREE.Mesh(new THREE.TubeGeometry(spokeVCurve, 6, 0.015, 6, false), chromeMat));
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.036, 18).rotateX(Math.PI / 2), trimDarkMat);
    steeringWheel.add(hub);
    addEmblemBadge(steeringWheel, spec.brand, textures, 0, 0, -0.02, Math.PI, 0.024);
    chassisGroup.add(steeringWheel);

    // Camera Anchors
    cockpitCameraAnchor.position.set(0.36, r + h * 0.78, cabinCenterZ - 0.02);
    chassisGroup.add(cockpitCameraAnchor);
    hoodCameraAnchor.position.set(0, r + h * 0.64, halfL * 0.28);
    chassisGroup.add(hoodCameraAnchor);

    // --- BRAND-AUTHENTIC SCULPTED GRILLES, HEADLIGHTS & TAILLIGHTS ---
    const noseZ = halfL - 0.03;
    const grilleY = r + h * (isSuv ? 0.36 : 0.27);
    const hlY = r + h * (isSuv ? 0.38 : 0.29);
    const hlX = halfW * 0.62;
    const rearZ = -halfL + 0.03;

    if (spec.brand === 'BMW') {
      const isG82 = spec.id === 'bmw_m4';
      const kW = isG82 ? 0.24 : 0.29;
      const kH = isG82 ? 0.36 : 0.22;
      const kMat = isG82 ? trimDarkMat : spec.id === 'bmw_m5' ? bronzeCsMat : chromeMat;

      for (const side of [-1, 1]) {
        const kShape = new THREE.Shape();
        kShape.moveTo(-kW * 0.44, -kH * 0.46);
        kShape.quadraticCurveTo(0, -kH * 0.54, kW * 0.44, -kH * 0.42);
        kShape.quadraticCurveTo(kW * 0.54, 0, kW * 0.42, kH * 0.44);
        kShape.quadraticCurveTo(0, kH * 0.54, -kW * 0.42, kH * 0.42);
        kShape.quadraticCurveTo(-kW * 0.54, 0, -kW * 0.44, -kH * 0.46);

        const kBack = new THREE.Mesh(makeExtrudedTrim(kShape, 0.03, 0.008), trimDarkMat);
        kBack.position.set(side * (kW * 0.56), grilleY, noseZ - 0.01);
        chassisGroup.add(kBack);

        // Beveled Kidney Surround Frame
        const ringGeo = new THREE.TorusGeometry(kW * 0.5, 0.014, 8, 20);
        const kFrame = new THREE.Mesh(ringGeo, kMat);
        kFrame.scale.set(0.95, kH / kW, 0.6);
        kFrame.position.set(side * (kW * 0.56), grilleY, noseZ + 0.02);
        chassisGroup.add(kFrame);

        // Horizontal M Slats
        const slatCount = isG82 ? 6 : 4;
        for (let sl = 0; sl < slatCount; sl++) {
          const sy = grilleY - kH * 0.34 + (sl / (slatCount - 1)) * (kH * 0.68);
          const slat = new THREE.Mesh(
            new THREE.CylinderGeometry(0.007, 0.007, kW * 0.78, 6).rotateZ(Math.PI / 2),
            trimDarkMat,
          );
          slat.position.set(side * (kW * 0.56), sy, noseZ + 0.022);
          chassisGroup.add(slat);
        }

        // BMW Swept Laserlight Headlamp + Dual Angular L-Blade DRLs
        const hlShape = new THREE.Shape();
        hlShape.moveTo(0, -0.045);
        hlShape.lineTo(0.32, -0.025);
        hlShape.quadraticCurveTo(0.36, 0.04, 0.28, 0.065);
        hlShape.lineTo(0.02, 0.04);
        hlShape.closePath();
        const hlHousing = new THREE.Mesh(makeExtrudedTrim(hlShape, 0.05, 0.008), trimDarkMat);
        if (side < 0) hlHousing.scale.x = -1;
        hlHousing.position.set(side * (hlX - 0.14), hlY, noseZ - 0.08);
        chassisGroup.add(hlHousing);

        // Twin glowing DRL U/L guides
        for (const off of [0.06, 0.18]) {
          const drlCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(side * (hlX - 0.10 + off), hlY + 0.02, noseZ - 0.03),
            new THREE.Vector3(side * (hlX - 0.06 + off), hlY - 0.03, noseZ - 0.025),
            new THREE.Vector3(side * (hlX + 0.03 + off), hlY - 0.02, noseZ - 0.045),
          ]);
          chassisGroup.add(new THREE.Mesh(new THREE.TubeGeometry(drlCurve, 8, 0.009, 6, false), drlMat));
          const proj = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 12), headlightMat);
          proj.position.set(side * (hlX - 0.04 + off * 0.8), hlY + 0.008, noseZ - 0.038);
          chassisGroup.add(proj);
        }
      }
    } else if (spec.brand === 'Mercedes-Benz') {
      // Panamericana Trapezoidal AMG Grille + 11 Vertical Chrome Slats + 3-Pointed Star Center
      const gW = spec.width * 0.46;
      const gH = isSuv ? 0.30 : 0.22;
      const gShape = new THREE.Shape();
      gShape.moveTo(-gW * 0.5, -gH * 0.46);
      gShape.lineTo(gW * 0.5, -gH * 0.46);
      gShape.lineTo(gW * 0.41, gH * 0.48);
      gShape.lineTo(-gW * 0.41, gH * 0.48);
      gShape.closePath();

      const gBack = new THREE.Mesh(makeExtrudedTrim(gShape, 0.035, 0.01), trimDarkMat);
      gBack.position.set(0, grilleY, noseZ - 0.01);
      chassisGroup.add(gBack);

      for (let i = 0; i < 11; i++) {
        const sx = -gW * 0.39 + (i / 10) * (gW * 0.78);
        const slat = new THREE.Mesh(
          new THREE.CylinderGeometry(0.008, 0.008, gH * 0.82, 6),
          chromeMat,
        );
        slat.position.set(sx, grilleY, noseZ + 0.025);
        chassisGroup.add(slat);
      }

      // Large Center Chrome Mercedes 3-Pointed Star Emblem
      addEmblemBadge(chassisGroup, 'Mercedes-Benz', textures, 0, grilleY, noseZ + 0.036, 0, isSuv ? 0.088 : 0.072);

      for (const side of [-1, 1]) {
        if (isSuv) {
          // G63 Classic Round Halo LED Headlight inside Square Bezel + Fender-Top Indicator Pods!
          const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.022, 8, 4).rotateZ(Math.PI / 4), trimDarkMat);
          bezel.position.set(side * (hlX - 0.02), hlY, noseZ - 0.02);
          chassisGroup.add(bezel);
          const haloRing = new THREE.Mesh(new THREE.TorusGeometry(0.082, 0.011, 8, 24), drlMat);
          haloRing.position.set(side * (hlX - 0.02), hlY, noseZ - 0.01);
          chassisGroup.add(haloRing);
          const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.052, 14, 14), headlightMat);
          bulb.scale.set(1, 1, 0.5);
          bulb.position.set(side * (hlX - 0.02), hlY, noseZ - 0.01);
          chassisGroup.add(bulb);

          // Iconic G-Wagen Fender-Top Turn Signal Pod
          const podMat = side > 0 ? indicatorLeftMat : indicatorRightMat;
          const pod = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.024, 0.075, 4, 8).rotateX(Math.PI / 2),
            podMat,
          );
          pod.position.set(side * (halfW * 0.76), r + h * 0.56, halfL - 0.34);
          chassisGroup.add(pod);
        } else {
          // CLS 63 / E63 MultiBeam LED Swept Headlamp + Boomerang DRL Eyebrow
          const hlCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(side * (hlX - 0.14), hlY - 0.025, noseZ - 0.02),
            new THREE.Vector3(side * hlX, hlY + 0.035, noseZ - 0.04),
            new THREE.Vector3(side * (hlX + 0.15), hlY + 0.05, noseZ - 0.12),
          ]);
          chassisGroup.add(new THREE.Mesh(new THREE.TubeGeometry(hlCurve, 10, 0.012, 8, false), drlMat));
          for (const px of [-0.04, 0.04]) {
            const proj = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 12), headlightMat);
            proj.position.set(side * (hlX + px), hlY - 0.005, noseZ - 0.05);
            chassisGroup.add(proj);
          }
        }
      }
    } else {
      // Chevrolet Split Dual-Port Grille + Gold Bowtie + Contoured Multi-Reflector Headlamps
      const gW = spec.width * 0.48;
      const uShape = new THREE.Shape();
      uShape.moveTo(-gW * 0.48, -0.05);
      uShape.lineTo(gW * 0.48, -0.05);
      uShape.lineTo(gW * 0.42, 0.055);
      uShape.lineTo(-gW * 0.42, 0.055);
      uShape.closePath();
      const upperG = new THREE.Mesh(makeExtrudedTrim(uShape, 0.03, 0.008), trimDarkMat);
      upperG.position.set(0, grilleY + 0.06, noseZ - 0.01);
      chassisGroup.add(upperG);

      const lowerG = new THREE.Mesh(makeExtrudedTrim(uShape, 0.03, 0.008), trimDarkMat);
      lowerG.scale.set(1.15, 1.2, 1);
      lowerG.position.set(0, grilleY - 0.09, noseZ - 0.01);
      chassisGroup.add(lowerG);

      addEmblemBadge(chassisGroup, 'Chevrolet', textures, 0, grilleY + 0.01, noseZ + 0.03, 0, 0.055);

      for (const side of [-1, 1]) {
        const cShape = new THREE.Shape();
        cShape.moveTo(0, -0.05);
        cShape.lineTo(0.28, -0.03);
        cShape.quadraticCurveTo(0.32, 0.06, 0.22, 0.08);
        cShape.lineTo(0.02, 0.04);
        cShape.closePath();
        const lamp = new THREE.Mesh(makeExtrudedTrim(cShape, 0.04, 0.01), headlightMat);
        if (side < 0) lamp.scale.x = -1;
        lamp.position.set(side * (hlX - 0.12), hlY, noseZ - 0.06);
        chassisGroup.add(lamp);
      }
    }

    // --- FUNCTIONAL INDICATORS, SCULPTED TAILLIGHTS & EXHAUSTS ---
    for (const side of [-1, 1]) {
      const indMat = side > 0 ? indicatorLeftMat : indicatorRightMat;

      // Front bumper corner LED indicator strip
      const fIndCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * (hlX - 0.06), hlY - 0.045, noseZ - 0.025),
        new THREE.Vector3(side * (hlX + 0.12), hlY - 0.035, noseZ - 0.08),
      ]);
      chassisGroup.add(new THREE.Mesh(new THREE.TubeGeometry(fIndCurve, 6, 0.01, 6, false), indMat));

      // Sculpted Curved 3D LED Taillight Light-Bar
      const tlCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * (halfW * 0.36), r + h * 0.43, rearZ + 0.01),
        new THREE.Vector3(side * (halfW * 0.68), r + h * 0.44, rearZ + 0.03),
        new THREE.Vector3(side * (halfW * 0.86), r + h * 0.46, rearZ + 0.12),
      ]);
      chassisGroup.add(new THREE.Mesh(new THREE.TubeGeometry(tlCurve, 10, 0.028, 8, false), tailLightMat));

      const revCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * (halfW * 0.38), r + h * 0.39, rearZ + 0.01),
        new THREE.Vector3(side * (halfW * 0.56), r + h * 0.39, rearZ + 0.02),
      ]);
      chassisGroup.add(new THREE.Mesh(new THREE.TubeGeometry(revCurve, 4, 0.014, 6, false), reverseLightMat));

      const rIndCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * (halfW * 0.58), r + h * 0.39, rearZ + 0.02),
        new THREE.Vector3(side * (halfW * 0.80), r + h * 0.40, rearZ + 0.08),
      ]);
      chassisGroup.add(new THREE.Mesh(new THREE.TubeGeometry(rIndCurve, 6, 0.014, 6, false), indMat));
    }

    // Exhausts, G63 Spare Tire Carrier & Performance Aero Lip
    if (isSuv) {
      const spareTire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.39, 0.39, 0.24, 24).rotateX(Math.PI / 2),
        trimDarkMat,
      );
      spareTire.position.set(0, r + h * 0.44, -halfL - 0.11);
      chassisGroup.add(spareTire);

      const spareCover = new THREE.Mesh(
        new THREE.CylinderGeometry(0.34, 0.34, 0.255, 24).rotateX(Math.PI / 2),
        paintMat,
      );
      spareCover.position.copy(spareTire.position);
      chassisGroup.add(spareCover);
      addEmblemBadge(chassisGroup, 'Mercedes-Benz', textures, 0, r + h * 0.44, -halfL - 0.24, Math.PI, 0.09);

      for (const side of [-1, 1]) {
        for (const zOff of [-0.14, 0.06]) {
          const sidePipe = new THREE.Mesh(
            new THREE.CylinderGeometry(0.032, 0.032, 0.22, 12).rotateZ(Math.PI / 2),
            chromeMat,
          );
          sidePipe.position.set(side * (halfW + 0.01), r + 0.04, -wbHalf * 0.5 + zOff);
          chassisGroup.add(sidePipe);
        }
      }
    } else {
      const tipGeo = new THREE.CylinderGeometry(0.044, 0.046, 0.16, 16, 1, true).rotateX(Math.PI / 2);
      if (isSport) {
        for (const side of [-1, 1]) {
          for (const off of [-0.075, 0.075]) {
            const tip = new THREE.Mesh(tipGeo, chromeMat);
            tip.position.set(side * (halfW * 0.54) + off, r + 0.095, -halfL + 0.01);
            chassisGroup.add(tip);
          }
        }
        const lipCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-halfW * 0.68, r + h * 0.59, -halfL + 0.18),
          new THREE.Vector3(0, r + h * 0.615, -halfL + 0.11),
          new THREE.Vector3(halfW * 0.68, r + h * 0.59, -halfL + 0.18),
        ]);
        chassisGroup.add(new THREE.Mesh(new THREE.TubeGeometry(lipCurve, 12, 0.024, 6, false), carbonMat));
      } else {
        const tip = new THREE.Mesh(tipGeo, chromeMat);
        tip.position.set(-halfW * 0.54, r + 0.095, -halfL + 0.01);
        chassisGroup.add(tip);
      }
    }
  }

  // --- VISIBLE 3D TUNING WORKSHOP PARTS (MODULAR ATTACHMENT GROUPS) ---
  // 1. Sport / GT Front Aero Bumper Add-ons
  const tuningFrontSport = new THREE.Group();
  const frontLipMesh = new THREE.Mesh(new THREE.BoxGeometry(halfW * 1.92, 0.055, 0.34), carbonMat);
  frontLipMesh.position.set(0, r + 0.055, halfL - 0.02);
  tuningFrontSport.add(frontLipMesh);
  for (const side of [-1, 1]) {
    const canard = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.24), carbonMat);
    canard.position.set(side * (halfW * 0.92), r + 0.16, halfL - 0.16);
    canard.rotation.z = side * 0.25;
    tuningFrontSport.add(canard);
  }
  chassisGroup.add(tuningFrontSport);

  const tuningFrontGt = new THREE.Group();
  const gtSplitter = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2.08, 0.05, 0.44), carbonMat);
  gtSplitter.position.set(0, r + 0.045, halfL + 0.05);
  tuningFrontGt.add(gtSplitter);
  for (const side of [-1, 1]) {
    const endplate = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.36), carbonMat);
    endplate.position.set(side * (halfW * 1.03), r + 0.11, halfL + 0.04);
    tuningFrontGt.add(endplate);
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.18, 6), chromeMat);
    strut.position.set(side * 0.35, r + 0.14, halfL + 0.1);
    tuningFrontGt.add(strut);
  }
  chassisGroup.add(tuningFrontGt);

  // 2. Rear Aero Diffuser Fins & Track Apron
  const tuningRearDiffuser = new THREE.Group();
  for (let f = -2; f <= 2; f++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.13, 0.28), carbonMat);
    fin.position.set(f * (halfW * 0.26), r + 0.08, -halfL - 0.02);
    tuningRearDiffuser.add(fin);
  }
  chassisGroup.add(tuningRearDiffuser);

  // 3. Carbon Side Skirt Aero Blades
  const tuningSideSkirts = new THREE.Group();
  for (const side of [-1, 1]) {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, spec.wheelBase * 0.72), carbonMat);
    skirt.position.set(side * (halfW + 0.02), r + 0.05, 0);
    tuningSideSkirts.add(skirt);
  }
  chassisGroup.add(tuningSideSkirts);

  // 4. Widebody Fender Arch Kit
  const tuningWidebody = new THREE.Group();
  const wbArchGeo = new THREE.TorusGeometry(spec.wheelRadius * 1.26, 0.075, 8, 20, Math.PI * 0.88);
  wbArchGeo.rotateY(Math.PI / 2);
  for (const [fx, fz] of [
    [halfW * 0.96, wbHalf],
    [-halfW * 0.96, wbHalf],
    [halfW * 0.96, -wbHalf],
    [-halfW * 0.96, -wbHalf],
  ]) {
    const flare = new THREE.Mesh(wbArchGeo, paintMat);
    flare.position.set(fx, spec.wheelRadius * 0.96, fz);
    tuningWidebody.add(flare);
  }
  chassisGroup.add(tuningWidebody);

  // 5. Trunk Spoilers (Lip vs Tall Swan-Neck GT Carbon Wing)
  const tuningSpoilerLip = new THREE.Mesh(
    new THREE.BoxGeometry(halfW * 1.46, 0.045, 0.14),
    carbonMat,
  );
  tuningSpoilerLip.position.set(0, r + h * (isSuv ? 0.98 : 0.62), -halfL + 0.16);
  chassisGroup.add(tuningSpoilerLip);

  const tuningSpoilerGt = new THREE.Group();
  const wingBaseY = r + h * (isSuv ? 1.02 : 0.64);
  const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(halfW * 1.88, 0.036, 0.28), carbonMat);
  wingBlade.position.set(0, wingBaseY + 0.32, -halfL + 0.12);
  wingBlade.rotation.x = 0.14;
  tuningSpoilerGt.add(wingBlade);
  for (const side of [-1, 1]) {
    const stanchion = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.34, 0.14), trimDarkMat);
    stanchion.position.set(side * (halfW * 0.42), wingBaseY + 0.15, -halfL + 0.15);
    tuningSpoilerGt.add(stanchion);
    const wingPlate = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.16, 0.36), paintMat);
    wingPlate.position.set(side * (halfW * 0.95), wingBaseY + 0.32, -halfL + 0.12);
    tuningSpoilerGt.add(wingPlate);
  }
  chassisGroup.add(tuningSpoilerGt);

  // 6. Titanium Quad Burnt Exhausts & Side-Exit Pipes
  const tuningQuadExhaust = new THREE.Group();
  const burntTiMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.92, roughness: 0.16 });
  for (const side of [-1, 1]) {
    for (const off of [-0.085, 0.085]) {
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.18, 14).rotateX(Math.PI / 2), burntTiMat);
      tip.position.set(side * (halfW * 0.54) + off, r + 0.095, -halfL - 0.02);
      tuningQuadExhaust.add(tip);
    }
  }
  chassisGroup.add(tuningQuadExhaust);

  const tuningSideExhaust = new THREE.Group();
  for (const side of [-1, 1]) {
    for (const zOff of [-0.14, 0.06]) {
      const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.24, 12).rotateZ(Math.PI / 2), chromeMat);
      sp.position.set(side * (halfW + 0.03), r + 0.045, -wbHalf * 0.45 + zOff);
      tuningSideExhaust.add(sp);
    }
  }
  chassisGroup.add(tuningSideExhaust);

  // 7. Custom Front & Rear Physical 3D License Plates
  let plateTex = createLicensePlateTexture(activeTuning.licensePlate);
  const plateMat = new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.3, metalness: 0.15 });
  const frontPlate = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.12, 0.02), plateMat);
  frontPlate.position.set(0, r + 0.14, halfL + 0.02);
  chassisGroup.add(frontPlate);
  const rearPlate = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.12, 0.02), plateMat);
  rearPlate.position.set(0, r + h * (isSuv ? 0.26 : 0.34), -halfL - 0.01);
  rearPlate.rotation.y = Math.PI;
  chassisGroup.add(rearPlate);

  // 8. Neon Underglow Ground Strip + Light
  const neonMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(activeTuning.neonColor),
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const neonStripPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(spec.width * 1.15, spec.length * 0.92).rotateX(-Math.PI / 2),
    neonMat,
  );
  neonStripPlane.position.y = 0.032;
  neonStripPlane.visible = activeTuning.neonEnabled;
  root.add(neonStripPlane);

  // Real Headlight SpotLights
  const spotLightLeft = new THREE.SpotLight(0xfff7ed, 0, 75, Math.PI / 5, 0.45, 1.35);
  spotLightLeft.position.set(-halfW * 0.58, r + h * 0.32, halfL + 0.05);
  spotLightLeft.target.position.set(-halfW * 0.4, 0.1, halfL + 28);
  chassisGroup.add(spotLightLeft);
  chassisGroup.add(spotLightLeft.target);

  const spotLightRight = new THREE.SpotLight(0xfff7ed, 0, 75, Math.PI / 5, 0.45, 1.35);
  spotLightRight.position.set(halfW * 0.58, r + h * 0.32, halfL + 0.05);
  spotLightRight.target.position.set(halfW * 0.4, 0.1, halfL + 28);
  chassisGroup.add(spotLightRight);
  chassisGroup.add(spotLightRight.target);

  // --- 4 INDEPENDENT SUSPENSION & FORGED WHEEL CORNERS ---
  const wheelWidth = isSuv ? 0.29 : 0.24;
  const alloyMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(activeTuning.wheelColor),
    roughness: 0.14,
    metalness: 0.94,
    clearcoat: 0.85,
    anisotropy: 0.7,
  });
  const caliperMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(activeTuning.caliperColor),
    roughness: 0.22,
    metalness: 0.78,
  });

  const wheelVariants: {
    yMeshGroup: THREE.Group;
    fiveSpokeGroup: THREE.Group;
    deepDishGroup: THREE.Group;
    offroadGroup: THREE.Group;
    tireMesh: THREE.Mesh;
  }[] = [];

  const makeCorner = (x: number, z: number, isLeft: boolean) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, spec.wheelRadius, z);

    const wRes = createDetailedWheel(spec.wheelRadius, wheelWidth, isSport, isSuv, textures, alloyMat);
    pivot.add(wRes.rollGroup);
    wheelVariants.push(wRes);

    // Curved 6-piston Brembo/AMG/M Brake Caliper
    const calShape = new THREE.Shape();
    calShape.arc(0, 0, spec.wheelRadius * 0.62, -0.45, 0.45, false);
    calShape.arc(0, 0, spec.wheelRadius * 0.40, 0.45, -0.45, true);
    calShape.closePath();
    const calGeo = makeExtrudedTrim(calShape, 0.085, 0.008);
    calGeo.rotateY(Math.PI / 2);
    const caliper = new THREE.Mesh(calGeo, caliperMat);
    caliper.position.set(-0.04, 0, 0);
    caliper.rotation.x = Math.PI * 0.85;
    pivot.add(caliper);

    const strut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.036, 0.036, 0.34, 8),
      new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.75, roughness: 0.28 }),
    );
    strut.position.set(isLeft ? -0.14 : 0.14, 0.18, 0);
    strut.rotation.z = isLeft ? -0.18 : 0.18;
    pivot.add(strut);

    highDetailGroup.add(pivot);
    return { pivot, roll: wRes.rollGroup };
  };

  const makeGlbCorner = (node: THREE.Object3D | undefined, x: number, z: number) => {
    const pivot = new THREE.Group();
    const roll = new THREE.Group();
    if (node && node.parent) {
      const parent = node.parent;
      pivot.position.copy(node.position);
      parent.add(pivot);
      node.position.set(0, 0, 0);
      pivot.add(roll);
      roll.add(node);
      return { pivot, roll, glbNode: pivot, baseY: pivot.position.y };
    }
    pivot.position.set(x, spec.wheelRadius, z);
    pivot.add(roll);
    return { pivot, roll, glbNode: undefined, baseY: spec.wheelRadius };
  };

  const fl = glbOverride
    ? makeGlbCorner(glbOverride.wheels.fl, trackHalf, wbHalf)
    : { ...makeCorner(trackHalf, wbHalf, true), glbNode: undefined, baseY: spec.wheelRadius };
  const fr = glbOverride
    ? makeGlbCorner(glbOverride.wheels.fr, -trackHalf, wbHalf)
    : { ...makeCorner(-trackHalf, wbHalf, false), glbNode: undefined, baseY: spec.wheelRadius };
  const rl = glbOverride
    ? makeGlbCorner(glbOverride.wheels.rl, trackHalf, -wbHalf)
    : { ...makeCorner(trackHalf, -wbHalf, true), glbNode: undefined, baseY: spec.wheelRadius };
  const rr = glbOverride
    ? makeGlbCorner(glbOverride.wheels.rr, -trackHalf, -wbHalf)
    : { ...makeCorner(-trackHalf, -wbHalf, false), glbNode: undefined, baseY: spec.wheelRadius };

  // Simplified wheels for LOD 1 Mid-Detail
  const midWheelGeo = new THREE.CylinderGeometry(spec.wheelRadius, spec.wheelRadius, wheelWidth, 14).rotateZ(Math.PI / 2);
  const midWheelMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 });
  for (const [wx, wz] of [
    [trackHalf, wbHalf],
    [-trackHalf, wbHalf],
    [trackHalf, -wbHalf],
    [-trackHalf, -wbHalf],
  ]) {
    const mw = new THREE.Mesh(midWheelGeo, midWheelMat);
    mw.position.set(wx, spec.wheelRadius, wz);
    midDetailGroup.add(mw);
  }

  // Contact & Undercarriage Ambient Occlusion Shadow
  const shadowGeo = new THREE.PlaneGeometry(spec.width * 1.48, spec.length * 1.24).rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: textures.contactShadowMap,
    transparent: true,
    opacity: 0.66,
    depthWrite: false,
  });
  const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.position.y = 0.025;
  root.add(contactShadow);

  const applyTuning = (tuning: VehicleTuningConfig) => {
    for (const m of bodyPaintMaterials) {
      m.color.set(tuning.paintColor);
    }
    tuningFrontSport.visible = tuning.frontBumper === 'sport';
    tuningFrontGt.visible = tuning.frontBumper === 'gt-aero';
    tuningRearDiffuser.visible = tuning.rearBumper !== 'stock';
    tuningSideSkirts.visible = tuning.sideSkirts === 'carbon';
    tuningWidebody.visible = tuning.bodyKit === 'widebody';
    tuningSpoilerLip.visible = tuning.spoiler === 'lip';
    tuningSpoilerGt.visible = tuning.spoiler === 'gt-wing';
    tuningQuadExhaust.visible = tuning.exhaust === 'quad-ti';
    tuningSideExhaust.visible = tuning.exhaust === 'side-exit';

    // Window tint darkness
    glassMat.opacity = THREE.MathUtils.clamp(0.28 + tuning.windowTint * 0.65, 0.25, 0.94);

    // Mirror finish
    chassisGroup.traverse((obj) => {
      if (obj.userData?.isMirrorCap && (obj as THREE.Mesh).isMesh) {
        (obj as THREE.Mesh).material = tuning.mirrors === 'carbon' ? carbonMat : paintMat;
      }
    });

    // Update license plate texture
    plateTex.dispose();
    plateTex = createLicensePlateTexture(tuning.licensePlate);
    plateMat.map = plateTex;
    plateMat.needsUpdate = true;

    // Wheels, tires, calipers & ride height drop
    alloyMat.color.set(tuning.wheelColor);
    caliperMat.color.set(tuning.caliperColor);
    for (const wv of wheelVariants) {
      wv.yMeshGroup.visible = tuning.wheelDesign === 'y-mesh';
      wv.fiveSpokeGroup.visible = tuning.wheelDesign === '5-spoke';
      wv.deepDishGroup.visible = tuning.wheelDesign === 'deep-dish';
      wv.offroadGroup.visible = tuning.wheelDesign === 'offroad';
      const widthScale = tuning.tireType === 'offroad' ? 1.16 : tuning.tireType === 'sport' ? 1.06 : 1.0;
      wv.tireMesh.scale.set(widthScale, 1, 1);
    }
    for (const piv of [fl.pivot, fr.pivot, rl.pivot, rr.pivot]) {
      piv.scale.set(1, tuning.rimScale, tuning.rimScale);
    }
    const suspDrop = (tuning.suspLv - 1) * 0.025;
    chassisGroup.position.y = -suspDrop;

    // Headlight color temperature + DRL + Neon Underglow
    const hlColor =
      tuning.headlightStyle === 'laser-blue'
        ? 0x93c5fd
        : tuning.headlightStyle === 'gt-yellow'
          ? 0xfacc15
          : 0xfff7ed;
    headlightMat.emissive.setHex(hlColor);
    spotLightLeft.color.setHex(hlColor);
    spotLightRight.color.setHex(hlColor);
    drlMat.emissiveIntensity = tuning.ledDrl ? 1.55 : 0.0;

    neonStripPlane.visible = tuning.neonEnabled;
    neonMat.color.set(tuning.neonColor);
  };

  applyTuning(activeTuning);

  return {
    root,
    lod,
    chassisGroup,
    assetSource,
    bodyPaintMaterials,
    wheelPivots: {
      fl: fl.pivot,
      fr: fr.pivot,
      rl: rl.pivot,
      rr: rr.pivot,
    },
    wheelRollMeshes: [fl.roll, fr.roll, rl.roll, rr.roll],
    wheelBaseYs: [spec.wheelRadius, spec.wheelRadius, spec.wheelRadius, spec.wheelRadius],
    steeringWheel,
    doorLPivot,
    doorRPivot,
    hoodPivot,
    cockpitCameraAnchor,
    hoodCameraAnchor,
    headlightMat,
    tailLightMat,
    reverseLightMat,
    indicatorLeftMat,
    indicatorRightMat,
    spotLightLeft,
    spotLightRight,
    contactShadow,
    setColor: (hex: string) => {
      for (const m of bodyPaintMaterials) {
        m.color.set(hex);
      }
    },
    applyTuning,
    setLights: (headlights, braking, reversing, indicator, blinkOn) => {
      headlightMat.emissiveIntensity = headlights ? 2.6 : 0.25;
      spotLightLeft.intensity = headlights ? 55 : 0;
      spotLightRight.intensity = headlights ? 55 : 0;
      tailLightMat.emissiveIntensity = braking ? 2.8 : headlights ? 1.25 : 0.25;
      reverseLightMat.emissiveIntensity = reversing ? 2.4 : 0.0;

      const leftOn = (indicator === 'left' || indicator === 'hazard') && blinkOn;
      const rightOn = (indicator === 'right' || indicator === 'hazard') && blinkOn;
      indicatorLeftMat.emissiveIntensity = leftOn ? 2.8 : 0.0;
      indicatorRightMat.emissiveIntensity = rightOn ? 2.8 : 0.0;
    },
    setOpenables: (doorsProgress, hoodProgress) => {
      if (glbOverride?.doorL) glbOverride.doorL.rotation.y = doorsProgress * 1.08;
      else doorLPivot.rotation.y = doorsProgress * 1.08;

      if (glbOverride?.doorR) glbOverride.doorR.rotation.y = -doorsProgress * 1.08;
      else doorRPivot.rotation.y = -doorsProgress * 1.08;

      if (glbOverride?.hood) glbOverride.hood.rotation.x = -hoodProgress * 0.78;
      else hoodPivot.rotation.x = -hoodProgress * 0.78;
    },
    setSuspension: (flOff, frOff, rlOff, rrOff) => {
      if (fl.glbNode) fl.glbNode.position.y = fl.baseY + flOff;
      else fl.pivot.position.y = spec.wheelRadius + flOff;

      if (fr.glbNode) fr.glbNode.position.y = fr.baseY + frOff;
      else fr.pivot.position.y = spec.wheelRadius + frOff;

      if (rl.glbNode) rl.glbNode.position.y = rl.baseY + rlOff;
      else rl.pivot.position.y = spec.wheelRadius + rlOff;

      if (rr.glbNode) rr.glbNode.position.y = rr.baseY + rrOff;
      else rr.pivot.position.y = spec.wheelRadius + rrOff;
    },
  };
}
