import fs from "node:fs";
import { brandName } from "../public/brand.js";
const titles = {
  fa: "تاریخ طبیعی",
  en: "Natural history",
  ar: "التاريخ الطبيعي",
  tr: "Doğa tarihi",
  fr: "Histoire naturelle",
  ru: "Естественная история",
};
const descriptions = {
  fa: "کشفیات انسان‌تبارها روی کرهٔ زمین امروزی، با سن تخمینی، تصاویر و منابع علمی.",
  en: "Explore hominin fossil discoveries on present-day Earth, with estimated ages, images and scientific sources.",
  ar: "استكشف أحافير أشباه البشر على الأرض الحالية، مع أعمار تقديرية وصور ومصادر علمية.",
  tr: "Günümüz dünyasındaki hominin fosil keşiflerini tahmini yaşlar, görseller ve bilimsel kaynaklarla keşfedin.",
  fr: "Explorez les découvertes de fossiles d’homininés sur la Terre actuelle, avec âges estimés, images et sources scientifiques.",
  ru: "Исследуйте находки гоминин на современной Земле: предполагаемый возраст, изображения и научные источники.",
};
for (const [lang, title] of Object.entries(titles)) {
  const source = new URL(
    `../public/${lang}/explore/index.html`,
    import.meta.url,
  );
  let html = fs.readFileSync(source, "utf8");
  const previousTitle = html.match(/<title>(.*?)<\/title>/)[1];
  const previousDescription = html.match(
    /name="description"\s+content="([^"]+)"/,
  )[1];
  html = html.replaceAll(previousTitle, `${title} — ${brandName(lang)}`);
  html = html.replaceAll(previousDescription, descriptions[lang]);
  html = html.replace(
    'data-page="explore"',
    'data-page="explore" data-natural-history="true"',
  );
  html = html.replace(
    /<title>.*?<\/title>/,
    `<title>${title} — ${brandName(lang)}</title>`,
  );
  html = html.replace(
    /\/(en|fa|ar|tr|fr|ru)\/explore\//g,
    "/$1/natural-history/",
  );
  // Navigation to Explore must retain its destination when cloning its shell.
  html = html.replace(
    /(class="explore-link"\s+href=")[^"]+/,
    `$1./${lang}/explore/`,
  );
  html = html.replace(
    "</head>",
    '<link rel="stylesheet" href="./natural-history.css" /></head>',
  );
  const directory = new URL(
    `../public/${lang}/natural-history/`,
    import.meta.url,
  );
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(new URL("index.html", directory), html);
  const home = new URL(`../public/${lang}/index.html`, import.meta.url);
  let h = fs.readFileSync(home, "utf8");
  h = h.replace(
    /<button\b[^>]*data-preview="natural-history"[^>]*>([\s\S]*?)<\/button>/,
    `<a class="destination-action" href="./${lang}/natural-history/"><span>${title}</span><span class="destination-arrow" aria-hidden="true">←</span></a>`,
  );
  fs.writeFileSync(home, h);
}
