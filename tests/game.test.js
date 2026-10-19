import test from "node:test";
import assert from "node:assert/strict";
import { normalize, matches, shuffled } from "../public/logic.js";
import fs from "node:fs";
test("accepts equivalent spelling, accents, punctuation and Persian variants", () => {
  assert(matches("  Côte d’Ivoire ", ["Cote d Ivoire"]));
  assert(matches("ايـران".replace("ـ", ""), ["ایران"]));
  assert(!matches("", [""]));
  assert(!matches("Iran", ["Iraq"]));
});
test("shuffle preserves every country exactly once", () => {
  const values = Array.from({ length: 200 }, (_, i) => i);
  assert.deepEqual(
    shuffled(values).sort((a, b) => a - b),
    values,
  );
  assert.equal(new Set(shuffled(values)).size, 200);
});
test("local map and country names cover a substantial quiz", () => {
  const world = JSON.parse(fs.readFileSync("public/data/countries.json"));
  const names = JSON.parse(fs.readFileSync("public/data/names.json"));
  const ids = world.objects.countries.geometries.filter((f) =>
    names.some((n) => n.ccn3 === f.id && n.independent),
  );
  assert(ids.length >= 190);
  assert.equal(new Set(ids.map((f) => f.id)).size, ids.length);
});
import {
  continents,
  continentFor,
  createSession,
  validSession,
  labels,
} from "../public/continents.js";
test("each playable country belongs to exactly one populated continent", () => {
  const names = JSON.parse(fs.readFileSync("public/data/names.json"));
  const world = JSON.parse(fs.readFileSync("public/data/countries.json"));
  const playable = world.objects.countries.geometries
    .map((f) => names.find((n) => n.ccn3 === f.id))
    .filter((n) => n?.independent);
  assert(playable.every((n) => continents.includes(continentFor(n))));
  assert(continents.every((c) => playable.some((n) => continentFor(n) === c)));
  assert.equal(
    continentFor({ region: "Americas", subregion: "Caribbean" }),
    "North America",
  );
  assert.equal(
    continentFor({ region: "Americas", subregion: "South America" }),
    "South America",
  );
  for (const text of Object.values(labels)) assert.equal(text.length, 13);
});
test("continent sessions preserve relevant answers and exclude other continents", () => {
  const old = {
    answers: [
      { id: "1", correct: true },
      { id: "3", correct: false },
    ],
  };
  const a = createSession(["1", "2"], old),
    b = createSession(["3", "4"], old);
  assert(validSession(a, ["1", "2"]));
  assert(validSession(b, ["3", "4"]));
  assert.deepEqual(a.answers, [old.answers[0]]);
  assert.deepEqual(b.answers, [old.answers[1]]);
  assert.equal(a.index, 1);
  a.index++;
  assert.equal(b.index, 1);
  assert(!validSession(a, ["3", "4"]));
  assert(validSession(createSession(["1"], old), ["1"]));
});

test("all localized pages and assets resolve beneath the GitHub Pages project path", () => {
  const root = "https://ohmydevops.github.io/Karshvar/";
  for (const locale of ["en", "fa", "ar", "tr", "fr", "ru"]) {
    const html = fs.readFileSync(`public/${locale}/index.html`, "utf8");
    const base = new URL(
      html.match(/<base href="([^"]+)"/)[1],
      `${root}${locale}/`,
    );
    for (const match of html.matchAll(
      /<(?:a|link|script)\b[^>]*?\b(?:src|href)="([^"]+)"/g,
    )) {
      const url = new URL(match[1], base);
      if (url.origin !== new URL(root).origin) continue;
      assert(
        url.pathname.startsWith("/Karshvar/"),
        `Asset escapes project path: ${url}`,
      );
      const relative = decodeURIComponent(
        url.pathname.slice("/Karshvar/".length),
      );
      assert(
        fs.existsSync(`public/${relative}`),
        `Missing asset or page: ${relative}`,
      );
    }
    assert(html.includes(`rel="canonical" href="${root}${locale}/"`));
    assert(html.includes(`content="${root}social/karshvar.png"`));
    const schema = JSON.parse(
      html.match(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
      )[1],
    );
    assert.equal(schema.url, `${root}${locale}/`);
    assert.equal(schema.inLanguage, locale);
  }
  assert(
    fs.readFileSync("public/robots.txt", "utf8").includes(`${root}sitemap.xml`),
  );
  const sitemap = fs.readFileSync("public/sitemap.xml", "utf8");
  assert.equal((sitemap.match(/<loc>/g) || []).length, 6);
});
