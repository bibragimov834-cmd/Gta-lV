import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AssetSourceType, VehicleId, VehicleSpec } from './types';

/**
 * Modular GLB/GLTF Asset Manifest.
 * Entries default to `null` so no unhosted local URLs trigger 404 errors.
 * Replace `null` with hosted licensed `.glb` / `.gltf` URLs or load assets at
 * runtime via the 3D Showroom Garage (`Load .GLB` file picker or URL input).
 */
export const VEHICLE_GLB_MANIFEST: Record<VehicleId, string | null> = {
  bmw_m4: null,
  bmw_m5: null,
  cls_63: null,
  g63_amg: null,
  e63_amg: null,
  chevy_cobalt: null,
  chevy_gentra: null,
};

export interface LoadedGlbVehicle {
  scene: THREE.Group;
  source: AssetSourceType;
  label: string;
  paintMaterials: THREE.MeshPhysicalMaterial[];
  wheels: {
    fl?: THREE.Object3D;
    fr?: THREE.Object3D;
    rl?: THREE.Object3D;
    rr?: THREE.Object3D;
  };
  doorL?: THREE.Object3D;
  doorR?: THREE.Object3D;
  hood?: THREE.Object3D;
  steeringWheel?: THREE.Object3D;
}

const gltfLoader = new GLTFLoader();
let dracoInitialized = false;

function ensureDracoDecoder() {
  if (dracoInitialized) return;
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
  gltfLoader.setDRACOLoader(dracoLoader);
  dracoInitialized = true;
}

interface CustomGlbEntry {
  buffer?: ArrayBuffer;
  url?: string;
  label: string;
}

const customGlbRegistry = new Map<VehicleId, CustomGlbEntry>();

export function registerCustomGlbBuffer(vehicleId: VehicleId, buffer: ArrayBuffer, fileName = 'Custom.glb') {
  customGlbRegistry.set(vehicleId, { buffer, label: fileName });
}

export function registerCustomGlbUrl(vehicleId: VehicleId, url: string) {
  const cleanName = url.split('/').pop()?.split('?')[0] || 'External.glb';
  customGlbRegistry.set(vehicleId, { url, label: cleanName });
}

export function clearCustomGlb(vehicleId: VehicleId) {
  customGlbRegistry.delete(vehicleId);
}

export function hasRegisteredGlb(vehicleId: VehicleId): boolean {
  return customGlbRegistry.has(vehicleId) || VEHICLE_GLB_MANIFEST[vehicleId] !== null;
}

export function getRegisteredGlbLabel(vehicleId: VehicleId): string | null {
  const custom = customGlbRegistry.get(vehicleId);
  if (custom) return custom.label;
  const manifestUrl = VEHICLE_GLB_MANIFEST[vehicleId];
  if (manifestUrl) {
    return manifestUrl.split('/').pop()?.split('?')[0] || 'Manifest.glb';
  }
  return null;
}

export async function tryLoadGlbVehicle(
  spec: VehicleSpec,
  paintHex: string,
): Promise<LoadedGlbVehicle | null> {
  const custom = customGlbRegistry.get(spec.id);
  const manifestUrl = VEHICLE_GLB_MANIFEST[spec.id];
  const targetUrl = custom?.url || manifestUrl;

  if (!custom?.buffer && !targetUrl) {
    return null;
  }

  ensureDracoDecoder();

  try {
    const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
      if (custom?.buffer) {
        gltfLoader.parse(custom.buffer.slice(0), '', resolve, reject);
      } else if (targetUrl) {
        gltfLoader.load(targetUrl, resolve, undefined, reject);
      }
    });

    const model = gltf.scene;
    const paintMaterials: THREE.MeshPhysicalMaterial[] = [];
    const wheels: LoadedGlbVehicle['wheels'] = {};
    let doorL: THREE.Object3D | undefined;
    let doorR: THREE.Object3D | undefined;
    let hood: THREE.Object3D | undefined;
    let steeringWheel: THREE.Object3D | undefined;

    // Normalize orientation & real-world scale
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    if (size.x > size.z * 1.15) {
      model.rotation.y = -Math.PI / 2;
      model.updateMatrixWorld(true);
    }

    const orientedBox = new THREE.Box3().setFromObject(model);
    const orientedSize = orientedBox.getSize(new THREE.Vector3());
    const longestAxis = Math.max(orientedSize.x, orientedSize.z, 0.001);
    const scaleFactor = spec.length / longestAxis;

    model.scale.setScalar(scaleFactor);
    model.updateMatrixWorld(true);

    const scaledBox = new THREE.Box3().setFromObject(model);
    const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
    model.position.x -= scaledCenter.x;
    model.position.z -= scaledCenter.z;
    model.position.y -= scaledBox.min.y;

    model.traverse((child) => {
      const n = child.name.toLowerCase();
      if (n.includes('wheel_fl') || n.includes('fl_wheel') || n === 'wheel_lf') wheels.fl = child;
      else if (n.includes('wheel_fr') || n.includes('fr_wheel') || n === 'wheel_rf') wheels.fr = child;
      else if (n.includes('wheel_rl') || n.includes('rl_wheel') || n === 'wheel_lr') wheels.rl = child;
      else if (n.includes('wheel_rr') || n.includes('rr_wheel') || n === 'wheel_rr') wheels.rr = child;
      else if (n.includes('door_fl') || n.includes('door_l') || n.includes('left_door')) doorL = child;
      else if (n.includes('door_fr') || n.includes('door_r') || n.includes('right_door')) doorR = child;
      else if (n.includes('hood') || n.includes('bonnet')) hood = child;
      else if (n.includes('steering')) steeringWheel = child;

      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        const matName = mat?.name?.toLowerCase() || '';
        if (
          mat &&
          (n.includes('body') ||
            n.includes('paint') ||
            n.includes('chassis') ||
            matName.includes('paint') ||
            matName.includes('carpaint') ||
            matName.includes('body'))
        ) {
          const phys = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(paintHex),
            metalness: 0.86,
            roughness: 0.15,
            clearcoat: 1.0,
            clearcoatRoughness: 0.04,
            envMapIntensity: 1.65,
          });
          mesh.material = phys;
          paintMaterials.push(phys);
        } else if (mat && (mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
          mat.envMapIntensity = Math.max(mat.envMapIntensity ?? 1.0, 1.35);
        }
      }
    });

    return {
      scene: model,
      source: 'glb',
      label: custom?.label || getRegisteredGlbLabel(spec.id) || 'External GLB',
      paintMaterials,
      wheels,
      doorL,
      doorR,
      hood,
      steeringWheel,
    };
  } catch {
    return null;
  }
}
