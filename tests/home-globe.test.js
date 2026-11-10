import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import * as THREE from "../public/vendor/three.module.min.js";
import { createHomeScene, earthAxialTilt } from "../public/home-scene.js";

async function fixture({
  compact = false,
  reduced = false,
  pixelRatio = 3,
  hostSize = 360,
  width = 1440,
  height = 900,
  random = Math.random,
} = {}) {
  const pending = new Map();
  const events = {};
  const canvasEvents = {};
  const flights = [];
  const timers = new Map();
  const meteors = [];
  const layers = [];
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
      setAttribute(name, value) {
        this[name] = value;
        if (
          name === "style" &&
          this.className?.startsWith("space-traffic") &&
          !layers.includes(this)
        )
          layers.push(this);
      },
      addEventListener(name, fn) {
        (this.listeners ||= {})[name] = fn;
      },
      append(child) {
        if (child.className?.startsWith("distant-meteor")) meteors.push(child);
      },
      remove() {
        this.removed = true;
      },
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
    getBoundingClientRect: () => ({ width: hostSize, height: hostSize }),
    replaceChildren() {},
    classList: { add() {} },
  };
  const source = fs
    .readFileSync("public/home-globe.js", "utf8")
    .replace(/^import .*;\r?\n/gm, "")
    .replace("export async function", "async function")
    .replaceAll("import.meta.url", '"https://example.test/home-globe.js"');
  const context = vm.createContext({
    Math: Object.assign(Object.create(Math), { random }),
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
    devicePixelRatio: pixelRatio,
    innerWidth: width,
    innerHeight: height,
    matchMedia: (query) =>
      query.includes("reduced-motion") ? motion : { matches: compact },
    requestAnimationFrame: (fn) => {
      pending.set(++next, fn);
      return next;
    },
    cancelAnimationFrame: (id) => pending.delete(id),
    setTimeout: (fn, delay) => {
      timers.set(++next, { fn, delay });
      return next;
    },
    clearTimeout: (id) => timers.delete(id),
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
    timers,
    meteors,
    layers,
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

test("Earth-bound meteors burn out at the atmospheric limb and are removed", async () => {
  const f = await fixture({ random: () => 0.1 });
  f.events.click({
    button: 0,
    clientX: 800,
    clientY: 200,
    target: { closest: () => null },
  });
  const meteor = f.meteors[0];
  assert.match(meteor.className, /meteor-impact/);
  const values = Object.fromEntries(
    meteor.style.split(";").map((pair) => pair.split(":")),
  );
  const x = parseFloat(values.left) + parseFloat(values["--meteor-x"]);
  const y = parseFloat(values.top) + parseFloat(values["--meteor-y"]);
  const distance = 1.62 / Math.sin(THREE.MathUtils.degToRad(19));
  const radius =
    ((180 / Math.tan(THREE.MathUtils.degToRad(19))) * 1.11) /
    Math.sqrt(distance ** 2 - 1.11 ** 2);
  assert.ok(Math.abs(Math.hypot(x - 180, y - 180) - radius) < 0.001);
  meteor.listeners.animationend({ animationName: "meteor-atmosphere-pass" });
  assert.equal(meteor.removed, true);
  f.events.pagehide();
});

test("meteors spawn singly every 1–3 seconds and clicks respect interactive controls", async () => {
  const f = await fixture();
  assert.equal(f.meteors.length, 0);
  for (let i = 0; i < 12; i++) {
    assert.equal(f.timers.size, 1);
    const [id, timer] = [...f.timers][0];
    assert.ok(timer.delay >= 1000 && timer.delay <= 3000);
    f.timers.delete(id);
    timer.fn();
    assert.equal(f.meteors.length, i + 1);
  }
  f.events.click({
    button: 0,
    clientX: 123,
    clientY: 234,
    target: { closest: () => null },
  });
  assert.equal(f.meteors.length, 13);
  f.events.click({
    button: 0,
    clientX: 500,
    clientY: 890,
    target: { closest: () => null },
  });
  assert.equal(f.meteors.length, 13);
  assert.match(f.meteors.at(-1).style, /^left:123px;top:234px;/);
  f.events.click({ button: 0, target: { closest: () => ({}) } });
  assert.equal(f.meteors.length, 13);
  f.document.hidden = true;
  f.events.visibilitychange();
  assert.equal(f.timers.size, 0);
  f.document.hidden = false;
  f.events.visibilitychange();
  assert.equal(f.timers.size, 1);
  f.events.pagehide();
  assert.equal(f.timers.size, 0);
  assert.equal(f.events.click, undefined);
});

test("all traffic layers exclude the Moon and random meteor paths stay in the sky", async () => {
  for (const [width, height] of [
    [390, 844],
    [1920, 1080],
    [2560, 720],
  ]) {
    let seed = 1234;
    const random = () =>
      (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    const f = await fixture({ width, height, random });
    const ground = Math.max(height, (width * 941) / 1672) * 0.18;
    const bottom = height - ground;
    assert.equal(f.layers.length, 3);
    for (const layer of f.layers)
      assert.equal(layer.style, `clip-path:inset(0 0 ${height - bottom}px 0)`);
    for (let i = 0; i < 40; i++) {
      const [id, timer] = [...f.timers][0];
      f.timers.delete(id);
      timer.fn();
      const values = Object.fromEntries(
        f.meteors
          .at(-1)
          .style.split(";")
          .map((pair) => pair.split(":")),
      );
      const y = parseFloat(values.top);
      const endY = y + parseFloat(values["--meteor-y"]);
      assert.ok(y >= 0 && y < bottom);
      assert.ok(endY >= -0.001 && endY < bottom);
    }
    f.events.pagehide();
  }
});

test("spacecraft silhouettes remain above the lunar horizon across screen shapes", async () => {
  for (const [width, height] of [
    [390, 844],
    [1920, 1080],
    [2560, 720],
  ]) {
    const f = await fixture({ width, height, random: () => 0.9999 });
    const horizon = height - Math.max(height, (width * 941) / 1672) * 0.18;
    for (const [index, flight] of f.flights.entries()) {
      const silhouette = [168, 84, 42][index] * 0.75;
      for (const frame of flight.keyframes) {
        const y =
          (parseFloat(frame.transform.match(/, ([\d.-]+)vh/)[1]) / 100) *
          height;
        assert.ok(
          y + silhouette < horizon,
          `${width}x${height}: spacecraft ${index}`,
        );
      }
    }
    f.events.pagehide();
  }
});

test("spacecraft keep moving through successive routes and resume after tab visibility changes", async () => {
  const f = await fixture();
  assert.equal(f.flights.length, 3);
  assert.ok(
    f.flights[0].options.delay >= 16000 && f.flights[0].options.delay <= 40000,
  );
  assert.equal(f.flights[0].options.fill, "both");
  assert.equal(f.flights[1].options.delay, 0);
  assert.equal(f.flights[2].options.delay, 0);
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
  assert.ok(f.flights.every((flight) => flight.state === "paused"));
  f.visible(true);
  assert.equal(f.pending.size, 1);
  assert.ok(f.flights.every((flight) => flight.state === "running"));
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
  assert.equal(f.ratio(), 2);
  f.step(100);
  f.step(131);
  assert.equal(f.draws(), 2);
  f.step(132);
  assert.equal(f.draws(), 3);
  const desktop = await fixture();
  assert.equal(desktop.ratio(), 2);
  const standardDisplay = await fixture({ pixelRatio: 1 });
  assert.equal(standardDisplay.ratio(), 1);
  const largeGlobe = await fixture({ hostSize: 800 });
  assert.equal(largeGlobe.ratio() * 800, 1024);
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
