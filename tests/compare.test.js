import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { toggleComparison } from "../public/compare.js";

test("mobile comparison stops at five and still allows removing a country", () => {
  const selected = new Map();
  for (let i = 0; i < 5; i++) toggleComparison(selected, String(i), 5);
  assert.equal(toggleComparison(selected, "sixth", 5), false);
  assert.equal(toggleComparison(selected, "0", 5), true);
  assert.equal(toggleComparison(selected, "sixth", 5), true);
  assert.equal(selected.size, 5);
});

test("comparison caps selection at ten and preserves unique colors after removal", () => {
  const selected = new Map();
  for (let i = 0; i < 10; i++)
    assert.equal(toggleComparison(selected, String(i)), true);
  assert.equal(toggleComparison(selected, "extra"), false);
  assert.equal(selected.size, 10);
  toggleComparison(selected, "3");
  assert.equal(toggleComparison(selected, "extra"), true);
  assert.equal(new Set(selected.values()).size, 10);
});

test("stored areas are positive and include expected reference countries", async () => {
  const data = JSON.parse(
    await readFile(new URL("../public/data/areas.json", import.meta.url)),
  );
  for (const row of Object.values(data.countries))
    assert.ok(Number.isFinite(row.km2) && row.km2 > 0);
  assert.equal(data.countries["364"].km2, 1648195);
  assert.equal(data.countries["124"].km2, 9984670);
  assert.ok(data.countries["356"].km2 > data.countries["364"].km2);
});
