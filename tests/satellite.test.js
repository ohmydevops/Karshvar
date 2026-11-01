import test from "node:test";
import assert from "node:assert/strict";
import { mountSatellite } from "../public/satellite.js";

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
            setAttribute: (k, v) => {
              attributes[k] = v;
            },
            removeAttribute: (k) => delete attributes[k],
            addEventListener: (_, fn) => {
              click = fn;
            },
          },
    querySelector: (selector) => ({
      append: (value) => {
        if (selector === ".map-controls") button = value;
      },
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
    assert.equal(button.textContent, "Satellite");
    assert.equal(satellite.active, false);
    assert.equal(loads, 0);
    const originalError = console.error;
    console.error = () => {};
    try {
      await click();
    } finally {
      console.error = originalError;
    }
    assert.equal(satellite.active, false);
    assert.equal(attributes["aria-pressed"], "false");
    assert.equal(loads, 0);
  } finally {
    Object.assign(globalThis, previous);
  }
});
