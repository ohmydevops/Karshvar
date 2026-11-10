import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import path from "node:path";
const workerUrl = process.env.KARSHVAR_WORKER
  ? pathToFileURL(path.resolve(process.env.KARSHVAR_WORKER))
  : new URL("../public/sw.js", import.meta.url);
const source = await readFile(workerUrl, "utf8");
const assets = JSON.parse(source.match(/const ASSETS=(\[.*?\]);/s)[1]);
const integrity = JSON.parse(source.match(/const INTEGRITY=(\{.*?\});/s)[1]);
const sri = (bytes) =>
  "sha256-" + createHash("sha256").update(bytes).digest("base64");
// Tiny network fixtures keep repeated lifecycle tests fast. The generated real
// file manifest is independently checked against every file below.
const bodies = new Map(
  assets.map((asset) => [asset, Buffer.from("release 2: " + asset)]),
);
bodies.set("favicon.svg", Buffer.from([0, 255, 13, 10, 128]));
const fixtureIntegrity = Object.fromEntries(
  [...bodies].map(([asset, bytes]) => [asset, sri(bytes)]),
);
function worker({
  fail = false,
  delayed = false,
  stalled = false,
  stale,
  missingHash,
  sharedStores,
  version,
} = {}) {
  const events = {},
    stores = sharedStores || new Map();
  const writes = [];
  let online = true,
    claimed = false;
  let active = 0,
    peak = 0;
  const timers = new Map();
  let timerId = 0;
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        async put(url, response) {
          writes.push(String(url));
          store.set(String(url), response.clone());
        },
        async match(url) {
          return store.get(String(url))?.clone();
        },
      };
    },
    async keys() {
      return [...stores.keys()];
    },
    async delete(name) {
      return stores.delete(name);
    },
  };
  const expected = { ...fixtureIntegrity };
  if (missingHash) delete expected[missingHash];
  let workerSource = source.replace(
    /const INTEGRITY=\{.*?\};/s,
    `const INTEGRITY=${JSON.stringify(expected)};`,
  );
  if (version)
    workerSource = workerSource.replace(
      /const VERSION="[^"]*";/,
      `const VERSION=${JSON.stringify(version)};`,
    );
  vm.runInNewContext(workerSource, {
    URL,
    Response,
    AbortController,
    setTimeout(handler) {
      const id = ++timerId;
      timers.set(id, handler);
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    caches,
    self: {
      registration: { scope: "https://example.test/game/" },
      location: { origin: "https://example.test" },
      clients: {
        async claim() {
          claimed = true;
        },
      },
      addEventListener(name, fn) {
        events[name] = fn;
      },
    },
    fetch: async (url, options = {}) => {
      active++;
      peak = Math.max(peak, active);
      try {
        if (stalled) {
          await new Promise((_, reject) =>
            options.signal.addEventListener(
              "abort",
              () => {
                reject(Error("timeout"));
              },
              { once: true },
            ),
          );
        }
        if (delayed) await new Promise((resolve) => setImmediate(resolve));
        if (!online) throw Error("offline");
        if (fail && String(url).includes("names.json"))
          return new Response("", { status: 500 });
        const asset = new URL(url.url || String(url)).pathname.slice(
          "/game/".length,
        );
        const body =
          asset === stale
            ? Buffer.from("old CDN release: " + asset)
            : bodies.get(asset) || Buffer.from("missing asset");
        // Exercise native Fetch integrity validation, without an external server.
        // A 200 response containing old bytes must reject before cache.put.
        const verified = await fetch(
          "data:application/octet-stream;base64," + body.toString("base64"),
          {
            integrity: options.integrity,
            signal: options.signal,
          },
        );
        return new Response(verified.body, {
          headers: {
            "Content-Type": String(url).includes(".css")
              ? "text/css"
              : "text/plain",
          },
        });
      } finally {
        active--;
      }
    },
  });
  return {
    writes,
    expireTimers() {
      for (const handler of [...timers.values()]) handler();
    },
    get peak() {
      return peak;
    },
    get active() {
      return active;
    },
    stores,
    caches,
    offline() {
      online = false;
    },
    async lifecycle(name) {
      let task;
      events[name]({
        waitUntil(p) {
          task = p;
        },
      });
      await task;
    },
    async request(path, mode = "navigate") {
      let task;
      events.fetch({
        request: {
          url: "https://example.test/game/" + path,
          mode,
          method: "GET",
        },
        respondWith(p) {
          task = p;
        },
      });
      return task;
    },
    get claimed() {
      return claimed;
    },
  };
}
test("generated integrity manifest matches every final file byte-for-byte", async () => {
  assert.deepEqual(Object.keys(integrity), assets);
  for (const asset of assets) {
    const bytes = await readFile(new URL(asset, workerUrl));
    assert.equal(integrity[asset], sri(bytes), asset);
  }
});

for (const stale of [
  "app.js",
  "style.css",
  "fa/index.html",
  "data/names.json",
  "build-info.json",
  "favicon.svg",
])
  test(
    "stale 200 response is rejected without replacing the active release: " +
      stale,
    async () => {
      const previous = worker({ version: "previous" });
      await previous.lifecycle("install");
      await previous.lifecycle("activate");
      const oldKeys = [...previous.stores.keys()];
      const update = worker({
        version: "new",
        stale,
        sharedStores: previous.stores,
      });
      await assert.rejects(update.lifecycle("install"));
      assert(!update.writes.includes("https://example.test/game/" + stale));
      assert.deepEqual([...previous.stores.keys()], oldKeys);
      assert.equal(update.claimed, false);
      previous.offline();
      assert.equal((await previous.request("fa/")).status, 200);
      assert.equal(
        await (await previous.request("app.js", "cors")).text(),
        bodies.get("app.js").toString(),
      );
    },
  );

test("missing file integrity fails installation instead of accepting unverified data", async () => {
  const w = worker({ missingHash: "app.js" });
  await assert.rejects(w.lifecycle("install"), /Missing offline integrity/);
  assert.equal(w.stores.size, 0);
  assert(!w.writes.includes("https://example.test/game/app.js"));
});

test("offline downloads overlap with a maximum of six requests", async () => {
  const w = worker({ delayed: true });
  await w.lifecycle("install");
  assert.equal(w.peak, 6);
  assert.equal(w.active, 0);
});

test("failed parallel installation settles requests before cleaning its cache", async () => {
  const w = worker({ delayed: true, fail: true });
  await assert.rejects(w.lifecycle("install"));
  assert.equal(w.active, 0);
  assert.equal(w.stores.size, 0);
});

test("stalled offline downloads abort and discard only the incomplete update", async () => {
  const w = worker({ stalled: true });
  w.stores.set("existing-offline-version", new Map());
  const installing = w.lifecycle("install");
  const rejected = assert.rejects(installing, /timeout/);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(w.active, 6);
  w.expireTimers();
  await rejected;
  assert.equal(w.active, 0);
  assert.equal(w.stores.size, 1);
  assert(w.stores.has("existing-offline-version"));
});
test("installed worker serves all game routes and assets without network", async () => {
  const w = worker();
  await w.lifecycle("install");
  await w.lifecycle("activate");
  assert.equal(w.claimed, true);
  w.offline();
  for (const path of [
    "en/",
    "en/modes/",
    "en/countries/",
    "en/continents/",
    "en/play/?continent=country%3A364",
    "en/results/?continent=Asia",
    "fa/explore/",
  ])
    assert.equal((await w.request(path)).status, 200, path);
  for (const path of [
    "app.js",
    "nearby.js",
    "data/names.json",
    "data/countries.json",
    "vendor/d3.min.js",
    "style.css",
  ])
    assert.equal((await w.request(path, "cors")).status, 200, path);
  assert.equal(
    (await w.request("style.css", "cors")).headers.get("Content-Type"),
    "text/css",
  );
  assert.equal((await w.request("missing/")).status, 503);
});
test("failed install discards incomplete cache", async () => {
  const w = worker({ fail: true });
  await assert.rejects(w.lifecycle("install"));
  assert.equal(w.stores.size, 0);
});

test("root navigation redirects to English online and offline while localized pages stay available", async () => {
  const w = worker();
  await w.lifecycle("install");
  await w.lifecycle("activate");
  for (const offline of [false, true]) {
    if (offline) w.offline();
    for (const path of [
      "",
      "index.html",
      "?from=google#map",
      "index.html?from=google#map",
    ]) {
      const response = await w.request(path);
      assert.equal(response.status, 302);
      const suffix = path.includes("?") ? "?from=google#map" : "";
      assert.equal(
        response.headers.get("Location"),
        "https://example.test/game/en/" + suffix,
      );
    }
    assert.equal((await w.request("en/?from=google")).status, 200);
    assert.equal((await w.request("fa/")).status, 200);
  }
});
test("activation removes only older caches belonging to this scope", async () => {
  const w = worker();
  await w.caches.open("unrelated-cache");
  await w.caches.open(
    "karshvar-" + encodeURIComponent("https://example.test/game/") + "-old",
  );
  await w.lifecycle("install");
  await w.lifecycle("activate");
  assert.ok(w.stores.has("unrelated-cache"));
  assert.equal(w.stores.size, 2);
});

test("offline asset list excludes deployment-only dotfiles", () => {
  const assets = JSON.parse(source.match(/const ASSETS=(\[.*?\]);/s)[1]);
  assert.ok(assets.includes("index.html"));
  assert.ok(assets.includes("fonts/Vazir-Regular.woff2"));
  assert.ok(
    assets.every(
      (path) => !path.split("/").some((part) => part.startsWith(".")),
    ),
  );
});

test("sitemap is neither precached nor intercepted, including query URLs", async () => {
  const assets = JSON.parse(source.match(/const ASSETS=(\[.*?\]);/s)[1]);
  assert.ok(!assets.includes("sitemap.xml"));
  const w = worker();
  await w.lifecycle("install");
  assert.equal(await w.request("sitemap.xml"), undefined);
  assert.equal(await w.request("sitemap.xml?v=2", "cors"), undefined);
  w.offline();
  assert.equal(await w.request("sitemap.xml"), undefined);
});

test("crawler metadata, verification files and source maps bypass offline caching", async () => {
  const assets = JSON.parse(source.match(/const ASSETS=(\[.*?\]);/s)[1]);
  const w = worker();
  for (const path of [
    "robots.txt",
    "sitemap-news.xml",
    "google123.html",
    "BingSiteAuth.xml",
    "vendor/app.js.map",
  ]) {
    assert.ok(!assets.includes(path));
    assert.equal(await w.request(path), undefined);
  }
  assert.ok(assets.includes("data/countries.json"));
  assert.ok(assets.includes("en/play/index.html"));
});

test("blog pages and social images are never precached or served by the worker", async () => {
  const assets = JSON.parse(source.match(/const ASSETS=(\[.*?\]);/s)[1]);
  assert.ok(
    assets.every((path) => !/(?:^|\/)blog(?:\/|$)|^social\//i.test(path)),
  );
  const w = worker();
  await w.lifecycle("install");
  await w.lifecycle("activate");
  const paths = [
    "blog/",
    "blog/style.css",
    "blog/style.css?v=2",
    "social/blog-iran-en.png",
    "social/blog-iran-en.png?v=2",
    "social/karshvar-en.png",
    "social/explore-fa.jpg?v=2",
  ];
  for (const locale of ["en", "fa", "ar", "tr", "fr", "ru"])
    paths.push(
      `${locale}/blog`,
      `${locale}/blog/`,
      `${locale}/blog/iran/`,
      `${locale}/blog/speak-en-everyday/`,
      `${locale}/blog/iran/index.html?version=2`,
    );
  // Even if an old blog entry exists, the fetch handler must not serve it.
  for (const cache of w.stores.values())
    for (const path of paths)
      cache.set(
        "https://example.test/game/" + path,
        new Response("stale blog"),
      );
  for (const path of paths)
    assert.equal(
      await w.request(path, path.startsWith("social/") ? "cors" : "navigate"),
      undefined,
      path,
    );
  w.offline();
  for (const path of paths)
    assert.equal(await w.request(path), undefined, path);
  assert.equal((await w.request("en/play/?continent=Asia")).status, 200);
  assert.equal((await w.request("data/countries.json", "cors")).status, 200);
});
