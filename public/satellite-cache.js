// Separate from versioned app assets so updates keep previously viewed imagery.
export const satelliteCacheName = "karshvar-satellite-images-v1";
export const satelliteCacheLimit = 200 * 1024 * 1024;
export function satelliteRegion(url) {
  const u = new URL(url);
  const box = u.searchParams.get("BBOX")?.split(",").map(Number);
  const width = Number(u.searchParams.get("WIDTH")),
    height = Number(u.searchParams.get("HEIGHT"));
  if (
    !box ||
    box.length !== 4 ||
    !box.every(Number.isFinite) ||
    box[2] <= box[0] ||
    box[3] <= box[1] ||
    width <= 0 ||
    height <= 0
  )
    return null;
  for (const key of ["BBOX", "WIDTH", "HEIGHT"]) u.searchParams.delete(key);
  u.searchParams.sort();
  return { box, width, height, product: u.href };
}
export function createSatelliteCache({
  storage = () => globalThis.caches,
  fetchImage = (...args) => fetch(...args),
  limit = satelliteCacheLimit,
  locks = () => globalThis.navigator?.locks,
} = {}) {
  let pending = Promise.resolve();
  function serial(action) {
    const run = () =>
      locks()?.request ? locks().request(satelliteCacheName, action) : action();
    const result = pending.then(run, run);
    pending = result.catch(() => {});
    return result;
  }
  async function open() {
    return storage()?.open(satelliteCacheName);
  }
  return async function getImage(
    url,
    { withRegion = false, onDownload = () => {} } = {},
  ) {
    const result = (blob, imageUrl = url) =>
      withRegion ? { blob, url: imageUrl } : blob;
    let fallback;
    try {
      const cache = await open();
      const cached = await cache?.match(url);
      if (cached) return result(await cached.blob());
      const target = withRegion ? satelliteRegion(url) : null;
      if (target && cache) {
        const candidates = [];
        for (const key of await cache.keys()) {
          const region = satelliteRegion(key.url);
          if (!region || region.product !== target.product) continue;
          const a = region.box,
            b = target.box;
          if (a[0] > b[0] || a[1] > b[1] || a[2] < b[2] || a[3] < b[3])
            continue;
          const quality = Math.min(
            region.width / (a[2] - a[0]) / (target.width / (b[2] - b[0])),
            region.height / (a[3] - a[1]) / (target.height / (b[3] - b[1])),
          );
          candidates.push({ key, quality });
        }
        candidates.sort((a, b) => b.quality - a.quality);
        if (candidates.length) {
          const best = candidates[0],
            response = await cache.match(best.key);
          if (response) {
            fallback = result(await response.blob(), best.key.url);
            if (best.quality >= 1) return fallback;
          }
        }
      }
    } catch {
      /* Storage restrictions must not block online images. */
    }
    let blob;
    onDownload(true);
    try {
      const response = await fetchImage(url, { mode: "cors" });
      if (
        !response.ok ||
        !response.headers.get("content-type")?.startsWith("image/")
      )
        throw Error("Satellite image unavailable");
      blob = await response.blob();
    } catch (error) {
      if (fallback) return fallback;
      throw error;
    } finally {
      onDownload(false);
    }
    if (!blob.size || blob.size > limit) return result(blob);
    try {
      await serial(async () => {
        const cache = await open();
        if (!cache) return;
        if (await cache.match(url)) return;
        let total = 0;
        const entries = [];
        for (const key of await cache.keys()) {
          const entry = await cache.match(key);
          if (!entry) continue;
          const size = Number(entry.headers.get("x-image-bytes"));
          if (!Number.isFinite(size) || size <= 0) {
            await cache.delete(key);
            continue;
          }
          total += size;
          entries.push({ key, size });
        }
        while (total + blob.size > limit && entries.length) {
          const oldest = entries.shift();
          await cache.delete(oldest.key);
          total -= oldest.size;
        }
        const stored = () =>
          new Response(blob, {
            headers: {
              "Content-Type": blob.type,
              "x-image-bytes": String(blob.size),
            },
          });
        // Browser quotas may be lower than our cap. Evict further and retry safely.
        while (true) {
          try {
            await cache.put(url, stored());
            break;
          } catch (error) {
            if (error.name !== "QuotaExceededError" || !entries.length)
              throw error;
            await cache.delete(entries.shift().key);
          }
        }
      });
    } catch {
      /* Return the downloaded image even when caching is unavailable. */
    }
    return result(blob);
  };
}
export const loadSatelliteImage = createSatelliteCache();
