import test from "node:test";
import assert from "node:assert/strict";
import { Vector3 } from "../public/vendor/three.module.min.js";
import { createPilot } from "../public/save-earth-flight.js";
import {
  meteorSafeDistance,
  constrainMeteorContact,
} from "../public/save-earth-collisions.js";
for (const radius of [1, 6])
  test(`contact keeps the pilot and orbit camera outside a radius-${radius} meteor`, () => {
    const pilot = createPilot();
    pilot.position.set(0, 0, radius);
    pilot.velocity.set(1, 0, -2);
    const rock = { position: new Vector3(), velocity: new Vector3(), radius };
    constrainMeteorContact(pilot, [rock]);
    assert.ok(
      Math.abs(pilot.position.length() - meteorSafeDistance(rock)) < 1e-9,
    );
    assert.equal(pilot.velocity.x, 1);
    assert.equal(pilot.velocity.z, 0);
    assert.ok(pilot.position.length() - 5.5 > radius * 1.85);
  });
test("distant and outward flight retain their momentum", () => {
  const pilot = createPilot();
  pilot.position.set(0, 0, 30);
  pilot.velocity.set(0, 1, 2);
  const before = pilot.position.clone(),
    velocity = pilot.velocity.clone();
  const rock = { position: new Vector3(), velocity: new Vector3(), radius: 1 };
  constrainMeteorContact(pilot, [rock]);
  assert.deepEqual(pilot.position, before);
  assert.deepEqual(pilot.velocity, velocity);
  pilot.position.set(0, 0, 1);
  constrainMeteorContact(pilot, [rock]);
  assert.deepEqual(pilot.velocity, velocity);
});
test("a passing meteor pushes the pilot away and exact-center contact stays finite", () => {
  const pilot = createPilot();
  pilot.position.set(0, 0, 0);
  pilot.velocity.set(0, 0, 0);
  const rock = {
    position: new Vector3(),
    velocity: new Vector3(0, 0, 2),
    radius: 6,
  };
  constrainMeteorContact(pilot, [rock]);
  assert.ok(Number.isFinite(pilot.position.length()));
  assert.equal(pilot.velocity.z, 2);
  assert.equal(pilot.position.length(), meteorSafeDistance(rock));
});
