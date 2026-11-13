import test from "node:test";
import assert from "node:assert/strict";
import {
  createSolarSystemLayout,
  solarSystemSunPosition,
  moonOrbitPosition,
  moonDisplayRadius,
} from "../public/save-earth-solar-system.js";
import { celestialSunDirection } from "../public/save-earth-sky.js";

test("Moon stays clear of Earth for a complete orbit and planets never intersect", () => {
  const layout = createSolarSystemLayout();
  for (let i = 0; i < layout.length; i++) {
    for (let j = i + 1; j < layout.length; j++) {
      const a = layout[i],
        b = layout[j];
      assert.ok(
        Math.hypot(...a.position.map((v, axis) => v - b.position[axis])) >
          a.radius + b.radius,
        `${a.name}/${b.name}`,
      );
    }
  }
  for (let t = 0; t < (Math.PI * 2) / 0.012; t += 0.5) {
    const moon = moonOrbitPosition(t);
    for (const body of layout)
      assert.ok(
        Math.hypot(...moon.map((v, axis) => v - body.position[axis])) >
          moonDisplayRadius + body.radius * 1.025,
        body.name,
      );
  }
});

test("rendered planetary positions preserve the order of orbits around the Sun", () => {
  const layout = createSolarSystemLayout();
  assert.deepEqual(
    layout.map((body) => body.name),
    [
      "Mercury",
      "Venus",
      "Earth",
      "Mars",
      "Jupiter",
      "Saturn",
      "Uranus",
      "Neptune",
    ],
  );
  let previous = 0;
  for (const body of layout) {
    const distance = Math.hypot(
      ...body.position.map(
        (value, axis) => value - solarSystemSunPosition[axis],
      ),
    );
    assert.ok(distance > previous, body.name);
    assert.ok(Math.abs(distance - body.orbitRadius) < 1e-8);
    previous = distance;
  }
});
test("scene lighting follows the same Sun position as the planetary layout", () => {
  const distance = Math.hypot(...solarSystemSunPosition);
  celestialSunDirection
    .toArray()
    .forEach((value, axis) =>
      assert.ok(
        Math.abs(value - solarSystemSunPosition[axis] / distance) < 1e-12,
      ),
    );
});

test("Moon has a visible gap from Earth throughout its display orbit", () => {
  for (const camera of [
    [0, 3, 90],
    [-5, -2, 85],
    [5, 8, 95],
  ]) {
    const earthDirection = camera.map((v) => -v);
    const earthDistance = Math.hypot(...earthDirection);
    for (let time = 0; time < (Math.PI * 2) / 0.012; time += 0.5) {
      const direction = moonOrbitPosition(time).map(
        (v, axis) => v - camera[axis],
      );
      const distance = Math.hypot(...direction);
      const separation = Math.acos(
        direction.reduce((dot, v, i) => dot + v * earthDirection[i], 0) /
          (distance * earthDistance),
      );
      const silhouettes =
        Math.asin((12 * 1.035) / earthDistance) +
        Math.asin(moonDisplayRadius / distance);
      assert.ok(
        separation > silhouettes + Math.PI / 60,
        `visible clearance at ${time}`,
      );
    }
  }
});
