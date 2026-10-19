import test from "node:test";
import assert from "node:assert/strict";
import { bindGlobeGestures } from "../public/gestures.js";
import { createAnalytics } from "../public/analytics.js";

class GestureSurface extends EventTarget {
  captures = new Set();
  setPointerCapture(id) {
    this.captures.add(id);
  }
  hasPointerCapture(id) {
    return this.captures.has(id);
  }
  releasePointerCapture(id) {
    this.captures.delete(id);
  }
  send(type, { id = 1, x = 0, y = 0, input = "touch", button = 0 } = {}) {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, {
      pointerId: id,
      clientX: x,
      clientY: y,
      pointerType: input,
      button,
    });
    this.dispatchEvent(event);
    return event;
  }
}
function fixture() {
  const surface = new GestureSurface(),
    rotations = [],
    zooms = [],
    ends = [];
  let starts = 0;
  const detach = bindGlobeGestures(surface, {
    onStart: () => starts++,
    onRotate: (...v) => rotations.push(v),
    onZoom: (v) => zooms.push(v),
    onEnd: (v) => ends.push(v),
  });
  return {
    surface,
    rotations,
    zooms,
    ends,
    detach,
    get starts() {
      return starts;
    },
  };
}
test("touch drag captures the pointer, rotates, and ends once", () => {
  const f = fixture();
  assert(f.surface.send("pointerdown", { x: 20, y: 30 }).defaultPrevented);
  assert(f.surface.captures.has(1));
  f.surface.send("pointermove", { x: 65, y: 50 });
  assert.deepEqual(f.rotations, [[45, 20]]);
  f.surface.send("pointerup");
  f.surface.send("lostpointercapture");
  assert.deepEqual(f.ends, ["touch"]);
  assert.equal(f.surface.captures.size, 0);
  f.surface.send("pointermove", { x: 80, y: 70 });
  assert.equal(f.rotations.length, 1);
});
test("two-finger pinch zooms and lifting a finger rebases the next drag", () => {
  const f = fixture();
  f.surface.send("pointerdown", { id: 1, x: 100, y: 100 });
  f.surface.send("pointerdown", { id: 2, x: 200, y: 100 });
  f.surface.send("pointermove", { id: 2, x: 250, y: 100 });
  assert.equal(f.zooms[0], 1.5);
  assert.equal(f.starts, 1);
  f.surface.send("pointerup", { id: 2 });
  f.surface.send("pointermove", { id: 1, x: 110, y: 100 });
  assert.deepEqual(f.rotations.at(-1), [10, 0]);
  f.surface.send("pointercancel", { id: 1 });
  assert.deepEqual(f.ends, ["touch"]);
});
test("mouse drag still works and touch can start later without reinitialization", () => {
  const f = fixture();
  f.surface.send("pointerdown", { input: "mouse", button: 2 });
  assert.equal(f.starts, 0);
  f.surface.send("pointerdown", { input: "mouse" });
  f.surface.send("pointermove", { input: "mouse", x: 10 });
  f.surface.send("pointerup");
  f.surface.send("pointerdown", { input: "touch" });
  f.surface.send("pointermove", { input: "touch", y: 12 });
  f.surface.send("lostpointercapture");
  assert.deepEqual(f.ends, ["mouse", "touch"]);
  assert.equal(f.starts, 2);
  f.detach();
  f.surface.send("pointerdown");
  assert.equal(f.starts, 2);
});
test("analytics buffers early events and omits raw answers and unrelated properties", () => {
  let tracker;
  const events = [];
  const analytics = createAnalytics({ getTracker: () => tracker });
  analytics.track("answer-submit", {
    language: "fa",
    result: "correct",
    choice: "typed answer",
    answer: "secret",
    answered: 1,
  });
  assert.equal(events.length, 0);
  tracker = { track: (...args) => events.push(args) };
  analytics.flush();
  assert.deepEqual(events, [
    ["answer-submit", { language: "fa", result: "correct", answered: 1 }],
  ]);
  analytics.flush();
  assert.equal(events.length, 1);
  analytics.track("unknown-event", { language: "en" });
  assert.equal(events.length, 1);
});
test("blocked or failing analytics never interrupts gameplay", async () => {
  const disabled = createAnalytics({
    enabled: false,
    getTracker: () => {
      throw Error("should not run");
    },
  });
  assert.doesNotThrow(() =>
    disabled.track("map-control", { action: "recenter" }),
  );
  const blocked = createAnalytics({ getTracker: () => undefined });
  for (let i = 0; i < 50; i++)
    assert.doesNotThrow(() =>
      blocked.track("map-control", { action: "zoom-in" }),
    );
  const throws = createAnalytics({
    getTracker: () => ({
      track() {
        throw Error("blocked");
      },
    }),
  });
  assert.doesNotThrow(() =>
    throws.track("answer-submit", { result: "incorrect" }),
  );
  const rejects = createAnalytics({
    getTracker: () => ({ track: () => Promise.reject(Error("offline")) }),
  });
  assert.doesNotThrow(() =>
    rejects.track("continent-select", { continent: "Asia" }),
  );
  await new Promise((resolve) => setImmediate(resolve));
});
