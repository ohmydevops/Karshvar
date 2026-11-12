import test from "node:test";
import assert from "node:assert/strict";
import { createPilot, turnPilot } from "../public/save-earth-flight.js";
import { createFlightMotion, springStep } from "../public/save-earth-motion.js";

test("body inertia never changes aim and settles after a rapid turn", () => {
  const pilot = createPilot(),
    motion = createFlightMotion();
  motion.update(pilot, 0, true);
  turnPilot(pilot, 160, 40);
  const look = pilot.orientation.clone();
  let result = motion.update(pilot, 1 / 60, true);
  assert.ok(result.orientation.angleTo(look) > 0);
  assert.ok(result.orientation.angleTo(look) < 0.3);
  assert.ok(result.blur.strength > 0);
  for (let i = 2; i <= 90; i++) result = motion.update(pilot, i / 60, true);
  assert.ok(result.orientation.angleTo(look) < 0.001);
  assert.equal(result.blur.strength, 0);
  assert.deepEqual(pilot.orientation.toArray(), look.toArray());
});
test("critically damped settling agrees at 30, 60 and 144 Hz", () => {
  const values = [30, 60, 144].map((fps) => {
    let p = 0.15,
      v = 0;
    for (let i = 0; i < fps; i++) [p, v] = springStep(p, v, 0, 12, 1 / fps);
    return p;
  });
  assert.ok(Math.max(...values) - Math.min(...values) < 1e-10);
});
test("reduced motion removes cosmetic lean, drift and blur immediately", () => {
  const pilot = createPilot(),
    motion = createFlightMotion();
  motion.update(pilot, 0, true);
  turnPilot(pilot, 300, 60);
  pilot.velocity.set(3, 0, 0);
  motion.update(pilot, 0.016, true);
  const result = motion.update(pilot, 0.032, true, true);
  assert.ok(result.orientation.angleTo(pilot.orientation) < 1e-7);
  assert.equal(result.blur.strength, 0);
  assert.equal(result.offset.lengthSq(), 0);
});
test("new rounds and camera switches do not inherit old motion", () => {
  const pilot = createPilot(),
    motion = createFlightMotion();
  motion.update(pilot, 0, true);
  turnPilot(pilot, 300, 0);
  motion.update(pilot, 0.016, true);
  const next = createPilot(),
    result = motion.update(next, 0, false);
  assert.equal(result.blur.strength, 0);
  assert.ok(result.orientation.angleTo(next.orientation) < 1e-7);
});
