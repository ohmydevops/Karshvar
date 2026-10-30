import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
const source = await readFile(
  new URL("../public/offline.js", import.meta.url),
  "utf8",
);
async function setup(controller = true) {
  const nodes = [],
    events = {},
    sent = [];
  let reloads = 0,
    checks = 0,
    now = 100_000;
  const waiting = {
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
  };
  const serviceWorker = {
    controller: controller ? {} : null,
    async register() {
      return registration;
    },
    addEventListener(name, handler) {
      events[name] = handler;
    },
  };
  const menuButton = {},
    menuStatus = {};
  const document = {
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
    source.replaceAll(
      "import.meta.url",
      JSON.stringify("https://example.test/offline.js"),
    ),
    {
      document,
      navigator: { serviceWorker },
      window: {
        isSecureContext: true,
        addEventListener(name, handler) {
          events[name] = handler;
        },
        setInterval(handler) {
          events.interval = handler;
        },
      },
      Date: { now: () => now },
      URL,
      location: {
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
    sent,
    get reloads() {
      return reloads;
    },
  };
}
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
  assert.equal(app.nodes.filter((n) => n.tag === "dialog").length, 1);
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
  assert.equal(app.nodes.filter((n) => n.tag === "dialog" && n.open).length, 1);
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
