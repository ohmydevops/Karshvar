import * as THREE from "./vendor/three.module.min.js";

// Authored in receiver space: +X is the barrel, +Y is up, +Z is the right side.
// The two closed gloves move with the receiver, including recoil and reload.
export function createWeaponHands() {
  const hands = new THREE.Group();
  const rubber = new THREE.MeshStandardMaterial({
    color: 0x18252d,
    roughness: 0.78,
  });
  const padding = new THREE.MeshStandardMaterial({
    color: 0x2b3941,
    roughness: 0.88,
  });
  const sphere = new THREE.SphereGeometry(1, 16, 12);
  function pad(position, scale, material = rubber) {
    const mesh = new THREE.Mesh(sphere, material);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    hands.add(mesh);
    return mesh;
  }
  function finger(points, radius) {
    const path = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
    );
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(path, 14, radius, 8, false),
      rubber,
    );
    hands.add(mesh);
    pad(points.at(-1), [radius, radius, radius]);
  }
  // Right palm lies along the pistol grip; four fingers close around its front.
  pad([0, -0.015, 0.055], [0.075, 0.11, 0.036]);
  pad([-0.035, -0.018, 0.073], [0.043, 0.085, 0.018], padding);
  for (let i = 0; i < 4; i++) {
    const y = 0.055 - i * 0.044;
    finger(
      [
        [-0.015, y, 0.074],
        [0.061, y, 0.075],
        [0.093, y, 0.022],
        [0.062, y, -0.037],
        [0.021, y, -0.041],
      ],
      0.022,
    );
  }
  finger(
    [
      [-0.062, 0.055, 0.051],
      [-0.07, 0.09, 0.01],
      [-0.029, 0.095, -0.046],
      [0.02, 0.069, -0.045],
    ],
    0.028,
  );
  // Left palm supports the fore-end, with fingers wrapping up its opposite side.
  pad([0.6, 0.004, -0.06], [0.105, 0.047, 0.042]);
  pad([0.6, -0.017, -0.082], [0.086, 0.025, 0.026], padding);
  for (let i = 0; i < 4; i++) {
    const x = 0.53 + i * 0.046;
    finger(
      [
        [x, 0.005, -0.086],
        [x, -0.03, -0.035],
        [x, -0.016, 0.05],
        [x, 0.042, 0.061],
        [x, 0.062, 0.035],
      ],
      0.021,
    );
  }
  finger(
    [
      [0.5, 0.006, -0.045],
      [0.49, 0.067, -0.052],
      [0.55, 0.1, -0.019],
      [0.58, 0.085, 0.003],
    ],
    0.027,
  );
  return hands;
}

// Separate helmet-view sleeves avoid stretching an unrigged full-body mesh
// into the lens. Endpoints are derived from the same receiver-space wrists.
export function createHelmetSleeves(weapon) {
  const arms = new THREE.Group();
  const weave = new Uint8Array(64 * 64 * 4);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const i = (y * 64 + x) * 4;
      weave[i] = 128 + Math.round(Math.sin((x * Math.PI) / 2) * 12);
      weave[i + 1] = 128 + Math.round(Math.sin((y * Math.PI) / 2) * 12);
      weave[i + 2] = 255;
      weave[i + 3] = 255;
    }
  const fabric = new THREE.DataTexture(weave, 64, 64);
  fabric.wrapS = fabric.wrapT = THREE.RepeatWrapping;
  fabric.repeat.set(4, 8);
  fabric.needsUpdate = true;
  const suit = new THREE.MeshStandardMaterial({
    color: 0xb8c5cc,
    roughness: 0.9,
    normalMap: fabric,
    normalScale: new THREE.Vector2(0.18, 0.18),
  });
  const cuff = new THREE.MeshStandardMaterial({
    color: 0x1c2a33,
    metalness: 0.12,
    roughness: 0.65,
  });
  const seam = new THREE.MeshStandardMaterial({
    color: 0x536470,
    roughness: 0.8,
  });
  const accent = new THREE.MeshStandardMaterial({
    color: 0xb66934,
    roughness: 0.8,
  });
  weapon.updateMatrix();
  const wrists = [
    [-0.065, -0.055, 0.065],
    [0.59, -0.025, -0.1],
  ];
  for (let side = 0; side < 2; side++) {
    const wrist = new THREE.Vector3(...wrists[side]).applyMatrix4(
      weapon.matrix,
    );
    const elbow =
      side === 0
        ? new THREE.Vector3(0.69, -0.14, 0.13)
        : new THREE.Vector3(-0.48, -0.12, -0.21);
    const axis = wrist.clone().sub(elbow);
    const length = axis.length();
    const frame = new THREE.Group();
    frame.position.copy(elbow);
    frame.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      axis.normalize(),
    );
    arms.add(frame);
    const geometry = new THREE.CylinderGeometry(0.065, 0.105, length, 24, 32);
    const vertices = geometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i),
        y = vertices.getY(i),
        z = vertices.getZ(i);
      const radius = Math.hypot(x, z);
      if (radius < 0.001) continue;
      const fold = 1 + Math.sin(y * 73 + Math.atan2(z, x) * 2) * 0.022;
      vertices.setXYZ(i, x * fold, y, z * fold);
    }
    geometry.computeVertexNormals();
    const sleeve = new THREE.Mesh(geometry, suit);
    sleeve.position.y = length / 2;
    frame.add(sleeve);
    // Small raised fabric folds and a sealed cuff, rather than a cut shoulder.
    for (let i = 0; i < 8; i++) {
      const t = 0.18 + i * 0.082;
      const radius = THREE.MathUtils.lerp(0.105, 0.065, t);
      const fold = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.004, 6, 24),
        i === 6 ? accent : suit,
      );
      fold.rotation.x = Math.PI / 2;
      fold.position.y = length * t;
      frame.add(fold);
    }
    const seal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.069, 0.07, 24),
      cuff,
    );
    seal.position.y = length - 0.014;
    frame.add(seal);
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.019, length * 0.57, 0.009),
      seam,
    );
    stripe.position.set(0, length * 0.44, 0.092);
    frame.add(stripe);
  }
  return arms;
}
