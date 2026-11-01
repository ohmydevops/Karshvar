export function isProduction(location) {
  return location?.protocol === "https:" && location.hostname === "karshvar.ir";
}
export function loadProductionAnalytics(document, location) {
  if (!isProduction(location)) return null;
  try {
    const existing = document.getElementById("umamiAnalytics");
    if (existing) return existing;
    const script = document.createElement("script");
    script.id = "umamiAnalytics";
    script.defer = true;
    script.src = "https://cloud.umami.is/script.js";
    script.dataset.websiteId = "8f92d457-8802-4230-8602-1445bc50840c";
    script.dataset.domains = "karshvar.ir";
    document.head.append(script);
    return script;
  } catch {
    return null;
  }
}

const events = new Set([
  "game-start",
  "blog-play-click",
  "continent-select",
  "answer-submit",
  "continent-complete",
  "continent-restart",
  "continent-change",
  "progress-reset",
  "reset-open",
  "reset-cancel",
  "map-interaction",
  "map-control",
  "language-change",
  "theme-change",
  "about-open",
]);
const fields = new Set([
  "language",
  "article",
  "continent",
  "result",
  "answered",
  "total",
  "score",
  "action",
  "input",
  "theme",
  "to",
]);
// Analytics must never affect gameplay or include the player's typed answer.
export function createAnalytics({
  getTracker = () => globalThis.umami,
  enabled = isProduction(globalThis.location),
} = {}) {
  const queue = [];
  function flush() {
    if (!enabled) return;
    try {
      const tracker = getTracker();
      if (typeof tracker?.track !== "function") return;
      while (queue.length) {
        const [event, data] = queue.shift();
        Promise.resolve(tracker.track(event, data)).catch(() => {});
      }
    } catch {
      queue.length = 0;
    }
  }
  function track(event, data = {}) {
    if (!enabled || !events.has(event)) return;
    const safe = Object.fromEntries(
      Object.entries(data).filter(
        ([key, value]) =>
          fields.has(key) &&
          ["string", "number", "boolean"].includes(typeof value),
      ),
    );
    if (queue.length >= 32) queue.shift();
    queue.push([event, safe]);
    flush();
  }
  return { track, flush };
}
