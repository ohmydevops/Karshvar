import { bindCountrySuggestions } from "./suggestions.js";
import { countryAliases, localizedCountryAliases } from "./country-aliases.js";
import { pageCopy, pagePath } from "./navigation.js";
import { bindGlobeGestures } from "./gestures.js";
import {
  createAnalytics,
  isProduction,
  loadProductionAnalytics,
} from "./analytics.js";
import { resetCopy } from "./reset.js";
import { populationLabel } from "./population.js";
import { aboutCopy, seoCopy } from "./about.js";
import {
  continents,
  labels,
  continentFor,
  restoreSession,
  createSession,
} from "./continents.js";
import { matches, formatNumber, formatRatio } from "./logic.js";
const keys = [
  "center",
  "question",
  "label",
  "check",
  "next",
  "skip",
  "credits",
  "correct",
  "incorrect",
  "complete",
  "again",
  "country",
  "score",
  "loading",
  "error",
  "placeholder",
  "globe",
  "theme",
  "zoomIn",
  "zoomOut",
  "storage",
];
const copy = {
  en: [
    "Recenter",
    "Which country is this?",
    "Country name",
    "Check answer",
    "Next country →",
    "I don’t know — reveal answer",
    "Map data: Natural Earth",
    "That’s right!",
    "Not quite. The correct answer is",
    "You explored every country!",
    "Play again",
    "Country",
    "Correct",
    "Loading the world…",
    "Could not load the map. Please reload to try again.",
    "Type the country name in English…",
    "Interactive globe. Use arrow keys to rotate; plus and minus to zoom.",
    "Switch theme",
    "Zoom in",
    "Zoom out",
    "Progress cannot be saved in this browser.",
  ],
  fa: [
    "برگشت به کشور",
    "این کدوم کشوره؟",
    "اسم کشور",
    "بررسی جواب",
    "کشور بعدی ←",
    "نمی‌دونم — جواب رو نشون بده",
    "داده‌های نقشه: Natural Earth",
    "درسته!",
    "این نبود. جواب درست:",
    "همهٔ کشورها رو دیدی!",
    "دوباره بازی کن",
    "کشور",
    "درست",
    "داریم دنیا رو آماده می‌کنیم…",
    "نقشه بارگیری نشد. صفحه رو دوباره باز کن.",
    "اسم کشور رو به فارسی بنویس…",
    "کرهٔ تعاملی؛ با کلیدهای جهت بچرخان و با مثبت و منفی بزرگ‌نمایی کن.",
    "تغییر ظاهر",
    "بزرگ‌نمایی",
    "کوچک‌نمایی",
    "پیشرفتت توی این مرورگر ذخیره نمی‌شه.",
  ],
  ar: [
    "إعادة التوسيط",
    "ما هذا البلد؟",
    "اسم البلد",
    "تحقق من الإجابة",
    "البلد التالي ←",
    "لا أعرف — أظهر الإجابة",
    "بيانات الخريطة: Natural Earth",
    "إجابة صحيحة!",
    "ليست صحيحة. الإجابة الصحيحة هي",
    "لقد استكشفت كل البلدان!",
    "العب مجددًا",
    "البلد",
    "صحيح",
    "جارٍ تحميل العالم…",
    "تعذر تحميل الخريطة. أعد تحميل الصفحة.",
    "اكتب اسم البلد بالعربية…",
    "كرة أرضية تفاعلية. استخدم الأسهم للتدوير وزري الجمع والطرح للتكبير.",
    "تغيير المظهر",
    "تكبير",
    "تصغير",
    "لا يمكن حفظ التقدم في هذا المتصفح.",
  ],
  tr: [
    "Ortala",
    "Bu hangi ülke?",
    "Ülke adı",
    "Yanıtı kontrol et",
    "Sonraki ülke →",
    "Bilmiyorum — yanıtı göster",
    "Harita verileri: Natural Earth",
    "Doğru!",
    "Tam değil. Doğru yanıt",
    "Tüm ülkeleri keşfettin!",
    "Tekrar oyna",
    "Ülke",
    "Doğru",
    "Dünya yükleniyor…",
    "Harita yüklenemedi. Sayfayı yenile.",
    "Ülkenin adını Türkçe yaz…",
    "Etkileşimli küre. Döndürmek için okları, yakınlaştırmak için artı ve eksiyi kullan.",
    "Temayı değiştir",
    "Yakınlaştır",
    "Uzaklaştır",
    "İlerleme bu tarayıcıda kaydedilemiyor.",
  ],
  fr: [
    "Recentrer",
    "Quel est ce pays ?",
    "Nom du pays",
    "Vérifier",
    "Pays suivant →",
    "Je ne sais pas — révéler",
    "Carte : Natural Earth",
    "Bonne réponse !",
    "Pas tout à fait. La bonne réponse est",
    "Vous avez exploré tous les pays !",
    "Rejouer",
    "Pays",
    "Correct",
    "Chargement du monde…",
    "Impossible de charger la carte. Rechargez la page.",
    "Écrivez le nom du pays en français…",
    "Globe interactif. Flèches pour tourner, plus et moins pour zoomer.",
    "Changer le thème",
    "Zoom avant",
    "Zoom arrière",
    "Impossible de sauvegarder dans ce navigateur.",
  ],
  ru: [
    "По центру",
    "Что это за страна?",
    "Название страны",
    "Проверить",
    "Следующая страна →",
    "Не знаю — показать ответ",
    "Данные карты: Natural Earth",
    "Верно!",
    "Не совсем. Правильный ответ:",
    "Вы исследовали все страны!",
    "Играть снова",
    "Страна",
    "Верно",
    "Загружаем мир…",
    "Не удалось загрузить карту. Обновите страницу.",
    "Напишите название страны по-русски…",
    "Интерактивный глобус. Стрелки вращают, плюс и минус меняют масштаб.",
    "Сменить тему",
    "Приблизить",
    "Отдалить",
    "Не удалось сохранить прогресс в браузере.",
  ],
};
const $ = (id) => document.getElementById(id);
const page = document.documentElement.dataset.page || "home";
const routeContinent = new URLSearchParams(location.search).get("continent");
let lang = "en",
  state,
  sessions = {},
  selected = null,
  legacy,
  features = [],
  names = [],
  current,
  zoom = 1,
  rotation = [0, -20, 0],
  animation,
  pendingDraw,
  storage = true;
try {
  lang =
    document.documentElement.dataset.locale ||
    localStorage.getItem("atlas-language") ||
    "en";
  if (!copy[lang]) lang = "en";
  legacy = JSON.parse(localStorage.getItem("atlas-progress"));
  sessions = JSON.parse(localStorage.getItem("atlas-continents")) || {};
  document.body.classList.toggle(
    "light",
    localStorage.getItem("atlas-theme") !== "dark",
  );
} catch {
  storage = false;
}
const analytics = createAnalytics({
  enabled: isProduction(location),
});
loadProductionAnalytics(document, location)?.addEventListener(
  "load",
  analytics.flush,
);
function track(event, data = {}) {
  analytics.track(event, {
    language: lang,
    ...(selected ? { continent: selected } : {}),
    ...data,
  });
}
const t = (key) => copy[lang][keys.indexOf(key)];
const number = (value) => formatNumber(value, lang);
const ratio = (answered, total) => formatRatio(answered, total, lang);
const navigate = (target, continent) =>
  location.assign(new URL(pagePath(lang, target, continent), document.baseURI));
// Refresh stale game pages when another tab answers or resets progress.
window.addEventListener("storage", (event) => {
  if (event.key === "atlas-continents" || event.key === null) location.reload();
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) location.reload();
});
function save(replaceProgress = false) {
  try {
    if (selected && state) sessions[selected] = state;
    if (!replaceProgress) {
      const latest = JSON.parse(localStorage.getItem("atlas-continents")) || {};
      for (const continent of continents) {
        if (!latest[continent]) continue;
        sessions[continent] = features.length
          ? restoreSession(
              idsFor(continent),
              sessions[continent],
              latest[continent],
            )
          : latest[continent];
      }
      if (selected) state = sessions[selected];
    }
    localStorage.setItem("atlas-continents", JSON.stringify(sessions));
    localStorage.setItem("atlas-language", lang);
    localStorage.setItem(
      "atlas-theme",
      document.body.classList.contains("light") ? "light" : "dark",
    );
  } catch {
    storage = false;
    document.querySelector(".session-note").textContent = t("storage");
    document.querySelector(".session-note").hidden = storage;
  }
}
function name(f) {
  const data = names.find((n) => n.ccn3 === f.id);
  try {
    return data
      ? new Intl.DisplayNames([lang], { type: "region" }).of(data.cca2)
      : f.properties.name;
  } catch {
    return f.properties.name;
  }
}
function aliases(f) {
  return countryAliases(
    names.find((n) => n.ccn3 === f.id),
    f.properties.name,
  );
}

let suggestionCacheKey = "",
  suggestionCandidates = [];
const countrySuggestions = bindCountrySuggestions(
  $("answer"),
  $("countrySuggestions"),
  () => {
    const key = lang + ":" + selected;
    if (key !== suggestionCacheKey) {
      suggestionCacheKey = key;
      const ids = idsFor(selected);
      suggestionCandidates = features
        .filter((f) => ids.includes(f.id))
        .map((f) => ({
          id: f.id,
          label: name(f),
          aliases: localizedCountryAliases(
            names.find((n) => n.ccn3 === f.id),
            lang,
          ),
        }));
    }
    return suggestionCandidates;
  },
  () => lang,
  () => answer(),
);

const svg = d3.select("#globe").attr("viewBox", "0 0 600 530");
const defs = svg.append("defs");
const glow = defs.append("radialGradient").attr("id", "ocean");
glow.append("stop").attr("offset", "0%").attr("stop-color", "#366194");
glow.append("stop").attr("offset", "100%").attr("stop-color", "#10243f");
const shade = defs
  .append("radialGradient")
  .attr("id", "shade")
  .attr("cx", "35%")
  .attr("cy", "30%")
  .attr("r", "72%");
shade
  .append("stop")
  .attr("offset", "45%")
  .attr("stop-color", "#000")
  .attr("stop-opacity", 0);
shade
  .append("stop")
  .attr("offset", "100%")
  .attr("stop-color", "#000")
  .attr("stop-opacity", 0.5);
const projection = d3.geoOrthographic().translate([300, 267]).clipAngle(90);
// A tenth of a viewBox unit is below a screen pixel at normal display sizes.
// Avoid serializing three decimal places for every coastline point each frame.
const path = d3.geoPath(projection).digits(1);
const sphere = svg
  .append("path")
  .datum({ type: "Sphere" })
  .attr("fill", "url(#ocean)")
  .attr("stroke", "#7b9bce")
  .attr("stroke-opacity", 0.35);
const grid = svg
  .append("path")
  .datum(d3.geoGraticule10())
  .attr("fill", "none")
  .attr("stroke", "#a2c5ff")
  .attr("stroke-opacity", 0.08)
  .attr("stroke-width", 0.6);
const land = svg.append("g");
const shadow = svg
  .append("path")
  .datum({ type: "Sphere" })
  .attr("fill", "url(#shade)")
  .attr("pointer-events", "none");
const countryLabels = svg
  .append("g")
  .attr("class", "country-labels")
  .attr("pointer-events", "none");
const marker = svg
  .append("circle")
  .attr("r", 14)
  .attr("fill", "none")
  .attr("stroke", "#ffbd4a")
  .attr("stroke-width", 3)
  .attr("pointer-events", "none");
const geography = new WeakMap();
function countryGeometry(f) {
  if (geography.has(f)) return geography.get(f);
  let geometry = f.geometry;
  if (geometry.type === "MultiPolygon") {
    const polys = geometry.coordinates.map((c) => ({
      type: "Polygon",
      coordinates: c,
    }));
    geometry = polys
      .map((polygon) => ({ polygon, area: d3.geoArea(polygon) }))
      .sort((a, b) => b.area - a.area)[0].polygon;
  }
  const result = {
    geometry,
    point: d3.geoCentroid(geometry),
    area: d3.geoArea(f),
  };
  geography.set(f, result);
  return result;
}
function focusGeometry(f) {
  return countryGeometry(f).geometry;
}
function focusPoint(f) {
  return countryGeometry(f).point;
}
// Measure labels together, only when their content or font changes. Reading
// text length between SVG writes forces a synchronous layout for every label.
let labelWidths = new WeakMap();
let labelsNeedMeasurement = true;
let labelOrderCurrent;
function measureLabels() {
  if (!labelsNeedMeasurement) return;
  const texts = countryLabels.selectAll("text");
  texts.attr("display", null).style("font-size", "10px");
  texts.each(function () {
    labelWidths.set(this, this.getComputedTextLength() / 10);
  });
  drawnLabelSize = undefined;
  labelsNeedMeasurement = false;
}
document.fonts?.ready.then(() => {
  labelsNeedMeasurement = true;
  queueDraw();
});
function queueDraw() {
  if (!pendingDraw)
    pendingDraw = requestAnimationFrame(() => {
      pendingDraw = null;
      draw();
    });
}
window.addEventListener("resize", queueDraw);
let drawnZoom;
let drawnLabelSize;
let drawnLabelScale;
function draw() {
  // Read layout before changing paths or label attributes.
  const mapScale = $("globe").getScreenCTM()?.a || 1;
  measureLabels();
  projection.rotate(rotation).scale(220 * zoom);
  // The circular ocean and shading do not change when the Earth rotates.
  if (drawnZoom !== zoom) {
    const outline = path({ type: "Sphere" });
    sphere.attr("d", outline);
    shadow.attr("d", outline);
    drawnZoom = zoom;
  }
  grid.attr("d", path);
  land
    .selectAll("path")
    .attr("d", path)
    .attr("fill", (f) => (f.id === current?.id ? "#ffbd4a" : "var(--land)"));
  const labelSize = Math.max(9, Math.min(14, 8 + zoom * 1.5));
  const occupied = [];
  const viewCenter = projection.invert([300, 267]);
  const texts = countryLabels.selectAll("text");
  if (labelOrderCurrent !== current) {
    texts.sort(
      (a, b) =>
        (b.id === current?.id) - (a.id === current?.id) ||
        countryGeometry(b).area - countryGeometry(a).area,
    );
    labelOrderCurrent = current;
  }
  if (drawnLabelSize !== labelSize || drawnLabelScale !== mapScale) {
    texts
      .style("font-size", labelSize / mapScale + "px")
      .style("stroke-width", 2 / mapScale + "px");
    drawnLabelSize = labelSize;
    drawnLabelScale = mapScale;
  }
  countryLabels.selectAll("text").attr("display", function (f) {
    const point = focusPoint(f);
    const p = projection(point);
    if (
      d3.geoDistance(point, viewCenter) >= Math.PI / 2 ||
      p[0] < 0 ||
      p[0] > 600 ||
      p[1] < 0 ||
      p[1] > 530
    )
      return "none";
    const width = (labelWidths.get(this) * labelSize + 8) / mapScale,
      height = (labelSize + 6) / mapScale;
    const box = [
      p[0] - width / 2,
      p[1] - height / 2,
      p[0] + width / 2,
      p[1] + height / 2,
    ];
    if (
      occupied.some(
        (b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1],
      )
    )
      return "none";
    occupied.push(box);
    this.setAttribute("transform", "translate(" + p + ")");
    return null;
  });
  if (current) {
    const point = focusPoint(current),
      p = projection(point);
    marker
      .attr("cx", p[0])
      .attr("cy", p[1])
      .attr(
        "display",
        countryGeometry(current).area < 0.00015 &&
          d3.geoDistance(point, viewCenter) < Math.PI / 2
          ? null
          : "none",
      );
  } else marker.attr("display", "none");
}
function center() {
  if (page === "explore") {
    openExplore(selected);
    return;
  }
  if (!current) return;
  cancelAnimationFrame(animation);
  const point = focusPoint(current),
    target = [-point[0], -point[1], 0];
  const start = [...rotation],
    startZoom = zoom;
  const fitting = d3
    .geoOrthographic()
    .translate([300, 267])
    .rotate(target)
    .scale(220);
  const bounds = d3.geoPath(fitting).bounds(focusGeometry(current));
  const extent = Math.max(
    bounds[1][0] - bounds[0][0],
    bounds[1][1] - bounds[0][1],
  );
  const targetZoom = Math.max(1.15, Math.min(12, 290 / Math.max(extent, 1)));
  const dx = ((((target[0] - start[0]) % 360) + 540) % 360) - 180;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    rotation = target;
    zoom = targetZoom;
    draw();
    return;
  }
  const began = performance.now();
  function step(now) {
    const elapsed = now - began;
    if (elapsed < 300) {
      zoom = startZoom + (0.85 - startZoom) * d3.easeCubicInOut(elapsed / 300);
    } else if (elapsed < 1000) {
      const e = d3.easeCubicInOut((elapsed - 300) / 700);
      zoom = 0.85;
      rotation = [start[0] + dx * e, start[1] + (target[1] - start[1]) * e, 0];
    } else {
      const e = d3.easeCubicInOut(Math.min(1, (elapsed - 1000) / 600));
      rotation = target;
      zoom = 0.85 + (targetZoom - 0.85) * e;
    }
    draw();
    if (elapsed < 1600) animation = requestAnimationFrame(step);
  }
  animation = requestAnimationFrame(step);
}
bindGlobeGestures($("globe"), {
  onStart: () => cancelAnimationFrame(animation),
  onRotate: (dx, dy) => {
    const bounds = $("globe").getBoundingClientRect();
    const viewScale = Math.min(bounds.width / 600, bounds.height / 530) || 1;
    rotation[0] += (dx * 0.3) / (zoom * viewScale);
    rotation[1] = Math.max(
      -89,
      Math.min(89, rotation[1] - (dy * 0.3) / (zoom * viewScale)),
    );
    queueDraw();
  },
  onZoom: scale,
  onEnd: (input) => track("map-interaction", { input }),
});
function scale(amount) {
  cancelAnimationFrame(animation);
  zoom = Math.max(0.8, Math.min(12, zoom * amount));
  queueDraw();
}
svg
  .on(
    "wheel",
    (e) => {
      e.preventDefault();
      scale(e.deltaY > 0 ? 0.9 : 1.1);
    },
    { passive: false },
  )
  .on("keydown", (e) => {
    if (
      [
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "+",
        "-",
        "=",
      ].includes(e.key)
    ) {
      e.preventDefault();
      cancelAnimationFrame(animation);
      if (e.key === "ArrowLeft") rotation[0] -= 8;
      if (e.key === "ArrowRight") rotation[0] += 8;
      if (e.key === "ArrowUp") rotation[1] = Math.min(89, rotation[1] + 8);
      if (e.key === "ArrowDown") rotation[1] = Math.max(-89, rotation[1] - 8);
      if (["+", "="].includes(e.key)) scale(1.2);
      if (e.key === "-") scale(1 / 1.2);
      draw();
    }
  });
function updateThemeLabel() {
  const light = document.body.classList.contains("light");
  const labels = {
    en: ["Dark mode", "Light mode"],
    fa: ["حالت شب", "حالت روز"],
    ar: ["الوضع الليلي", "الوضع النهاري"],
    tr: ["Karanlık mod", "Aydınlık mod"],
    fr: ["Mode sombre", "Mode clair"],
    ru: ["Тёмная тема", "Светлая тема"],
  };
  const label = labels[lang][light ? 0 : 1];
  $("theme").querySelector("[data-text]").textContent = label;
  $("theme").querySelector("[aria-hidden]").textContent = light ? "☾" : "☀";
  $("theme").setAttribute("aria-label", label);
}
function localize() {
  const reset = resetCopy[lang];
  $("resetOpen").setAttribute("aria-label", reset[0]);
  $("resetOpen").title = reset[0];
  $("resetMenuLabel").textContent = reset[0];
  ["resetTitle", "resetBody", "resetCancel", "resetConfirm"].forEach(
    (id, i) => ($(id).textContent = reset[i + 1]),
  );
  document.documentElement.lang = lang;
  document.documentElement.dir = ["fa", "ar"].includes(lang) ? "rtl" : "ltr";
  $("languageLabel").textContent = lang.toUpperCase();
  const languageName = {
    en: "Language",
    fa: "زبان",
    ar: "اللغة",
    tr: "Dil",
    fr: "Langue",
    ru: "Язык",
  }[lang];
  $("language").setAttribute("aria-label", languageName);
  $("languageMenuLabel").textContent = languageName;
  document
    .querySelector(".language-options")
    .setAttribute("aria-label", languageName);
  document.querySelectorAll("[data-language]").forEach((link) => {
    if (link.dataset.language === lang)
      link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  document
    .querySelectorAll("[data-text]")
    .forEach((el) => (el.textContent = t(el.dataset.text)));
  $("answer").placeholder = t("placeholder");
  $("countrySuggestions").setAttribute("aria-label", t("label"));
  $("center").title = t("center");
  for (const id of ["globe", "theme", "zoomIn", "zoomOut", "center"])
    $(id).setAttribute("aria-label", t(id));
  document.title =
    page === "home"
      ? seoCopy[lang][0]
      : `${page === "about" ? aboutCopy[lang][0] : pageCopy[lang][page]} — Karshvar`;
  document.querySelector(".brand").href = pagePath(lang);
  document.querySelector(".brand").textContent =
    lang === "fa" ? "کَرشوَر" : "Karshvar";
  $("startGame").textContent = pageCopy[lang].start;
  $("startGame").href = pagePath(lang, "continents");
  $("welcomeTitle").textContent = pageCopy[lang].homeTitle;
  $("welcomeDescription").textContent = pageCopy[lang].homeDescription;
  $("aboutOpen").href = pagePath(lang, "about");
  $("footerHome").textContent = pageCopy[lang].home;
  $("footerHome").href = pagePath(lang);
  document.querySelectorAll(".site-menu a").forEach((link) => {
    const active = new URL(link.href).pathname === location.pathname;
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  $("resultsTitle").textContent = pageCopy[lang].results;
  $("restartContinent").textContent = labels[lang][5];
  $("chooseAgain").textContent = pageCopy[lang].again;
  $("chooseAgain").href = pagePath(lang, "continents");
  document
    .querySelectorAll("[data-language]")
    .forEach(
      (link) =>
        (link.href = pagePath(link.dataset.language, page, routeContinent)),
    );
  const about = aboutCopy[lang];
  ["aboutOpen", "aboutTitle"].forEach((id) => ($(id).textContent = about[0]));
  $("aboutBody").replaceChildren(
    ...about[1].split("\n\n").map((text) => {
      const p = document.createElement("p");
      p.textContent = text;
      return p;
    }),
  );
  $("aboutSource").textContent = about[2];
  $("aboutSource").href =
    lang === "fa"
      ? "https://fa.wikipedia.org/wiki/%DA%A9%D8%A7%D8%B1%D8%B4%D9%88%D8%B1"
      : "https://en.wikipedia.org/wiki/Karshvar";

  if (!storage)
    document.querySelector(".session-note").textContent = t("storage");
  document.querySelector(".session-note").hidden = storage;
  document.querySelector(".intro h1").textContent = labels[lang][1];
  document.querySelector(".intro p").textContent = labels[lang][2];
  $("chooseTitle").textContent = pageCopy[lang].continents;
  $("changeContinent").textContent = labels[lang][3];
  renderContinents();
  if (state && features.length) render();
  updateThemeLabel();
}
function idsFor(continent) {
  return features
    .filter(
      (f) => continentFor(names.find((n) => n.ccn3 === f.id)) === continent,
    )
    .map((f) => f.id);
}
function prepareContinentImages(root) {
  root.querySelectorAll(".continent-art").forEach((image) => {
    if (image.dataset.loadingBound) return;
    image.dataset.loadingBound = "true";
    const finish = () => {
      image.closest(".continent-card").classList.add("image-ready");
      if (!image.naturalWidth) image.hidden = true;
    };
    if (image.complete) finish();
    else {
      image.addEventListener("load", finish, { once: true });
      image.addEventListener("error", finish, { once: true });
    }
  });
}
function renderContinents() {
  if (!features.length) {
    prepareContinentImages($("continentChoices"));
    return;
  }
  $("continentChoices").setAttribute("aria-busy", "false");
  $("continentChoices").replaceChildren();
  $("selectionStatus").textContent = "";
  for (const [index, continent] of continents.entries()) {
    const session = sessions[continent];
    const button = document.createElement("a");
    button.className = "continent-card";
    const title = document.createElement("strong");
    title.textContent = labels[lang][7 + index];
    const count = document.createElement("span");
    count.textContent =
      ratio(session.answers.length, session.order.length) +
      " · " +
      labels[lang][6];
    const art = document.createElement("img");
    art.src = new URL(
      "./art/" + continent.toLowerCase().replaceAll(" ", "-") + ".svg",
      import.meta.url,
    ).href;
    art.alt = "";
    art.className = "continent-art";
    const badge = document.createElement("span");
    badge.className = "continent-number";
    badge.textContent = number(index + 1).padStart(
      lang === "fa" ? 1 : 2,
      lang === "fa" ? "۰" : "0",
    );
    badge.setAttribute("aria-hidden", "true");
    const imagePlaceholder = document.createElement("span");
    imagePlaceholder.className = "continent-art-placeholder";
    imagePlaceholder.setAttribute("aria-hidden", "true");
    button.append(imagePlaceholder, art, badge, title, count);
    button.href = pagePath(lang, "play", continent);
    button.addEventListener("click", () => {
      track("continent-select", {
        continent,
        answered: session.answers.length,
        total: session.order.length,
      });
      save();
    });
    $("continentChoices").append(button);
    prepareContinentImages(button);
  }
}
function openExplore(continent = "All") {
  selected = continent;
  current = null;
  const exploreName = (f) =>
    $("showPopulation").checked
      ? populationLabel(name(f), f.id, lang)
      : name(f);
  $("showPopulation").onchange = () => {
    countryLabels.selectAll("text").text(exploreName);
    land.selectAll("path").attr("aria-label", exploreName);
    labelsNeedMeasurement = true;
    queueDraw();
  };

  const countries = features.filter((f) =>
    (continent === "All"
      ? continents.flatMap(idsFor)
      : idsFor(continent)
    ).includes(f.id),
  );
  $("gameSection").hidden = false;
  document.querySelector(".answer-panel").hidden = true;

  const centers = {
    All: [20, 15],
    Africa: [20, 2],
    Asia: [90, 30],
    Europe: [20, 52],
    "North America": [-100, 35],
    "South America": [-60, -20],
    Oceania: [155, -22],
  };
  const point = centers[continent];
  rotation = [-point[0], -point[1], 0];
  zoom = continent === "All" ? 1 : 1.5;
  land
    .selectAll("path")
    .data(countries, (f) => f.id)
    .join("path")
    .attr("stroke", "var(--ocean)")
    .attr("stroke-width", 0.7);
  land
    .selectAll("path")
    .attr("tabindex", 0)
    .attr("role", "button")
    .attr("aria-label", exploreName)
    .on("click", (_, f) => {
      current = f;
      draw();
    })
    .on("keydown", (event, f) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        current = f;
        draw();
      }
    });
  countryLabels
    .selectAll("text")
    .data(countries, (f) => f.id)
    .join("text")
    .text(exploreName)
    .attr("text-anchor", "middle")
    .attr("dy", ".35em");
  labelsNeedMeasurement = true;
  labelOrderCurrent = undefined;
  drawnLabelSize = undefined;
  const nav = $("exploreContinents");
  nav.replaceChildren();
  ["All", ...continents].forEach((c, i) => {
    const a = document.createElement("a");
    a.href = pagePath(lang, "explore", c === "All" ? undefined : c);
    a.textContent =
      c === "All"
        ? {
            en: "All",
            fa: "همه",
            ar: "الكل",
            tr: "Tümü",
            fr: "Tous",
            ru: "Все",
          }[lang]
        : labels[lang][6 + i];
    if (c === continent) a.setAttribute("aria-current", "page");
    nav.append(a);
  });
  draw();
}
function focusAnswer() {
  if (!$("answerForm").hidden) $("answer").focus({ preventScroll: true });
}
function openGame(continent) {
  selected = continent;
  document.body.classList.add("playing");
  state = sessions[continent];
  $("answer").value = "";
  $("continentSelection").hidden = true;
  $("gameSection").hidden = false;
  $("gameNavigation").hidden = false;
  land
    .selectAll("path")
    .data(
      features.filter((f) => idsFor(selected).includes(f.id)),
      (f) => f.id,
    )
    .join("path")
    .attr("stroke", "var(--ocean)")
    .attr("stroke-width", 0.7)
    .attr("stroke-linejoin", "round");
  render();
  center();
  focusAnswer();
}
$("changeContinent").onclick = () => {
  track("continent-change");
  save();
  navigate("continents");
};
function render() {
  countrySuggestions.close();
  const record = state.answers[state.index];
  const done = state.index >= state.order.length;
  current = features.find((f) => f.id === state.order[state.index]);
  $("position").textContent =
    `${t("country")} ${ratio(Math.min(state.index + 1, state.order.length), state.order.length)}`;
  $("score").textContent =
    `${number(state.answers.filter((a) => a.correct).length)} ${t("score")}`;
  $("bar").style.width =
    `${(state.answers.length / state.order.length) * 100}%`;
  $("answerForm").hidden = done || !!record;
  $("skip").hidden = done || !!record;
  $("skip").disabled = false;
  $("answer").disabled = false;
  $("check").disabled = false;
  $("next").hidden = !done && !record;
  $("next").textContent = done ? labels[lang][5] : t("next");
  $("activeContinent").textContent =
    labels[lang][7 + continents.indexOf(selected)];
  $("feedback").hidden = !record && !done;
  $("feedback").textContent = done
    ? `${labels[lang][4]} ${number(state.answers.filter((a) => a.correct).length)} / ${number(state.order.length)}`
    : record
      ? `${t(record.correct ? "correct" : "incorrect")} ${name(current)}.`
      : "";
  document.querySelector(".question").hidden = done;
  draw();
}
function answer(skip = false) {
  if (!current || state.answers[state.index]) return;
  const value = skip ? "" : $("answer").value.trim();
  if (!skip && !value) return;
  state.answers.push({
    id: current.id,
    choice: value,
    correct: !skip && matches(value, aliases(current)),
    date: new Date().toISOString(),
  });
  const record = state.answers.at(-1);
  track("answer-submit", {
    result: skip ? "revealed" : record.correct ? "correct" : "incorrect",
    answered: state.answers.length,
    total: state.order.length,
  });
  if (state.answers.length === state.order.length)
    track("continent-complete", {
      score: state.answers.filter((a) => a.correct).length,
      total: state.order.length,
    });
  save();
  render();
  $("next").focus();
}
$("answerForm").addEventListener("submit", (e) => {
  e.preventDefault();
  answer();
});
$("skip").onclick = () => answer(true);
$("next").onclick = () => {
  if (!state.answers[state.index]) return;
  state.index++;
  $("answer").value = "";
  save();
  if (state.index >= state.order.length) {
    navigate("results", selected);
    return;
  }
  render();
  center();
  focusAnswer();
};
$("restartContinent").onclick = () => {
  track("continent-restart");
  state = createSession(idsFor(selected));
  save(true);
  navigate("play", selected);
};
$("center").onclick = () => {
  track("map-control", { action: "recenter" });
  center();
};
$("zoomIn").onclick = () => {
  track("map-control", { action: "zoom-in" });
  scale(1.25);
};
$("zoomOut").onclick = () => {
  track("map-control", { action: "zoom-out" });
  scale(0.8);
};
document.querySelectorAll("[data-language]").forEach((link) => {
  link.addEventListener("click", () => {
    track("language-change", { to: link.dataset.language });
    lang = link.dataset.language;
    save();
  });
});
document.addEventListener("pointerdown", (event) => {
  if (!$("languagePicker").contains(event.target))
    $("languagePicker").open = false;
});
$("languagePicker").addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    $("languagePicker").open = false;
    $("language").focus();
  }
});
$("resetOpen").onclick = () => {
  track("reset-open");
  $("resetDialog").returnValue = "";
  $("resetDialog").showModal();
};
$("resetDialog").addEventListener("close", () => {
  if ($("resetDialog").returnValue !== "confirm") {
    track("reset-cancel");
    return;
  }
  track("progress-reset");
  cancelAnimationFrame(animation);
  sessions = {};
  legacy = null;
  selected = null;
  state = null;
  current = null;
  try {
    localStorage.removeItem("atlas-progress");
  } catch {
    storage = false;
  }
  save(true);
  navigate("home");
});
$("startGame").onclick = () => track("game-start");
$("aboutOpen").onclick = () => {
  track("about-open");
};
$("theme").onclick = () => {
  document.body.classList.toggle("light");
  updateThemeLabel();
  track("theme-change", {
    theme: document.body.classList.contains("light") ? "light" : "dark",
  });
  save();
  draw();
};
const appMenu = $("appMenu");
let menuCloseTimer;
function closeMenu() {
  if (!appMenu.open || appMenu.classList.contains("is-closing")) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    appMenu.close();
    return;
  }
  appMenu.classList.add("is-closing");
  // Fallback if animation events are interrupted or unavailable.
  menuCloseTimer = setTimeout(() => appMenu.close(), 300);
}
$("menuOpen").onclick = () => {
  appMenu.showModal();
  $("menuOpen").setAttribute("aria-expanded", "true");
};
$("menuClose").onclick = closeMenu;
appMenu.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeMenu();
});
appMenu.addEventListener("animationend", (event) => {
  if (event.target === appMenu && event.animationName === "drawer-exit")
    appMenu.close();
});
appMenu.addEventListener("close", () => {
  clearTimeout(menuCloseTimer);
  appMenu.classList.remove("is-closing");
  $("menuOpen").setAttribute("aria-expanded", "false");
});
appMenu.addEventListener("click", (event) => {
  if (event.target !== appMenu) return;
  const bounds = appMenu.getBoundingClientRect();
  if (
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom
  )
    closeMenu();
});
localize();
$("resetOpen").disabled = false;
if (["continents", "play", "results", "explore"].includes(page)) {
  const mapLoading = $("mapLoading");
  if (mapLoading) $("mapRetry").href = location.href;
  else $("selectionStatus").textContent = t("loading");
  try {
    const responses = await Promise.all(
      [
        new URL("./data/countries.json", import.meta.url),
        new URL("./data/names.json", import.meta.url),
      ].map((url) =>
        fetch(url).then((r) => {
          if (!r.ok) throw Error(r.status);
          return r.json();
        }),
      ),
    );
    names = responses[1];
    features = topojson
      .feature(responses[0], responses[0].objects.countries)
      .features.filter((f) =>
        names.some((n) => n.ccn3 === f.id && n.independent === true),
      );
    if (!sessions || typeof sessions !== "object" || Array.isArray(sessions))
      sessions = {};
    for (const continent of continents) {
      const ids = idsFor(continent);
      sessions[continent] = restoreSession(
        ids,
        sessions[continent],
        sessions[continent] ? undefined : legacy,
      );
    }
    $("resetOpen").disabled = false;
    $("selectionStatus").textContent = "";
    if (page === "explore")
      openExplore(continents.includes(routeContinent) ? routeContinent : "All");
    else if (page === "continents") renderContinents();
    else if (!continents.includes(routeContinent))
      location.replace(new URL(pagePath(lang, "continents"), document.baseURI));
    else {
      selected = routeContinent;
      state = sessions[selected];
      // Returning to a continent starts at its first unanswered country.
      if (page === "play") state.index = state.answers.length;
      if (page === "results") {
        if (state.answers.length < state.order.length)
          location.replace(
            new URL(pagePath(lang, "play", selected), document.baseURI),
          );
        else {
          state.index = state.order.length;
          $("resultsContinent").textContent =
            labels[lang][7 + continents.indexOf(selected)];
          $("resultsScore").textContent =
            number(state.answers.filter((a) => a.correct).length) +
            " / " +
            number(state.order.length);
          $("resultsMessage").textContent = labels[lang][4];
        }
      } else if (state.index >= state.order.length)
        location.replace(
          new URL(pagePath(lang, "results", selected), document.baseURI),
        );
      else openGame(selected);
    }
    draw();
    if (mapLoading) {
      mapLoading.hidden = true;
      document.querySelector("main").setAttribute("aria-busy", "false");
    }
    save();
  } catch (error) {
    console.error(error);
    if (mapLoading) {
      mapLoading.classList.add("load-failed");
      $("mapLoadingMessage").textContent = t("error");
      $("mapLoadingMessage").hidden = false;
      $("mapRetry").hidden = false;
      document.querySelector("main").setAttribute("aria-busy", "false");
    } else $("selectionStatus").textContent = t("error");
    $("continentChoices").setAttribute("aria-busy", "false");
    $("continentChoices")
      .querySelectorAll(".skeleton-line")
      .forEach((el) => el.remove());
  }
}

if (page === "home") {
  import("./home-globe.js")
    .then(({ mountHomeGlobe }) =>
      mountHomeGlobe(document.querySelector(".welcome-art")),
    )
    .catch((error) => {
      const host = document.querySelector(".welcome-art");
      host.classList.add("globe-failed");
      const fallback = host.querySelector(".home-earth");
      if (fallback) fallback.hidden = false;
      console.warn(error);
    });
}
