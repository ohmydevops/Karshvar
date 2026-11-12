import * as THREE from "./vendor/three.module.min.js";

// The bundled SMG is a single textured mesh, but its drum is assembled from
// disconnected closed components. Split whole components, keeping their UVs,
// tangents and normals; slicing by height would cut the receiver and pistol grip.
function drumIndices(geometry) {
  const positions = geometry.attributes.position;
  const indices = geometry.index;
  if (!positions || !indices) return null;
  const parents = new Int32Array(positions.count);
  for (let i = 0; i < parents.length; i++) parents[i] = i;
  function find(i) {
    let root = i;
    while (parents[root] !== root) root = parents[root];
    while (parents[i] !== i) {
      const next = parents[i];
      parents[i] = root;
      i = next;
    }
    return root;
  }
  const join = (a, b) => {
    parents[find(a)] = find(b);
  };
  const welded = new Map();
  for (let i = 0; i < positions.count; i++) {
    const key = `${Math.round(positions.getX(i) * 1e5)},${Math.round(positions.getY(i) * 1e5)},${Math.round(positions.getZ(i) * 1e5)}`;
    const previous = welded.get(key);
    if (previous === undefined) welded.set(key, i);
    else join(i, previous);
  }
  for (let i = 0; i < indices.count; i += 3) {
    join(indices.getX(i), indices.getX(i + 1));
    join(indices.getX(i), indices.getX(i + 2));
  }
  const bounds = new Map();
  for (let i = 0; i < positions.count; i++) {
    const root = find(i);
    let box = bounds.get(root);
    if (!box) {
      box = {
        minY: Infinity,
        maxY: -Infinity,
        minZ: Infinity,
        maxZ: -Infinity,
      };
      bounds.set(root, box);
    }
    box.minY = Math.min(box.minY, positions.getY(i));
    box.maxY = Math.max(box.maxY, positions.getY(i));
    box.minZ = Math.min(box.minZ, positions.getZ(i));
    box.maxZ = Math.max(box.maxZ, positions.getZ(i));
  }
  const selected = new Set();
  for (const [root, box] of bounds) {
    // These are authored coordinates in smg-gun.glb, before its node transforms.
    if (
      box.minY > -0.025 &&
      box.maxY < 0.36 &&
      box.minZ < -0.3 &&
      box.maxZ < 0.1
    )
      selected.add(root);
  }
  const drum = [],
    receiver = [];
  for (let i = 0; i < indices.count; i += 3) {
    const destination = selected.has(find(indices.getX(i))) ? drum : receiver;
    destination.push(indices.getX(i), indices.getX(i + 1), indices.getX(i + 2));
  }
  return drum.length >= 900 && drum.length < indices.count / 2
    ? { drum, receiver }
    : null;
}

export function createMagazineAnimation(gun) {
  const mount = gun.parent;
  if (!mount) return { update() {}, enabled: false };
  let source, split;
  gun.traverse((mesh) => {
    if (
      source ||
      !mesh.isMesh ||
      !mesh.geometry?.attributes.position ||
      Array.isArray(mesh.material)
    )
      return;
    const box = new THREE.Box3().setFromBufferAttribute(
      mesh.geometry.attributes.position,
    );
    const size = box.getSize(new THREE.Vector3());
    if (size.x < 0.4 || size.x > 0.8 || size.y < 2 || size.y > 3.5) return;
    const result = drumIndices(mesh.geometry);
    if (result) {
      source = mesh;
      split = result;
    }
  });
  if (!source) return { update() {}, enabled: false };

  gun.updateWorldMatrix(true, true);
  const original = source.geometry;
  const receiver = new THREE.BufferGeometry();
  for (const [name, attribute] of Object.entries(original.attributes))
    receiver.setAttribute(name, attribute);
  receiver.setIndex(split.receiver);
  receiver.computeBoundingBox();
  receiver.computeBoundingSphere();
  source.geometry = receiver;

  // Bake the drum into the weapon's local metre units, including gun.position.
  const relative = new THREE.Matrix4()
    .copy(mount.matrixWorld)
    .invert()
    .multiply(source.matrixWorld);
  const geometry = original.clone();
  geometry.setIndex(split.drum);
  geometry.clearGroups();
  geometry.applyMatrix4(relative);
  // BufferGeometry bounds include unused vertices; take only selected indices.
  const box = new THREE.Box3();
  const point = new THREE.Vector3();
  for (const index of split.drum)
    box.expandByPoint(
      point.fromBufferAttribute(geometry.attributes.position, index),
    );
  const anchor = box.getCenter(new THREE.Vector3());
  geometry.translate(-anchor.x, -anchor.y, -anchor.z);
  geometry.computeBoundingSphere();
  const inserted = new THREE.Mesh(geometry, source.material);
  inserted.name = "SMG inserted drum";
  inserted.position.copy(anchor);
  mount.add(inserted);
  const fallingMaterial = source.material.clone();
  fallingMaterial.transparent = true;
  fallingMaterial.depthWrite = false;
  const falling = new THREE.Mesh(geometry, fallingMaterial);
  falling.name = "SMG discarded drum";
  falling.visible = false;
  mount.add(falling);

  const origin = new THREE.Vector3(),
    drop = new THREE.Vector3(),
    sideways = new THREE.Vector3();
  const initialRotation = new THREE.Quaternion(),
    tumble = new THREE.Quaternion();
  const spin = new THREE.Euler();
  let previous = 0;
  const smooth = (value) => {
    const t = Math.max(0, Math.min(1, value));
    return t * t * (3 - 2 * t);
  };
  function reset() {
    inserted.visible = true;
    inserted.position.copy(anchor);
    inserted.rotation.set(0, 0, 0);
    falling.visible = false;
    fallingMaterial.opacity = 1;
  }
  function beginDrop() {
    inserted.position.copy(anchor);
    inserted.rotation.set(0, 0, 0);
    mount.updateWorldMatrix(true, true);
    let scene = mount;
    while (scene.parent) scene = scene.parent;
    // In the game this is the scene root: the old drum no longer follows aim.
    scene.add(falling);
    inserted.getWorldPosition(origin);
    inserted.getWorldQuaternion(initialRotation);
    inserted.getWorldScale(falling.scale);
    drop.set(0, -1, 0).applyQuaternion(initialRotation);
    sideways.set(0.14, 0, 0.12).applyQuaternion(initialRotation);
    falling.position.copy(origin);
    falling.quaternion.copy(initialRotation);
    fallingMaterial.opacity = 1;
  }
  return {
    enabled: true,
    update(reloadRemaining) {
      const remaining = Math.max(0, Math.min(1.4, reloadRemaining || 0));
      if (!remaining) {
        if (previous) reset();
        previous = 0;
        return;
      }
      if (!previous || remaining > previous + 0.1) beginDrop();
      const elapsed = 1.4 - remaining;
      const travel = elapsed / 0.62;
      falling.visible = elapsed < 0.64;
      if (falling.visible) {
        falling.position
          .copy(origin)
          .addScaledVector(drop, 0.22 * travel + 1.45 * travel * travel)
          .addScaledVector(sideways, travel);
        tumble.setFromEuler(
          spin.set(travel * 0.65, travel * 0.35, travel * -0.45),
        );
        falling.quaternion.copy(initialRotation).multiply(tumble);
        fallingMaterial.opacity = 1 - smooth((elapsed - 0.38) / 0.26);
      }
      inserted.visible = elapsed >= 0.64;
      if (inserted.visible) {
        const approach = smooth((elapsed - 0.64) / 0.62);
        const seating =
          elapsed > 1.26
            ? Math.sin(((elapsed - 1.26) / 0.14) * Math.PI) * 0.012
            : 0;
        inserted.position.copy(anchor);
        inserted.position.x += (1 - approach) * 0.07;
        inserted.position.y -= (1 - approach) * 0.5 - seating;
        inserted.position.z += (1 - approach) * 0.06;
        inserted.rotation.set((1 - approach) * -0.08, 0, (1 - approach) * 0.16);
      }
      previous = remaining;
    },
    dispose() {
      inserted.removeFromParent();
      falling.removeFromParent();
      source.geometry = original;
      receiver.dispose();
      geometry.dispose();
      fallingMaterial.dispose();
    },
  };
}
