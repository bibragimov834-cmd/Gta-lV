import * as THREE from 'three';
import { CharacterAppearance, DEFAULT_APPEARANCE } from './types';

export interface CharacterRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  applyAppearance: (appearance: CharacterAppearance) => void;
  updateAnimation: (dt: number, speed: number, isSprinting: boolean, isGrounded: boolean) => void;
}

export function createCharacterRig(
  contactShadowMap: THREE.Texture,
  jacketColor: number | string = DEFAULT_APPEARANCE.jacketColor,
  pantsColor: number | string = DEFAULT_APPEARANCE.pantsColor,
): CharacterRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const skinMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(DEFAULT_APPEARANCE.skinColor),
    roughness: 0.7,
    metalness: 0.02,
  });
  const jacketMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(jacketColor),
    roughness: 0.65,
    metalness: 0.08,
  });
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0xf4f4f5, roughness: 0.8 });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(pantsColor),
    roughness: 0.8,
  });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.55 });
  const hairMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(DEFAULT_APPEARANCE.hairColor),
    roughness: 0.85,
  });
  const capMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.6 });
  const glassesMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.15, metalness: 0.7 });

  // Pelvis
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.2), pantsMat);
  pelvis.position.y = 0.88;
  pelvis.castShadow = true;
  bodyGroup.add(pelvis);

  // Torso Jacket
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.48, 0.22), jacketMat);
  torso.position.y = 1.18;
  torso.castShadow = true;
  bodyGroup.add(torso);

  const shirtStrip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 0.23), shirtMat);
  shirtStrip.position.y = 1.18;
  bodyGroup.add(shirtStrip);

  // Neck + Head
  const head = new THREE.Group();
  head.position.set(0, 1.48, 0);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.1, 10), skinMat);
  head.add(neck);

  const cranium = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.22), skinMat);
  cranium.position.y = 0.14;
  cranium.castShadow = true;
  head.add(cranium);

  const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.235, 0.08, 0.235), hairMat);
  hairTop.position.set(0, 0.25, -0.01);
  head.add(hairTop);

  const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.14, 0.08), hairMat);
  hairBack.position.set(0, 0.16, -0.09);
  head.add(hairBack);

  // Baseball cap (for hairStyle === 'cap')
  const capGroup = new THREE.Group();
  const capCrown = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.09, 0.24), capMat);
  capCrown.position.set(0, 0.26, -0.01);
  capGroup.add(capCrown);
  const capVisor = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.025, 0.14), capMat);
  capVisor.position.set(0, 0.22, 0.16);
  capGroup.add(capVisor);
  capGroup.visible = false;
  head.add(capGroup);

  const sunglasses = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.048, 0.04), glassesMat);
  sunglasses.position.set(0, 0.16, 0.11);
  head.add(sunglasses);

  bodyGroup.add(head);

  // Arms
  const makeArm = (side: number) => {
    const armPivot = new THREE.Group();
    armPivot.position.set(side * 0.25, 1.38, 0);

    const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.34, 0.11), jacketMat);
    sleeve.position.y = -0.15;
    sleeve.castShadow = true;
    armPivot.add(sleeve);

    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.2, 0.09), skinMat);
    forearm.position.y = -0.4;
    armPivot.add(forearm);

    bodyGroup.add(armPivot);
    return armPivot;
  };

  const leftArm = makeArm(1);
  const rightArm = makeArm(-1);

  // Legs
  const makeLeg = (side: number) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(side * 0.1, 0.84, 0);

    const trouser = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.72, 0.145), pantsMat);
    trouser.position.y = -0.36;
    trouser.castShadow = true;
    legPivot.add(trouser);

    const sneaker = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.11, 0.22), shoeMat);
    sneaker.position.set(0, -0.785, 0.035);
    sneaker.castShadow = true;
    legPivot.add(sneaker);

    bodyGroup.add(legPivot);
    return legPivot;
  };

  const leftLeg = makeLeg(1);
  const rightLeg = makeLeg(-1);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.85, 0.85).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      map: contactShadowMap,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    }),
  );
  shadow.position.y = 0.02;
  root.add(shadow);

  const applyAppearance = (ap: CharacterAppearance) => {
    skinMat.color.set(ap.skinColor);
    jacketMat.color.set(ap.jacketColor);
    pantsMat.color.set(ap.pantsColor);
    hairMat.color.set(ap.hairColor);
    capMat.color.set(ap.jacketColor);
    sunglasses.visible = ap.glasses;
    capGroup.visible = ap.hairStyle === 'cap';
    hairTop.visible = ap.hairStyle !== 'cap';
    hairBack.visible = ap.hairStyle === 'short';
  };

  let animPhase = 0;

  const updateAnimation = (dt: number, speed: number, isSprinting: boolean, isGrounded: boolean) => {
    if (!isGrounded) {
      leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, 0.42, 12, dt);
      rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, -0.35, 12, dt);
      leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, -0.65, 12, dt);
      rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, -0.45, 12, dt);
      bodyGroup.rotation.x = THREE.MathUtils.damp(bodyGroup.rotation.x, 0.08, 10, dt);
      return;
    }

    if (speed > 0.25) {
      const freq = isSprinting ? 11.5 : 7.2;
      const amp = isSprinting ? 0.88 : 0.48;
      animPhase += dt * freq;

      const swing = Math.sin(animPhase) * amp;
      leftLeg.rotation.x = swing;
      rightLeg.rotation.x = -swing;
      leftArm.rotation.x = -swing * 0.85;
      rightArm.rotation.x = swing * 0.85;

      bodyGroup.position.y = Math.abs(Math.sin(animPhase)) * (isSprinting ? 0.07 : 0.035);
      bodyGroup.rotation.x = THREE.MathUtils.damp(bodyGroup.rotation.x, isSprinting ? 0.14 : 0.04, 10, dt);
    } else {
      animPhase += dt * 2.2;
      leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, 0, 10, dt);
      rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, 0, 10, dt);
      leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, Math.sin(animPhase) * 0.03, 8, dt);
      rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, -Math.sin(animPhase) * 0.03, 8, dt);
      bodyGroup.position.y = THREE.MathUtils.damp(bodyGroup.position.y, Math.sin(animPhase) * 0.01, 8, dt);
      bodyGroup.rotation.x = THREE.MathUtils.damp(bodyGroup.rotation.x, 0, 10, dt);
    }
  };

  return {
    root,
    bodyGroup,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    applyAppearance,
    updateAnimation,
  };
}
