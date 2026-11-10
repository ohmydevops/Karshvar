import test from "node:test";
import assert from "node:assert/strict";
import {
  bindExploreSwitchAnalytics,
  createAnalytics,
} from "../public/analytics.js";

function fixture() {
  const root = new EventTarget();
  const sent = [];
  const analytics = createAnalytics({
    enabled: true,
    getTracker: () => ({ track: (...args) => sent.push(args) }),
  });
  const cleanup = bindExploreSwitchAnalytics(root, (event) =>
    analytics.track(event, { language: "fa" }),
  );
  const change = (id, checked) => {
    const event = new Event("change");
    Object.defineProperty(event, "target", { value: { id, checked } });
    root.dispatchEvent(event);
  };
  return { root, sent, cleanup, change };
}

test("all nine Explore switches send their activation through the analytics allowlist", () => {
  const f = fixture();
  const expected = [
    ["showLabels", "explore-labels-enable"],
    ["showPopulation", "explore-population-enable"],
    ["showClock", "explore-clock-enable"],
    ["showFlags", "explore-flags-enable"],
    ["showComparison", "explore-comparison-enable"],
    ["showAntipode", "explore-antipode-enable"],
    ["highlightCountries", "explore-highlight-enable"],
    ["showSatellite", "explore-satellite-enable"],
    ["showPopulationDensity", "explore-population-density-enable"],
  ];
  for (const [id] of expected) f.change(id, true);
  assert.deepEqual(
    f.sent,
    expected.map(([, event]) => [event, { language: "fa" }]),
  );
});

test("restored preferences, disable actions and unrelated controls are not activations", () => {
  const f = fixture();
  assert.deepEqual(f.sent, []);
  f.change("showAntipode", false);
  f.change("theme", true);
  f.change("answer", true);
  assert.deepEqual(f.sent, []);
  f.change("showAntipode", true);
  f.change("showAntipode", false);
  // A newly rebuilt control with the same ID is handled by the original listener.
  f.change("showAntipode", true);
  assert.equal(f.sent.length, 2);
  f.cleanup();
  f.change("showAntipode", true);
  assert.equal(f.sent.length, 2);
});
