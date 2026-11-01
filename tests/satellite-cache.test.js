import test from "node:test";
import assert from "node:assert/strict";
import {
  createSatelliteCache,
  satelliteCacheLimit,
  satelliteCacheName,
} from "../public/satellite-cache.js";
function memoryCache() {
  const entries = new Map();
  const cache = {
    match: async (key) =>
      entries.get(typeof key === "string" ? key : key.url)?.clone(),
    keys: async () => [...entries.keys()].map((url) => new Request(url)),
    delete: async (key) =>
      entries.delete(typeof key === "string" ? key : key.url),
    put: async (key, value) => {
      entries.set(key, value.clone());
    },
  };
  return {
    entries,
    cache,
    storage: () => ({
      open: async (name) => {
        assert.equal(name, satelliteCacheName);
        return cache;
      },
    }),
  };
}
const url = (id) => "https://gibs.earthdata.nasa.gov/image?bbox=" + id;
const image = (size) =>
  new Response(new Blob([new Uint8Array(size)], { type: "image/jpeg" }), {
    headers: { "Content-Type": "image/jpeg" },
  });
test("satellite images remain available offline in a new page session", async () => {
  const memory = memoryCache();
  let calls = 0;
  const online = createSatelliteCache({
    storage: memory.storage,
    fetchImage: async () => {
      calls++;
      return image(6);
    },
    locks: () => undefined,
  });
  assert.equal((await online(url("a"))).size, 6);
  const offline = createSatelliteCache({
    storage: memory.storage,
    fetchImage: async () => {
      throw Error("offline");
    },
    locks: () => undefined,
  });
  assert.equal((await offline(url("a"))).size, 6);
  assert.equal(calls, 1);
});
test("concurrent downloads respect the byte cap and evict oldest images", async () => {
  assert.equal(satelliteCacheLimit, 200 * 1024 * 1024);
  const memory = memoryCache();
  const load = createSatelliteCache({
    storage: memory.storage,
    limit: 10,
    locks: () => undefined,
    fetchImage: async () => image(4),
  });
  await load(url("a"));
  await Promise.all([load(url("b")), load(url("c"))]);
  assert.equal(memory.entries.has(url("a")), false);
  assert.equal(memory.entries.size, 2);
  let total = 0;
  for (const r of memory.entries.values())
    total += Number(r.headers.get("x-image-bytes"));
  assert(total <= 10);
});
test("oversized images and failed responses do not displace cached images", async () => {
  const memory = memoryCache();
  let response = image(4);
  const load = createSatelliteCache({
    storage: memory.storage,
    limit: 10,
    locks: () => undefined,
    fetchImage: async () => response,
  });
  await load(url("saved"));
  response = image(11);
  assert.equal((await load(url("large"))).size, 11);
  assert.equal(memory.entries.size, 1);
  response = new Response("error", { status: 503 });
  await assert.rejects(load(url("error")));
  assert.equal(memory.entries.size, 1);
  response = new Response("<error/>", {
    headers: { "content-type": "text/xml" },
  });
  await assert.rejects(load(url("xml")));
  assert.equal(memory.entries.size, 1);
});
test("storage failures and browser quota errors never prevent online imagery", async () => {
  const blocked = createSatelliteCache({
    storage: () => {
      throw Error("blocked");
    },
    fetchImage: async () => image(5),
    locks: () => undefined,
  });
  assert.equal((await blocked(url("a"))).size, 5);
  const memory = memoryCache();
  await memory.cache.put(
    url("old"),
    new Response(new Blob(["old"]), { headers: { "x-image-bytes": "3" } }),
  );
  const put = memory.cache.put;
  let attempts = 0;
  memory.cache.put = async (...args) => {
    if (++attempts === 1) throw new DOMException("quota", "QuotaExceededError");
    return put(...args);
  };
  const load = createSatelliteCache({
    storage: memory.storage,
    fetchImage: async () => image(5),
    locks: () => undefined,
  });
  assert.equal((await load(url("new"))).size, 5);
  assert.equal(memory.entries.has(url("old")), false);
  assert.equal(memory.entries.has(url("new")), true);
});
test("refresh and overlapping views reuse cached coverage without a network call", async () => {
  const memory = memoryCache();
  let calls = 0;
  const query = (box, width = 2048) =>
    "https://gibs.earthdata.nasa.gov/wms?LAYERS=BlueMarble&BBOX=" +
    box +
    "&WIDTH=" +
    width +
    "&HEIGHT=" +
    width;
  const load = createSatelliteCache({
    storage: memory.storage,
    fetchImage: async () => {
      calls++;
      return image(6);
    },
    locks: () => undefined,
  });
  const wide = query("40,20,60,40", 4096),
    inside = query("45,25,55,35");
  await load(wide, { withRegion: true });
  const refreshed = createSatelliteCache({
    storage: memory.storage,
    fetchImage: async () => {
      throw Error("must not download");
    },
    locks: () => undefined,
  });
  const covered = await refreshed(inside, { withRegion: true });
  assert.equal(covered.url, wide);
  assert.equal(covered.blob.size, 6);
  assert.equal(calls, 1);
});
test("zoom downloads higher detail online but falls back to saved coverage offline", async () => {
  const memory = memoryCache();
  const base = "https://gibs.earthdata.nasa.gov/wms?LAYERS=BlueMarble&BBOX=";
  const wide = base + "40,20,60,40&WIDTH=2048&HEIGHT=2048";
  const detail = base + "45,25,55,35&WIDTH=2048&HEIGHT=2048";
  const initial = createSatelliteCache({
    storage: memory.storage,
    fetchImage: async () => image(6),
    locks: () => undefined,
  });
  await initial(wide);
  const offline = createSatelliteCache({
    storage: memory.storage,
    fetchImage: async () => {
      throw Error("offline");
    },
    locks: () => undefined,
  });
  assert.equal((await offline(detail, { withRegion: true })).url, wide);
  let downloads = 0;
  const online = createSatelliteCache({
    storage: memory.storage,
    fetchImage: async () => {
      downloads++;
      return image(8);
    },
    locks: () => undefined,
  });
  assert.equal((await online(detail, { withRegion: true })).url, detail);
  assert.equal(downloads, 1);
});
test("download status runs only for network work and clears after failures", async () => {
  const memory = memoryCache(),
    status = [];
  const load = createSatelliteCache({
    storage: memory.storage,
    locks: () => undefined,
    fetchImage: async () => image(6),
  });
  await load(url("status"), { onDownload: (active) => status.push(active) });
  assert.deepEqual(status, [true, false]);
  status.length = 0;
  await load(url("status"), { onDownload: (active) => status.push(active) });
  assert.deepEqual(status, []);
  const failed = createSatelliteCache({
    storage: memory.storage,
    locks: () => undefined,
    fetchImage: async () => {
      throw Error("offline");
    },
  });
  await assert.rejects(
    failed(url("missing"), { onDownload: (active) => status.push(active) }),
  );
  assert.deepEqual(status, [true, false]);
});
