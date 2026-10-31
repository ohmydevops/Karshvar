import test from "node:test";
import assert from "node:assert/strict";
import {
  bindHighlightSwitch,
  highlightCopy,
} from "../public/explore-settings.js";
import fs from "node:fs";

test("country highlighting defaults off and persists both switch states", () => {
  let value = null;
  const storage = {
    getItem: () => value,
    setItem: (_key, next) => {
      value = next;
    },
  };
  const changes = [];
  const input = {};
  bindHighlightSwitch(
    input,
    (enabled) => changes.push(enabled),
    () => storage,
  );
  assert.equal(input.checked, false);
  input.checked = true;
  input.onchange();
  assert.equal(value, "true");
  const restored = {};
  bindHighlightSwitch(
    restored,
    () => {},
    () => storage,
  );
  assert.equal(restored.checked, true);
  input.checked = false;
  input.onchange();
  assert.equal(value, "false");
  assert.deepEqual(changes, [true, false]);
});

test("highlight switch still works when browser storage is blocked", () => {
  const input = {};
  let enabled;
  bindHighlightSwitch(
    input,
    (value) => {
      enabled = value;
    },
    () => {
      throw Error("blocked");
    },
  );
  assert.equal(input.checked, false);
  input.checked = true;
  input.onchange();
  assert.equal(enabled, true);
});

test("every language has a default-off switch alongside population", () => {
  for (const [locale, label] of Object.entries(highlightCopy)) {
    const html = fs.readFileSync(`public/${locale}/explore/index.html`, "utf8");
    assert.ok(html.includes(label));
    const input = html.match(/<input[^>]*id="highlightCountries"[^>]*>/)?.[0];
    assert.ok(input);
    assert.ok(input.includes('role="switch"'));
    assert.ok(!input.includes("checked"));
    assert.ok(
      html.indexOf('id="showPopulation"') <
        html.indexOf('id="highlightCountries"'),
    );
  }
});
