import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "../public/vendor/three.module.min.js";
import { createMagazineAnimation } from "../public/save-earth-weapon.js";

// Load the shipped geometry and node transforms without a browser or textures.
// This catches asset changes that could silently detach the grip instead of the drum.
function weaponFixture() {
  const file = readFileSync(
    new URL("../public/art/smg-gun.glb", import.meta.url),
  );
  assert.equal(file.readUInt32LE(0), 0x46546c67);
  const jsonLength = file.readUInt32LE(12);
  const asset = JSON.parse(file.subarray(20, 20 + jsonLength));
  const binary = file.subarray(20 + jsonLength + 8);
  function attribute(index) {
    const accessor = asset.accessors[index];
    const view = asset.bufferViews[accessor.bufferView];
    const size = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[accessor.type];
    const ArrayType = {
      5126: Float32Array,
      5125: Uint32Array,
      5123: Uint16Array,
      5121: Uint8Array,
    }[accessor.componentType];
    const offset =
      binary.byteOffset + (view.byteOffset || 0) + (accessor.byteOffset || 0);
    assert.ok(
      !view.byteStride ||
        view.byteStride === size * ArrayType.BYTES_PER_ELEMENT,
    );
    return new THREE.BufferAttribute(
      new ArrayType(binary.buffer, offset, accessor.count * size).slice(),
      size,
      Boolean(accessor.normalized),
    );
  }
  const primitive = asset.meshes[0].primitives[0];
  const original = new THREE.BufferGeometry();
  for (const [semantic, index] of Object.entries(primitive.attributes)) {
    const name = {
      POSITION: "position",
      NORMAL: "normal",
      TANGENT: "tangent",
      TEXCOORD_0: "uv",
    }[semantic];
    original.setAttribute(name, attribute(index));
  }
  original.setIndex(attribute(primitive.indices));
  const material = new THREE.MeshStandardMaterial();
  const mesh = new THREE.Mesh(original, material);
  const nodes = asset.nodes.map((node) => {
    const object = node.mesh === undefined ? new THREE.Group() : mesh;
    object.name = node.name;
    if (node.matrix)
      object.applyMatrix4(new THREE.Matrix4().fromArray(node.matrix));
    return object;
  });
  asset.nodes.forEach((node, i) =>
    node.children?.forEach((child) => nodes[i].add(nodes[child])),
  );
  const model = new THREE.Group();
  asset.scenes[asset.scene || 0].nodes.forEach((node) =>
    model.add(nodes[node]),
  );
  model.rotation.y = Math.PI / 2;
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  model.position.sub(box.getCenter(new THREE.Vector3()));
  const gun = new THREE.Group();
  gun.add(model);
  gun.scale.setScalar(1.15 / Math.max(size.x, size.y, size.z));
  gun.position.set(0.505, 0.055, 0);
  const mount = new THREE.Group();
  mount.position.set(0.27, 0.27, -0.48);
  mount.rotation.set(0.08, Math.PI / 2 + 0.15, 0);
  mount.scale.setScalar(0.75);
  mount.add(gun);
  const pilot = new THREE.Group();
  pilot.position.set(1, 3, 90);
  pilot.rotation.y = 0.4;
  pilot.add(mount);
  const scene = new THREE.Scene();
  scene.add(pilot);
  scene.updateMatrixWorld(true);
  const originalWorld = mesh.matrixWorld.clone();
  const positions = original.attributes.position.array.slice();
  const animation = createMagazineAnimation(gun);
  assert.equal(
    animation.enabled,
    true,
    "The actual shipped drum must be detachable",
  );
  scene.updateMatrixWorld(true);
  const inserted = scene.getObjectByName("SMG inserted drum");
  const falling = scene.getObjectByName("SMG discarded drum");
  return {
    scene,
    mesh,
    mount,
    original,
    material,
    originalWorld,
    positions,
    animation,
    inserted,
    falling,
  };
}

function triangles(index) {
  const result = [];
  for (let i = 0; i < index.count; i += 3)
    result.push(`${index.getX(i)},${index.getX(i + 1)},${index.getX(i + 2)}`);
  return result;
}

test("shipped SMG drum separation conserves triangles, textures and placement", () => {
  const f = weaponFixture();
  const oldTriangles = triangles(f.original.index).sort();
  const splitTriangles = [
    ...triangles(f.mesh.geometry.index),
    ...triangles(f.inserted.geometry.index),
  ].sort();
  assert.deepEqual(splitTriangles, oldTriangles);
  assert.deepEqual(
    f.mesh.geometry.attributes.position.array,
    f.positions,
    "Receiver and grip vertices must not move",
  );
  assert.equal(f.inserted.material, f.material);
  assert.deepEqual(
    f.inserted.geometry.attributes.uv.array,
    f.original.attributes.uv.array,
  );
  const before = new THREE.Vector3(),
    after = new THREE.Vector3();
  for (const index of f.inserted.geometry.index.array) {
    before
      .fromBufferAttribute(f.original.attributes.position, index)
      .applyMatrix4(f.originalWorld);
    after
      .fromBufferAttribute(f.inserted.geometry.attributes.position, index)
      .applyMatrix4(f.inserted.matrixWorld);
    assert.ok(
      before.distanceTo(after) < 1e-6,
      "Detaching the drum must not shift its seated position",
    );
  }
  f.animation.dispose();
  assert.equal(f.mesh.geometry, f.original);
});

test("drum reload pauses, detaches from aim, replaces, and resets on cancellation", () => {
  const f = weaponFixture();
  const anchor = f.inserted.position.clone();
  f.animation.update(1.4);
  assert.equal(f.inserted.visible, false);
  assert.equal(f.falling.visible, true);
  assert.equal(f.falling.parent, f.scene);
  f.animation.update(1.1);
  const position = f.falling.position.clone();
  const rotation = f.falling.quaternion.clone();
  f.mount.position.addScalar(10);
  f.mount.rotation.y += 0.8;
  f.mount.scale.setScalar(1); // Switching view changes the held weapon, not the dropped one.
  f.scene.updateMatrixWorld(true);
  f.animation.update(1.1);
  assert.deepEqual(f.falling.position, position);
  assert.deepEqual(f.falling.quaternion.toArray(), rotation.toArray());
  f.animation.update(0.65);
  assert.equal(f.falling.visible, false);
  assert.equal(f.inserted.visible, true);
  assert.ok(f.inserted.position.distanceTo(anchor) > 0.1);
  f.animation.update(0);
  assert.deepEqual(f.inserted.position, anchor);
  assert.equal(f.inserted.rotation.x, 0);
  assert.equal(f.falling.visible, false);
  f.animation.update(1.4);
  f.animation.update(0); // Ending a round before the new drum appears restores it too.
  assert.equal(f.inserted.visible, true);
  assert.deepEqual(f.inserted.position, anchor);
  f.animation.dispose();
});
