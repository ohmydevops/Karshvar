import test from "node:test";
import assert from "node:assert/strict";
import { createAtmosphereDamage } from "../public/save-earth-atmosphere.js";

test("atmosphere breaches stay fixed within a round and regenerate on reset", () => {
  let seed = 17;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const atmosphere = createAtmosphereDamage(random);
  const before = atmosphere.uniforms.breaches.value.map((v) => v.toArray());
  atmosphere.uniforms.damage.value = 0.8;
  assert.deepEqual(
    atmosphere.uniforms.breaches.value.map((v) => v.toArray()),
    before,
  );
  atmosphere.reset();
  assert.equal(atmosphere.uniforms.damage.value, 0);
  assert.notDeepEqual(
    atmosphere.uniforms.breaches.value.map((v) => v.toArray()),
    before,
  );
  for (const v of atmosphere.uniforms.breaches.value) {
    assert.ok(Math.abs(Math.hypot(v.x, v.y, v.z) - 1) < 1e-12);
    assert.ok(v.w >= 0.23 && v.w <= 0.37);
  }
});
