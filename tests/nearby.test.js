import test from "node:test";
import assert from "node:assert/strict";
import { nearbyOrder, restoreNearbySession } from "../public/nearby.js";
test("nearby route expands from fixed origin and crosses date line", () => {
  const countries = [
    { id: "home", point: [179, 0] },
    { id: "far", point: [0, 0] },
    { id: "near", point: [-179, 0] },
    { id: "middle", point: [160, 0] },
  ];
  assert.deepEqual(nearbyOrder(countries, "home"), ["near", "middle", "far"]);
  assert.deepEqual(nearbyOrder(countries, "missing"), []);
});

test("land neighbors come first; each group remains nearest to farthest", () => {
  const countries = [
    { id: "home", code: "HOME", point: [0, 0], borders: ["N1", "N2"] },
    { id: "nearSea", code: "SEA", point: [1, 0] },
    { id: "neighbor2", code: "N2", point: [8, 0] },
    { id: "far", code: "FAR", point: [20, 0] },
    { id: "neighbor1", code: "N1", point: [4, 0] },
  ];
  assert.deepEqual(nearbyOrder(countries, "home"), [
    "neighbor1",
    "neighbor2",
    "nearSea",
    "far",
  ]);
});

test("new distance ordering preserves previously answered countries", () => {
  const saved = {
    answers: [
      { id: "sea", correct: true },
      { id: "neighbor", correct: false },
    ],
  };
  const result = restoreNearbySession(["neighbor", "new", "sea"], saved);
  assert.deepEqual(result.order, ["sea", "neighbor", "new"]);
  assert.deepEqual(result.answers, saved.answers);
  assert.equal(result.index, 2);
});
