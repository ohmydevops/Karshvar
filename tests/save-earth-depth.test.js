import test from "node:test";
import assert from "node:assert/strict";
import { createMotionBlur } from "../public/save-earth-motion-blur.js";

test("distant bodies render before local objects with an independent depth buffer", () => {
  const calls = [];
  const previous = {};
  const renderer = {
    autoClear: true,
    capabilities: { maxSamples: 4 },
    getDrawingBufferSize: (v) => v.set(800, 600),
    getRenderTarget: () => previous,
    setRenderTarget: (target) => calls.push(["target", target]),
    clearDepth: () => calls.push(["clearDepth"]),
    render(scene) {
      calls.push(["render", scene, this.autoClear]);
    },
  };
  const effect = createMotionBlur(renderer);
  const foreground = {},
    background = {},
    camera = {};
  effect.render(foreground, camera, {}, background);
  const draws = calls.filter((c) => c[0] === "render");
  assert.equal(draws[0][1], background);
  assert.equal(draws[0][2], true);
  assert.equal(draws[1][1], foreground);
  assert.equal(draws[1][2], false);
  assert.ok(
    calls.findIndex((c) => c[0] === "clearDepth") > calls.indexOf(draws[0]),
  );
  assert.ok(
    calls.findIndex((c) => c[0] === "clearDepth") < calls.indexOf(draws[1]),
  );
  assert.equal(renderer.autoClear, true);
  assert.equal(calls.at(-1)[1], previous);
  renderer.render = () => {
    throw new Error("render failure");
  };
  assert.throws(() => effect.render(foreground, camera, {}, background));
  assert.equal(renderer.autoClear, true);
  assert.equal(calls.at(-1)[1], previous);
  effect.dispose();
});
