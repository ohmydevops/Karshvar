import test from "node:test";
import assert from "node:assert/strict";
import { mountSatellite, satelliteStatusBottom } from "../public/satellite.js";

test("download status stays bottom-right when clear and moves above overlapping controls", () => {
  const panel = { bottom: 400 };
  const status = { left: 260, right: 390, height: 24 };
  assert.equal(satelliteStatusBottom(panel, status, []), 8);
  assert.equal(
    satelliteStatusBottom(panel, status, [
      { left: 10, right: 150, top: 350, bottom: 390 },
    ]),
    8,
  );
  assert.equal(
    satelliteStatusBottom(panel, status, [
      { left: 200, right: 390, top: 350, bottom: 395 },
    ]),
    58,
  );
  assert.equal(
    satelliteStatusBottom(panel, status, [
      { left: 200, right: 390, top: 380, bottom: 398 },
      { left: 200, right: 390, top: 330, bottom: 370 },
    ]),
    78,
  );
});

test("satellite defaults off and keeps the plain map when WebGL is unavailable", async () => {
  const previous = {
    document: globalThis.document,
    Image: globalThis.Image,
    localStorage: globalThis.localStorage,
  };
  let loads = 0,
    button,
    frame;
  const context = {
    drawImage() {},
    getImageData: () => ({
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([10, 20, 30, 255, 40, 50, 60, 255]),
    }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: (image) => {
      frame = image;
    },
  };
  const canvas = { getContext: () => context };
  const layer = {
    append: () => layer,
    attr: () => layer,
    style: () => layer,
    node: () => canvas,
  };
  const attributes = {};
  let click;
  const storage = new Map();
  globalThis.localStorage = {
    getItem: (key) => storage.get(key),
    setItem: (key, value) => storage.set(key, value),
  };
  globalThis.document = {
    createElement: (tag) =>
      tag === "canvas"
        ? canvas
        : {
            append: (...children) => {
              if (tag === "label" && children[0]?.type === "checkbox")
                button = children[0];
            },
            setAttribute: (k, v) => {
              attributes[k] = v;
            },
            removeAttribute: (k) => delete attributes[k],
            addEventListener: (_, fn) => {
              click = fn;
            },
          },
    querySelector: (selector) => ({
      append: (value) => {},
    }),
  };
  globalThis.Image = class {
    naturalWidth = 2;
    naturalHeight = 1;
    set src(value) {
      loads++;
      queueMicrotask(() => this.onload());
    }
  };
  const projection = {
    scale: () => 1,
    rotate: () => [0, 0, 0],
    translate: () => [1, 1],
    invert: () => [0, 0],
  };
  try {
    const satellite = mountSatellite(layer, projection, "en", () => {});
    assert.equal(button.type, "checkbox");
    assert.equal(button.id, "showSatellite");
    assert.equal(button.checked, false);
    assert.equal(satellite.active, false);
    assert.equal(loads, 0);
    await click();
    assert.equal(storage.get("atlas-satellite"), "false");
    const originalError = console.error;
    console.error = () => {};
    try {
      button.checked = true;
      await click();
    } finally {
      console.error = originalError;
    }
    assert.equal(satellite.active, false);
    assert.equal(button.checked, false);
    assert.equal(storage.get("atlas-satellite"), "false");
    assert.equal(loads, 0);
  } finally {
    Object.assign(globalThis, previous);
  }
});
