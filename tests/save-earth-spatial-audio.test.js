import test from "node:test";
import assert from "node:assert/strict";
import { Vector3, Quaternion } from "../public/vendor/three.module.min.js";
import { distanceAudio } from "../public/save-earth-spatial-audio.js";

test("rocket and explosion audio attenuate with distance and follow the listener's heading", () => {
  const listener = { position: new Vector3(), orientation: new Quaternion() };
  const near = distanceAudio(new Vector3(5, 0, -5), listener);
  const far = distanceAudio(new Vector3(100, 0, -100), listener);
  assert.ok(near.gain > far.gain);
  assert.ok(near.cutoff > far.cutoff);
  assert.ok(near.pan > 0);
  listener.orientation.setFromAxisAngle(new Vector3(0, 1, 0), Math.PI);
  assert.ok(distanceAudio(new Vector3(5, 0, -5), listener).pan < 0);
  const centered = distanceAudio(listener.position, listener);
  assert.equal(centered.pan, 0);
  assert.equal(centered.gain, 1);
});
