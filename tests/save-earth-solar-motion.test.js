import test from "node:test";
import assert from "node:assert/strict";
import { solarArrayAngle } from "../public/save-earth-solar-motion.js";

test("solar arrays track slowly, remain bounded, and pause between adjustments", () => {
  for (let array = 0; array < 8; array++) {
    const start = 5 + array * 2.3;
    assert.equal(solarArrayAngle(start, array), 0);
    assert.notEqual(solarArrayAngle(start + 7, array), 0);
    assert.equal(
      solarArrayAngle(start + 8, array),
      solarArrayAngle(start + 24, array),
    );
    let previous = 0;
    for (let t = 0; t < 180; t += 0.02) {
      const angle = solarArrayAngle(t, array);
      assert.ok(Math.abs(angle) <= 0.171);
      assert.ok(Math.abs(angle - previous) < 0.002);
      previous = angle;
    }
  }
});
