import { PrecacheController } from "workbox-precaching/PrecacheController.js";

const scope = self.registration.scope;
const legacyPrefix = "karshvar-" + encodeURIComponent(scope) + "-";
const stateName = "karshvar-update-state-" + encodeURIComponent(scope);
const stateURL = new URL(".update-state", scope).href;
const approvalURL = new URL(".update-approval", scope).href;
const activeURL = new URL(".update-active", scope).href;
const gameEnabledURL = new URL(".save-earth-enabled", scope).href;
const gameAssets = new Set(GAME_ASSETS);
let status = {
  version: VERSION,
  phase: "idle",
  completed: 0,
  total: ASSETS.length,
};
async function publish(phase) {
  status.phase = phase;
  const state = await caches.open(stateName);
  await state.put(stateURL, new Response(JSON.stringify(status)));
}
const timers = new Map();
const precache = new PrecacheController({
  cacheName: "karshvar-workbox-" + encodeURIComponent(scope),
  // Only cacheAsset invokes the strategy on a miss, with a known revision and
  // mandatory integrity. This allows the optional pack to install after entry.
  fallbackToNetwork: true,
  plugins: [
    {
      requestWillFetch: async ({ request }) => {
        const controller = new AbortController();
        timers.set(
          request.url,
          setTimeout(() => controller.abort(), 20000),
        );
        return new Request(request, { signal: controller.signal });
      },
      fetchDidSucceed: async ({ request, response }) => {
        clearTimeout(timers.get(request.url));
        timers.delete(request.url);
        return response;
      },
      fetchDidFail: async ({ request }) => {
        clearTimeout(timers.get(request.url));
        timers.delete(request.url);
      },
    },
  ],
});
precache.addToCacheList(
  ASSETS.map((url) => {
    if (!INTEGRITY[url]) throw new Error("Missing offline integrity: " + url);
    return { url, revision: INTEGRITY[url], integrity: INTEGRITY[url] };
  }),
);
const pendingAssets = new Map();
async function cacheAsset(asset, event) {
  if (!pendingAssets.has(asset)) {
    const url = new URL(asset, scope).href;
    const task = Promise.all(
      precache.strategy.handleAll({
        event,
        request: new Request(url, {
          integrity: INTEGRITY[asset],
          // Revisioned Workbox entries already reuse unchanged files. A miss
          // must revalidate HTTP cache bytes, including optional game scripts.
          cache: "reload",
          credentials: "same-origin",
        }),
        params: {
          cacheKey: precache.getCacheKeyForURL(url),
          integrity: INTEGRITY[asset],
        },
      }),
    ).then(([response]) => response);
    pendingAssets.set(asset, task);
    task.finally(() => pendingAssets.delete(asset)).catch(() => {});
  }
  return (await pendingAssets.get(asset)).clone();
}
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const state = await caches.open(stateName);
      const approval = await state.match(approvalURL);
      // Browsers also discover workers autonomously. Only download approved packs.
      if (
        self.registration.active &&
        (await state.match(activeURL)) &&
        (await approval?.json())?.version !== VERSION
      )
        throw new Error("Download approval required");
      // Ordinary visitors receive only the site. An enrolled player receives
      // the game on subsequent updates too; Workbox reuses unchanged hashes.
      const enrolled = await state.match(gameEnabledURL);
      const installAssets = enrolled
        ? ASSETS
        : ASSETS.filter((asset) => !gameAssets.has(asset));
      status.total = installAssets.length;
      status.completed = 0;
      await publish("downloading");
      let next = 0;
      let failed = false;
      const download = async () => {
        while (!failed && next < installAssets.length) {
          const asset = installAssets[next++];
          try {
            // Workbox reuses unchanged revisions and completed files on retries.
            await cacheAsset(asset, event);
            status.completed++;
            if (status.completed % 10 === 0) await publish("downloading");
          } catch (error) {
            failed = true;
            throw error;
          }
        }
      };
      const results = await Promise.allSettled(
        Array.from({ length: Math.min(6, ASSETS.length) }, download),
      );
      if (results.some((result) => result.status === "rejected")) {
        await publish("error");
        throw results.find((result) => result.status === "rejected").reason;
      }
      await publish("ready");
    })(),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await precache.activate(event);
      await self.clients.claim();
      await (
        await caches.open(stateName)
      ).put(activeURL, new Response(VERSION));
      await publish("active");
      // Migrate legacy caches only after the replacement is completely installed.
      for (const key of await caches.keys())
        if (key.startsWith(legacyPrefix)) await caches.delete(key);
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !url.href.startsWith(scope)
  )
    return;
  const relative = url.pathname.slice(new URL(scope).pathname.length);
  // The project's Vite preview must always show the current working files.
  if (
    url.port === "5174" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  )
    return;
  if (
    relative === "update-manifest.json" ||
    /(?:^|\/)blog(?:\/|$)|^social\//i.test(relative) ||
    /(?:^|\/)(?:sitemap[^/]*\.xml|robots\.txt|google[^/]*\.html|BingSiteAuth\.xml)$|\.map$/i.test(
      relative,
    )
  )
    return;
  if (
    event.request.mode === "navigate" &&
    ["", "index.html"].includes(relative)
  ) {
    const destination = new URL("en/", scope);
    destination.search = url.search;
    destination.hash = url.hash;
    event.respondWith(Response.redirect(destination.href, 302));
    return;
  }
  event.respondWith(
    (async () => {
      const key = new URL(url);
      if (event.request.mode === "navigate") {
        key.search = "";
        if (key.pathname.endsWith("/")) key.pathname += "index.html";
      }
      const cached = await precache.matchPrecache(key.href);
      if (cached) return cached;
      if (gameAssets.has(relative)) {
        try {
          return await cacheAsset(relative, event);
        } catch {
          return new Response(
            "Game download unavailable. Reconnect and retry.",
            { status: 503 },
          );
        }
      }
      // Never combine new route HTML with JS belonging to an older app release.
      if (
        event.request.mode === "navigate" &&
        /^(en|fa|ar|tr|fr|ru)\//.test(relative)
      ) {
        const home = new URL(relative.split("/")[0] + "/", scope);
        home.searchParams.set("update", "1");
        return Response.redirect(home.href, 302);
      }
      try {
        return await fetch(event.request);
      } catch {
        return new Response("This page is not available offline.", {
          status: 503,
        });
      }
    })(),
  );
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "CACHE_SAVE_EARTH") {
    const port = event.ports?.[0];
    event.waitUntil(
      (async () => {
        const state = await caches.open(stateName);
        await state.put(gameEnabledURL, new Response("true"));
        let next = 0,
          completed = 0,
          failed = false;
        const progress = (phase) =>
          port?.postMessage({
            phase,
            completed,
            total: GAME_ASSETS.length,
            version: VERSION,
          });
        progress("downloading");
        const results = await Promise.allSettled(
          Array.from({ length: 4 }, async () => {
            while (!failed && next < GAME_ASSETS.length) {
              const asset = GAME_ASSETS[next++];
              try {
                await cacheAsset(asset, event);
                completed++;
                progress("downloading");
              } catch (error) {
                failed = true;
                throw error;
              }
            }
          }),
        );
        progress(
          results.some((result) => result.status === "rejected")
            ? "error"
            : "ready",
        );
      })(),
    );
  }
  if (event.data?.type === "ACTIVATE_UPDATE")
    event.waitUntil(self.skipWaiting());
  if (event.data?.type === "UPDATE_STATUS")
    event.ports?.[0]?.postMessage(status);
});
