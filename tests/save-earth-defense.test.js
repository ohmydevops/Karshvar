import test from "node:test";
import assert from "node:assert/strict";
import { createEarthDefense } from "../public/save-earth-defense.js";
import {
  createPilot,
  createMeteor,
  advanceMeteor,
} from "../public/save-earth-flight.js";

test("opening interceptor launches at second two, curves from Earth and hits a moving target", () => {
  const defense = createEarthDefense(() => 0.5),
    pilot = createPilot();
  const target = createMeteor(() => 0.5, pilot),
    meteors = [target];
  let hits = 0;
  defense.update(1.99, pilot, meteors, () => hits++);
  assert.equal(defense.rockets.length, 0);
  defense.update(0.011, pilot, meteors, () => hits++);
  const rocket = defense.rockets[0];
  assert.ok(rocket);
  assert.ok(Math.abs(rocket.origin.length() - 12.2) < 1e-6);
  const straight = target.position.clone().sub(rocket.origin).normalize();
  let deviation = 0;
  for (let i = 0; i < 600 && defense.rockets.length; i++) {
    advanceMeteor(target, pilot, 0.02);
    defense.update(0.02, pilot, meteors, () => hits++);
    const offset = rocket.position.clone().sub(rocket.origin);
    deviation = Math.max(
      deviation,
      offset.addScaledVector(straight, -offset.dot(straight)).length(),
    );
  }
  assert.ok(deviation > 3);
  assert.equal(hits, 1);
  assert.equal(meteors.length, 0);
  assert.ok(rocket.trailCount <= 128);
  assert.equal(defense.trails.length, 1);
  assert.equal(defense.trails[0].retired, true);
  defense.update(2, pilot, meteors, () => assert.fail());
  assert.equal(defense.trails.length, 1);
  defense.update(1.01, pilot, meteors, () => assert.fail());
  assert.equal(defense.trails.length, 0);
});

test("crowded scenes allow two simultaneous rockets on distinct targets, then a long cooldown", () => {
  const defense = createEarthDefense(() => 0),
    pilot = createPilot();
  const meteors = Array.from({ length: 20 }, () => {
    const m = createMeteor(() => 0.5, pilot);
    m.age = 10;
    return m;
  });
  let hits = 0,
    time = 0;
  const launches = [];
  for (let i = 0; i < 1100; i++) {
    time += 0.02;
    defense.update(
      0.02,
      pilot,
      meteors,
      () => hits++,
      undefined,
      () => launches.push(time),
    );
    assert.ok(defense.rockets.length <= 2);
    if (defense.rockets.length === 2) {
      assert.notEqual(defense.rockets[0].target, defense.rockets[1].target);
      assert.ok(
        defense.rockets[0].origin.distanceTo(defense.rockets[1].origin) > 3,
      );
    }
  }
  assert.equal(launches.length, 2);
  assert.ok(Math.abs(launches[0] - 2) < 0.03);
  assert.ok(Math.abs(launches[1] - 2) < 0.03);
  assert.equal(hits, 2);
  defense.reset();
  defense.update(2, pilot, meteors, () => hits++);
  assert.equal(defense.rockets.length, 2);
});

test("eight meteors do not trigger a second launch, flights take four to eight seconds", () => {
  for (const random of [() => 0, () => 0.5, () => 0.999]) {
    const defense = createEarthDefense(random),
      pilot = createPilot();
    const meteors = Array.from({ length: 8 }, () => {
      const m = createMeteor(() => 0.5, pilot);
      m.age = 10;
      return m;
    });
    let launches = 0;
    for (let i = 0; i < 600; i++) {
      defense.update(
        0.02,
        pilot,
        meteors,
        () => {},
        undefined,
        () => launches++,
      );
      for (const rocket of defense.rockets)
        assert.ok(rocket.duration >= 4 && rocket.duration <= 8);
    }
    assert.equal(launches, 1);
  }
});

test("a player kill lets the rocket coast without another hit, and a missing opening target can be replaced", () => {
  const defense = createEarthDefense(() => 0),
    pilot = createPilot(),
    meteors = [];
  defense.update(
    2,
    pilot,
    meteors,
    () => assert.fail(),
    () => {
      const m = createMeteor(() => 0.5, pilot);
      meteors.push(m);
      return m;
    },
  );
  assert.equal(defense.rockets.length, 1);
  const oldPosition = defense.rockets[0].position.clone();
  meteors.length = 0;
  defense.update(0.02, pilot, meteors, () => assert.fail());
  assert.equal(defense.rockets.length, 1);
  assert.ok(defense.rockets[0].position.distanceTo(oldPosition) > 0);
  for (let i = 0; i < 900; i++)
    defense.update(0.02, pilot, meteors, () => assert.fail());
  assert.equal(defense.rockets.length, 0);
});

test("hard salvos randomly launch two or three rockets from separate locations", () => {
  for (const [random, count] of [
    [0, 2],
    [0.5, 3],
    [0.99, 3],
  ]) {
    const defense = createEarthDefense(() => random),
      pilot = createPilot();
    const meteors = Array.from({ length: 10 }, () =>
      createMeteor(() => 0.5, pilot),
    );
    defense.reset("hard");
    defense.update(2, pilot, meteors, () => {});
    assert.equal(defense.rockets.length, count);
    assert.equal(new Set(defense.rockets.map((r) => r.target)).size, count);
    for (let i = 0; i < count; i++)
      for (let j = i + 1; j < count; j++)
        assert.ok(
          defense.rockets[i].origin.distanceTo(defense.rockets[j].origin) > 2,
        );
  }
});

test("critical shields accelerate support without bypassing the cooldown", () => {
  function nextSalvo(shields) {
    const defense = createEarthDefense(() => 0),
      pilot = createPilot();
    const meteors = Array.from({ length: 20 }, () => {
      const m = createMeteor(() => 0.5, pilot);
      m.age = 10;
      return m;
    });
    let launches = 0,
      time = 0;
    while (launches < 4 && time < 35) {
      time += 0.02;
      defense.update(
        0.02,
        pilot,
        meteors,
        () => {},
        undefined,
        () => launches++,
        shields,
      );
    }
    assert.equal(launches, 4);
    return time;
  }
  const healthy = nextSalvo(8),
    critical = nextSalvo(3);
  assert.ok(healthy > 23 && healthy < 25);
  assert.ok(critical > 17 && critical < healthy - 4);
});
