import test from "node:test";
import assert from "node:assert/strict";
import { placeMapLabel, countryFlag } from "../public/map-labels.js";
test("flags use the correct country's ISO code and omit missing codes", () => {
  assert.equal(countryFlag("IR"), "🇮🇷");
  assert.equal(countryFlag("IL"), "🇮🇱");
  assert.equal(countryFlag("US"), "🇺🇸");
  assert.equal(countryFlag(undefined), "");
  assert.equal(countryFlag("123"), "");
});
test("uncrowded labels stay centered and crowded labels use a nearby callout", () => {
  const bounds = [0, 0, 400, 400];
  const first = placeMapLabel([200, 200], 60, 20, bounds, []);
  assert.deepEqual(first.point, [200, 200]);
  assert.equal(first.shifted, false);
  const next = placeMapLabel([200, 210], 50, 20, bounds, [first.box]);
  assert.ok(next);
  assert.equal(next.shifted, true);
  assert.ok(next.box[1] >= first.box[3] || next.box[3] <= first.box[1]);
});
test("label placement stays inside the map and hides labels when no space remains", () => {
  assert.equal(
    placeMapLabel([50, 50], 40, 20, [0, 0, 100, 100], [[0, 0, 100, 100]]),
    null,
  );
  const placed = placeMapLabel([10, 50], 30, 20, [0, 0, 100, 100], []);
  assert.ok(placed);
  assert.ok(placed.box[0] >= 0 && placed.box[2] <= 100);
});

test("explore labels leave room for a connector from the country center to the label edge", () => {
  const anchor = [200, 200];
  const result = placeMapLabel(anchor, 80, 20, [0, 0, 400, 400], [], true);
  assert.equal(result.shifted, true);
  assert.deepEqual(result.point, [200, 174]);
  assert.deepEqual(result.connector, [200, 184]);
  assert.ok(result.connector[1] < anchor[1]);
  assert.equal(result.connector[1], result.box[3]);
});
