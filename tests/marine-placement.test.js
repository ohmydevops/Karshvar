import test from "node:test";
import assert from "node:assert/strict";
import {
  marineAngle,
  placeMarineLabel,
  fitMarineLabel,
} from "../public/marine-placement.js";

test("a narrow waterway gets a smaller label instead of disappearing", () => {
  const result = fitMarineLabel(
    [150, 150],
    40,
    0,
    1,
    [0, 0, 300, 300],
    [],
    ([x, y]) => x > 130 && x < 170 && y > 144.5 && y < 155.5,
  );
  assert.ok(result);
  assert.equal(result.fontSize, 7);
});

test("marine text rotates with the projection while remaining upright", () => {
  const projection = ([x, y]) => [x, -y];
  assert.equal(marineAngle(projection, [50, 27], [1, 0]), 0);
  assert.ok(Math.abs(marineAngle(projection, [50, 27], [1, -1]) - 45) < 1e-8);
  const rotated = ([x, y]) => [-x, y];
  assert.equal(marineAngle(rotated, [50, 27], [1, 0]), 0);
});

test("marine placement checks text edges, moves within water, or hides", () => {
  const bounds = [0, 0, 300, 300];
  const placement = placeMarineLabel(
    [150, 150],
    90,
    20,
    30,
    bounds,
    [],
    ([x, y]) => y < 170,
  );
  assert.ok(placement);
  assert.equal(
    placeMarineLabel([150, 150], 90, 20, 30, bounds, [], () => false),
    null,
  );
  // A wet center alone is insufficient if the text overlaps either coast.
  assert.equal(
    placeMarineLabel(
      [150, 150],
      90,
      20,
      0,
      bounds,
      [],
      ([x]) => x > 140 && x < 160,
    ),
    null,
  );
  assert.equal(
    placeMarineLabel([150, 150], 90, 20, 30, bounds, [bounds], () => true),
    null,
  );
});
