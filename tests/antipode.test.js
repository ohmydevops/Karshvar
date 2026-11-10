import test from "node:test";
import assert from "node:assert/strict";
import { antipode } from "../public/antipode.js";

test("antipodes cross the equator and wrap the date line", () => {
  assert.deepEqual(antipode([51.389, 35.6892]), [-128.611, -35.6892]);
  assert.deepEqual(antipode([0, 90]), [-180, -90]);
  assert.deepEqual(antipode([-180, -90]), [0, 90]);
  assert.deepEqual(antipode([180, 45]), [0, -45]);
});

test("taking the antipode twice restores the location", () => {
  for (const point of [
    [51.389, 35.6892],
    [-73.9857, 40.7484],
    [179.9, -20],
    [-179.9, 20],
  ]) {
    const restored = antipode(antipode(point));
    assert.ok(Math.abs(restored[0] - point[0]) < 1e-10);
    assert.equal(restored[1], point[1]);
  }
});
