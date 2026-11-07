const PREFIX = "karshvar-" + encodeURIComponent(self.registration.scope) + "-";
const CACHE = PREFIX + VERSION;
self.addEventListener("install", (event) =>
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        // Overlap network latency while bounding downloads and cache writes.
        let next = 0;
        let failed = false;
        const download = async () => {
          while (!failed && next < ASSETS.length) {
            const asset = ASSETS[next++];
            try {
              const url = new URL(asset, self.registration.scope);
              const requestUrl = new URL(url);
              if (url.pathname.endsWith(".css")) requestUrl.search = "?direct";
              const response = await fetch(requestUrl, { cache: "reload" });
              if (!response.ok)
                throw new Error("Offline download failed: " + asset);
              await cache.put(url, response);
            } catch (error) {
              failed = true;
              throw error;
            }
          }
        };
        // Settle every in-flight write before deleting an incomplete cache.
        const results = await Promise.allSettled(
          Array.from({ length: Math.min(6, ASSETS.length) }, download),
        );
        const failure = results.find((result) => result.status === "rejected");
        if (failure) throw failure.reason;
      } catch (error) {
        await caches.delete(CACHE);
        throw error;
      }
      // Wait for user approval or until all existing tabs have closed.
    })(),
  ),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      // Take control before old-cache cleanup, so slow storage cannot leave the
      // approved update dialog waiting for controllerchange.
      await self.clients.claim();
      for (const key of await caches.keys())
        if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
    })(),
  ),
);
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !url.href.startsWith(self.registration.scope)
  )
    return;
  // During local development, let Vite serve current assets rather than mixing
  // new styles with JavaScript from a previously installed offline version.
  if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return;
  // Keep the root entry point pointed at the English page, including offline.
  const scope = new URL(self.registration.scope);
  if (
    event.request.mode === "navigate" &&
    (url.pathname === scope.pathname ||
      url.pathname === new URL("index.html", scope).pathname)
  ) {
    const destination = new URL("en/", scope);
    destination.search = url.search;
    destination.hash = url.hash;
    event.respondWith(Response.redirect(destination.href, 302));
    return;
  }
  // Blog pages/images and crawler metadata always use the browser network path.
  const relativePath = url.pathname.slice(
    new URL(self.registration.scope).pathname.length,
  );
  if (/(?:^|\/)blog(?:\/|$)|^social\//i.test(relativePath)) return;
  if (
    /(?:^|\/)(?:sitemap[^/]*\.xml|robots\.txt|google[^/]*\.html|BingSiteAuth\.xml)$|\.map$/i.test(
      relativePath,
    )
  )
    return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const key = new URL(url);
      if (event.request.mode === "navigate") {
        key.search = "";
        if (key.pathname.endsWith("/")) key.pathname += "index.html";
      }
      // Queries on assets keep their identity; navigation parameters only select game state.
      const cached = await cache.match(key.href);
      if (cached) return cached;
      try {
        return await fetch(event.request);
      } catch {
        return new Response("This page is not available offline.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "ACTIVATE_UPDATE")
    event.waitUntil(self.skipWaiting());
});
