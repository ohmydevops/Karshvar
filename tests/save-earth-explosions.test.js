import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../public/vendor/three.module.min.js";
import {
  createMeteorExplosions,
  explosionLifetime,
  explosionScale,
} from "../public/save-earth-explosions.js";

test("explosions fade without alpha clipping or shrinking their group", () => {
  const scene = new THREE.Scene();
  const source = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshBasicMaterial({ alphaTest: 0.5 }),
  );
  const effect = createMeteorExplosions(scene, source);
  const burst = {
    position: new THREE.Vector3(),
    radius: 2,
    age: 0.18,
    duration: 1,
    seed: 0.5,
  };
  effect.update([burst]);
  const group = scene.children[0],
    material = group.children[0].material;
  assert.equal(material.alphaTest, 0);
  assert.equal(material.opacity, 1);
  assert.equal(explosionLifetime(burst), 4.2);
  for (const age of [1, 2, 3]) {
    const previous = material.opacity;
    const previousSize = group.scale.x;
    burst.age = age;
    effect.update([burst]);
    assert.ok(material.opacity > 0 && material.opacity < previous);
    assert.ok(group.scale.x > previousSize);
  }
  burst.age = explosionLifetime(burst);
  effect.update([burst]);
  assert.equal(material.opacity, 0);
});

test("explosion spreads slowly and keeps expanding throughout the fade", () => {
  const ages = [0, 0.1, 0.3, 0.5, 0.7, 1, 2, 4.2];
  let previous = 0;
  for (const age of ages) {
    const size = explosionScale(age);
    assert.ok(size > previous);
    if (age <= 0.7) assert.ok(size < 2);
    previous = size;
  }
});
