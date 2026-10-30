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
  let reloads = 0;
  const waiting = {
    postMessage(message) {
      sent.push(message);
    },
  };
  const registration = { waiting, addEventListener() {} };
  const serviceWorker = {
    controller: controller ? {} : null,
    async register() {
      return registration;
    },
    addEventListener(name, handler) {
      events[name] = handler;
    },
  };
  const document = {
    readyState: "complete",
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
      window: { isSecureContext: true },
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
