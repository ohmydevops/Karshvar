import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { lunarField } from "../public/save-earth-lunar-field.js";
import { createPilot } from "../public/save-earth-flight.js";
import {
  constrainLunarPilot,
  lunarRadius,
  landingOrigin,
} from "../public/save-earth-lunar.js";

test("baked lunar attachment samples match the shipped model and display scale", async () => {
  const source = await readFile(
    new URL("../public/art/game-moon.glb", import.meta.url),
  );
  assert.equal(
    lunarField.sourceSha256,
    createHash("sha256").update(source).digest("hex"),
  );
  assert.equal(lunarField.radius, lunarRadius);
  assert.equal(lunarField.field.length, (lunarField.cells + 1) ** 2);
  assert.equal(lunarField.fieldUV.length, lunarField.field.length);
  assert.ok(lunarField.field.every(Number.isFinite));
});

test("lunar display scale leaves the landing site small relative to the globe", () => {
  assert.ok(lunarRadius > 200 && lunarRadius < 1000);
});
test("lunar ground stops inward travel while retaining sideways motion", () => {
  const pilot = createPilot();
  pilot.position.copy(landingOrigin);
  pilot.velocity.set(1, -2, 0);
  constrainLunarPilot(pilot);
  assert.ok(Math.abs(pilot.position.y - landingOrigin.y - 2.5) < 1e-6);
  assert.ok(Math.abs(pilot.velocity.y) < 1e-6);
  assert.equal(pilot.velocity.x, 1);
});
test("free flight above the lunar surface is not snapped to the ground", () => {
  const pilot = createPilot();
  const before = pilot.position.clone();
  constrainLunarPilot(pilot);
  assert.ok(pilot.position.equals(before));
});
