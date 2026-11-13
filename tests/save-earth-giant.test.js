import test from "node:test";
import assert from "node:assert/strict";
import {
  createPilot,
  createGiantMeteor,
  damageMeteor,
  advanceMeteor,
} from "../public/save-earth-flight.js";
import { createEarthDefense } from "../public/save-earth-defense.js";
import { giantMeteorInterval } from "../public/save-earth-difficulty.js";
import { rumbleStrength } from "../public/save-earth-rumble.js";

test("hard schedules one giant each minute; normal never schedules one", () => {
  assert.equal(giantMeteorInterval("hard"), 60);
  assert.equal(giantMeteorInterval("normal"), Infinity);
});
test("giant survives fourteen bullet hits and deals three shield damage", () => {
  const m = createGiantMeteor(() => 0.5, createPilot());
  assert.equal(m.earthDamage, 3);
  assert.equal(m.radius, 6);
  for (let i = 0; i < 14; i++) assert.equal(damageMeteor(m), false);
  assert.equal(damageMeteor(m), true);
});
test("Earth needs two separate rocket impacts to destroy a giant", () => {
  const pilot = createPilot(),
    m = createGiantMeteor(() => 0.5, pilot),
    defense = createEarthDefense(() => 0),
    meteors = [m],
    hits = [];
  m.age = 10;
  defense.reset("hard");
  for (let i = 0; i < 1600 && meteors.length; i++)
    defense.update(0.02, pilot, meteors, (target, destroyed) => {
      hits.push(destroyed);
      if (!destroyed) assert.ok(meteors.includes(target));
    });
  assert.deepEqual(hits, [false, true]);
  assert.equal(meteors.length, 0);
});
test("giant makes a close pass with distance-limited rumble then reaches Earth", () => {
  const pilot = createPilot(),
    m = createGiantMeteor(() => 0.5, pilot),
    state = { active: true, player: pilot, meteors: [m] };
  assert.equal(rumbleStrength(state), 0);
  let maximum = 0,
    nearest = Infinity;
  for (let i = 0; i < 700; i++) {
    advanceMeteor(m, pilot, 0.1);
    maximum = Math.max(maximum, rumbleStrength(state));
    nearest = Math.min(nearest, m.position.distanceTo(pilot.position));
  }
  assert.ok(nearest < 24);
  assert.ok(maximum > 0.03);
  assert.equal(rumbleStrength(state), 0);
  state.active = false;
  assert.equal(rumbleStrength(state), 0);
});
