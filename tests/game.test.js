import test from "node:test";
import assert from "node:assert/strict";
import {
  normalize,
  matches,
  shuffled,
  formatNumber,
  formatRatio,
} from "../public/logic.js";
import fs from "node:fs";
test("accepts equivalent spelling, accents, punctuation and Persian variants", () => {
  assert(matches("  Côte d’Ivoire ", ["Cote d Ivoire"]));
  assert(matches("ايـران", ["ایران"]));
  assert(!matches("", [""]));
  assert(!matches("Iran", ["Iraq"]));
});
test("country answers ignore case consistently, including Turkish I variants", () => {
  for (const answer of ["iraq", "Iraq", "IRAQ", "iRaQ", "ıraq", "İRAQ"]) {
    assert(matches(answer, ["Iraq"]), answer);
  }
  for (const answer of ["türkiye", "TÜRKİYE", "TÜRKıYE", "Türkiye"]) {
    assert(matches(answer, ["Türkiye"]), answer);
  }
  assert(matches("франция", ["Франция"]));
  assert(matches("ФРАНЦИЯ", ["Франция"]));
  assert(!matches("IRAN", ["Iraq"]));
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
    for (const suffix of [
      "",
      "continents/",
      "play/",
      "results/",
      "about/",
      "explore/",
    ]) {
      const html = fs.readFileSync(
        `public/${locale}/${suffix}index.html`,
        "utf8",
      );
      const base = new URL(
        html.match(/<base href="([^"]+)"/)[1],
        `${root}${locale}/${suffix}`,
      );
      for (const match of html.matchAll(
        /<(?:a|link|script|img)\b[^>]*?\b(?:src|href)="([^"]+)"/g,
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
      assert.equal(
        html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/)[1],
        `${root}${locale}/${suffix}`,
      );
      assert(html.includes(`content="${root}social/karshvar.png"`));
      assert(
        !html.includes("https://cloud.umami.is/script.js"),
        "Analytics must be gated by the production loader",
      );
      const schema = JSON.parse(
        html.match(
          /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
        )[1],
      );
      assert.equal(schema.url, `${root}${locale}/${suffix}`);
      assert.equal(schema.inLanguage, locale);
    }
  }
  assert(
    fs.readFileSync("public/robots.txt", "utf8").includes(`${root}sitemap.xml`),
  );
  const sitemap = fs.readFileSync("public/sitemap.xml", "utf8");
  assert.equal((sitemap.match(/<loc>/g) || []).length, 24);
});
import { pagePath, pageTypes, routeLanguages } from "../public/navigation.js";
test("Persian UI numbers use Persian digits without changing other languages", () => {
  assert.equal(formatNumber(1234567890, "fa"), "۱۲۳۴۵۶۷۸۹۰");
  assert.equal(formatNumber(0, "fa"), "۰");
  for (const language of ["en", "ar", "tr", "fr", "ru"])
    assert.equal(formatNumber(45, language), "45");
  assert.equal(formatRatio(1, 45, "fa"), "\u2066۱ / ۴۵\u2069");
});
test("page links retain language, page, and selected continent without hash routes", () => {
  assert.equal(pagePath("fa"), "./fa/");
  assert.equal(pagePath("fa", "continents"), "./fa/continents/");
  assert.equal(
    pagePath("en", "play", "North America"),
    "./en/play/?continent=North%20America",
  );
  assert.equal(
    pagePath("fa", "results", "Asia"),
    "./fa/results/?continent=Asia",
  );
  for (const language of routeLanguages)
    for (const page of pageTypes) {
      const path = pagePath(language, page);
      assert(!path.includes("#"));
      assert(path.startsWith("./" + language + "/"));
    }
});

test("answer normalization accepts spacing, Persian letters and Arabic marks", () => {
  assert(matches("  عربستان   سعودی  ", ["عربستان سعودی"]));
  assert(matches("پاكستان", ["پاکستان"]));
  assert(matches("المان", ["آلمان"]));
  assert(matches("آلمان", ["المان"]));
  assert(matches("إِيرَان", ["ایران"]));
  assert(matches("کره\u200cجنوبی", ["کره جنوبی"]));
});

import { countryAliases } from "../public/country-aliases.js";
test("common country aliases work across all six quiz languages", () => {
  const countries = JSON.parse(fs.readFileSync("public/data/names.json"));
  const aliases = (code) =>
    countryAliases(countries.find((c) => c.cca3 === code));
  for (const value of [
    "Hind",
    "HINDUSTAN",
    "Bharat",
    "هند",
    "هندوستان",
    "الهند",
    "Hindistan",
    "Inde",
    "Hindoustan",
    "Индия",
    "Индостан",
  ])
    assert(matches(value, aliases("IND")), value);
  for (const [code, values] of Object.entries({
    NLD: ["Holland", "هلند", "هولندا", "Hollanda", "Hollande", "Голландия"],
    MMR: ["Burma", "برمه", "بورما", "Birmanya", "Birmanie", "Бирма"],
    USA: ["USA", "آمریکا", "أمريكا", "ABD", "États-Unis", "США"],
    SWZ: [
      "Swaziland",
      "سوازیلند",
      "إسواتيني",
      "Esvatini",
      "Eswatini",
      "Эсватини",
    ],
  }))
    for (const value of values)
      assert(matches(value, aliases(code)), code + ":" + value);
  for (const [country, wrong] of [
    ["NER", "Nigeria"],
    ["NGA", "Niger"],
    ["AUS", "Austria"],
    ["AUT", "Australia"],
    ["IND", "Indonesia"],
    ["PRK", "South Korea"],
    ["KOR", "North Korea"],
  ])
    assert(
      !matches(wrong, aliases(country)),
      country + " must reject " + wrong,
    );
});

test("every playable country accepts its name in all supported languages without cross-country alias collisions", () => {
  const world = JSON.parse(fs.readFileSync("public/data/countries.json"));
  const represented = new Set(
    world.objects.countries.geometries.map((f) => f.id),
  );
  const countries = JSON.parse(
    fs.readFileSync("public/data/names.json"),
  ).filter((c) => c.independent && represented.has(c.ccn3));
  const owners = new Map();
  for (const country of countries) {
    const aliases = countryAliases(country);
    for (const language of routeLanguages) {
      const name = new Intl.DisplayNames([language], { type: "region" }).of(
        country.cca2,
      );
      assert(
        matches(name, aliases),
        country.cca3 + " must accept " + language + ": " + name,
      );
      assert(
        matches("  " + name.toUpperCase() + "  ", aliases),
        country.cca3 + " uppercase " + language,
      );
    }
    for (const alias of aliases) {
      const normalized = normalize(alias);
      assert(normalized.length > 0);
      const previous = owners.get(normalized);
      assert(
        !previous || previous === country.cca3,
        alias + " is shared by " + previous + " and " + country.cca3,
      );
      owners.set(normalized, country.cca3);
    }
  }
  assert(countries.length >= 190);
});

test("reviewed source-data mistakes cannot award an answer for the wrong country", () => {
  const countries = JSON.parse(fs.readFileSync("public/data/names.json"));
  const aliases = (code) =>
    countryAliases(countries.find((c) => c.cca3 === code));
  for (const [code, wrong] of [
    ["GIN", "پاپوآ گینه نو"],
    ["TZA", "Tádzsikisztán"],
    ["DMA", "도미니카 공화국"],
    ["LTU", "لیتوانیایی‌ها"],
  ])
    assert(!matches(wrong, aliases(code)), code + " rejects " + wrong);
  for (const [code, right] of [
    ["GIN", "گینه"],
    ["LTU", "لیتوانی"],
    ["AZE", "آذربایجان"],
    ["COM", "کومور"],
    ["COD", "کنگو کینشاسا"],
    ["COG", "کنگو برازاویل"],
    ["KNA", "St Kitts and Nevis"],
    ["JPN", "يابان"],
  ])
    assert(matches(right, aliases(code)), code + " accepts " + right);
});
