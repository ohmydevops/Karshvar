import test from "node:test";
import assert from "node:assert/strict";
import {
  celestialName,
  createCelestialLabels,
} from "../public/save-earth-labels.js";
import { Group, PerspectiveCamera } from "../public/vendor/three.module.min.js";

test("celestial names follow all six game languages with English fallback", () => {
  for (const [lang, name] of Object.entries({
    en: "Earth",
    fa: "زمین",
    ar: "الأرض",
    tr: "Dünya",
    fr: "Terre",
    ru: "Земля",
  }))
    assert.equal(celestialName("Earth", lang), name);
  assert.equal(celestialName("Moon", "unknown"), "Moon");
});
test("aim selects nearest celestial body and hides the label off target or paused", () => {
  const visible = new Set();
  const label = {
    style: {},
    setAttribute() {},
    classList: { add: (c) => visible.add(c), remove: (c) => visible.delete(c) },
  };
  const old = globalThis.document;
  globalThis.document = {
    documentElement: { lang: "fa" },
    createElement: () => label,
  };
  try {
    const camera = new PerspectiveCamera(68, 1, 0.1, 5000),
      planet = new Group(),
      sky = new Group(),
      moon = new Group();
    planet.position.z = -30;
    planet.scale.setScalar(4);
    moon.name = "Moon";
    moon.position.z = -10;
    sky.add(moon);
    planet.updateMatrixWorld(true);
    sky.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    const labels = createCelestialLabels(
      { append() {} },
      camera,
      planet,
      sky,
      800,
      800,
    );
    labels.update(true);
    assert.equal(label.textContent, "ماه");
    assert.ok(visible.has("is-visible"));
    moon.position.x = 10;
    sky.updateMatrixWorld(true);
    labels.update(true);
    assert.equal(label.textContent, "زمین");
    camera.rotation.y = Math.PI;
    camera.updateMatrixWorld(true);
    labels.update(true);
    assert.ok(!visible.has("is-visible"));
    camera.rotation.y = 0;
    camera.updateMatrixWorld(true);
    labels.update(true);
    labels.update(false);
    assert.ok(!visible.has("is-visible"));
  } finally {
    globalThis.document = old;
  }
});
