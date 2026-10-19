const events = new Set([
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
  enabled = true,
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
