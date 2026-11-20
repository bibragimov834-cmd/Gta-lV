import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { ProceduralTextureSet } from './textures';
import {
  createDefaultTuning,
  GarageCameraPreset,
  GarageSnapshotState,
  VEHICLE_CATALOG,
  VehicleId,
  VehicleTuningConfig,
} from './types';
import { getRegisteredGlbLabel, tryLoadGlbVehicle } from './vehicleLoader';
import { createVehicleMesh, VehicleMeshRig } from './vehicles';

interface GallerySlot {
  vehicleId: VehicleId;
  platformGroup: THREE.Group;
  rig: VehicleMeshRig;
  angle: number;
}

const _camTargetPos = new THREE.Vector3();
const _camTargetLook = new THREE.Vector3();
const _heroCenter = new THREE.Vector3(0, 0.16, 0);

export class GarageShowroom {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;

  private textures: ProceduralTextureSet;
  private isSoftwareGl: boolean;
  private envTexture: THREE.Texture | null;

  private heroTurntable: THREE.Group;
  private heroRig: VehicleMeshRig;
  private gallerySlots: GallerySlot[] = [];
  private raycaster = new THREE.Raycaster();
  private ndcPointer = new THREE.Vector2();

  public selectedId: VehicleId = 'bmw_m4';
  public selectedColor: string = VEHICLE_CATALOG[0].defaultColor;
  public cameraPreset: GarageCameraPreset = 'orbit';
  public autoRotate = true;
  public doorsOpen = false;
  public hoodOpen = false;
  public headlightsOn = true;
  public engineRunning = false;
  public revBoost = 0;

  private doorsAnim = 0;
  private hoodAnim = 0;
  private turntableAngle = Math.PI * 0.18;

  // Spherical orbit controls state
  private orbitYaw = Math.PI * 0.24;
  private orbitPitch = 0.22;
  private orbitDist = 6.2;
  private interiorLookYaw = 0;
  private interiorLookPitch = 0;
  private currentCamPos = new THREE.Vector3(4.5, 2.1, 4.8);
  private currentCamLook = new THREE.Vector3(0, 0.78, 0);

  private customColors = new Map<VehicleId, string>();
  private tunings = new Map<VehicleId, VehicleTuningConfig>();

  constructor(
    aspect: number,
    textures: ProceduralTextureSet,
    isSoftwareGl: boolean,
    envTexture: THREE.Texture | null,
  ) {
    this.textures = textures;
    this.isSoftwareGl = isSoftwareGl;
    this.envTexture = envTexture;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x090a0d);
    this.scene.fog = new THREE.FogExp2(0x090a0d, 0.018);
    if (this.envTexture) {
      this.scene.environment = this.envTexture;
      this.scene.environmentIntensity = 1.35;
    }

    this.camera = new THREE.PerspectiveCamera(48, aspect, 0.1, 140);
    this.camera.position.copy(this.currentCamPos);
    this.camera.lookAt(this.currentCamLook);

    this.heroTurntable = new THREE.Group();

    this.buildShowroomArchitecture();
    this.setupLighting();

    // Initialize colors & default tunings
    for (const v of VEHICLE_CATALOG) {
      this.customColors.set(v.id, v.defaultColor);
      this.tunings.set(v.id, createDefaultTuning(v));
    }

    // Build initial hero & perimeter gallery vehicles
    const heroSpec = VEHICLE_CATALOG[0];
    this.heroRig = createVehicleMesh(
      heroSpec,
      this.selectedColor,
      this.textures,
      this.isSoftwareGl,
      null,
      this.tunings.get(heroSpec.id),
    );
    this.heroRig.root.position.y = 0.16;
    this.heroTurntable.add(this.heroRig.root);
    this.scene.add(this.heroTurntable);

    this.buildPerimeterGallery();
  }

  private buildShowroomArchitecture() {
    // 1. Reflective Dark Underground Concrete & Marble Floor
    if (!this.isSoftwareGl) {
      const mirrorGeo = new THREE.CircleGeometry(28, 48);
      const reflector = new Reflector(mirrorGeo, {
        clipBias: 0.003,
        textureWidth: 512,
        textureHeight: 512,
        color: 0x3f424a,
      });
      reflector.rotation.x = -Math.PI / 2;
      reflector.position.y = 0.0;
      this.scene.add(reflector);

      const overlayMat = new THREE.MeshPhysicalMaterial({
        map: this.textures.showroomFloorMap,
        color: 0x181a20,
        roughness: 0.18,
        metalness: 0.25,
        transparent: true,
        opacity: 0.62,
        depthWrite: false,
      });
      const overlay = new THREE.Mesh(new THREE.PlaneGeometry(58, 48).rotateX(-Math.PI / 2), overlayMat);
      overlay.position.y = 0.008;
      overlay.receiveShadow = true;
      this.scene.add(overlay);
    } else {
      const floorMat = new THREE.MeshPhysicalMaterial({
        map: this.textures.showroomFloorMap,
        color: 0x1b1e24,
        roughness: 0.16,
        metalness: 0.35,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
        envMapIntensity: 1.6,
      });
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(58, 48).rotateX(-Math.PI / 2), floorMat);
      floor.receiveShadow = true;
      this.scene.add(floor);
    }

    // 2. Center Hero Turntable Platform (Lathe stepped brushed steel + glowing LED perimeter halo)
    const plinthPts = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(3.55, 0),
      new THREE.Vector2(3.50, 0.08),
      new THREE.Vector2(3.32, 0.16),
      new THREE.Vector2(0, 0.16),
    ];
    const plinthGeo = new THREE.LatheGeometry(plinthPts, 64);
    const plinthMat = new THREE.MeshPhysicalMaterial({
      color: 0x18181b,
      metalness: 0.72,
      roughness: 0.22,
      clearcoat: 0.85,
      envMapIntensity: 1.5,
    });
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.receiveShadow = true;
    this.heroTurntable.add(plinth);

    const haloMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.75,
      roughness: 0.2,
    });
    const haloRing = new THREE.Mesh(new THREE.TorusGeometry(3.42, 0.025, 10, 72).rotateX(Math.PI / 2), haloMat);
    haloRing.position.y = 0.11;
    this.heroTurntable.add(haloRing);

    // Inner subtle architectural floor ring around turntable
    const outerFloorRing = new THREE.Mesh(
      new THREE.RingGeometry(4.4, 4.48, 72).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.4 }),
    );
    outerFloorRing.position.y = 0.015;
    this.scene.add(outerFloorRing);

    // 3. Architectural Concrete Walls, Fluted Ribbed Acoustic Backing & Columns
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x16181d,
      roughness: 0.78,
      metalness: 0.15,
    });
    const brassTrimMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.88,
      roughness: 0.24,
    });

    // Curved rear gallery feature wall
    const backWall = new THREE.Mesh(
      new THREE.CylinderGeometry(20, 20, 9.2, 48, 1, true, Math.PI * 0.58, Math.PI * 0.84),
      new THREE.MeshStandardMaterial({
        color: 0x121418,
        roughness: 0.72,
        metalness: 0.2,
        side: THREE.BackSide,
      }),
    );
    backWall.position.y = 4.6;
    this.scene.add(backWall);

    // Vertical structural concrete & brass accent columns around showroom perimeter
    const colGeo = new THREE.CylinderGeometry(0.42, 0.46, 9.2, 16);
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI * 0.72 + (i / 9) * (Math.PI * 1.44);
      const cx = Math.sin(a) * 18.6;
      const cz = -Math.cos(a) * 18.6;
      const col = new THREE.Mesh(colGeo, wallMat);
      col.position.set(cx, 4.6, cz);
      this.scene.add(col);

      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 7.6, 0.06), brassTrimMat);
      strip.position.set(cx * 0.96, 4.5, cz * 0.96);
      strip.lookAt(0, 4.5, 0);
      this.scene.add(strip);
    }

    // Overhead Coffered Dark Ceiling + Glowing Linear LED Light Softboxes
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(58, 48).rotateX(Math.PI / 2), wallMat);
    ceiling.position.y = 9.0;
    this.scene.add(ceiling);

    const softboxEmissive = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      emissive: 0xe0f2fe,
      emissiveIntensity: 1.85,
      roughness: 0.1,
    });
    for (const zOff of [-6.5, -2.2, 2.2, 6.5]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.08, 0.55), softboxEmissive);
      bar.position.set(0, 8.75, zOff);
      this.scene.add(bar);
    }

    // Illuminated Underground Showroom Exit Ramp on +Z side
    const ramp = new THREE.Mesh(
      new THREE.BoxGeometry(7.2, 0.3, 18),
      new THREE.MeshStandardMaterial({ color: 0x22252b, roughness: 0.75 }),
    );
    ramp.position.set(0, 1.9, 23);
    ramp.rotation.x = -0.22;
    this.scene.add(ramp);

    const rampLedMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.4,
    });
    for (const side of [-3.4, 3.4]) {
      const guide = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 17), rampLedMat);
      guide.position.set(side, 2.08, 23);
      guide.rotation.x = -0.22;
      this.scene.add(guide);
    }

    // Backlit Showroom Monolith Sign Wall
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 1024;
    signCanvas.height = 256;
    const sCtx = signCanvas.getContext('2d')!;
    sCtx.fillStyle = '#09090b';
    sCtx.fillRect(0, 0, 1024, 256);
    sCtx.strokeStyle = '#f59e0b';
    sCtx.lineWidth = 6;
    sCtx.strokeRect(16, 16, 992, 224);
    sCtx.fillStyle = '#fafafa';
    sCtx.font = '700 66px sans-serif';
    sCtx.textAlign = 'center';
    sCtx.fillText('APEX AUTOMOTIVE GALLERY', 512, 128);
    sCtx.fillStyle = '#f59e0b';
    sCtx.font = '600 28px monospace';
    sCtx.fillText('UNDERGROUND CONCOURS · CUSTOMIZATION LAB', 512, 186);

    const signTex = new THREE.CanvasTexture(signCanvas);
    signTex.colorSpace = THREE.SRGBColorSpace;
    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(8.5, 2.1),
      new THREE.MeshStandardMaterial({
        map: signTex,
        emissiveMap: signTex,
        emissive: 0xffffff,
        emissiveIntensity: 0.85,
        roughness: 0.25,
      }),
    );
    signMesh.position.set(0, 4.3, -18.5);
    this.scene.add(signMesh);
  }

  private setupLighting() {
    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x18181b, 0.72);
    this.scene.add(hemi);

    // Warm overhead hero key spotlight
    const keySpot = new THREE.SpotLight(0xfff3d6, 95, 36, Math.PI / 3.8, 0.45, 1.2);
    keySpot.position.set(5.5, 8.6, 5.5);
    keySpot.target.position.set(0, 0.6, 0);
    if (!this.isSoftwareGl) {
      keySpot.castShadow = true;
      keySpot.shadow.mapSize.set(1024, 1024);
      keySpot.shadow.bias = -0.0005;
    }
    this.scene.add(keySpot);
    this.scene.add(keySpot.target);

    // Cool rim light for dramatic metallic body creases
    const rimLight = new THREE.DirectionalLight(0x93c5fd, 1.25);
    rimLight.position.set(-8, 6, -9);
    this.scene.add(rimLight);

    const warmFill = new THREE.DirectionalLight(0xfde68a, 0.75);
    warmFill.position.set(9, 4, -5);
    this.scene.add(warmFill);

    // Hardware Studio RectAreaLight softboxes overhead
    if (!this.isSoftwareGl) {
      RectAreaLightUniformsLib.init();
      for (const zOff of [-4.2, 4.2]) {
        const rectLight = new THREE.RectAreaLight(0xe0f2fe, 4.2, 10, 1.4);
        rectLight.position.set(0, 8.5, zOff);
        rectLight.lookAt(0, 0, zOff * 0.3);
        this.scene.add(rectLight);
      }
    }
  }

  private buildPerimeterGallery() {
    const otherVehicles = VEHICLE_CATALOG.filter((v) => v.id !== this.selectedId);
    const radius = 12.2;
    const platPts = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(2.75, 0),
      new THREE.Vector2(2.65, 0.12),
      new THREE.Vector2(0, 0.12),
    ];
    const platGeo = new THREE.LatheGeometry(platPts, 36);
    const platMat = new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.65, roughness: 0.28 });
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.9,
    });
    const ringGeo = new THREE.TorusGeometry(2.70, 0.018, 8, 48).rotateX(Math.PI / 2);

    otherVehicles.forEach((spec, idx) => {
      const frac = otherVehicles.length > 1 ? idx / (otherVehicles.length - 1) : 0.5;
      const angle = -Math.PI * 0.62 + frac * (Math.PI * 1.24);
      const px = Math.sin(angle) * radius;
      const pz = -Math.cos(angle) * radius;

      const platGroup = new THREE.Group();
      platGroup.position.set(px, 0, pz);
      platGroup.rotation.y = -angle;

      const platMesh = new THREE.Mesh(platGeo, platMat);
      platMesh.receiveShadow = true;
      platGroup.add(platMesh);

      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 0.08;
      platGroup.add(ring);

      const color = this.customColors.get(spec.id) || spec.defaultColor;
      const rig = createVehicleMesh(spec, color, this.textures, this.isSoftwareGl);
      rig.root.position.y = 0.12;
      rig.root.userData.galleryVehicleId = spec.id;
      rig.setLights(true, false, false, 'off', false);
      platGroup.add(rig.root);

      this.scene.add(platGroup);
      this.gallerySlots.push({
        vehicleId: spec.id,
        platformGroup: platGroup,
        rig,
        angle,
      });
    });
  }

  private async rebuildGallerySlots() {
    for (const s of this.gallerySlots) {
      this.scene.remove(s.platformGroup);
    }
    this.gallerySlots = [];
    this.buildPerimeterGallery();
  }

  public async selectVehicle(id: VehicleId, colorOverride?: string, tuningOverride?: VehicleTuningConfig) {
    const spec = VEHICLE_CATALOG.find((v) => v.id === id);
    if (!spec) return;

    this.selectedId = id;
    if (tuningOverride) {
      this.tunings.set(id, { ...tuningOverride });
      this.customColors.set(id, tuningOverride.paintColor);
    }
    const tuning = this.tunings.get(id) || createDefaultTuning(spec);
    const color = colorOverride || tuning.paintColor || this.customColors.get(id) || spec.defaultColor;
    this.selectedColor = color;
    this.customColors.set(id, color);
    tuning.paintColor = color;
    this.tunings.set(id, tuning);

    const glb = await tryLoadGlbVehicle(spec, color);
    this.heroTurntable.remove(this.heroRig.root);
    this.heroRig = createVehicleMesh(spec, color, this.textures, this.isSoftwareGl, glb, tuning);
    this.heroRig.root.position.y = 0.16;
    this.heroTurntable.add(this.heroRig.root);

    this.doorsOpen = false;
    this.hoodOpen = false;
    this.doorsAnim = 0;
    this.hoodAnim = 0;

    await this.rebuildGallerySlots();
  }

  public setColor(hex: string) {
    this.selectedColor = hex;
    this.customColors.set(this.selectedId, hex);
    const cur = this.tunings.get(this.selectedId);
    if (cur) {
      cur.paintColor = hex;
      this.heroRig.applyTuning(cur);
    } else {
      this.heroRig.setColor(hex);
    }
  }

  public setTuning(next: VehicleTuningConfig) {
    this.tunings.set(this.selectedId, { ...next });
    this.selectedColor = next.paintColor;
    this.customColors.set(this.selectedId, next.paintColor);
    this.heroRig.applyTuning(next);
  }

  public setCameraPreset(preset: GarageCameraPreset) {
    this.cameraPreset = preset;
    if (preset === 'orbit') {
      this.orbitDist = 6.2;
      this.orbitPitch = 0.22;
    } else if (preset === 'closeup') {
      this.orbitYaw = Math.PI * 0.20;
      this.orbitPitch = 0.12;
      this.orbitDist = 3.5;
    } else if (preset === 'rear') {
      this.orbitYaw = Math.PI * 0.88;
      this.orbitPitch = 0.18;
      this.orbitDist = 4.9;
    } else if (preset === 'interior') {
      this.interiorLookYaw = 0.22;
      this.interiorLookPitch = -0.08;
    }
  }

  public handleDrag(dx: number, dy: number) {
    if (this.cameraPreset === 'interior') {
      this.interiorLookYaw = THREE.MathUtils.clamp(this.interiorLookYaw - dx * 0.005, -1.25, 1.25);
      this.interiorLookPitch = THREE.MathUtils.clamp(this.interiorLookPitch - dy * 0.004, -0.55, 0.55);
    } else {
      this.orbitYaw -= dx * 0.0065;
      this.orbitPitch = THREE.MathUtils.clamp(this.orbitPitch + dy * 0.0045, 0.04, 0.92);
    }
  }

  public handleWheel(deltaY: number) {
    if (this.cameraPreset === 'interior') return;
    this.orbitDist = THREE.MathUtils.clamp(this.orbitDist + deltaY * 0.003, 3.0, 9.6);
  }

  public handlePickClick(clientX: number, clientY: number, rect: DOMRect): VehicleId | null {
    this.ndcPointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.ndcPointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.ndcPointer, this.camera);

    const targets = this.gallerySlots.map((s) => s.rig.root);
    const hits = this.raycaster.intersectObjects(targets, true);
    if (hits.length === 0) return null;

    let cur: THREE.Object3D | null = hits[0].object;
    while (cur) {
      if (cur.userData?.galleryVehicleId) {
        return cur.userData.galleryVehicleId as VehicleId;
      }
      cur = cur.parent;
    }
    return null;
  }

  public update(dt: number, elapsed: number) {
    if (this.autoRotate && this.cameraPreset !== 'interior') {
      this.turntableAngle += dt * 0.24;
    }
    this.heroTurntable.rotation.y = this.turntableAngle;

    this.doorsAnim = THREE.MathUtils.damp(this.doorsAnim, this.doorsOpen ? 1 : 0, 7, dt);
    this.hoodAnim = THREE.MathUtils.damp(this.hoodAnim, this.hoodOpen ? 1 : 0, 7, dt);
    this.heroRig.setOpenables(this.doorsAnim, this.hoodAnim);
    this.heroRig.setLights(this.headlightsOn, false, false, 'off', false);
    this.heroRig.lod.update(this.camera);

    // Subtle engine idle / rev chassis micro-tremor
    this.revBoost = Math.max(0, this.revBoost - dt * 1.6);
    if (this.engineRunning) {
      const amp = 0.0018 + this.revBoost * 0.004;
      this.heroRig.chassisGroup.position.y = Math.sin(elapsed * 42) * amp;
    } else {
      this.heroRig.chassisGroup.position.y = THREE.MathUtils.damp(this.heroRig.chassisGroup.position.y, 0, 12, dt);
    }

    // Update gallery slot LODs cleanly
    for (const s of this.gallerySlots) {
      s.rig.lod.update(this.camera);
    }

    // Camera Smooth Damping
    if (this.cameraPreset === 'interior') {
      this.heroRig.cockpitCameraAnchor.getWorldPosition(_camTargetPos);
      const lookYaw = this.turntableAngle + this.interiorLookYaw;
      _camTargetLook.set(
        _camTargetPos.x + Math.sin(lookYaw) * 2.2,
        _camTargetPos.y + Math.sin(this.interiorLookPitch) * 1.4 - 0.14,
        _camTargetPos.z + Math.cos(lookYaw) * 2.2,
      );
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 64, 8, dt);
    } else {
      const worldYaw = this.orbitYaw + (this.cameraPreset === 'closeup' ? this.turntableAngle : 0);
      const yOffset = this.cameraPreset === 'closeup' ? 0.62 : 0.78;
      _camTargetLook.set(_heroCenter.x, _heroCenter.y + yOffset, _heroCenter.z);
      _camTargetPos.set(
        Math.sin(worldYaw) * Math.cos(this.orbitPitch) * this.orbitDist,
        0.55 + Math.sin(this.orbitPitch) * this.orbitDist,
        Math.cos(worldYaw) * Math.cos(this.orbitPitch) * this.orbitDist,
      );
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, this.cameraPreset === 'closeup' ? 40 : 48, 8, dt);
    }

    this.camera.updateProjectionMatrix();
    this.currentCamPos.lerp(_camTargetPos, 1 - Math.exp(-8.5 * dt));
    this.currentCamLook.lerp(_camTargetLook, 1 - Math.exp(-10 * dt));
    this.camera.position.copy(this.currentCamPos);
    this.camera.lookAt(this.currentCamLook);
  }

  public getSnapshotState(): GarageSnapshotState {
    const spec = VEHICLE_CATALOG.find((v) => v.id === this.selectedId) || VEHICLE_CATALOG[0];
    return {
      selectedId: this.selectedId,
      color: this.selectedColor,
      cameraPreset: this.cameraPreset,
      autoRotate: this.autoRotate,
      assetSource: this.heroRig.assetSource,
      glbLabel: getRegisteredGlbLabel(this.selectedId),
      tuning: { ...(this.tunings.get(this.selectedId) || createDefaultTuning(spec)) },
    };
  }
}
