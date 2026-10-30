import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
const source = await readFile(
  new URL("../public/sw.js", import.meta.url),
  "utf8",
);
function worker({ fail = false } = {}) {
  const events = {},
    stores = new Map();
  let online = true,
    claimed = false;
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        async put(url, response) {
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
  vm.runInNewContext(source, {
    URL,
    Response,
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
    fetch: async (url) => {
      if (!online) throw Error("offline");
      if (fail && String(url).includes("names.json"))
        return new Response("", { status: 500 });
      return new Response(String(url), {
        headers: {
          "Content-Type": String(url).includes(".css")
            ? "text/css"
            : "text/plain",
        },
      });
    },
  });
  return {
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
  assert.ok(assets.includes("en/blog/iran/index.html"));
  assert.ok(assets.includes("social/blog-iran-en.png"));
});
