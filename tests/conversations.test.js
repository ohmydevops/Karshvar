import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { languages, phrases, readings } from "../scripts/conversation-data.mjs";

test("all 30 conversation guides have localized phrases, dialogue, links and metadata", () => {
  const sitemap = fs.readFileSync("public/sitemap.xml", "utf8");
  for (const source of languages) {
    const index = fs.readFileSync(`public/${source}/blog/index.html`, "utf8");
    for (const target of languages.filter((l) => l !== source)) {
      const relative = `${source}/blog/speak-${target}-everyday/`;
      const html = fs.readFileSync(`public/${relative}index.html`, "utf8");
      assert(index.includes(`href="./${relative}"`));
      assert(sitemap.includes(`https://karshvar.ir/${relative}`));
      assert.equal(
        (html.match(/class="conversation-phrases"/g) || []).length,
        6,
      );
      assert.equal(
        (html.match(/class="conversation-dialogue"/g) || []).length,
        6,
      );
      assert.equal(phrases[target].length, 26);
      assert.equal(readings[target].length, 26);
      for (const text of [
        ...phrases[target],
        ...phrases[source],
        ...readings[target],
      ]) {
        assert(
          html.replace(/\s+/g, " ").includes(text),
          `${relative}: ${text}`,
        );
      }
      const schema = JSON.parse(
        html.match(
          /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
        )[1],
      );
      assert.equal(schema.inLanguage, source);
      assert.equal(schema["@type"], "BlogPosting");
      const base = new URL(html.match(/<base href="([^"]+)"/)[1], schema.url);
      for (const match of html.matchAll(
        /<(?:a|link|script|img)\b[^>]*?\b(?:href|src)="([^"]+)"/g,
      )) {
        const link = new URL(match[1], base);
        if (link.origin === base.origin) {
          assert(
            fs.existsSync(
              "public/" + decodeURIComponent(link.pathname.slice(1)),
            ),
            link.href,
          );
        }
      }
    }
  }
});
