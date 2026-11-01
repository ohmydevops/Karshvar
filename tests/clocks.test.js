import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { capitalTime, capitalZones } from "../public/clocks.js";
test("capital clocks cover independent map countries with supported IANA zones", () => {
  const names = JSON.parse(fs.readFileSync("public/data/names.json"));
  for (const country of names.filter((n) => n.independent)) {
    assert(capitalZones[country.ccn3], country.name.common);
    assert(capitalTime(country.ccn3, "en"), country.name.common);
  }
});
test("capital clocks handle fractional offsets and seasonal time changes", () => {
  const winter = new Date("2026-01-15T12:00:00Z"),
    summer = new Date("2026-07-15T12:00:00Z");
  assert.equal(capitalTime("364", "en", winter), "15:30");
  assert.equal(capitalTime("356", "en", winter), "17:30");
  assert.equal(capitalTime("840", "en", winter), "07:00");
  assert.equal(capitalTime("840", "en", summer), "08:00");
  assert.equal(capitalTime("999", "en", winter), "");
});
