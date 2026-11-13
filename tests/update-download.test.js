import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
const source = (
  await readFile(
    new URL("../public/update-download.js", import.meta.url),
    "utf8",
  )
)
  .replace("export function", "function")
  .replaceAll("import.meta.url", '"https://example.test/update-download.js"');
const oldVersion = "a".repeat(20),
  nextVersion = "b".repeat(20);
function fixture({
  latest = nextVersion,
  shared = new Map(),
  installing = null,
  fail = false,
  noInstall = false,
} = {}) {
  const nodes = [],
    session = new Map();
  let now = 1000;
  let requests = 0,
    downloads = 0,
    polls;
  const registration = {
    scope: "https://example.test/",
    active: {
      postMessage(message, ports) {
        ports[0].postMessage({ version: oldVersion });
      },
    },
    installing,
    addEventListener() {},
  };
  const caches = {
    async open() {
      return {
        async put(url, response) {
          shared.set(url, await response.text());
        },
        async match(url) {
          return shared.has(url) ? new Response(shared.get(url)) : undefined;
        },
      };
    },
  };
  const document = {
    documentElement: { lang: "en" },
    body: { append() {} },
    createElement(tag) {
      const events = {};
      const n = {
        tag,
        children: [],
        setAttribute() {},
        removeAttribute() {},
        append(...x) {
          this.children.push(...x);
        },
        remove() {},
        showModal() {
          this.open = true;
        },
        close() {
          this.open = false;
          events.close?.();
        },
        addEventListener(k, v) {
          events[k] = v;
        },
      };
      nodes.push(n);
      return n;
    },
  };
  const context = vm.createContext({
    URL,
    Response,
    AbortController,
    MessageChannel,
    Intl,
    Date: { now: () => now },
    document,
    caches,
    sessionStorage: {
      getItem: (k) => session.get(k),
      setItem: (k, v) => session.set(k, v),
    },
    location: { reload() {} },
    window: {
      setTimeout,
      clearTimeout,
      setInterval(fn) {
        polls = fn;
        return 1;
      },
      clearInterval() {},
    },
    fetch: async () => {
      requests++;
      return new Response(
        JSON.stringify({ version: latest, build: "next", files: 20 }),
      );
    },
  });
  vm.runInContext(source, context);
  const options = {
    registration,
    requestUpdate: async () => {
      downloads++;
      if (fail) throw Error("network");
      if (!noInstall) registration.installing = {};
    },
    onReady() {},
  };
  const create = () => context.createDownloadManager(options);
  const manager = create();
  return {
    manager,
    advance(ms) {
      now += ms;
    },
    create,
    nodes,
    registration,
    shared,
    poll: () => polls?.(),
    get requests() {
      return requests;
    },
    get downloads() {
      return downloads;
    },
  };
}
test("discovery asks before downloading or authorizing any release", async () => {
  const f = fixture();
  await f.manager.check();
  assert.equal(f.requests, 1);
  assert.equal(f.downloads, 0);
  assert.equal(f.shared.size, 0);
  assert(f.nodes.some((n) => n.tag === "aside" && !n.hidden));
});
test("up-to-date release checks only metadata without a prompt", async () => {
  const f = fixture({ latest: oldVersion });
  assert.equal(await f.manager.check(), 1);
  assert.equal(f.downloads, 0);
  assert.equal(f.nodes.length, 0);
});
test("Later survives page navigation but manual check can reopen the prompt", async () => {
  const f = fixture();
  await f.manager.check();
  f.nodes.find((n) => n.textContent === "Later").onclick();
  await f.create().check();
  assert.equal(f.nodes.filter((n) => n.tag === "aside" && !n.hidden).length, 0);
  await f.manager.check(true);
  assert.equal(f.nodes.filter((n) => n.tag === "aside" && !n.hidden).length, 1);
  assert.equal(f.downloads, 0);
});
test("approval persists and a new page shows the same worker download", async () => {
  const f = fixture();
  await f.manager.check();
  await f.nodes.find((n) => n.textContent === "Download").onclick();
  assert.equal(f.downloads, 1);
  assert.equal(
    JSON.parse(f.shared.get("https://example.test/.update-approval")).version,
    nextVersion,
  );
  f.shared.set(
    "https://example.test/.update-state",
    JSON.stringify({
      version: nextVersion,
      phase: "downloading",
      completed: 12,
      total: 20,
    }),
  );
  const nextPage = fixture({ shared: f.shared, installing: {} });
  await nextPage.manager.poll();
  assert(
    nextPage.nodes.some((n) => n.textContent === "Downloading update · 60%"),
  );
  assert.equal(nextPage.downloads, 0);
});
test("simultaneous checks share discovery and create only one prompt", async () => {
  const f = fixture();
  await Promise.all([f.manager.check(), f.manager.check(true)]);
  assert.equal(f.requests, 1);
  assert.equal(f.nodes.filter((n) => n.tag === "aside").length, 1);
});
test("failed start offers retry without throwing or claiming success", async () => {
  const f = fixture({ fail: true });
  await f.manager.check();
  await f.nodes.find((n) => n.textContent === "Download").onclick();
  assert(f.nodes.some((n) => n.textContent === "Retry" && !n.hidden));
});

test("automatic script discovery does not pretend an unapproved pack is downloading", async () => {
  const f = fixture({
    installing: {
      postMessage(message, ports) {
        ports[0].postMessage({ version: nextVersion, phase: "idle" });
      },
    },
  });
  await f.manager.poll();
  assert.equal(f.nodes.length, 0);
  assert.equal(f.downloads, 0);
});

test("available is not ready, and a no-op browser update offers retry instead of spinning forever", async () => {
  const f = fixture({ noInstall: true });
  assert.equal(await f.manager.check(), 6);
  await f.nodes.find((n) => n.textContent === "Download").onclick();
  f.advance(6000);
  await f.manager.poll();
  assert(f.nodes.some((n) => n.textContent === "Retry" && !n.hidden));
  assert(!f.nodes.some((n) => n.tag === "progress" && !n.hidden));
});
test("waiting worker wins over an earlier asynchronous downloading poll", async () => {
  const f = fixture({
    installing: {
      postMessage(message, ports) {
        f.registration.waiting = {};
        f.registration.installing = null;
        ports[0].postMessage({ version: nextVersion, phase: "downloading" });
      },
    },
  });
  await f.manager.poll();
  assert(
    f.nodes.some((n) => n.textContent === "Apply and reload" && !n.hidden),
  );
  assert(!f.nodes.some((n) => n.tag === "progress" && !n.hidden));
});
test("stalled progress becomes retryable and a completed worker can still recover", async () => {
  const shared = new Map([
    [
      "https://example.test/.update-state",
      JSON.stringify({
        phase: "downloading",
        version: nextVersion,
        completed: 4,
        total: 20,
      }),
    ],
  ]);
  const f = fixture({
    shared,
    installing: {
      postMessage(message, ports) {
        ports[0].postMessage({ version: nextVersion, phase: "downloading" });
      },
    },
  });
  await f.manager.poll();
  f.advance(151000);
  await f.manager.poll();
  assert(f.nodes.some((n) => n.textContent === "Retry" && !n.hidden));
  f.registration.waiting = {};
  f.registration.installing = null;
  await f.manager.poll();
  assert(
    f.nodes.some((n) => n.textContent === "Apply and reload" && !n.hidden),
  );
});

test("retry hides an obsolete error after the latest worker activated", async () => {
  const f = fixture({ fail: true });
  await f.manager.check();
  await f.nodes.find((n) => n.textContent === "Download").onclick();
  const banner = f.nodes.find((n) => n.tag === "aside");
  assert.equal(banner.hidden, false);
  f.registration.active.postMessage = (_, ports) =>
    ports[0].postMessage({ version: nextVersion });
  assert.equal(await f.manager.check(true), 1);
  assert.equal(banner.hidden, true);
});
