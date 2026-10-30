import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const origin = "https://ohmydevops.github.io/Karshvar/";
const walk = (d) =>
  fs
    .readdirSync(d, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? walk(d + "/" + e.name) : [d + "/" + e.name],
    );
test("SEO canonicals, sharing URLs, hreflang and sitemap agree for every page", () => {
  const sitemap = fs.readFileSync("public/sitemap.xml", "utf8");
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  assert.equal(new Set(urls).size, urls.length);
  for (const file of walk("public").filter(
    (p) => p.endsWith("/index.html") && p !== "public/index.html",
  )) {
    const h = fs.readFileSync(file, "utf8"),
      url = origin + file.slice(7, -10);
    assert.equal(h.match(/rel="canonical"\s+href="([^"]+)"/)[1], url);
    assert.equal(h.match(/property="og:url"\s+content="([^"]+)"/)[1], url);
    assert(h.match(/<title>[^<]+<\/title>/));
    assert(h.match(/name="description"\s+content="[^"]+"/));
    assert.equal(
      urls.includes(url),
      !/name="robots"\s+content="[^"]*noindex/.test(h),
    );
    for (const m of h.matchAll(
      /rel="alternate"\s+hreflang="([^"]+)"\s+href="([^"]+)"/g,
    )) {
      const target = "public/" + m[2].slice(origin.length) + "index.html";
      assert(fs.existsSync(target), target);
      if (m[1] !== "x-default")
        assert(
          fs.readFileSync(target, "utf8").includes(`href="${url}"`),
          "Missing return alternate: " + target,
        );
    }
  }
});
