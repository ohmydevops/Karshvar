import test from "node:test";
import assert from "node:assert/strict";
import { Vector3 } from "../public/vendor/three.module.min.js";
import { explosionDelay, rumbleStrength } from "../public/save-earth-rumble.js";
test("explosion rumble arrives later and softer at distance, then settles", () => {
  assert.equal(explosionDelay(0), 0.5);
  assert.equal(explosionDelay(160), 1.5);
  assert.equal(explosionDelay(1000), 1.5);
  const burst = { position: new Vector3(), age: 0.4 };
  const state = {
    active: true,
    player: { position: new Vector3() },
    bursts: [burst],
  };
  assert.equal(rumbleStrength(state), 0);
  burst.age = 0.9;
  const near = rumbleStrength(state);
  assert.ok(near > 0);
  burst.position.x = 160;
  assert.equal(rumbleStrength(state), 0);
  burst.age = 1.9;
  assert.ok(rumbleStrength(state) > 0 && rumbleStrength(state) < near);
  burst.age = 2.31;
  assert.equal(rumbleStrength(state), 0);
  state.active = false;
  burst.age = 1.9;
  assert.equal(rumbleStrength(state), 0);
});

test("rocket flight alone never shakes the camera", () => {
  assert.equal(
    rumbleStrength({
      active: true,
      player: { position: new Vector3() },
      rockets: [{ age: 2, position: new Vector3() }],
      bursts: [],
    }),
    0,
  );
});
