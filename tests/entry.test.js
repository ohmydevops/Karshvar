import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(
  new URL("../public/entry.js", import.meta.url),
  "utf8",
);
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
