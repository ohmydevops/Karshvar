import test from "node:test";
import assert from "node:assert/strict";
import { Vector3 } from "../public/vendor/three.module.min.js";
import {
  createPilot,
  turnPilot,
  flyPilot,
  shotHits,
  createMeteor,
  planetRadius,
  meteorHealth,
  damageMeteor,
  nearMeteorCue,
  initialPilotPosition,
  localFlightRadius,
  earthAnchor,
  advanceMeteor,
} from "../public/save-earth-flight.js";

test("mouse orientation redirects thrust in space, without moving an independent gun aim", () => {
  const pilot = createPilot();
  turnPilot(pilot, Math.PI / 0.004, 0);
  flyPilot(pilot, new Set(["KeyW"]), 0.1);
  assert.ok(Math.abs(pilot.velocity.x) > 0.2);
  assert.ok(Math.abs(pilot.velocity.z) < 1e-8);
  for (let i = 0; i < 1000; i++) turnPilot(pilot, 17, -11);
  assert.ok(Math.abs(pilot.orientation.length() - 1) < 1e-10);
});
test("flight retains momentum and only opposite thrust stops it", () => {
  const pilot = createPilot();
  flyPilot(pilot, new Set(["KeyW"]), 0.1);
  const speed = pilot.velocity.length(),
    start = pilot.position.clone();
  for (let i = 0; i < 6000; i++) flyPilot(pilot, new Set(), 0.1);
  assert.ok(Math.abs(pilot.velocity.length() - speed) < 1e-10);
  assert.ok(pilot.position.distanceTo(start) > 200);
  flyPilot(pilot, new Set(["KeyS"]), 0.1);
  assert.ok(pilot.velocity.length() < 1e-10);
});
test("F is not a flight brake", () => {
  const pilot = createPilot();
  pilot.velocity.set(1, 2, 0);
  flyPilot(pilot, new Set(["KeyF"]), 0.5);
  assert.deepEqual(pilot.velocity.toArray(), [1, 2, 0]);
});
test("local forward flight can approach the ISS while distant Earth keeps its apparent distance", () => {
  const pilot = createPilot();
  const station = new Vector3(0, 20, 68);
  const initialStationDistance = pilot.position.distanceTo(station);
  for (let i = 0; i < 240; i++) flyPilot(pilot, new Set(["KeyW"]), 1 / 30);
  assert.ok(pilot.position.z < 75);
  assert.ok(pilot.position.distanceTo(station) < initialStationDistance - 8);
  const apparentEarthOffset = earthAnchor(pilot).sub(pilot.position);
  assert.ok(
    apparentEarthOffset.distanceTo(initialPilotPosition.clone().negate()) <
      1e-10,
  );
  pilot.position.add(new Vector3(20, 15, -35));
  assert.ok(
    earthAnchor(pilot).sub(pilot.position).distanceTo(apparentEarthOffset) <
      1e-10,
  );
});
test("the local flight boundary stops outward drift but permits tangential and inward flight", () => {
  const pilot = createPilot();
  pilot.flightRadius = localFlightRadius;
  pilot.position.add(new Vector3(0, 0, localFlightRadius - 0.01));
  pilot.velocity.set(1, 0, 3);
  flyPilot(pilot, new Set(), 0.1);
  const offset = pilot.position.clone().sub(initialPilotPosition);
  assert.ok(offset.length() <= localFlightRadius + 1e-9);
  assert.ok(pilot.velocity.dot(offset) <= 1e-9);
  assert.ok(pilot.velocity.x > 0.5);
  pilot.velocity.set(0, 0, -3);
  flyPilot(pilot, new Set(), 0.1);
  assert.ok(
    pilot.position.distanceTo(initialPilotPosition) < localFlightRadius - 0.1,
  );
});
test("fast bullets sweep through 3D meteors but miss at a different depth", () => {
  const shot = {
    position: new Vector3(0, 0, 10),
    velocity: new Vector3(0, 0, -240),
  };
  const meteor = {
    position: new Vector3(0, 0, 5),
    velocity: new Vector3(),
    radius: 0.7,
  };
  assert.equal(shotHits(shot, meteor, 0.04), true);
  meteor.position.x = 2;
  assert.equal(shotHits(shot, meteor, 0.04), false);
  meteor.position.set(0, 0, -30);
  assert.equal(shotHits(shot, meteor, 0.04), false);
});
test("meteors spawn around the current pilot and aim at the visible Earth surface", () => {
  const pilot = createPilot();
  pilot.position.add(new Vector3(45, -15, -25));
  const meteor = createMeteor(() => 0.4, pilot);
  const spawnDistance = meteor.position.distanceTo(pilot.position);
  assert.ok(spawnDistance >= 18 && spawnDistance <= 32);
  const directionToEarth = earthAnchor(pilot)
    .add(meteor.targetSurface)
    .sub(meteor.position);
  assert.ok(directionToEarth.dot(meteor.velocity) > 0);
  assert.ok(Math.abs(meteor.targetSurface.length() - planetRadius) < 1e-10);
  assert.ok(meteor.targetSurface.z > 0);
  assert.notEqual(meteor.position.y, pilot.position.y);
  assert.equal(
    createMeteor(() => 0.4).position.distanceTo(
      createMeteor(() => 0.4, createPilot()).position,
    ),
    0,
  );
});

test("meteor journeys last 40–70 seconds and shrink without changing damage thresholds", () => {
  const pilot = createPilot();
  for (const seed of [0, 0.4, 1]) {
    const meteor = createMeteor(() => seed, pilot);
    const health = meteor.health;
    assert.ok(meteor.duration >= 40 && meteor.duration <= 70);
    assert.equal(advanceMeteor(meteor, pilot, meteor.duration / 2), false);
    assert.ok(Math.abs(meteor.renderRadius / meteor.radius - 0.54) < 1e-10);
    assert.equal(meteor.health, health);
    assert.equal(advanceMeteor(meteor, pilot, meteor.duration / 2), true);
    assert.ok(Math.abs(meteor.renderRadius / meteor.radius - 0.08) < 1e-10);
    assert.ok(
      meteor.position.distanceTo(earthAnchor(pilot).add(meteor.targetSurface)) <
        1e-10,
    );
  }
});

test("meteor arrival follows the distant Earth anchor after the pilot translates", () => {
  const pilot = createPilot();
  const meteor = createMeteor(() => 0.4, pilot);
  const spawn = meteor.spawnPosition.clone();
  assert.equal(advanceMeteor(meteor, pilot, 20), false);
  pilot.position.add(new Vector3(60, 30, -50));
  assert.equal(advanceMeteor(meteor, pilot, 5), false);
  assert.ok(meteor.position.toArray().every(Number.isFinite));
  assert.ok(meteor.velocity.toArray().every(Number.isFinite));
  assert.deepEqual(meteor.spawnPosition, spawn);
  assert.equal(advanceMeteor(meteor, pilot, meteor.duration), true);
  assert.ok(
    meteor.position.distanceTo(earthAnchor(pilot).add(meteor.targetSurface)) <
      1e-10,
  );
});

test("meteor travel and apparent size are stable across frame rates", () => {
  const pilot = createPilot();
  const fastFrames = createMeteor(() => 0.4, pilot);
  const slowFrames = createMeteor(() => 0.4, pilot);
  for (let i = 0; i < 1200; i++) advanceMeteor(fastFrames, pilot, 1 / 60);
  for (let i = 0; i < 400; i++) advanceMeteor(slowFrames, pilot, 1 / 20);
  assert.ok(fastFrames.position.distanceTo(slowFrames.position) < 1e-9);
  assert.ok(
    Math.abs(fastFrames.renderRadius - slowFrames.renderRadius) < 1e-10,
  );
});

test("shot collision tracks a shrinking rock instead of its original invisible hitbox", () => {
  const shot = {
    position: new Vector3(0.5, 0, 10),
    velocity: new Vector3(0, 0, -240),
  };
  const meteor = {
    position: new Vector3(),
    velocity: new Vector3(),
    radius: 1.8,
    renderRadius: 0.144,
  };
  assert.equal(shotHits(shot, meteor, 0.1), false);
  shot.position.x = 0.1;
  assert.equal(shotHits(shot, meteor, 0.1), true);
});

test("meteor size requires exactly one, two or three hits", () => {
  for (const [radius, hits] of [
    [0.8, 1],
    [1.2, 2],
    [1.7, 3],
  ]) {
    const meteor = { health: meteorHealth(radius) };
    assert.equal(meteor.health, hits);
    for (let shot = 1; shot <= hits; shot++)
      assert.equal(damageMeteor(meteor), shot === hits);
    assert.equal(meteor.health, 0);
  }
});
test("near-meteor flybys are directional and only play once", () => {
  const pilot = createPilot();
  const meteor = { position: pilot.position.clone().add(new Vector3(4, 0, 0)) };
  const cue = nearMeteorCue(pilot, meteor);
  assert.ok(cue.pan > 0);
  assert.ok(cue.proximity > 0);
  assert.equal(nearMeteorCue(pilot, meteor), null);
  assert.equal(nearMeteorCue(pilot, { position: new Vector3(0, 0, 0) }), null);
});

test("roll keeps its angular momentum until opposite torque is applied", () => {
  const pilot = createPilot();
  for (let i = 0; i < 60; i++) flyPilot(pilot, new Set(["KeyQ"]), 1 / 60);
  const held = pilot.angularVelocity.z;
  const released = pilot.orientation.clone();
  flyPilot(pilot, new Set(), 1 / 60);
  assert.equal(pilot.angularVelocity.z, held);
  assert.ok(released.angleTo(pilot.orientation) > 0.001);
  for (let i = 0; i < 180; i++) flyPilot(pilot, new Set(), 1 / 60);
  assert.equal(pilot.angularVelocity.z, held);
  for (let i = 0; i < 60; i++) flyPilot(pilot, new Set(["KeyE"]), 1 / 60);
  assert.ok(Math.abs(pilot.angularVelocity.z) < 1e-9);
  flyPilot(pilot, new Set(["KeyE"]), 0.1);
  assert.ok(pilot.angularVelocity.z < 0);
});
test("roll acceleration and release agree across frame rates", () => {
  const pilots = [30, 60, 144].map((fps) => {
    const pilot = createPilot();
    for (let i = 0; i < fps; i++) flyPilot(pilot, new Set(["KeyE"]), 1 / fps);
    for (let i = 0; i < fps; i++) flyPilot(pilot, new Set(), 1 / fps);
    return pilot;
  });
  for (const pilot of pilots)
    assert.ok(pilot.orientation.angleTo(pilots[0].orientation) < 1e-6);
});
test("mouse turns retain a small settling tail", () => {
  const pilot = createPilot();
  turnPilot(pilot, 60, 30);
  const before = pilot.orientation.clone();
  flyPilot(pilot, new Set(), 1 / 60);
  assert.ok(before.angleTo(pilot.orientation) > 0);
  const velocity = pilot.angularVelocity.length();
  flyPilot(pilot, new Set(), 0.1);
  assert.ok(pilot.angularVelocity.length() < velocity * 0.5);
});

test("looking and rolling never redirect existing world-space momentum", () => {
  const pilot = createPilot();
  flyPilot(pilot, new Set(["KeyW"]), 0.5);
  const velocity = pilot.velocity.clone();
  turnPilot(pilot, 650, -150);
  for (let i = 0; i < 120; i++) flyPilot(pilot, new Set(["KeyQ"]), 1 / 60);
  assert.ok(pilot.velocity.distanceTo(velocity) < 1e-10);
  const before = pilot.position.clone();
  for (let i = 0; i < 120; i++) flyPilot(pilot, new Set(), 1 / 60);
  assert.ok(
    pilot.position
      .clone()
      .sub(before)
      .distanceTo(velocity.clone().multiplyScalar(2)) < 1e-9,
  );
  flyPilot(pilot, new Set(["KeyW"]), 0.1);
  assert.ok(
    pilot.velocity.distanceTo(velocity) > 0.1,
    "new thrust alone changes momentum",
  );
});
