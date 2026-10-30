import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const articles = JSON.parse(fs.readFileSync("scripts/blog-images.json"));
test("all 18 blog articles have five places, valid local links, SEO and unique sharing images", () => {
  assert.equal(articles.length, 18);
  const images = new Set();
  for (const a of articles) {
    const relative = `${a.l}/blog/${a.slug}/`;
    const html = fs.readFileSync(`public/${relative}index.html`, "utf8");
    assert.equal((html.match(/class="blog-place"/g) || []).length, 5);
    const schema = JSON.parse(
      html.match(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
      )[1],
    );
    assert.equal(
      schema.url,
      `https://ohmydevops.github.io/Karshvar/${relative}`,
    );
    assert.equal(schema["@type"], "BlogPosting");
    assert.equal(schema.inLanguage, a.l);
    assert.match(
      html,
      new RegExp(`class="blog-cta"[\\s\\S]*?href="\\./${a.l}/"`),
    );
    assert(!html.includes("country%3A"));
    const png = fs.readFileSync("public/" + a.image);
    assert.equal(png.readUInt32BE(16), 1200);
    assert.equal(png.readUInt32BE(20), 630);
    images.add(a.image);
    const base = new URL(html.match(/<base href="([^"]+)"/)[1], schema.url);
    for (const match of html.matchAll(
      /<(?:a|link|script|img)\b[^>]*?\b(?:href|src)="([^"]+)"/g,
    )) {
      const u = new URL(match[1], base);
      if (u.origin !== base.origin) continue;
      assert(u.pathname.startsWith("/Karshvar/"));
      assert(
        fs.existsSync("public/" + decodeURIComponent(u.pathname.slice(10))),
        u.href,
      );
      if (u.hash) assert.equal(u.pathname, new URL(schema.url).pathname);
    }
  }
  assert.equal(images.size, articles.length);
});
