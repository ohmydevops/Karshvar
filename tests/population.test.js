import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { populations, populationLabel } from "../public/population.js";

test("every supported map country has a valid population estimate", () => {
  const names = JSON.parse(fs.readFileSync("public/data/names.json", "utf8"));
  const map = JSON.parse(fs.readFileSync("public/data/countries.json", "utf8"));
  const ids = new Set(names.filter((n) => n.independent).map((n) => n.ccn3));
  for (const country of map.objects.countries.geometries) {
    if (!ids.has(country.id)) continue;
    assert(Number.isSafeInteger(populations[country.id]), country.id);
    assert(populations[country.id] > 0, country.id);
  }
});

test("population labels use grouped localized digits and omit missing estimates", () => {
  assert.equal(populationLabel("Egypt", "818", "en"), "Egypt (120,101,175)");
  assert.equal(populationLabel("ایران", "364", "fa"), "ایران (۹۳٬۱۶۸٬۴۹۷)");
  assert.equal(populationLabel("Unknown", "unknown", "en"), "Unknown");
});
