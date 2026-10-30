import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const source = app.slice(
  app.indexOf("function syncSavedProgress()"),
  app.indexOf("function save("),
);

test("other tabs and history synchronize progress without reloads or write-back", () => {
  const handlers = {};
  let saved = { Asia: { index: 0, answers: [] } };
  let renders = 0;
  const context = {
    features: [{}],
    continents: ["Asia"],
    selected: "Asia",
    page: "play",
    sessions: structuredClone(saved),
    state: saved.Asia,
    localStorage: { getItem: () => JSON.stringify(saved) },
    idsFor: () => [],
    restoreSession: (_, value) => value || { index: 0, answers: [] },
    render: () => renders++,
    draw() {},
    window: { addEventListener: (name, handler) => (handlers[name] = handler) },
  };
  vm.runInNewContext(source, context);
  handlers.pageshow({ persisted: true });
  assert.equal(renders, 0);
  saved = { Asia: { index: 1, answers: [{ id: "364" }] } };
  handlers.storage({ key: "atlas-continents" });
  assert.equal(context.state.index, 1);
  assert.equal(renders, 1);
  handlers.storage({ key: "atlas-language" });
  handlers.pageshow({ persisted: true });
  assert.equal(renders, 1);
  saved = {};
  handlers.storage({ key: null });
  assert.equal(context.state.index, 0);
  assert.equal(renders, 2);
});
