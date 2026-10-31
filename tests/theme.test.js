import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

function pages(dir = "public") {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory()
      ? pages(file)
      : file.endsWith(".html")
        ? [file]
        : [];
  });
}

test("every styled page restores theme before styles and body, without app dependencies", () => {
  for (const file of pages()) {
    const html = fs.readFileSync(file, "utf8");
    if (!html.includes('href="./style.css"')) continue;
    const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].find(
      (match) => match[1].includes("document.documentElement.dataset.theme"),
    );
    assert.ok(script, file);
    assert.ok(script.index < html.indexOf('<link rel="stylesheet"'), file);
    assert.ok(script.index < html.indexOf("<body"), file);
    for (const saved of ["dark", "light", null, "invalid", "blocked"]) {
      const root = { dataset: {} };
      let color;
      vm.runInNewContext(script[1], {
        document: {
          documentElement: root,
          querySelector: () => ({
            setAttribute: (_name, value) => {
              color = value;
            },
          }),
        },
        localStorage: {
          getItem: () => {
            if (saved === "blocked") throw new Error("Storage unavailable");
            return saved;
          },
        },
      });
      assert.equal(
        root.dataset.theme,
        saved === "dark" ? "dark" : "light",
        file,
      );
      assert.equal(color, saved === "dark" ? "#0d1528" : "#f7f9ff", file);
    }
  }
});
