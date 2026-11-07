import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { createAnalytics } from "../public/analytics.js";

const source = await readFile(
  new URL("../public/entry.js", import.meta.url),
  "utf8",
);
test("home entry sends both CTA click events to analytics", async () => {
  const site = await readFile(
    new URL("../public/site.js", import.meta.url),
    "utf8",
  );
  const bindings = site.slice(
    site.indexOf('$("startGame")?.addEventListener'),
    site.indexOf('$("aboutOpen")?.addEventListener'),
  );
  const start = new EventTarget();
  const explore = new EventTarget();
  const sent = [];
  const analytics = createAnalytics({
    enabled: true,
    getTracker: () => ({ track: (...args) => sent.push(args) }),
  });
  vm.runInNewContext(bindings, {
    $: () => start,
    document: { querySelectorAll: () => [explore] },
    track: (event) => analytics.track(event, { language: "fa" }),
  });
  start.dispatchEvent(new Event("click"));
  explore.dispatchEvent(new Event("click"));
  assert.deepEqual(sent, [
    ["play-click", { language: "fa" }],
    ["explore-click", { language: "fa" }],
  ]);
});
for (const page of [
  "home",
  "about",
  "sources",
  "blog",
  "history",
  "continents",
  "play",
  "results",
  "explore",
]) {
  test(`${page} loads only its entry, with map vendors ready before the game`, async () => {
    const requests = [];
    const completed = new Set();
    await vm.runInNewContext(
      `(async () => { ${source.replaceAll("import(", "load(")} })()`,
      {
        document: { documentElement: { dataset: { page } } },
        load: async (path) => {
          if (path === "./app.js") {
            assert.ok(completed.has("./vendor/d3.min.js"));
            assert.ok(completed.has("./vendor/topojson-client.min.js"));
          }
          requests.push(path);
          await Promise.resolve();
          completed.add(path);
        },
      },
    );
    assert.deepEqual(
      requests,
      ["continents", "play", "results", "explore"].includes(page)
        ? ["./vendor/d3.min.js", "./vendor/topojson-client.min.js", "./app.js"]
        : ["./site.js"],
    );
  });
}
