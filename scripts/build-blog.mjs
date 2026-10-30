import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
const data = JSON.parse(fs.readFileSync("scripts/blog-data.json", "utf8"));
const langs = ["en", "fa", "ar", "tr", "fr", "ru"];
const labels = {
  en: [
    "Blog",
    "Five historic places to discover",
    "Explore the stories behind the map, one country at a time.",
    "Play Karshvar",
    "Before you go",
    "Check official access, opening times and conservation restrictions before planning a visit. These guides introduce the history; they are not current travel itineraries.",
    "Read the UNESCO entry",
  ],
  fa: [
    "وبلاگ",
    "پنج جای تاریخی برای کشف کردن",
    "داستان‌های پشت نقشه را، هر بار در یک کشور، کشف کنید.",
    "بازی کَرشوَر",
    "پیش از رفتن",
    "پیش از برنامه‌ریزی، شرایط ورود، ساعت بازدید و محدودیت‌های حفاظتی را از منابع رسمی بررسی کنید. این راهنما معرفی تاریخی است، نه برنامه سفر به‌روز.",
    "اطلاعات بیشتر در یونسکو",
  ],
  ar: [
    "المدونة",
    "خمسة أماكن تاريخية تستحق الاكتشاف",
    "اكتشف القصص وراء الخريطة، بلداً بعد بلد.",
    "العب Karshvar",
    "قبل الزيارة",
    "تحقق من شروط الدخول والمواعيد وقيود الحماية لدى الجهات الرسمية قبل التخطيط. هذه المقالات مقدمة تاريخية وليست برامج سفر محدثة.",
    "اقرأ صفحة اليونسكو",
  ],
  tr: [
    "Blog",
    "Keşfedilecek beş tarihî yer",
    "Haritanın ardındaki hikâyeleri ülke ülke keşfedin.",
    "Karshvar oyna",
    "Gitmeden önce",
    "Plan yapmadan önce resmî giriş koşullarını, saatleri ve koruma kısıtlamalarını kontrol edin. Bu yazılar tarihî bir giriş sunar; güncel seyahat programı değildir.",
    "UNESCO kaydını oku",
  ],
  fr: [
    "Blog",
    "Cinq lieux historiques à découvrir",
    "Découvrez les histoires derrière la carte, pays après pays.",
    "Jouer à Karshvar",
    "Avant de partir",
    "Vérifiez les conditions d’accès, les horaires et les restrictions de conservation auprès des organismes officiels. Ces guides présentent le patrimoine, sans constituer des itinéraires actualisés.",
    "Lire la fiche UNESCO",
  ],
  ru: [
    "Блог",
    "Пять исторических мест для знакомства",
    "Откройте истории за картой, страна за страной.",
    "Играть в Karshvar",
    "Перед поездкой",
    "Проверьте официальные условия доступа, часы работы и ограничения охраны памятников. Эти статьи знакомят с историей и не являются актуальными маршрутами поездок.",
    "Страница ЮНЕСКО",
  ],
};
const origin = "https://ohmydevops.github.io/Karshvar/";
const esc = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;");
const native = {
  en: "English",
  fa: "فارسی",
  ar: "العربية",
  tr: "Türkçe",
  fr: "Français",
  ru: "Русский",
};
const url = (l, slug = "") => `${l}/blog/${slug ? slug + "/" : ""}`;
const titles = (r, l) => `${l === "en" ? r[3] : r[4]}: ${labels[l][1]}`;
const articles = [];
const paths = [];
function page(l, slug, title, description, body, variants, image) {
  const rel = url(l, slug),
    canonical = origin + rel;
  paths.push(rel);
  let template = fs.readFileSync(`public/${l}/sources/index.html`, "utf8");
  const metadata = `<base href="${slug ? "../../../" : "../../"}"><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>${esc(title)} — Karshvar</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${canonical}"><link rel="icon" href="./favicon.svg"><link rel="stylesheet" href="./style.css"><script src="./vendor/d3.min.js" defer></script><script src="./vendor/topojson-client.min.js" defer></script><script type="module" src="./app.js"></script>
 ${variants.map((v) => `<link rel="alternate" hreflang="${v}" href="${origin + url(v, slug)}">`).join("")}<link rel="alternate" hreflang="x-default" href="${origin + url("en", slug)}">
 <meta property="og:type" content="${slug ? "article" : "website"}"><meta property="og:site_name" content="Karshvar"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${canonical}"><meta property="og:locale" content="${{ en: "en_US", fa: "fa_IR", ar: "ar_SA", tr: "tr_TR", fr: "fr_FR", ru: "ru_RU" }[l]}"><meta property="og:image" content="${origin + image}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(title)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${origin + image}"><meta name="twitter:image:alt" content="${esc(title)}">
 <script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": slug ? "BlogPosting" : "CollectionPage", headline: title, description, inLanguage: l, url: canonical, image: origin + image, mainEntityOfPage: canonical, ...(slug ? { author: { "@type": "Organization", name: "Karshvar", url: origin }, publisher: { "@type": "Organization", name: "Karshvar", url: origin } } : {}) }).replaceAll("<", "\\u003c")}</script>`;
  template = template
    .replace(/<head>[\s\S]*?<\/head>/, `<head>${metadata}</head>`)
    .replace('data-page="sources"', 'data-page="blog"');
  template = template.replace(
    /<article class="sources-page info-page">[\s\S]*?<\/article>/,
    `<article class="blog-page info-page"><header class="blog-heading"><h1>${esc(title)}</h1>${slug ? `<p class="info-intro">${esc(description)}</p>` : ""}${slug ? `<nav class="blog-languages" aria-label="Languages">${variants.map((v) => `<a href="./${url(v, slug)}" lang="${v}" hreflang="${v}" ${v === l ? 'aria-current="page"' : ""}>${native[v]}</a>`).join("")}</nav>` : ""}</header>${body}</article>`,
  );
  fs.mkdirSync(`public/${rel}`, { recursive: true });
  fs.writeFileSync(`public/${rel}index.html`, template);
}
for (const r of data) {
  for (const l of [...new Set(["en", r[2]])]) {
    const title = titles(r, l),
      sites = r[5],
      intro = sites.map((s) => (l === "en" ? s[0] : s[1])).join(" · "),
      variants = [...new Set(["en", r[2]])];
    const body = `${sites.map((s, i) => `<section class="blog-place" id="place-${i + 1}"><span class="blog-number">${new Intl.NumberFormat(l).format(i + 1)}</span><h2>${esc(l === "en" ? s[0] : s[1])}</h2><p>${esc(l === "en" ? s[3] : s[4])}</p><a class="blog-source" href="https://whc.unesco.org/en/list/${s[2]}/">${labels[l][6]}</a></section>`).join("")}<aside class="blog-note"><h2>${labels[l][4]}</h2><p>${labels[l][5]}</p></aside><div class="blog-cta"><p>${labels[l][2]}</p><a class="primary" data-article="${r[0]}" href="./${l}/">${labels[l][3]}</a></div>`;
    const image = `social/blog-${r[0]}-${l}.png`;
    page(l, r[0], title, intro, body, variants, image);
    articles.push({
      l,
      slug: r[0],
      title,
      country: l === "en" ? r[3] : r[4],
      subtitle: labels[l][1],
      image,
    });
  }
}
for (const l of langs) {
  const choices = data.map((r) => ({ r, lang: r[2] === l ? l : "en" }));
  page(
    l,
    "",
    labels[l][0],
    labels[l][2],
    `<div class="blog-grid">${choices.map(({ r, lang }) => `<a class="blog-card" href="./${url(lang, r[0])}" hreflang="${lang}" lang="${lang}" dir="${["fa", "ar"].includes(lang) ? "rtl" : "ltr"}"><img class="blog-cover" src="./social/blog-${r[0]}-${lang}.png" width="1200" height="630" alt="" loading="lazy"><div class="blog-card-copy"><span class="blog-card-language">${native[lang]}</span><h2>${esc(titles(r, lang))}</h2><p>${esc(lang === "en" ? r[5][0][3] : r[5][0][4])}</p></div></a>`).join("")}</div>`,
    langs,
    `social/karshvar-${l}.png`,
  );
}
function walk(d) {
  return fs
    .readdirSync(d, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? walk(d + "/" + e.name) : [d + "/" + e.name],
    );
}
for (const p of walk("public").filter((p) => p.endsWith(".html"))) {
  let s = fs.readFileSync(p, "utf8");
  const l = s.match(/<html[\s\S]*?lang="([^"]+)"/)?.[1] || "en";
  if (!s.includes('class="blog-link"'))
    s = s.replace(
      /(<a class="sources-link"[^>]*>[\s\S]*?<\/a>)/,
      `<a class="blog-link" href="./${l}/blog/">${labels[l][0]}</a>$1`,
    );
  fs.writeFileSync(p, s);
}
let nav = fs.readFileSync("public/navigation.js", "utf8");
if (!nav.includes('"blog",'))
  nav = nav.replace('"sources",', '"sources",\n  "blog",');
fs.writeFileSync("public/navigation.js", nav);
let app = fs.readFileSync("public/app.js", "utf8");
if (!app.includes('page !== "blog"'))
  app = app.replace(
    "  document.title =\n",
    '  if (page !== "blog") document.title =\n',
  );
fs.writeFileSync("public/app.js", app);
let sitemap = fs
  .readFileSync("public/sitemap.xml", "utf8")
  .replace(/\s*<url>\s*<loc>[^<]*\/blog\/[^<]*<\/loc>[\s\S]*?<\/url>/g, "");
sitemap = sitemap.replace(
  "</urlset>",
  paths.map((p) => `<url><loc>${origin + p}</loc></url>`).join("\n") +
    "\n</urlset>",
);
fs.writeFileSync("public/sitemap.xml", sitemap);
fs.writeFileSync("scripts/blog-images.json", JSON.stringify(articles, null, 2));
console.log(`Built ${articles.length} articles and ${langs.length} indexes`);

await import("./build-seo.mjs");
