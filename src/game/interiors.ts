import * as THREE from 'three';
import { ProceduralTextureSet } from './textures';
import {
  FurnitureTheme,
  OwnedPropertyState,
  VEHICLE_CATALOG,
  VehicleTuningConfig,
} from './types';
import { createVehicleMesh, VehicleMeshRig } from './vehicles';

export class InteriorStage {
  public root = new THREE.Group();
  public origin = new THREE.Vector3(0, -120, 0);
  public exitDoorPos = new THREE.Vector3(0, -120, 8.6);
  public isActive = false;

  private floorMat: THREE.MeshStandardMaterial;
  private wallMat: THREE.MeshStandardMaterial;
  private sofaMat: THREE.MeshStandardMaterial;
  private tableMat: THREE.MeshStandardMaterial;
  private accentLight: THREE.PointLight;
  private accentStripMat: THREE.MeshStandardMaterial;
  private garageBayGroup = new THREE.Group();
  private parkedRig: VehicleMeshRig | null = null;
  private textures: ProceduralTextureSet;
  private isSoftwareGl: boolean;

  constructor(textures: ProceduralTextureSet, isSoftwareGl: boolean) {
    this.textures = textures;
    this.isSoftwareGl = isSoftwareGl;
    this.root.position.copy(this.origin);
    this.root.visible = false;

    this.floorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.15 });
    this.wallMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.72 });
    this.sofaMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.75 });
    this.tableMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.55 });
    this.accentStripMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.4,
    });

    // Chamber Dimensions: 26m wide x 6m tall x 22m deep
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(26, 22).rotateX(-Math.PI / 2), this.floorMat);
    floor.receiveShadow = true;
    this.root.add(floor);

    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(26, 22).rotateX(Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 }),
    );
    ceiling.position.y = 5.8;
    this.root.add(ceiling);

    // 4 Perimeter Walls
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(26, 5.8, 0.4), this.wallMat);
    backWall.position.set(0, 2.9, -11);
    this.root.add(backWall);

    const frontWall = new THREE.Mesh(new THREE.BoxGeometry(26, 5.8, 0.4), this.wallMat);
    frontWall.position.set(0, 2.9, 11);
    this.root.add(frontWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5.8, 22), this.wallMat);
    leftWall.position.set(-13, 2.9, 0);
    this.root.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5.8, 22), this.wallMat);
    rightWall.position.set(13, 2.9, 0);
    this.root.add(rightWall);

    // Modern Lounge Sofa & Coffee Table (West side of interior)
    const rug = new THREE.Mesh(
      new THREE.BoxGeometry(7.2, 0.04, 5.4),
      new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.92 }),
    );
    rug.position.set(-5.8, 0.02, -3.5);
    this.root.add(rug);

    const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.55, 1.4), this.sofaMat);
    sofaBase.position.set(-5.8, 0.3, -5.5);
    this.root.add(sofaBase);
    const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.75, 0.35), this.sofaMat);
    sofaBack.position.set(-5.8, 0.85, -6.05);
    this.root.add(sofaBack);

    const coffeeTable = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.42, 1.2), this.tableMat);
    coffeeTable.position.set(-5.8, 0.25, -3.2);
    this.root.add(coffeeTable);

    // Widescreen TV Console
    const tvStand = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.55, 0.7), this.tableMat);
    tvStand.position.set(-5.8, 0.28, -0.6);
    this.root.add(tvStand);
    const tvScreen = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 1.6, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x09090b, emissive: 0x0284c7, emissiveIntensity: 0.35, roughness: 0.1 }),
    );
    tvScreen.position.set(-5.8, 1.6, -0.6);
    this.root.add(tvScreen);

    // Ceiling & Wall Accent Strips + Point Lights
    const strip = new THREE.Mesh(new THREE.BoxGeometry(18, 0.12, 0.25), this.accentStripMat);
    strip.position.set(0, 5.65, -4);
    this.root.add(strip);

    const hemi = new THREE.HemisphereLight(0xf8fafc, 0x1e293b, 0.85);
    this.root.add(hemi);

    this.accentLight = new THREE.PointLight(0xf59e0b, 38, 28, 1.5);
    this.accentLight.position.set(0, 4.8, 0);
    this.root.add(this.accentLight);

    // Private Indoor Collector Garage Plinth (East side of interior: x = +5.5)
    const bayPad = new THREE.Mesh(
      new THREE.BoxGeometry(6.8, 0.12, 9.6),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.22, metalness: 0.45 }),
    );
    bayPad.position.set(5.8, 0.06, -2.5);
    this.root.add(bayPad);
    this.garageBayGroup.position.set(5.8, 0.12, -2.5);
    this.root.add(this.garageBayGroup);

    // Exit Door Portal (+Z = +9.8)
    const doorFrame = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 3.2, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.3 }),
    );
    doorFrame.position.set(0, 1.6, 10.7);
    this.root.add(doorFrame);

    const exitRing = new THREE.Mesh(
      new THREE.RingGeometry(1.1, 1.35, 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide }),
    );
    exitRing.position.set(0, 0.04, 8.6);
    this.root.add(exitRing);
  }

  public configure(
    kind: 'property' | 'restaurant' | 'clothing' | 'barber' | 'dealership',
    propertyState?: OwnedPropertyState | null,
    tunings?: Record<string, VehicleTuningConfig>,
  ) {
    this.isActive = true;
    this.root.visible = true;

    const theme: FurnitureTheme = propertyState?.furnitureTheme || 'modern-dark';
    const accentHex = propertyState?.accentLight || (kind === 'restaurant' ? '#f97316' : '#f59e0b');

    if (theme === 'warm-oak') {
      this.floorMat.color.setHex(0x5c4033);
      this.wallMat.color.setHex(0xe7e5e4);
      this.sofaMat.color.setHex(0x78350f);
      this.tableMat.color.setHex(0x92400e);
    } else if (theme === 'minimal-white') {
      this.floorMat.color.setHex(0xd4d4d8);
      this.wallMat.color.setHex(0xf4f4f5);
      this.sofaMat.color.setHex(0x52525b);
      this.tableMat.color.setHex(0x18181b);
    } else {
      this.floorMat.color.setHex(0x1e293b);
      this.wallMat.color.setHex(0x18181b);
      this.sofaMat.color.setHex(0x334155);
      this.tableMat.color.setHex(0x292524);
    }

    this.accentLight.color.set(accentHex);
    this.accentStripMat.color.set(accentHex);
    this.accentStripMat.emissive.set(accentHex);

    // Clear & optionally spawn parked car in private indoor bay
    if (this.parkedRig) {
      this.garageBayGroup.remove(this.parkedRig.root);
      this.parkedRig = null;
    }
    if (propertyState?.parkedVehicleId) {
      const spec = VEHICLE_CATALOG.find((v) => v.id === propertyState.parkedVehicleId);
      if (spec) {
        const tuning = tunings?.[spec.id];
        const rig = createVehicleMesh(
          spec,
          tuning?.paintColor || spec.defaultColor,
          this.textures,
          this.isSoftwareGl,
          null,
          tuning,
        );
        rig.setLights(true, false, false, 'off', false);
        rig.root.rotation.y = Math.PI * 0.12;
        this.garageBayGroup.add(rig.root);
        this.parkedRig = rig;
      }
    }
  }

  public hide() {
    this.isActive = false;
    this.root.visible = false;
  }

  public clampInteriorPosition(worldX: number, worldZ: number): [number, number] {
    return [
      THREE.MathUtils.clamp(worldX, -11.4, 11.4),
      THREE.MathUtils.clamp(worldZ, -9.8, 9.8),
    ];
  }

  public isNearExit(worldX: number, worldZ: number): boolean {
    return Math.hypot(worldX - this.exitDoorPos.x, worldZ - this.exitDoorPos.z) < 2.2;
  }
}
