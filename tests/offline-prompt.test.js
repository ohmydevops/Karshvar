import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
const source = await readFile(
  new URL("../public/offline.js", import.meta.url),
  "utf8",
);
const timeoutSource = (
  await readFile(
    new URL("../public/update-loading.js", import.meta.url),
    "utf8",
  )
).replaceAll("export ", "");
async function setup(
  controller = true,
  register,
  hostname = "example.test",
  vite = false,
  reuse = false,
) {
  const nodes = [],
    events = {},
    sent = [];
  const timers = new Map();
  const workerEvents = {};
  let reloads = 0,
    checks = 0,
    now = 100_000;
  const waiting = {
    scriptURL: "https://example.test/sw.js",
    addEventListener(name, handler) {
      workerEvents[name] = handler;
    },
    removeEventListener(name) {
      delete workerEvents[name];
    },
    postMessage(message) {
      sent.push(message);
    },
  };
  const registration = {
    waiting,
    addEventListener() {},
    async update() {
      checks++;
    },
    async unregister() {
      this.unregistered = true;
    },
  };
  const serviceWorker = {
    controller: controller ? {} : null,
    async register() {
      return register ? register(registration) : registration;
    },
    async getRegistration() {
      return reuse ? registration : undefined;
    },
    addEventListener(name, handler) {
      events[name] = handler;
    },
  };
  const menuButton = {},
    menuStatus = {};
  const document = {
    querySelector: () => (vite ? {} : null),
    getElementById(id) {
      return id === "checkUpdates" ? menuButton : menuStatus;
    },
    readyState: "complete",
    visibilityState: "visible",
    addEventListener(name, handler) {
      events[name] = handler;
    },
    documentElement: { lang: "en" },
    body: { append() {} },
    createElement(tag) {
      const node = {
        tag,
        children: [],
        handlers: {},
        setAttribute() {},
        append(...children) {
          this.children.push(...children);
        },
        addEventListener(name, fn) {
          this.handlers[name] = fn;
        },
        showModal() {
          this.open = true;
        },
        close() {
          this.open = false;
          this.handlers.close?.();
        },
        remove() {
          this.removed = true;
        },
      };
      nodes.push(node);
      return node;
    },
  };
  vm.runInNewContext(
    timeoutSource +
      source
        .replace(/^import .*withUpdateTimeout.*\n/, "")
        .replace(/^import .*createDownloadManager.*\n/m, "")
        .replace("export const offlineReady", "const offlineReady")
        .replaceAll(
          "import.meta.url",
          JSON.stringify("https://example.test/offline.js"),
        ),
    {
      document,
      // Activation UI tests isolate discovery; its consent/download flow has
      // separate tests with real browser and CacheStorage fixtures.
      createDownloadManager: ({ requestUpdate }) => ({
        check: async () => {
          await requestUpdate();
          return 1;
        },
        poll() {},
        hide() {},
      }),
      navigator: { serviceWorker },
      window: {
        isSecureContext: true,
        addEventListener(name, handler) {
          events[name] = handler;
        },
        setInterval(handler) {
          events.interval = handler;
        },
        setTimeout(handler) {
          const id = timers.size + 1;
          timers.set(id, handler);
          return id;
        },
        clearTimeout(id) {
          timers.delete(id);
        },
      },
      Date: { now: () => now },
      URL,
      location: {
        hostname,
        reload() {
          reloads++;
        },
      },
      console,
    },
  );
  await new Promise((resolve) => setImmediate(resolve));
  return {
    nodes,
    registration,
    menuButton,
    menuStatus,
    document,
    advance() {
      now += 60_000;
    },
    get checks() {
      return checks;
    },
    events,
    workerEvents,
    expireTimers() {
      for (const fn of [...timers.values()]) fn();
    },
    sent,
    get reloads() {
      return reloads;
    },
  };
}

test("a local static build keeps the same update prompt as production", async () => {
  const app = await setup(true, undefined, "localhost");
  assert.equal(app.registration.unregistered, undefined);
  assert.equal(app.menuButton.hidden, false);
  assert.ok(app.nodes.some((n) => n.textContent === "Update now"));
});

test("a stalled activation restores retry and Later without reloading", async () => {
  const app = await setup();
  const button = app.nodes.find((n) => n.textContent === "Update now");
  button.onclick();
  assert.equal(button.disabled, true);
  assert.notEqual(
    app.nodes.find((n) => n.textContent === "Later").disabled,
    true,
  );
  app.expireTimers();
  assert.equal(button.disabled, false);
  assert.equal(button.textContent, "Try again");
  assert.equal(app.reloads, 0);
  button.onclick();
  assert.equal(app.sent.length, 2);
  app.events.controllerchange();
  assert.equal(app.reloads, 1);
});

test("activated state recovers a missed controllerchange and reloads once", async () => {
  const app = await setup();
  app.nodes.find((n) => n.textContent === "Update now").onclick();
  app.registration.active = app.registration.waiting;
  app.registration.active.state = "activated";
  app.workerEvents.statechange();
  app.events.controllerchange();
  assert.equal(app.reloads, 1);
});

test("Later during activation cancels automatic reload", async () => {
  const app = await setup();
  app.nodes.find((n) => n.textContent === "Update now").onclick();
  app.nodes.find((n) => n.textContent === "Later").onclick();
  app.events.controllerchange();
  assert.equal(app.reloads, 0);
});

test("update button is visible while service worker registration is still pending", async () => {
  let finish;
  const pending = new Promise((resolve) => {
    finish = resolve;
  });
  const app = await setup(true, () => pending);
  assert.equal(app.menuButton.hidden, false);
  assert.equal(app.menuButton.disabled, true);
  finish(app.registration);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(app.menuButton.disabled, false);
});

test("failed registration leaves a visible button that retries installation", async () => {
  let calls = 0;
  const app = await setup(true, (registration) => {
    if (++calls === 1) throw Error("network");
    return registration;
  });
  assert.equal(app.menuButton.hidden, false);
  assert.equal(app.menuButton.disabled, false);
  await app.menuButton.onclick();
  assert.equal(calls, 2);
  assert.equal(app.menuButton.disabled, false);
});
test("first offline installation does not prompt", async () => {
  const app = await setup(false);
  assert.equal(app.nodes.length, 0);
});
test("Later dismisses update without activation or reload", async () => {
  const app = await setup();
  app.nodes.find((n) => n.textContent === "Later").onclick();
  assert.equal(app.sent.length, 0);
  app.events.controllerchange();
  assert.equal(app.reloads, 0);
});
test("Update now activates waiting worker and reloads once on controller change", async () => {
  const app = await setup();
  app.nodes.find((n) => n.textContent === "Update now").onclick();
  assert.equal(app.sent[0].type, "ACTIVATE_UPDATE");
  assert.equal(app.reloads, 0);
  app.events.controllerchange();
  app.events.controllerchange();
  assert.equal(app.reloads, 1);
});

test("update checks run on return and reconnect, with throttling and hidden-tab suppression", async () => {
  const app = await setup();
  assert.equal(app.checks, 1);
  await app.events.pageshow();
  assert.equal(app.checks, 1);
  app.advance();
  app.document.visibilityState = "hidden";
  await app.events.interval();
  assert.equal(app.checks, 1);
  app.document.visibilityState = "visible";
  await app.events.visibilitychange();
  assert.equal(app.checks, 2);
  app.advance();
  await app.events.online();
  assert.equal(app.checks, 3);
  assert.equal(app.reloads, 0);
  assert.equal(app.nodes.filter((n) => n.tag === "aside").length, 1);
});

test("manual menu check bypasses throttle and reports no update", async () => {
  const app = await setup();
  app.registration.waiting = null;
  await app.menuButton.onclick();
  assert.equal(app.checks, 2);
  assert.equal(app.menuStatus.textContent, "You’re up to date.");
  assert.equal(app.menuButton.disabled, false);
  assert.equal(app.reloads, 0);
});
test("manual check can offer a previously dismissed update", async () => {
  const app = await setup();
  app.nodes.find((n) => n.textContent === "Later").onclick();
  await app.menuButton.onclick();
  assert.equal(
    app.nodes.filter((n) => n.tag === "aside" && !n.hidden).length,
    1,
  );
  assert.equal(app.sent.length, 0);
});
test("failed manual checks show feedback and restore the button", async () => {
  const app = await setup();
  app.registration.waiting = null;
  app.registration.update = async () => {
    throw Error("network");
  };
  await app.menuButton.onclick();
  assert.equal(app.menuStatus.textContent, "Couldn’t check. Try again.");
  assert.equal(app.menuButton.disabled, false);
});

test("stalled registration restores retry and ignores a late result", async () => {
  let finish,
    calls = 0;
  const pending = new Promise((resolve) => {
    finish = resolve;
  });
  const app = await setup(true, (registration) =>
    ++calls === 1 ? pending : registration,
  );
  app.expireTimers();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(app.menuButton.disabled, false);
  assert.equal(app.menuStatus.textContent, "Couldn’t check. Try again.");
  finish(app.registration);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(app.nodes.length, 0);
  await app.menuButton.onclick();
  assert.equal(calls, 2);
  assert.equal(app.menuButton.disabled, false);
});

test("stalled manual update restores retry without reporting success", async () => {
  const app = await setup();
  app.registration.waiting = null;
  app.registration.update = () => new Promise(() => {});
  const checking = app.menuButton.onclick();
  assert.equal(app.menuButton.disabled, true);
  app.expireTimers();
  await checking;
  assert.equal(app.menuButton.disabled, false);
  assert.equal(app.menuStatus.textContent, "Couldn’t check. Try again.");
});

test("manual and automatic checks share one in-flight update request", async () => {
  const app = await setup();
  app.registration.waiting = null;
  let finish,
    calls = 0;
  app.registration.update = () => {
    calls++;
    return new Promise((resolve) => {
      finish = resolve;
    });
  };
  app.advance();
  const automatic = app.events.online();
  const manual = app.menuButton.onclick();
  assert.equal(calls, 1);
  finish();
  await Promise.all([automatic, manual]);
  assert.equal(app.menuButton.disabled, false);
  assert.equal(app.menuStatus.textContent, "You’re up to date.");
});

test("Vite preview explains local updates without installing a worker", async () => {
  let installs = 0;
  const app = await setup(
    true,
    () => {
      installs++;
    },
    "localhost",
    true,
  );
  app.menuButton.onclick();
  assert.equal(installs, 0);
  assert.equal(app.menuButton.disabled, false);
  assert.match(app.menuStatus.textContent, /Local development preview/);
});

test("existing waiting update is offered without registering again", async () => {
  const app = await setup(
    true,
    () => {
      throw new Error("register must not run");
    },
    "example.test",
    false,
    true,
  );
  assert.ok(app.nodes.some((node) => node.tag === "aside" && !node.hidden));
});

test("manual check reports an in-progress download without starting another request", async () => {
  const app = await setup();
  app.registration.waiting = null;
  app.registration.installing = {};
  const before = app.checks;
  await app.menuButton.onclick();
  assert.equal(app.menuStatus.textContent, "Downloading update…");
  assert.equal(app.checks, before);
});
