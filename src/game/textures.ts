import * as THREE from 'three';

export interface ProceduralTextureSet {
  asphaltMap: THREE.CanvasTexture;
  asphaltNormalMap: THREE.DataTexture;
  asphaltRoughnessMap: THREE.CanvasTexture;
  sidewalkMap: THREE.CanvasTexture;
  grassMap: THREE.CanvasTexture;
  buildingFacades: THREE.CanvasTexture[];
  buildingEmissives: THREE.CanvasTexture[];
  houseWallMap: THREE.CanvasTexture;
  roofTileMap: THREE.CanvasTexture;
  contactShadowMap: THREE.CanvasTexture;
  smokeSpriteMap: THREE.CanvasTexture;
  waterNormalMap: THREE.DataTexture;
  brakeDiscMap: THREE.CanvasTexture;
  tireTreadMap: THREE.CanvasTexture;
  leatherNormalMap: THREE.DataTexture;
  bmwRoundelMap: THREE.CanvasTexture;
  mercedesStarMap: THREE.CanvasTexture;
  chevyBowtieMap: THREE.CanvasTexture;
  carbonWeaveMap: THREE.CanvasTexture;
  dashboardClusterMap: THREE.CanvasTexture;
  navScreenMap: THREE.CanvasTexture;
  showroomFloorMap: THREE.CanvasTexture;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

function configureColorTex(
  tex: THREE.CanvasTexture,
  maxAniso: number,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAniso;
  tex.needsUpdate = true;
  return tex;
}

function configureDataTex(
  tex: THREE.CanvasTexture | THREE.DataTexture,
  maxAniso: number,
  repeatX = 1,
  repeatY = 1,
): void {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAniso;
  tex.needsUpdate = true;
}

export function createLicensePlateTexture(plateText: string, maxAnisotropy = 4): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256, 64);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 256, 64);
  // Euro/Metro blue left strip
  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(0, 0, 34, 64);
  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('AH', 17, 40);
  // Border
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 252, 60);
  // Plate string
  ctx.fillStyle = '#09090b';
  ctx.font = 'bold 34px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText((plateText || 'APEX 001').toUpperCase().slice(0, 9), 144, 34);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  // 1. Realistic Asphalt Texture (Albedo + Micro-Aggregate Normal + Roughness Variation for Reflections)
  const [asphaltCanvas, actx] = makeCanvas(512, 512);
  actx.fillStyle = '#23252a';
  actx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 20000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const v = 24 + Math.floor(Math.random() * 34);
    actx.fillStyle = `rgb(${v},${v + 1},${v + 4})`;
    actx.fillRect(x, y, 2, 2);
  }
  actx.fillStyle = 'rgba(12, 13, 16, 0.25)';
  actx.fillRect(88, 0, 78, 512);
  actx.fillRect(346, 0, 78, 512);
  const asphaltMap = configureColorTex(new THREE.CanvasTexture(asphaltCanvas), maxAnisotropy, 36, 36);

  // Asphalt Roughness Map (polished tire tracks reflect light more than shoulders)
  const [arCanvas, arCtx] = makeCanvas(512, 512);
  arCtx.fillStyle = '#c8c8c8';
  arCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 10000; i++) {
    const v = 160 + Math.floor(Math.random() * 75);
    arCtx.fillStyle = `rgb(${v},${v},${v})`;
    arCtx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }
  arCtx.fillStyle = 'rgba(85, 85, 85, 0.5)';
  arCtx.fillRect(88, 0, 78, 512);
  arCtx.fillRect(346, 0, 78, 512);
  const asphaltRoughnessMap = new THREE.CanvasTexture(arCanvas);
  configureDataTex(asphaltRoughnessMap, maxAnisotropy, 36, 36);

  // Asphalt Micro-Grain Normal Map
  const aSize = 256;
  const aNorm = new Uint8Array(aSize * aSize * 4);
  for (let i = 0; i < aSize * aSize; i++) {
    const idx = i * 4;
    aNorm[idx] = 112 + Math.floor(Math.random() * 32);
    aNorm[idx + 1] = 112 + Math.floor(Math.random() * 32);
    aNorm[idx + 2] = 240;
    aNorm[idx + 3] = 255;
  }
  const asphaltNormalMap = new THREE.DataTexture(aNorm, aSize, aSize, THREE.RGBAFormat);
  configureDataTex(asphaltNormalMap, maxAnisotropy, 48, 48);

  // 2. Concrete Sidewalk Paving
  const [swCanvas, swCtx] = makeCanvas(512, 512);
  swCtx.fillStyle = '#9ca3af';
  swCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) {
    const v = 135 + Math.floor(Math.random() * 32);
    swCtx.fillStyle = `rgb(${v},${v},${v - 2})`;
    swCtx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }
  swCtx.strokeStyle = 'rgba(63, 63, 70, 0.35)';
  swCtx.lineWidth = 3;
  for (let x = 0; x <= 512; x += 128) {
    swCtx.beginPath();
    swCtx.moveTo(x, 0);
    swCtx.lineTo(x, 512);
    swCtx.stroke();
  }
  for (let y = 0; y <= 512; y += 128) {
    swCtx.beginPath();
    swCtx.moveTo(0, y);
    swCtx.lineTo(512, y);
    swCtx.stroke();
  }
  const sidewalkMap = configureColorTex(new THREE.CanvasTexture(swCanvas), maxAnisotropy, 4, 4);

  // 3. Park Grass Texture
  const [grCanvas, grCtx] = makeCanvas(512, 512);
  grCtx.fillStyle = '#2d5a27';
  grCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 14000; i++) {
    const g = 70 + Math.floor(Math.random() * 48);
    const r = Math.floor(g * 0.52);
    const b = Math.floor(g * 0.42);
    grCtx.fillStyle = `rgb(${r},${g},${b})`;
    grCtx.fillRect(Math.random() * 512, Math.random() * 512, 2, 3);
  }
  const grassMap = configureColorTex(new THREE.CanvasTexture(grCanvas), maxAnisotropy, 6, 6);

  // 4. Skyscraper / Building Facades + Night Emissives
  const buildingFacades: THREE.CanvasTexture[] = [];
  const buildingEmissives: THREE.CanvasTexture[] = [];
  const facadeStyles = [
    { wall: '#1e293b', glass: '#38bdf8', mullion: '#0f172a', warmProb: 0.45 },
    { wall: '#27272a', glass: '#64748b', mullion: '#18181b', warmProb: 0.55 },
    { wall: '#3f3f46', glass: '#94a3b8', mullion: '#52525b', warmProb: 0.65 },
    { wall: '#44403c', glass: '#78716c', mullion: '#292524', warmProb: 0.7 },
  ];

  for (const style of facadeStyles) {
    const [fCanvas, fCtx] = makeCanvas(512, 512);
    const [eCanvas, eCtx] = makeCanvas(512, 512);
    fCtx.fillStyle = style.wall;
    fCtx.fillRect(0, 0, 512, 512);
    eCtx.fillStyle = '#000000';
    eCtx.fillRect(0, 0, 512, 512);

    const cols = 8;
    const rows = 12;
    const cellW = 512 / cols;
    const cellH = 512 / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = c * cellW + 6;
        const wy = r * cellH + 5;
        const ww = cellW - 12;
        const wh = cellH - 10;

        const grad = fCtx.createLinearGradient(wx, wy, wx, wy + wh);
        grad.addColorStop(0, style.glass);
        grad.addColorStop(1, '#0f172a');
        fCtx.fillStyle = grad;
        fCtx.fillRect(wx, wy, ww, wh);
        fCtx.strokeStyle = style.mullion;
        fCtx.lineWidth = 2;
        fCtx.strokeRect(wx, wy, ww, wh);

        if (Math.random() < style.warmProb) {
          const isWarm = Math.random() < 0.72;
          eCtx.fillStyle = isWarm
            ? `rgba(255, ${195 + Math.floor(Math.random() * 45)}, ${110 + Math.floor(Math.random() * 50)}, 1)`
            : 'rgba(186, 230, 253, 0.9)';
          eCtx.fillRect(wx + 1, wy + 1, ww - 2, wh - 2);
        }
      }
    }

    buildingFacades.push(configureColorTex(new THREE.CanvasTexture(fCanvas), maxAnisotropy, 1, 1));
    buildingEmissives.push(configureColorTex(new THREE.CanvasTexture(eCanvas), maxAnisotropy, 1, 1));
  }

  // 5. House Wall & Roof
  const [hwCanvas, hwCtx] = makeCanvas(256, 256);
  hwCtx.fillStyle = '#e7e5e4';
  hwCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3000; i++) {
    const v = 215 + Math.floor(Math.random() * 25);
    hwCtx.fillStyle = `rgb(${v},${v - 2},${v - 6})`;
    hwCtx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  const houseWallMap = configureColorTex(new THREE.CanvasTexture(hwCanvas), maxAnisotropy, 1, 1);

  const [rtCanvas, rtCtx] = makeCanvas(256, 256);
  rtCtx.fillStyle = '#57534e';
  rtCtx.fillRect(0, 0, 256, 256);
  rtCtx.strokeStyle = '#292524';
  rtCtx.lineWidth = 2;
  for (let y = 0; y < 256; y += 16) {
    rtCtx.beginPath();
    rtCtx.moveTo(0, y);
    rtCtx.lineTo(256, y);
    rtCtx.stroke();
    const off = (y / 16) % 2 === 0 ? 0 : 16;
    for (let x = off; x < 256; x += 32) {
      rtCtx.beginPath();
      rtCtx.moveTo(x, y);
      rtCtx.lineTo(x, y + 16);
      rtCtx.stroke();
    }
  }
  const roofTileMap = configureColorTex(new THREE.CanvasTexture(rtCanvas), maxAnisotropy, 2, 2);

  // 6. Contact Shadow Map
  const [csCanvas, csCtx] = makeCanvas(128, 128);
  const csGrad = csCtx.createRadialGradient(64, 64, 10, 64, 64, 62);
  csGrad.addColorStop(0, 'rgba(0, 0, 0, 0.88)');
  csGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.5)');
  csGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  csCtx.fillStyle = csGrad;
  csCtx.fillRect(0, 0, 128, 128);
  const contactShadowMap = new THREE.CanvasTexture(csCanvas);
  contactShadowMap.colorSpace = THREE.SRGBColorSpace;
  contactShadowMap.needsUpdate = true;

  // 7. Tire Smoke Sprite
  const [smCanvas, smCtx] = makeCanvas(128, 128);
  const smGrad = smCtx.createRadialGradient(64, 64, 4, 64, 64, 60);
  smGrad.addColorStop(0, 'rgba(245, 245, 250, 0.95)');
  smGrad.addColorStop(0.45, 'rgba(220, 224, 230, 0.55)');
  smGrad.addColorStop(1, 'rgba(200, 205, 215, 0)');
  smCtx.fillStyle = smGrad;
  smCtx.fillRect(0, 0, 128, 128);
  const smokeSpriteMap = new THREE.CanvasTexture(smCanvas);
  smokeSpriteMap.colorSpace = THREE.SRGBColorSpace;
  smokeSpriteMap.needsUpdate = true;

  // 8. Water Normal Map
  const wSize = 128;
  const wData = new Uint8Array(wSize * wSize * 4);
  for (let y = 0; y < wSize; y++) {
    for (let x = 0; x < wSize; x++) {
      const idx = (y * wSize + x) * 4;
      const nx = Math.sin((x / wSize) * Math.PI * 8) * 0.25 + Math.cos((y / wSize) * Math.PI * 6) * 0.2;
      const ny = Math.cos((y / wSize) * Math.PI * 10) * 0.25 + Math.sin((x / wSize) * Math.PI * 4) * 0.2;
      wData[idx] = Math.floor((nx * 0.5 + 0.5) * 255);
      wData[idx + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
      wData[idx + 2] = 240;
      wData[idx + 3] = 255;
    }
  }
  const waterNormalMap = new THREE.DataTexture(wData, wSize, wSize, THREE.RGBAFormat);
  configureDataTex(waterNormalMap, maxAnisotropy, 16, 16);

  // 9. Cross-Drilled Ventilated Brake Rotor Texture
  const [bdCanvas, bdCtx] = makeCanvas(256, 256);
  bdCtx.fillStyle = '#9ca3af';
  bdCtx.fillRect(0, 0, 256, 256);
  // Radial brushed metal rings
  for (let r = 46; r < 122; r += 3) {
    bdCtx.strokeStyle = r % 6 === 0 ? 'rgba(255,255,255,0.22)' : 'rgba(55,65,81,0.25)';
    bdCtx.lineWidth = 1.5;
    bdCtx.beginPath();
    bdCtx.arc(128, 128, r, 0, Math.PI * 2);
    bdCtx.stroke();
  }
  // Cross-drilled ventilation holes
  bdCtx.fillStyle = '#18181b';
  for (let a = 0; a < 16; a++) {
    const ang = (a / 16) * Math.PI * 2;
    for (let k = 0; k < 4; k++) {
      const rad = 60 + k * 15;
      const hx = 128 + Math.cos(ang + k * 0.09) * rad;
      const hy = 128 + Math.sin(ang + k * 0.09) * rad;
      bdCtx.beginPath();
      bdCtx.arc(hx, hy, 2.8, 0, Math.PI * 2);
      bdCtx.fill();
    }
  }
  const brakeDiscMap = new THREE.CanvasTexture(bdCanvas);
  brakeDiscMap.colorSpace = THREE.SRGBColorSpace;
  brakeDiscMap.anisotropy = maxAnisotropy;
  brakeDiscMap.needsUpdate = true;

  // 10. Performance Tire Tread Texture
  const [ttCanvas, ttCtx] = makeCanvas(256, 256);
  ttCtx.fillStyle = '#151518';
  ttCtx.fillRect(0, 0, 256, 256);
  ttCtx.strokeStyle = '#09090b';
  ttCtx.lineWidth = 4;
  for (let y = 0; y < 256; y += 24) {
    ttCtx.beginPath();
    ttCtx.moveTo(0, y + 10);
    ttCtx.lineTo(118, y);
    ttCtx.lineTo(138, y);
    ttCtx.lineTo(256, y + 10);
    ttCtx.stroke();
  }
  // Center circumferential rain grooves
  ttCtx.fillStyle = '#09090b';
  ttCtx.fillRect(84, 0, 10, 256);
  ttCtx.fillRect(123, 0, 10, 256);
  ttCtx.fillRect(162, 0, 10, 256);
  const tireTreadMap = configureColorTex(new THREE.CanvasTexture(ttCanvas), maxAnisotropy, 1, 6);

  // 11. Interior Perforated Leather Normal Map
  const lSize = 128;
  const lData = new Uint8Array(lSize * lSize * 4);
  for (let y = 0; y < lSize; y++) {
    for (let x = 0; x < lSize; x++) {
      const idx = (y * lSize + x) * 4;
      const pebble = Math.sin(x * 0.9) * Math.cos(y * 0.9) * 18;
      lData[idx] = Math.floor(128 + pebble);
      lData[idx + 1] = Math.floor(128 - pebble);
      lData[idx + 2] = 245;
      lData[idx + 3] = 255;
    }
  }
  const leatherNormalMap = new THREE.DataTexture(lData, lSize, lSize, THREE.RGBAFormat);
  configureDataTex(leatherNormalMap, maxAnisotropy, 6, 6);

  // 12. BMW Roundel Emblem (Crisp Blue/White/Chrome/Black Medallion)
  const [bmwC, bmwCtx] = makeCanvas(256, 256);
  bmwCtx.clearRect(0, 0, 256, 256);
  bmwCtx.beginPath();
  bmwCtx.arc(128, 128, 122, 0, Math.PI * 2);
  bmwCtx.fillStyle = '#d4d4d8';
  bmwCtx.fill();
  bmwCtx.beginPath();
  bmwCtx.arc(128, 128, 112, 0, Math.PI * 2);
  bmwCtx.fillStyle = '#09090b';
  bmwCtx.fill();
  bmwCtx.beginPath();
  bmwCtx.arc(128, 128, 72, 0, Math.PI * 2);
  bmwCtx.fillStyle = '#d4d4d8';
  bmwCtx.fill();
  // Quadrants: Top-Left & Bottom-Right Blue, Top-Right & Bottom-Left White
  const quads = [
    { start: Math.PI, end: Math.PI * 1.5, color: '#0284c7' },
    { start: Math.PI * 1.5, end: Math.PI * 2, color: '#f8fafc' },
    { start: 0, end: Math.PI * 0.5, color: '#0284c7' },
    { start: Math.PI * 0.5, end: Math.PI, color: '#f8fafc' },
  ];
  for (const q of quads) {
    bmwCtx.beginPath();
    bmwCtx.moveTo(128, 128);
    bmwCtx.arc(128, 128, 66, q.start, q.end);
    bmwCtx.closePath();
    bmwCtx.fillStyle = q.color;
    bmwCtx.fill();
  }
  bmwCtx.strokeStyle = '#d4d4d8';
  bmwCtx.lineWidth = 5;
  bmwCtx.beginPath();
  bmwCtx.moveTo(62, 128);
  bmwCtx.lineTo(194, 128);
  bmwCtx.moveTo(128, 62);
  bmwCtx.lineTo(128, 194);
  bmwCtx.stroke();
  const bmwRoundelMap = new THREE.CanvasTexture(bmwC);
  bmwRoundelMap.colorSpace = THREE.SRGBColorSpace;
  bmwRoundelMap.anisotropy = maxAnisotropy;
  bmwRoundelMap.needsUpdate = true;

  // 13. Mercedes-Benz 3-Pointed Star Medallion
  const [mbC, mbCtx] = makeCanvas(256, 256);
  mbCtx.beginPath();
  mbCtx.arc(128, 128, 120, 0, Math.PI * 2);
  mbCtx.fillStyle = '#18181b';
  mbCtx.fill();
  mbCtx.lineWidth = 10;
  mbCtx.strokeStyle = '#e4e4e7';
  mbCtx.stroke();
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 3;
    const aL = a - 0.22;
    const aR = a + 0.22;
    mbCtx.beginPath();
    mbCtx.moveTo(128, 128);
    mbCtx.lineTo(128 + Math.cos(aL) * 24, 128 + Math.sin(aL) * 24);
    mbCtx.lineTo(128 + Math.cos(a) * 108, 128 + Math.sin(a) * 108);
    mbCtx.lineTo(128 + Math.cos(aR) * 24, 128 + Math.sin(aR) * 24);
    mbCtx.closePath();
    mbCtx.fillStyle = '#f4f4f5';
    mbCtx.fill();
  }
  const mercedesStarMap = new THREE.CanvasTexture(mbC);
  mercedesStarMap.colorSpace = THREE.SRGBColorSpace;
  mercedesStarMap.anisotropy = maxAnisotropy;
  mercedesStarMap.needsUpdate = true;

  // 14. Chevrolet Gold Bowtie Badge
  const [chC, chCtx] = makeCanvas(256, 128);
  chCtx.fillStyle = '#09090b';
  chCtx.fillRect(0, 0, 256, 128);
  chCtx.fillStyle = '#d4d4d8';
  chCtx.beginPath();
  chCtx.moveTo(20, 44);
  chCtx.lineTo(92, 44);
  chCtx.lineTo(98, 22);
  chCtx.lineTo(158, 22);
  chCtx.lineTo(164, 44);
  chCtx.lineTo(242, 44);
  chCtx.lineTo(230, 84);
  chCtx.lineTo(164, 84);
  chCtx.lineTo(158, 106);
  chCtx.lineTo(98, 106);
  chCtx.lineTo(92, 84);
  chCtx.lineTo(14, 84);
  chCtx.closePath();
  chCtx.fill();
  chCtx.fillStyle = '#eab308';
  chCtx.beginPath();
  chCtx.moveTo(28, 50);
  chCtx.lineTo(97, 50);
  chCtx.lineTo(103, 29);
  chCtx.lineTo(153, 29);
  chCtx.lineTo(159, 50);
  chCtx.lineTo(232, 50);
  chCtx.lineTo(222, 78);
  chCtx.lineTo(159, 78);
  chCtx.lineTo(153, 99);
  chCtx.lineTo(103, 99);
  chCtx.lineTo(97, 78);
  chCtx.lineTo(22, 78);
  chCtx.closePath();
  chCtx.fill();
  const chevyBowtieMap = new THREE.CanvasTexture(chC);
  chevyBowtieMap.colorSpace = THREE.SRGBColorSpace;
  chevyBowtieMap.anisotropy = maxAnisotropy;
  chevyBowtieMap.needsUpdate = true;

  // 15. Carbon Fiber Twill Weave Map
  const [cfC, cfCtx] = makeCanvas(64, 64);
  cfCtx.fillStyle = '#111114';
  cfCtx.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 8) {
    for (let x = 0; x < 64; x += 8) {
      cfCtx.fillStyle = ((x + y) / 8) % 2 === 0 ? '#242429' : '#16161a';
      cfCtx.fillRect(x, y, 7, 4);
      cfCtx.fillStyle = ((x + y) / 8) % 2 === 0 ? '#18181d' : '#2a2a30';
      cfCtx.fillRect(x, y + 4, 7, 4);
    }
  }
  const carbonWeaveMap = configureColorTex(new THREE.CanvasTexture(cfC), maxAnisotropy, 8, 8);

  // 16. Digital Cockpit Instrument Cluster Screen
  const [dcC, dcCtx] = makeCanvas(512, 192);
  dcCtx.fillStyle = '#05070c';
  dcCtx.fillRect(0, 0, 512, 192);
  // Left Speed Ring
  dcCtx.strokeStyle = '#0ea5e9';
  dcCtx.lineWidth = 8;
  dcCtx.beginPath();
  dcCtx.arc(112, 98, 66, Math.PI * 0.75, Math.PI * 2.1);
  dcCtx.stroke();
  // Right RPM Ring
  dcCtx.strokeStyle = '#f59e0b';
  dcCtx.beginPath();
  dcCtx.arc(400, 98, 66, Math.PI * 0.9, Math.PI * 2.25);
  dcCtx.stroke();
  dcCtx.strokeStyle = '#ef4444';
  dcCtx.beginPath();
  dcCtx.arc(400, 98, 66, Math.PI * 2.0, Math.PI * 2.25);
  dcCtx.stroke();
  // Center Telemetry Map Line
  dcCtx.strokeStyle = '#22d3ee';
  dcCtx.lineWidth = 3;
  dcCtx.beginPath();
  dcCtx.moveTo(220, 150);
  dcCtx.lineTo(256, 55);
  dcCtx.lineTo(292, 150);
  dcCtx.stroke();
  dcCtx.fillStyle = '#fafafa';
  dcCtx.font = 'bold 26px monospace';
  dcCtx.textAlign = 'center';
  dcCtx.fillText('000', 112, 108);
  dcCtx.fillText('8.0', 400, 108);
  const dashboardClusterMap = new THREE.CanvasTexture(dcC);
  dashboardClusterMap.colorSpace = THREE.SRGBColorSpace;
  dashboardClusterMap.anisotropy = maxAnisotropy;
  dashboardClusterMap.needsUpdate = true;

  // 17. Wide Center Infotainment Navigation Display
  const [nvC, nvCtx] = makeCanvas(512, 224);
  nvCtx.fillStyle = '#0b1220';
  nvCtx.fillRect(0, 0, 512, 224);
  nvCtx.strokeStyle = '#1e293b';
  nvCtx.lineWidth = 6;
  for (let i = 0; i < 512; i += 48) {
    nvCtx.beginPath();
    nvCtx.moveTo(i, 0);
    nvCtx.lineTo(i, 224);
    nvCtx.stroke();
  }
  for (let j = 0; j < 224; j += 48) {
    nvCtx.beginPath();
    nvCtx.moveTo(0, j);
    nvCtx.lineTo(512, j);
    nvCtx.stroke();
  }
  nvCtx.strokeStyle = '#f59e0b';
  nvCtx.lineWidth = 7;
  nvCtx.beginPath();
  nvCtx.moveTo(80, 190);
  nvCtx.quadraticCurveTo(220, 120, 260, 75);
  nvCtx.quadraticCurveTo(320, 45, 440, 38);
  nvCtx.stroke();
  const navScreenMap = new THREE.CanvasTexture(nvC);
  navScreenMap.colorSpace = THREE.SRGBColorSpace;
  navScreenMap.anisotropy = maxAnisotropy;
  navScreenMap.needsUpdate = true;

  // 18. Underground Showroom Polished Slate Concrete Tile Floor
  const [sfC, sfCtx] = makeCanvas(512, 512);
  sfCtx.fillStyle = '#14161a';
  sfCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 6500; i++) {
    const v = 16 + Math.floor(Math.random() * 18);
    sfCtx.fillStyle = `rgb(${v},${v + 1},${v + 3})`;
    sfCtx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
  }
  sfCtx.strokeStyle = 'rgba(255,255,255,0.06)';
  sfCtx.lineWidth = 2;
  for (let p = 0; p <= 512; p += 128) {
    sfCtx.beginPath();
    sfCtx.moveTo(p, 0);
    sfCtx.lineTo(p, 512);
    sfCtx.stroke();
    sfCtx.beginPath();
    sfCtx.moveTo(0, p);
    sfCtx.lineTo(512, p);
    sfCtx.stroke();
  }
  const showroomFloorMap = configureColorTex(new THREE.CanvasTexture(sfC), maxAnisotropy, 10, 10);

  return {
    asphaltMap,
    asphaltNormalMap,
    asphaltRoughnessMap,
    sidewalkMap,
    grassMap,
    buildingFacades,
    buildingEmissives,
    houseWallMap,
    roofTileMap,
    contactShadowMap,
    smokeSpriteMap,
    waterNormalMap,
    brakeDiscMap,
    tireTreadMap,
    leatherNormalMap,
    bmwRoundelMap,
    mercedesStarMap,
    chevyBowtieMap,
    carbonWeaveMap,
    dashboardClusterMap,
    navScreenMap,
    showroomFloorMap,
  };
}
