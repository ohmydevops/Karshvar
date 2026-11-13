import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const root = new URL("../public/", import.meta.url);
const tokens = new URL("design-tokens.css", root).href;
test("natural-history shells keep the Explore menu destination in every language", async () => {
  for (const language of ["en", "fa", "ar", "tr", "fr", "ru"]) {
    const html = await readFile(
      new URL(`${language}/natural-history/index.html`, root),
      "utf8",
    );
    const href = html.match(/class="explore-link"\s+href="([^"]+)"/)?.[1];
    assert.equal(href, `./${language}/explore/`);
  }
});
async function pages(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const url = new URL(
      entry.name + (entry.isDirectory() ? "/" : ""),
      directory,
    );
    if (entry.isDirectory()) result.push(...(await pages(url)));
    else if (entry.name.endsWith(".html")) result.push(url);
  }
  return result;
}
async function dependencies(url, seen = new Set()) {
  if (seen.has(url.href)) return seen;
  seen.add(url.href);
  const css = await readFile(url, "utf8");
  for (const match of css.matchAll(/@import\s+url\(["']([^"']+)["']\)/g))
    await dependencies(new URL(match[1], url), seen);
  return seen;
}
test("every localized styled page reaches the common design system, including standalone games", async () => {
  for (const language of ["en", "fa", "ar", "tr", "fr", "ru"]) {
    for (const page of await pages(new URL(language + "/", root))) {
      const html = await readFile(page, "utf8");
      const base = new URL(
        html.match(/<base\b[^>]*href="([^"]+)"/)?.[1] || "",
        page,
      );
      const styles = [
        ...html.matchAll(
          /<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g,
        ),
      ];
      if (!styles.length) continue;
      const reached = new Set();
      for (const [, href] of styles)
        await dependencies(new URL(href, base), reached);
      assert.ok(reached.has(tokens), `${page.pathname} bypasses shared tokens`);
    }
  }
});
