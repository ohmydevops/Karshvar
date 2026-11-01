import test from "node:test";
import assert from "node:assert/strict";
import { bindGlobeGestures } from "../public/gestures.js";
import {
  createAnalytics,
  isProduction,
  loadProductionAnalytics,
} from "../public/analytics.js";

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
  const taps = [];
  let starts = 0;
  const detach = bindGlobeGestures(surface, {
    onStart: () => starts++,
    onRotate: (...v) => rotations.push(v),
    onZoom: (v) => zooms.push(v),
    onEnd: (v) => ends.push(v),
    onTap: (v) => taps.push(v),
  });
  return {
    surface,
    rotations,
    zooms,
    ends,
    taps,
    detach,
    get starts() {
      return starts;
    },
  };
}

test("a touchscreen tap survives pointer capture and small finger movement", () => {
  const f = fixture();
  f.surface.send("pointerdown", { x: 20, y: 30 });
  f.surface.send("pointermove", { x: 22, y: 31 });
  f.surface.send("pointerup");
  assert.equal(f.taps.length, 1);
  assert.equal(f.taps[0].target, f.surface);
  assert.equal(f.taps[0].pointerType, "touch");
});

test("dragging, pinching, and cancelled touches never select a country", () => {
  const drag = fixture();
  drag.surface.send("pointerdown");
  drag.surface.send("pointermove", { x: 20 });
  drag.surface.send("pointerup");
  assert.equal(drag.taps.length, 0);
  const pinch = fixture();
  pinch.surface.send("pointerdown");
  pinch.surface.send("pointerdown", { id: 2, x: 100 });
  pinch.surface.send("pointerup", { id: 2 });
  pinch.surface.send("pointerup");
  assert.equal(pinch.taps.length, 0);
  const cancelled = fixture();
  cancelled.surface.send("pointerdown");
  cancelled.surface.send("pointercancel");
  assert.equal(cancelled.taps.length, 0);
});
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
  const analytics = createAnalytics({
    enabled: true,
    getTracker: () => tracker,
  });
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
  const blocked = createAnalytics({
    enabled: true,
    getTracker: () => undefined,
  });
  for (let i = 0; i < 50; i++)
    assert.doesNotThrow(() =>
      blocked.track("map-control", { action: "zoom-in" }),
    );
  const throws = createAnalytics({
    enabled: true,
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
    enabled: true,
    getTracker: () => ({ track: () => Promise.reject(Error("offline")) }),
  });
  assert.doesNotThrow(() =>
    rejects.track("continent-select", { continent: "Asia" }),
  );
  await new Promise((resolve) => setImmediate(resolve));
});

test("analytics never loads or sends events on localhost and preview URLs", () => {
  for (const address of [
    "http://localhost:5174/",
    "http://127.0.0.1:5174/en/",
    "http://[::1]:5174/",
    "http://192.168.1.10:5174/",
    "https://preview.example.com/Karshvar/",
    "https://other.example.com/",
    "http://karshvar.ir/",
  ]) {
    const location = new URL(address);
    assert.equal(isProduction(location), false, address);
    const document = {
      getElementById() {
        throw Error("must not touch document");
      },
    };
    assert.equal(loadProductionAnalytics(document, location), null);
    let sent = 0;
    const analytics = createAnalytics({
      enabled: isProduction(location),
      getTracker: () => ({ track: () => sent++ }),
    });
    analytics.track("continent-select", { continent: "Asia" });
    analytics.flush();
    assert.equal(sent, 0);
  }
});
test("production loads the configured Umami tracker once and allows events", () => {
  const location = new URL("https://karshvar.ir/fa/");
  assert(isProduction(location));
  const scripts = [];
  const document = {
    getElementById: (id) => scripts.find((s) => s.id === id),
    createElement: () => ({ dataset: {} }),
    head: { append: (script) => scripts.push(script) },
  };
  const script = loadProductionAnalytics(document, location);
  assert.equal(script.src, "https://cloud.umami.is/script.js");
  assert.equal(script.dataset.domains, "karshvar.ir");
  assert.equal(
    script.dataset.websiteId,
    "c99dd2e3-8541-4d92-84c9-df74a8919c18",
  );
  assert.equal(loadProductionAnalytics(document, location), script);
  assert.equal(scripts.length, 1);
  const events = [];
  createAnalytics({
    enabled: isProduction(location),
    getTracker: () => ({ track: (...args) => events.push(args) }),
  }).track("continent-select", { continent: "Asia" });
  assert.equal(events.length, 1);
});

import { bindCountrySuggestions } from "../public/suggestions.js";
class SuggestionElement extends EventTarget {
  children = [];
  attributes = new Map();
  value = "";
  hidden = true;
  disabled = false;
  setAttribute(name, value) {
    this.attributes.set(name, value);
  }
  removeAttribute(name) {
    this.attributes.delete(name);
  }
  replaceChildren() {
    this.children = [];
  }
  append(child) {
    this.children.push(child);
  }
  scrollIntoView() {}
  send(type, details = {}) {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, details);
    this.dispatchEvent(event);
    return event;
  }
}
for (const method of ["pointer", "keyboard"])
  test("suggestion selection submits exactly once by " + method, () => {
    const input = new SuggestionElement(),
      list = new SuggestionElement();
    input.ownerDocument = { createElement: () => new SuggestionElement() };
    let submitted = 0,
      value = "";
    bindCountrySuggestions(
      input,
      list,
      () => [{ id: "CHN", label: "China", aliases: ["China"] }],
      () => "en",
      () => {
        submitted++;
        value = input.value;
      },
    );
    input.value = "Ch";
    input.send("input");
    assert.equal(submitted, 0);
    assert.equal(list.children.length, 1);
    if (method === "pointer") list.children[0].send("click");
    else {
      input.send("keydown", { key: "ArrowDown" });
      assert(input.send("keydown", { key: "Enter" }).defaultPrevented);
    }
    assert.equal(submitted, 1);
    assert.equal(value, "China");
    assert(list.hidden);
    assert.equal(list.children.length, 0);
    input.send("keydown", { key: "Enter" });
    assert.equal(submitted, 1);
  });
