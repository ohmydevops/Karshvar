let errorRelease;
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
    script.dataset.errors = "true";
    script.dataset.environment = "production";
    fetch(new URL("./build-info.json", import.meta.url))
      .then((r) => r.json())
      .then((info) => {
        errorRelease = String(info.version);
        script.dataset.release = errorRelease;
        globalThis.umamiConfig = {
          ...globalThis.umamiConfig,
          release: String(info.version),
        };
      })
      .catch(() => {});
    document.head.append(script);
    return script;
  } catch {
    return null;
  }
}

export function quizContext(selection) {
  if (!selection) return {};
  return selection.startsWith("country:")
    ? { mode: "country", country: selection.slice(8) }
    : { mode: "continent", continent: selection };
}

const exploreSwitchEvents = new Map([
  ["showLabels", "explore-labels-enable"],
  ["showPopulation", "explore-population-enable"],
  ["showClock", "explore-clock-enable"],
  ["showFlags", "explore-flags-enable"],
  ["showComparison", "explore-comparison-enable"],
  ["showAntipode", "explore-antipode-enable"],
  ["highlightCountries", "explore-highlight-enable"],
  ["showSatellite", "explore-satellite-enable"],
  ["showPopulationDensity", "explore-population-density-enable"],
]);

// One delegated listener also covers controls rebuilt during continent changes.
// Capture the directly changed switch before settings handlers update related ones.
export function bindExploreSwitchAnalytics(root, track) {
  const onChange = ({ target }) => {
    const event = exploreSwitchEvents.get(target?.id);
    if (event && target.checked === true) track(event);
  };
  root.addEventListener("change", onChange, { capture: true });
  return () => root.removeEventListener("change", onChange, { capture: true });
}

const events = new Set([
  ...exploreSwitchEvents.values(),
  "play-click",
  "explore-click",
  "mode-select",
  "country-select",
  "game-start",
  "save-earth-start",
  "blog-play-click",
  "continent-select",
  "answer-submit",
  "game-complete",
  "game-restart",
  "game-change",
  "progress-reset",
  "reset-open",
  "reset-cancel",
  "language-change",
  "theme-change",
  "about-open",
]);
const fields = new Set([
  "language",
  "article",
  "continent",
  "mode",
  "country",
  "result",
  "answered",
  "total",
  "score",
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

// Handled failures need explicit reporting; never let telemetry break recovery.
export function reportError(error, stage) {
  if (!isProduction(globalThis.location)) return;
  try {
    const failure = error instanceof Error ? error : new Error(String(error));
    globalThis.umami?.captureException?.(failure, {
      tags: { stage },
      release: errorRelease,
    });
  } catch {}
}
