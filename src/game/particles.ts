import * as THREE from 'three';
import { WeatherType } from './types';

interface SmokePuff {
  sprite: THREE.Sprite;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  life: number;
  startScale: number;
}

export class EffectsManager {
  public root = new THREE.Group();
  private smokePool: SmokePuff[] = [];
  private smokeCursor = 0;

  // Skid marks via instanced quads
  private skidInst: THREE.InstancedMesh;
  private skidCursor = 0;
  private skidDummy = new THREE.Object3D();
  private maxSkids = 340;

  // Rain & Snow particle clouds
  private rainPoints: THREE.Points;
  private rainPositions: Float32Array;
  private rainCount = 1500;
  private rainMat: THREE.PointsMaterial;

  private snowPoints: THREE.Points;
  private snowPositions: Float32Array;
  private snowCount = 900;

  constructor(smokeTexture: THREE.Texture) {
    // 1. Pooled Tire Smoke Sprites
    for (let i = 0; i < 65; i++) {
      const mat = new THREE.SpriteMaterial({
        map: smokeTexture,
        color: 0xe5e7eb,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      this.root.add(sprite);
      this.smokePool.push({
        sprite,
        vx: 0,
        vy: 0,
        vz: 0,
        age: 99,
        life: 1,
        startScale: 0.6,
      });
    }

    // 2. Pooled Asphalt Skid Marks
    const skidGeo = new THREE.PlaneGeometry(0.28, 0.95).rotateX(-Math.PI / 2);
    const skidMat = new THREE.MeshBasicMaterial({
      color: 0x09090b,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.skidInst = new THREE.InstancedMesh(skidGeo, skidMat, this.maxSkids);
    this.skidInst.frustumCulled = false;
    for (let i = 0; i < this.maxSkids; i++) {
      this.skidDummy.position.set(0, -10, 0);
      this.skidDummy.scale.set(0, 0, 0);
      this.skidDummy.updateMatrix();
      this.skidInst.setMatrixAt(i, this.skidDummy.matrix);
    }
    this.skidInst.instanceMatrix.needsUpdate = true;
    this.root.add(this.skidInst);

    // 3. Dynamic Rain / Thunderstorm Particle System
    this.rainPositions = new Float32Array(this.rainCount * 3);
    for (let i = 0; i < this.rainCount; i++) {
      this.rainPositions[i * 3] = (Math.random() - 0.5) * 76;
      this.rainPositions[i * 3 + 1] = Math.random() * 28;
      this.rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 76;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
    this.rainMat = new THREE.PointsMaterial({
      color: 0xcbd5e1,
      size: 0.24,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
    });
    this.rainPoints = new THREE.Points(rainGeo, this.rainMat);
    this.rainPoints.visible = false;
    this.rainPoints.frustumCulled = false;
    this.root.add(this.rainPoints);

    // 4. Winter Snow Particle System
    this.snowPositions = new Float32Array(this.snowCount * 3);
    for (let i = 0; i < this.snowCount; i++) {
      this.snowPositions[i * 3] = (Math.random() - 0.5) * 76;
      this.snowPositions[i * 3 + 1] = Math.random() * 24;
      this.snowPositions[i * 3 + 2] = (Math.random() - 0.5) * 76;
    }
    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute('position', new THREE.BufferAttribute(this.snowPositions, 3));
    const snowMat = new THREE.PointsMaterial({
      map: smokeTexture,
      color: 0xf8fafc,
      size: 0.36,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    this.snowPoints = new THREE.Points(snowGeo, snowMat);
    this.snowPoints.visible = false;
    this.snowPoints.frustumCulled = false;
    this.root.add(this.snowPoints);
  }

  public emitTireSmoke(x: number, y: number, z: number, vx: number, vz: number) {
    const p = this.smokePool[this.smokeCursor];
    this.smokeCursor = (this.smokeCursor + 1) % this.smokePool.length;
    p.sprite.visible = true;
    p.sprite.position.set(x + (Math.random() - 0.5) * 0.25, y + 0.15, z + (Math.random() - 0.5) * 0.25);
    p.vx = vx * 0.2 + (Math.random() - 0.5) * 1.1;
    p.vy = 0.7 + Math.random() * 0.8;
    p.vz = vz * 0.2 + (Math.random() - 0.5) * 1.1;
    p.age = 0;
    p.life = 0.75 + Math.random() * 0.45;
    p.startScale = 0.65 + Math.random() * 0.35;
    p.sprite.scale.setScalar(p.startScale);
    (p.sprite.material as THREE.SpriteMaterial).opacity = 0.52;
  }

  public addSkidMark(x: number, z: number, heading: number) {
    this.skidDummy.position.set(x, 0.028, z);
    this.skidDummy.rotation.set(0, heading, 0);
    this.skidDummy.scale.set(1, 1, 1);
    this.skidDummy.updateMatrix();
    this.skidInst.setMatrixAt(this.skidCursor, this.skidDummy.matrix);
    this.skidInst.instanceMatrix.needsUpdate = true;
    this.skidCursor = (this.skidCursor + 1) % this.maxSkids;
  }

  public update(dt: number, focusX: number, focusZ: number, weather: WeatherType, elapsed: number) {
    for (const p of this.smokePool) {
      if (!p.sprite.visible) continue;
      p.age += dt;
      if (p.age >= p.life) {
        p.sprite.visible = false;
        continue;
      }
      const t = p.age / p.life;
      p.sprite.position.x += p.vx * dt;
      p.sprite.position.y += p.vy * dt;
      p.sprite.position.z += p.vz * dt;
      const scale = p.startScale + t * 2.6;
      p.sprite.scale.setScalar(scale);
      (p.sprite.material as THREE.SpriteMaterial).opacity = (1 - t) * 0.48;
    }

    const isRain = weather === 'rain' || weather === 'heavy-rain' || weather === 'thunderstorm';
    const isHeavy = weather === 'heavy-rain' || weather === 'thunderstorm';
    this.rainPoints.visible = isRain;
    if (isRain) {
      this.rainMat.opacity = isHeavy ? 0.8 : 0.55;
      this.rainMat.size = isHeavy ? 0.28 : 0.21;
      const activeCount = isHeavy ? this.rainCount : 850;
      const fallSpeed = isHeavy ? 38 : 27;
      this.rainPoints.geometry.setDrawRange(0, activeCount);
      this.rainPoints.position.set(focusX, 0, focusZ);
      const posAttr = this.rainPoints.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < activeCount; i++) {
        let y = this.rainPositions[i * 3 + 1] - fallSpeed * dt;
        if (y < 0) y = 28;
        this.rainPositions[i * 3 + 1] = y;
      }
      posAttr.needsUpdate = true;
    }

    const isSnow = weather === 'snow';
    this.snowPoints.visible = isSnow;
    if (isSnow) {
      this.snowPoints.position.set(focusX, 0, focusZ);
      const posAttr = this.snowPoints.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < this.snowCount; i++) {
        let y = this.snowPositions[i * 3 + 1] - 4.2 * dt;
        if (y < 0) y = 24;
        this.snowPositions[i * 3 + 1] = y;
        this.snowPositions[i * 3] += Math.sin(elapsed * 1.6 + i) * 0.6 * dt;
      }
      posAttr.needsUpdate = true;
    }
  }
}
