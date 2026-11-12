import test from "node:test";
import assert from "node:assert/strict";
import { mountDiscoveryMotion } from "../public/home-discovery.js";

function target() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
    emit(type, event = {}) {
      listeners.get(type)?.(event);
    },
  };
}
function fixture() {
  const reduced = { ...target(), matches: false };
  const fine = { ...target(), matches: true };
  const pending = new Map();
  const styles = new Map();
  let next = 0;
  let reads = 0;
  let intersect;
  let disconnected = false;
  const media = {
    ...target(),
    style: {
      setProperty: (key, value) => styles.set(key, value),
      removeProperty: (key) => styles.delete(key),
    },
    getBoundingClientRect() {
      reads++;
      return { left: 0, top: 0, width: 200, height: 100 };
    },
  };
  const scene = { dataset: {}, querySelector: () => media };
  const view = {
    ...target(),
    matchMedia: (query) => (query.includes("reduced") ? reduced : fine),
    requestAnimationFrame(callback) {
      pending.set(++next, callback);
      return next;
    },
    cancelAnimationFrame: (id) => pending.delete(id),
    IntersectionObserver: class {
      constructor(callback) {
        intersect = callback;
      }
      observe() {}
      disconnect() {
        disconnected = true;
      }
    },
  };
  const doc = {
    ...target(),
    defaultView: view,
    hidden: false,
    querySelectorAll: () => [scene],
  };
  const dispose = mountDiscoveryMotion(doc);
  return {
    doc,
    view,
    media,
    scene,
    reduced,
    fine,
    pending,
    styles,
    dispose,
    reads: () => reads,
    disconnected: () => disconnected,
    visible: (value) => intersect([{ target: scene, isIntersecting: value }]),
    move: () => media.emit("pointermove", { clientX: 200, clientY: 100 }),
    enter: () => media.emit("pointerenter", { pointerType: "mouse" }),
    paint() {
      const callbacks = [...pending.values()];
      pending.clear();
      callbacks.forEach((callback) => callback());
    },
  };
}

test("discovery scenes pause offscreen, hidden, and with reduced motion", () => {
  const f = fixture();
  assert.equal(f.scene.dataset.active, "false");
  f.visible(true);
  assert.equal(f.scene.dataset.active, "true");
  f.doc.hidden = true;
  f.doc.emit("visibilitychange");
  assert.equal(f.scene.dataset.active, "false");
  f.doc.hidden = false;
  f.doc.emit("visibilitychange");
  assert.equal(f.scene.dataset.active, "true");
  f.reduced.matches = true;
  f.reduced.emit("change");
  assert.equal(f.scene.dataset.active, "false");
  f.reduced.matches = false;
  f.reduced.emit("change");
  f.visible(false);
  assert.equal(f.scene.dataset.active, "false");
  f.dispose();
});

test("pointer parallax batches paints and performs no per-move layout reads", () => {
  const f = fixture();
  f.visible(true);
  f.enter();
  for (let i = 0; i < 20; i++) f.move();
  assert.equal(f.reads(), 1);
  assert.equal(f.pending.size, 1);
  f.paint();
  assert.equal(f.styles.get("--scene-x"), "10.00px");
  assert.equal(f.styles.get("--scene-y"), "10.00px");
  assert.equal(f.pending.size, 0);
  f.media.emit("pointerleave");
  assert.equal(f.styles.size, 0);
  f.dispose();
});

test("scroll, hiding and reduced motion cancel pending work and reset offsets", () => {
  for (const stop of [
    (f) => f.view.emit("scroll"),
    (f) => f.visible(false),
    (f) => {
      f.doc.hidden = true;
      f.doc.emit("visibilitychange");
    },
    (f) => {
      f.reduced.matches = true;
      f.reduced.emit("change");
    },
    (f) => {
      f.fine.matches = false;
      f.fine.emit("change");
    },
  ]) {
    const f = fixture();
    f.visible(true);
    f.enter();
    f.move();
    f.paint();
    f.move();
    stop(f);
    assert.equal(f.pending.size, 0);
    assert.equal(f.styles.size, 0);
    f.move();
    assert.equal(f.pending.size, 0);
    f.dispose();
  }
});

test("coarse pointers never measure the scene or schedule pointer animation", () => {
  const f = fixture();
  f.visible(true);
  f.fine.matches = false;
  f.enter();
  f.move();
  assert.equal(f.reads(), 0);
  assert.equal(f.pending.size, 0);
  f.dispose();
});

test("history-cache restoration resumes scenes; final disposal removes listeners", () => {
  const f = fixture();
  f.visible(true);
  f.enter();
  f.move();
  f.view.emit("pagehide", { persisted: true });
  assert.equal(f.scene.dataset.active, "false");
  assert.equal(f.pending.size, 0);
  assert.equal(f.disconnected(), false);
  f.view.emit("pageshow", { persisted: true });
  assert.equal(f.scene.dataset.active, "true");
  f.view.emit("pagehide", { persisted: false });
  assert.equal(f.scene.dataset.active, "false");
  assert.equal(f.disconnected(), true);
  assert.equal(f.view.listeners.size, 0);
  assert.equal(f.media.listeners.size, 0);
  assert.equal(f.doc.listeners.size, 0);
  f.visible(true);
  assert.equal(f.scene.dataset.active, "false");
});
