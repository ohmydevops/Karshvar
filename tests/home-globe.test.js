import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import * as THREE from "../public/vendor/three.module.min.js";
import { createHomeScene, earthAxialTilt } from "../public/home-scene.js";

async function fixture({ compact = false, reduced = false } = {}) {
  const pending = new Map();
  const events = {};
  const canvasEvents = {};
  const flights = [];
  let next = 0,
    draws = 0,
    ratio,
    renderedScene,
    intersection;
  const motion = {
    matches: reduced,
    addEventListener: (_, fn) => {
      events.motion = fn;
    },
    removeEventListener: () => {
      delete events.motion;
    },
  };
  const document = {
    hidden: false,
    body: { append() {} },
    createElement: () => ({
      setAttribute() {},
      addEventListener() {},
      append() {},
      remove() {},
      animate(keyframes, options) {
        const flight = {
          keyframes,
          options,
          state: "running",
          cancel() {
            this.state = "cancelled";
          },
          pause() {
            this.state = "paused";
          },
          play() {
            this.state = "running";
          },
        };
        flights.push(flight);
        return flight;
      },
    }),
    querySelector: () => ({ prepend() {} }),
    addEventListener: (name, fn) => {
      events[name] = fn;
    },
    removeEventListener: (name) => {
      delete events[name];
    },
  };
  const host = {
    getBoundingClientRect: () => ({ width: 360, height: 360 }),
    replaceChildren() {},
    classList: { add() {} },
  };
  const source = fs
    .readFileSync("public/home-globe.js", "utf8")
    .replace(/^import .*;\r?\n/gm, "")
    .replace("export async function", "async function")
    .replaceAll("import.meta.url", '"https://example.test/home-globe.js"');
  const context = vm.createContext({
    THREE: {
      ...THREE,
      WebGLRenderer: class {
        domElement = {
          setAttribute() {},
          setPointerCapture() {},
          addEventListener: (name, fn) => {
            canvasEvents[name] = fn;
          },
        };
        capabilities = { getMaxAnisotropy: () => 8 };
        setPixelRatio(value) {
          ratio = value;
        }
        setSize() {}
        render(scene) {
          renderedScene = scene;
          draws++;
        }
        dispose() {}
      },
      TextureLoader: class {
        async loadAsync() {
          return new THREE.Texture();
        }
      },
    },
    createHomeScene,
    earthAxialTilt,
    document,
    URL,
    console,
    devicePixelRatio: 3,
    matchMedia: (query) =>
      query.includes("reduced-motion") ? motion : { matches: compact },
    requestAnimationFrame: (fn) => {
      pending.set(++next, fn);
      return next;
    },
    cancelAnimationFrame: (id) => pending.delete(id),
    ResizeObserver: class {
      observe() {}
      disconnect() {}
    },
    IntersectionObserver: class {
      constructor(fn) {
        intersection = fn;
      }
      observe() {}
      disconnect() {}
    },
    addEventListener: (name, fn) => {
      events[name] = fn;
    },
  });
  vm.runInContext(source, context);
  await context.mountHomeGlobe(host);
  return {
    flights,
    pending,
    events,
    motion,
    document,
    canvasEvents,
    draws: () => draws,
    ratio: () => ratio,
    scene: () => renderedScene,
    visible: (value) => intersection([{ isIntersecting: value }]),
    step: (now) => {
      const callbacks = [...pending.values()];
      pending.clear();
      callbacks.forEach((fn) => fn(now));
    },
  };
}

test("spacecraft keep moving through successive routes and resume after tab visibility changes", async () => {
  const f = await fixture();
  assert.equal(f.flights.length, 3);
  assert.deepEqual(
    f.flights.map((flight) => flight.options.duration),
    [16000, 24000, 48000],
  );
  for (const flight of f.flights.slice()) {
    assert.equal(flight.currentTime, 0);
    assert.equal(flight.options.easing, "linear");
    assert.notEqual(
      flight.keyframes[0].transform,
      flight.keyframes[1].transform,
    );
    flight.onfinish();
    const next = f.flights.at(-1);
    assert.match(
      next.keyframes[0].transform,
      /translate3d\((?:(?:-30|130|-18|118)vw,|[^,]+vw, (?:-30|130|-18|118)vh)/,
    );
    assert.match(
      next.keyframes.at(-1).transform,
      /translate3d\((?:(?:-30|130|-18|118)vw,|[^,]+vw, (?:-30|130|-18|118)vh)/,
    );
    assert.equal(next.state, "running");
    assert.equal(flight.state, "cancelled");
  }
  f.document.hidden = true;
  f.events.visibilitychange();
  assert.ok(f.flights.slice(3).every((flight) => flight.state === "paused"));
  f.document.hidden = false;
  f.events.visibilitychange();
  assert.ok(f.flights.slice(3).every((flight) => flight.state === "running"));
  f.events.pagehide();
  assert.ok(f.flights.every((flight) => flight.state === "cancelled"));
});

test("home globe stops offscreen, in hidden tabs, and after disposal", async () => {
  const f = await fixture();
  f.step(100);
  assert.equal(f.draws(), 2);
  f.visible(false);
  assert.equal(f.pending.size, 0);
  f.visible(true);
  assert.equal(f.pending.size, 1);
  f.document.hidden = true;
  f.events.visibilitychange();
  assert.equal(f.pending.size, 0);
  f.document.hidden = false;
  f.events.visibilitychange();
  f.events.pagehide();
  assert.equal(f.pending.size, 0);
  assert.equal(f.events.visibilitychange, undefined);
  f.visible(true);
  assert.equal(f.pending.size, 0);
});

test("Back restores globe and spacecraft after repeated history-cache visits", async () => {
  const f = await fixture();
  for (let visit = 0; visit < 3; visit++) {
    f.events.pagehide({ persisted: true });
    assert.equal(f.pending.size, 0);
    assert.ok(f.flights.every((flight) => flight.state === "paused"));
    f.events.visibilitychange();
    assert.equal(f.pending.size, 0);
    f.events.pageshow({ persisted: true });
    assert.equal(f.pending.size, 1);
    assert.ok(f.flights.every((flight) => flight.state === "running"));
    const before = f.draws();
    f.step(100 + visit * 100);
    assert.ok(f.draws() > before);
  }
  f.events.pagehide({ persisted: false });
  assert.ok(f.flights.every((flight) => flight.state === "cancelled"));
  f.events.pageshow({ persisted: true });
  assert.equal(f.pending.size, 0);
});

test("reduced motion renders a still globe that remains draggable", async () => {
  const f = await fixture({ reduced: true });
  assert.equal(f.draws(), 1);
  assert.equal(f.pending.size, 0);
  f.canvasEvents.pointerdown({ clientX: 0, clientY: 0, pointerId: 1 });
  f.canvasEvents.pointermove({ clientX: 10, clientY: 5 });
  assert.equal(f.draws(), 2);
  f.motion.matches = false;
  f.events.motion();
  assert.equal(f.pending.size, 1);
});

test("mobile rendering caps pixel density and preserves the original frame interval", async () => {
  const f = await fixture({ compact: true });
  assert.equal(f.ratio(), 1);
  f.step(100);
  f.step(131);
  assert.equal(f.draws(), 2);
  f.step(132);
  assert.equal(f.draws(), 3);
  const desktop = await fixture();
  assert.equal(desktop.ratio(), 1.5);
});

test("satellites keep orbiting while the globe is dragged", async () => {
  const f = await fixture();
  let earth;
  const satellites = [];
  f.scene().traverse((object) => {
    if (object.material?.uniforms?.dayMap) earth = object;
    if (
      object.isGroup &&
      object.children.length === 3 &&
      object.children.every((child) => child.geometry?.type === "BoxGeometry")
    )
      satellites.push(object);
  });
  assert.equal(satellites.length, 6);
  f.step(100);
  const positions = satellites.map((satellite) => satellite.position.clone());
  const rotation = earth.rotation.y;
  f.canvasEvents.pointerdown({ clientX: 0, clientY: 0, pointerId: 1 });
  f.canvasEvents.pointermove({ clientX: 10, clientY: 5 });
  f.step(150);
  satellites.forEach((satellite, index) => {
    assert.ok(satellite.position.distanceTo(positions[index]) > 0);
  });
  assert.equal(earth.rotation.y, rotation);
  f.canvasEvents.pointerup();
  f.step(200);
  assert.notEqual(earth.rotation.y, rotation);
});
