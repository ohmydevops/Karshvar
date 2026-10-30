import test from "node:test";
import assert from "node:assert/strict";
import { keyboardVisible } from "../public/keyboard-viewport.js";
test("keyboard detection responds to keyboard shrink without confusing zoom or browser chrome", () => {
  const base = {
    focused: true,
    touch: true,
    scale: 1,
    available: 430,
    full: 760,
  };
  assert.equal(keyboardVisible(base), true);
  assert.equal(keyboardVisible({ ...base, focused: false }), false);
  assert.equal(keyboardVisible({ ...base, touch: false }), false);
  assert.equal(keyboardVisible({ ...base, scale: 2 }), false);
  assert.equal(keyboardVisible({ ...base, available: 700 }), false);
});
