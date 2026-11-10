import { toggleComparison, compareCopy } from "./compare.js";
import { brandName } from "./brand.js";
import { revealPage } from "./page-ready.js";
import { placeMapLabel, countryFlag } from "./map-labels.js";
import { interiorLabelPoint } from "./label-anchor.js";
import { bindHighlightSwitch, bindLabelsSwitch } from "./explore-settings.js";
import { mountAntipode } from "./antipode.js";
import "./footer-version.js";
import { answerFill, bindHistory } from "./history.js";
import { bindKeyboardViewport } from "./keyboard-viewport.js";
bindKeyboardViewport(window, document);
import { modeCopy, modeRecommendation } from "./mode-copy.js";
import { bindStartingCountry, countrySetupCopy } from "./country-setup.js";
import { nearbyOrder, restoreNearbySession } from "./nearby.js";
import { bindCountrySuggestions } from "./suggestions.js";
import { countryAliases, localizedCountryAliases } from "./country-aliases.js";
import { pageCopy, pagePath } from "./navigation.js";
import { bindGlobeGestures } from "./gestures.js";
import {
  createAnalytics,
  bindExploreSwitchAnalytics,
  quizContext,
  isProduction,
  loadProductionAnalytics,
} from "./analytics.js";
import { resetCopy } from "./reset.js";
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
const mapData = Promise.all(
  [
    new URL("./data/countries.json", import.meta.url),
    new URL("./data/names.json", import.meta.url),
  ].map(async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw Error(response.status);
    return response.json();
  }),
);
// Startup consumes the error below; don't leave an early network rejection unhandled.
mapData.catch(() => {});
const [
  { mountMarineLabels },
  { mountGpuCountries },
  { capitalTime },
  { mountSatellite },
  { populationLabel },
  { mountPopulationLayer },
] = await Promise.all([
  page === "explore" ? import("./marine-labels.js") : {},
  ["play", "explore"].includes(page) ? import("./gpu-countries.js") : {},
  page === "explore" ? import("./clocks.js") : {},
  ["play", "explore"].includes(page) ? import("./satellite.js") : {},
  page === "explore" ? import("./population.js") : {},
  page === "explore" ? import("./population-layer.js") : {},
]);
const selectionPage =
  document.documentElement.dataset.selectionPage || "continents";
const routeContinent = new URLSearchParams(location.search).get("continent");
let lang = "en",
  state,
  sessions = {},
  selected = null,
  legacy,
  features = [],
  landFeatures = [],
  names = [],
  current,
  hoveredCountry,
  zoom = 1,
  rotation = [0, -20, 0],
  animation,
  pendingDraw,
  storage = true;
document.body.classList.toggle(
  "light",
  document.documentElement.dataset.theme !== "dark",
);
try {
  lang =
    document.documentElement.dataset.locale ||
    localStorage.getItem("atlas-language") ||
    "en";
  if (!copy[lang]) lang = "en";
  legacy = JSON.parse(localStorage.getItem("atlas-progress"));
  sessions = JSON.parse(localStorage.getItem("atlas-continents")) || {};
} catch {
  storage = false;
}
if ($("showPopulation")) {
  try {
    $("showPopulation").checked =
      localStorage.getItem("atlas-show-population") === "true";
  } catch {
    // Keep the default off when browser storage is unavailable.
  }
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
    ...(["play", "results"].includes(page) ? quizContext(selected) : {}),
    ...data,
  });
}
if (page === "explore") bindExploreSwitchAnalytics(document, track);
const t = (key) => copy[lang][keys.indexOf(key)];
const number = (value) => formatNumber(value, lang);
const ratio = (answered, total) => formatRatio(answered, total, lang);
const navigate = (target, continent) =>
  location.assign(new URL(pagePath(lang, target, continent), document.baseURI));
// Synchronize progress without reloading or writing it back to other tabs.
function syncSavedProgress() {
  if (!features.length) return;
  let latest;
  try {
    latest = JSON.parse(localStorage.getItem("atlas-continents")) || {};
  } catch {
    return;
  }
  if (typeof latest !== "object" || Array.isArray(latest)) return;
  const selectedChanged =
    selected &&
    JSON.stringify(latest[selected]) !== JSON.stringify(sessions[selected]);
  sessions = latest;
  for (const continent of continents) {
    sessions[continent] = restoreSession(
      idsFor(continent),
      sessions[continent],
    );
  }
  if (selected?.startsWith("country:")) {
    sessions[selected] = restoreNearbySession(
      idsFor(selected),
      sessions[selected],
    );
  }
  if (page === "play" && selectedChanged && sessions[selected]) {
    state = sessions[selected];
    render();
    draw();
  } else if (page === "continents") {
    renderContinents();
  }
}
window.addEventListener("storage", (event) => {
  if (event.key === "atlas-continents" || event.key === null)
    syncSavedProgress();
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) syncSavedProgress();
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
const satellite = mountSatellite
  ? mountSatellite(svg, projection, lang, queueDraw)
  : { active: false, draw() {} };
const grid = svg
  .append("path")
  .datum(d3.geoGraticule10())
  .attr("fill", "none")
  .attr("stroke", "#a2c5ff")
  .attr("stroke-opacity", 0.08)
  .attr("stroke-width", 0.6);
const gpuCountries = ["play", "explore"].includes(page)
  ? mountGpuCountries(svg, projection, queueDraw)
  : null;
const land = svg.append("g");
const shadow = svg
  .append("path")
  .datum({ type: "Sphere" })
  .attr("fill", "url(#shade)")
  .attr("pointer-events", "none");
const populationLayer = mountPopulationLayer
  ? mountPopulationLayer(svg, projection, lang, queueDraw)
  : null;
const labelLeaders = svg
  .append("g")
  .attr("class", "label-leaders")
  .attr("pointer-events", "none");
const countryLabels = svg
  .append("g")
  .attr("class", "country-labels")
  .attr("pointer-events", "none");
const activeLabelBackground = countryLabels
  .append("rect")
  .attr("class", "active-country-label-background")
  .attr("display", "none");
const drawMarineLabels =
  page === "explore"
    ? mountMarineLabels(svg, lang, () => landFeatures, queueDraw)
    : null;
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
    labelPoint: interiorLabelPoint(geometry, d3),
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
window.addEventListener("resize", () => {
  if (antipodeMode?.active) zoom = Math.min(zoom, 0.94);
  queueDraw();
});
let gestureActive = false;
let gestureTimer;
function finishGesture() {
  gestureActive = false;
  queueDraw();
}
let drawnZoom;
let drawnLabelSize;
let drawnLabelScale;
let hitPathFrame;
let hitPathKey;
let completedHitPathKey;
let gridPathKey;
function updateHitPaths(key) {
  if (key === completedHitPathKey || key === hitPathKey) return;
  cancelAnimationFrame(hitPathFrame);
  hitPathKey = key;
  // GPU renders the visible map. Refresh invisible SVG hit targets in short
  // slices, rather than blocking the first frame after a drag.
  const nodes = land.selectAll("path").nodes();
  const hitProjection = d3
    .geoOrthographic()
    .rotate(projection.rotate())
    .translate(projection.translate())
    .scale(projection.scale())
    .clipAngle(projection.clipAngle())
    .precision(projection.precision());
  const hitPath = d3.geoPath(hitProjection);
  let index = 0;
  land.style("pointer-events", "none");
  function step() {
    const began = performance.now();
    do {
      const node = nodes[index++];
      if (node) node.setAttribute("d", hitPath(node.__data__) || "");
    } while (index < nodes.length && performance.now() - began < 3);
    if (index < nodes.length) hitPathFrame = requestAnimationFrame(step);
    else {
      completedHitPathKey = key;
      hitPathKey = null;
      land.style("pointer-events", null);
    }
  }
  hitPathFrame = requestAnimationFrame(step);
}
function draw(animating = false) {
  const moving = gestureActive || animating === true;
  const activeCountry =
    comparisonEnabled || antipodeMode?.active
      ? null
      : page === "explore"
        ? $("highlightCountries")?.checked
          ? hoveredCountry || current
          : null
        : current;
  // Read layout before changing paths or label attributes.
  const globe = $("globe");
  const matrix = globe.getScreenCTM();
  const mapScale = matrix?.a || 1;
  // SVG's default "meet" scaling can expose space beyond the viewBox on
  // tall or wide screens. Cull labels against the real viewport instead.
  const bounds = globe.getBoundingClientRect();
  const inverse = matrix?.inverse();
  const topLeft = inverse
    ? new DOMPoint(bounds.left, bounds.top).matrixTransform(inverse)
    : { x: 0, y: 0 };
  const bottomRight = inverse
    ? new DOMPoint(bounds.right, bounds.bottom).matrixTransform(inverse)
    : { x: 600, y: 530 };
  measureLabels();
  projection.rotate(rotation).scale(220 * zoom);
  sphere.attr("opacity", antipodeMode?.active ? 0.12 : 1);
  shadow.attr("opacity", antipodeMode?.active ? 0.08 : 1);
  const northNeedle = document.querySelector("#north svg");
  if (northNeedle) northNeedle.style.transform = `rotate(${-rotation[2]}deg)`;
  // The circular ocean and shading do not change when the Earth rotates.
  if (drawnZoom !== zoom) {
    const outline = path({ type: "Sphere" });
    sphere.attr("d", outline);
    shadow.attr("d", outline);
    drawnZoom = zoom;
  }
  if (!antipodeMode?.active)
    satellite.draw(topLeft.x, topLeft.y, bottomRight.x, bottomRight.y);
  antipodeMode?.draw();
  if (!antipodeMode?.active)
    populationLayer?.draw(topLeft.x, topLeft.y, bottomRight.x, bottomRight.y);
  grid.attr("display", moving || antipodeMode?.active ? "none" : null);
  land
    .attr("opacity", gpuCountries ? 0 : 1)
    .attr("display", moving && gpuCountries ? "none" : null);
  gpuCountries?.draw(
    land.selectAll("path").data(),
    (f) =>
      antipodeMode?.active && antipodeMode.color(f.id)
        ? antipodeMode.color(f.id)
        : comparedCountries.get(f.id) && comparisonEnabled
          ? comparedCountries.get(f.id)
          : answerFill(
              f.id,
              activeCountry?.id,
              page === "play" ? state?.answers : [],
            ),
    (f) =>
      satellite.active && !antipodeMode?.active
        ? (comparisonEnabled && comparedCountries.has(f.id)) ||
          f.id === activeCountry?.id ||
          (page === "play" && state?.answers?.some((a) => a.id === f.id))
          ? 0.72
          : 0.04
        : 1,
    [topLeft.x, topLeft.y, bottomRight.x, bottomRight.y],
    antipodeMode?.active,
    satellite.active,
  );
  const geometryKey = JSON.stringify([
    rotation,
    zoom,
    land
      .selectAll("path")
      .data()
      .map((f) => f.id),
  ]);
  if (moving && hitPathKey) {
    cancelAnimationFrame(hitPathFrame);
    hitPathKey = null;
    completedHitPathKey = null;
  }
  if (!moving && gridPathKey !== geometryKey) {
    grid.attr("d", path);
    gridPathKey = geometryKey;
  }
  if (!moving && gpuCountries) updateHitPaths(geometryKey);
  if (!gpuCountries) land.selectAll("path").attr("d", path);
  if (!moving || !gpuCountries)
    land
      .selectAll("path")
      .attr("fill", (f) =>
        antipodeMode?.active && antipodeMode.color(f.id)
          ? antipodeMode.color(f.id)
          : comparedCountries.get(f.id) && comparisonEnabled
            ? comparedCountries.get(f.id)
            : answerFill(
                f.id,
                activeCountry?.id,
                page === "play" ? state?.answers : [],
              ),
      )
      .attr("fill-opacity", (f) =>
        satellite.active
          ? (comparisonEnabled && comparedCountries.has(f.id)) ||
            f.id === activeCountry?.id ||
            (page === "play" && state?.answers.some((a) => a.id === f.id))
            ? 0.72
            : 0.04
          : 1,
      )
      .attr("aria-pressed", (f) =>
        page === "explore"
          ? String(
              comparisonEnabled
                ? comparedCountries.has(f.id)
                : f.id === current?.id,
            )
          : null,
      );
  const labelsVisible =
    !antipodeMode?.active &&
    (page !== "explore" || $("showLabels")?.checked !== false);
  countryLabels.attr("display", labelsVisible ? null : "none");
  labelLeaders.attr("display", labelsVisible ? null : "none");
  const labelSize = Math.max(14, Math.min(18, 13 + zoom));
  const occupied = [];
  // Water labels have little room to move; reserve their water-only footprint
  // before placing country callouts, which can use several nearby positions.
  drawMarineLabels?.(
    projection,
    mapScale,
    [topLeft.x, topLeft.y, bottomRight.x, bottomRight.y],
    occupied,
    placeMapLabel,
    labelsVisible,
    moving,
  );
  if (!labelsVisible) {
    marker.attr("display", "none");
    return;
  }
  const leaders = [];
  const highlightedLabel = page === "explore" ? activeCountry : null;
  const viewCenter = projection.invert([300, 267]);
  const texts = countryLabels.selectAll("text");
  texts.classed("active-country-label", (f) => f === highlightedLabel);
  if (labelOrderCurrent !== activeCountry) {
    texts.sort(
      (a, b) =>
        (b.id === activeCountry?.id) - (a.id === activeCountry?.id) ||
        countryGeometry(b).area - countryGeometry(a).area,
    );
    labelOrderCurrent = activeCountry;
  }
  if (drawnLabelSize !== labelSize || drawnLabelScale !== mapScale) {
    texts
      .style("font-size", labelSize / mapScale + "px")
      .style("stroke-width", 2.5 / mapScale + "px");
    drawnLabelSize = labelSize;
    drawnLabelScale = mapScale;
  }
  activeLabelBackground.attr("display", "none");
  countryLabels.selectAll("text").attr("display", function (f) {
    if (comparisonEnabled && !comparedCountries.has(f.id)) return "none";
    const point = countryGeometry(f).labelPoint;
    const p = projection(point);
    if (
      d3.geoDistance(point, viewCenter) >= Math.PI / 2 ||
      p[0] < topLeft.x ||
      p[0] > bottomRight.x ||
      p[1] < topLeft.y ||
      p[1] > bottomRight.y
    )
      return "none";
    const width = (labelWidths.get(this) * labelSize + 8) / mapScale,
      height = (labelSize + 6) / mapScale;
    const placement = placeMapLabel(
      p,
      width,
      height,
      [topLeft.x, topLeft.y, bottomRight.x, bottomRight.y],
      occupied,
      page === "explore",
    );
    if (!placement) return "none";
    if (f === highlightedLabel) {
      const padding = 4 / mapScale;
      activeLabelBackground
        .attr("display", null)
        .attr("x", placement.box[0] - padding)
        .attr("y", placement.box[1] - padding)
        .attr("width", placement.box[2] - placement.box[0] + padding * 2)
        .attr("height", placement.box[3] - placement.box[1] + padding * 2)
        .attr("rx", 6 / mapScale)
        .attr("stroke-width", 1 / mapScale);
    }
    occupied.push(placement.box);
    if (placement.shifted)
      leaders.push({ id: f.id, anchor: p, point: placement.connector });
    this.setAttribute("transform", "translate(" + placement.point + ")");
    return null;
  });
  labelLeaders
    .selectAll("line")
    .data(leaders, (d) => d.id)
    .join("line")
    .attr("x1", (d) => d.anchor[0])
    .attr("y1", (d) => d.anchor[1])
    .attr("x2", (d) => d.point[0])
    .attr("y2", (d) => d.point[1]);
  labelLeaders
    .selectAll("circle")
    .data(leaders, (d) => d.id)
    .join("circle")
    .attr("cx", (d) => d.anchor[0])
    .attr("cy", (d) => d.anchor[1])
    .attr("r", 2 / mapScale);
  if (activeCountry) {
    const point = focusPoint(activeCountry),
      p = projection(point);
    marker
      .attr("cx", p[0])
      .attr("cy", p[1])
      .attr(
        "display",
        countryGeometry(activeCountry).area < 0.00015 &&
          d3.geoDistance(point, viewCenter) < Math.PI / 2
          ? null
          : "none",
      );
  } else marker.attr("display", "none");
}
function center(instant = false) {
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
  if (instant || matchMedia("(prefers-reduced-motion: reduce)").matches) {
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
if (page === "explore") {
  const north = document.createElement("button");
  north.id = "north";
  north.type = "button";
  const title = {
    en: "Reset north · Ctrl + drag to rotate",
    fa: "شمال رو به بالا · چرخش با Ctrl و درگ",
    ar: "إعادة الشمال للأعلى · Ctrl والسحب للتدوير",
    tr: "Kuzeyi sıfırla · Ctrl + sürükle ile döndür",
    fr: "Nord en haut · Ctrl + glisser pour tourner",
    ru: "Север сверху · Ctrl + перетаскивание для поворота",
  }[lang];
  north.title = title;
  north.setAttribute("aria-label", title);
  north.innerHTML =
    '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><text x="12" y="7" text-anchor="middle" fill="currentColor" font-size="7" font-family="sans-serif">N</text><path d="M12 9 7 21 12 18 17 21Z" fill="currentColor"/></svg>';
  north.onclick = () => {
    cancelAnimationFrame(animation);
    const start = rotation[2];
    const delta = (((-start % 360) + 540) % 360) - 180;
    if (!delta || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      rotation[2] = 0;
      queueDraw();
      return;
    }
    const began = performance.now();
    function step(now) {
      const progress = Math.min(1, (now - began) / 550);
      rotation[2] =
        progress === 1 ? 0 : start + delta * d3.easeCubicInOut(progress);
      // Use the same GPU path as dragging; rebuild SVG hit targets at rest.
      draw(progress < 1);
      if (progress < 1) animation = requestAnimationFrame(step);
    }
    animation = requestAnimationFrame(step);
  };
  $("center").after(north);
}
bindGlobeGestures($("globe"), {
  onStart: () => {
    cancelAnimationFrame(animation);
    hoveredCountry = null;
    gestureActive = true;
    clearTimeout(gestureTimer);
    gestureTimer = setTimeout(finishGesture, 180);
  },
  onTap: ({ target, x, y }) => {
    if (page !== "explore") return;
    if (antipodeMode?.active) {
      antipodeMode.tap(x, y);
      return;
    }
    if (comparisonEnabled) {
      const id = target.closest?.("[data-country-id]")?.dataset.countryId;
      selectComparison(features.find((f) => f.id === id));
      return;
    }
    if (!$("highlightCountries")?.checked) return;
    const id = target.closest?.("[data-country-id]")?.dataset.countryId;
    current = features.find((country) => country.id === id) || null;
    draw();
  },
  onRotate: (dx, dy) => {
    gestureActive = true;
    clearTimeout(gestureTimer);
    gestureTimer = setTimeout(finishGesture, 180);
    const bounds = $("globe").getBoundingClientRect();
    const viewScale = Math.min(bounds.width / 600, bounds.height / 530) || 1;
    const angle = (rotation[2] * Math.PI) / 180;
    [dx, dy] = [
      dx * Math.cos(angle) - dy * Math.sin(angle),
      dx * Math.sin(angle) + dy * Math.cos(angle),
    ];
    rotation[0] += (dx * 0.3) / (zoom * viewScale);
    rotation[1] = Math.max(
      -89,
      Math.min(89, rotation[1] - (dy * 0.3) / (zoom * viewScale)),
    );
    queueDraw();
  },
  onBearing:
    page === "explore"
      ? (dx) => {
          gestureActive = true;
          clearTimeout(gestureTimer);
          gestureTimer = setTimeout(finishGesture, 180);
          rotation[2] =
            ((((rotation[2] - dx * 0.4 + 180) % 360) + 360) % 360) - 180;
          queueDraw();
        }
      : undefined,
  onZoom: scale,
  onEnd: finishGesture,
});
function scale(amount) {
  gestureActive = true;
  clearTimeout(gestureTimer);
  gestureTimer = setTimeout(finishGesture, 180);
  cancelAnimationFrame(animation);
  zoom = Math.max(0.8, Math.min(80, zoom * amount));
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
      antipodeMode?.active &&
      e.target === $("globe") &&
      (e.key === "Enter" || e.key === " ")
    ) {
      e.preventDefault();
      antipodeMode.select(projection.invert(projection.translate()));
      return;
    }
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
  document.documentElement.dataset.theme = light ? "light" : "dark";
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", light ? "#f7f9ff" : "#0d1528");
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
  if (page !== "blog" && page !== "history")
    document.title =
      page === "home"
        ? seoCopy[lang][0]
        : `${page === "about" ? aboutCopy[lang][0] : pageCopy[lang][page]} — Karshvar`;
  document.querySelector(".brand").href = pagePath(lang);
  document.querySelector(".brand-name").textContent = brandName(lang);
  $("startGame").textContent = pageCopy[lang].start;
  $("startGame").href = pagePath(lang, "modes");
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
  $("chooseAgain").textContent = modeCopy[lang][5];
  $("chooseAgain").href = pagePath(lang, "modes");
  document
    .querySelectorAll("[data-language]")
    .forEach(
      (link) =>
        (link.href = pagePath(
          link.dataset.language,
          page === "continents" ? selectionPage : page,
          routeContinent,
        )),
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
  const introTitle = document.querySelector(".intro h1");
  if (introTitle) introTitle.textContent = labels[lang][1];
  const introDescription = document.querySelector(".intro p");
  if (introDescription) introDescription.textContent = labels[lang][2];
  $("chooseTitle").textContent = pageCopy[lang].continents;
  $("changeContinent").textContent = labels[lang][3];
  renderContinents();
  if (state && features.length) render();
  updateThemeLabel();
}
function idsFor(continent) {
  if (continent?.startsWith("country:"))
    return nearbyOrder(
      features.map((f) => {
        const country = names.find((n) => n.ccn3 === f.id);
        return {
          id: f.id,
          point: d3.geoCentroid(f),
          code: country.cca3,
          borders: country.borders,
        };
      }),
      continent.slice(8),
    );
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
  if (page !== "continents") return;
  if (!$("modeChoices")) {
    const copy = modeCopy[lang];
    const choices = document.createElement("div");
    choices.id = "modeChoices";
    choices.className = "mode-choices";
    choices.hidden = selectionPage !== "modes";
    $("continentChoices").hidden = selectionPage !== "continents";
    $("chooseTitle").textContent =
      selectionPage === "continents"
        ? labels[lang][0]
        : selectionPage === "countries"
          ? copy[2]
          : copy[0];
    for (const mode of ["country", "continent"]) {
      const i = mode === "continent" ? 0 : 1;
      const button = document.createElement("a");
      button.className = "mode-card";
      const title = document.createElement("strong");
      title.textContent = copy[i + 1];
      if (mode === "country") {
        const recommendation = document.createElement("span");
        recommendation.className = "mode-recommendation";
        recommendation.textContent = ` (${modeRecommendation[lang]})`;
        title.append(recommendation);
      }
      const description = document.createElement("span");
      description.textContent = copy[i + 3];
      button.append(title, description);
      button.href = pagePath(
        lang,
        mode === "continent" ? "continents" : "countries",
      );
      button.addEventListener("click", () => track("mode-select", { mode }));
      choices.append(button);
    }
    $("continentChoices").before(choices);
    if (page === "continents")
      document.title = $("chooseTitle").textContent + " — Karshvar";
  }

  if (selectionPage === "countries" && !$("nearbyMode") && features.length) {
    const copy = countrySetupCopy[lang];
    $("chooseTitle").textContent = copy.title;
    document.title = copy.title + " — Karshvar";
    const step = document.createElement("p");
    step.className = "setup-step";
    step.textContent = copy.step;
    $("chooseTitle").before(step);
    const section = document.createElement("section");
    section.id = "nearbyMode";
    section.className = "nearby-mode";
    const entry = document.createElement("div");
    entry.className = "answer-entry country-picker";
    const input = document.createElement("input");
    input.id = "startingCountry";
    input.setAttribute("aria-label", copy.label);
    input.type = "search";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-controls", "startingCountrySuggestions");
    input.placeholder = copy.placeholder;
    const list = document.createElement("div");
    list.id = "startingCountrySuggestions";
    list.className = "country-suggestions";
    list.setAttribute("role", "listbox");
    list.hidden = true;
    const button = document.createElement("button");
    button.className = "primary";
    button.textContent = pageCopy[lang].start;
    button.disabled = true;
    const candidates = features.map((f) => ({
      id: f.id,
      label: name(f),
      aliases: localizedCountryAliases(
        names.find((n) => n.ccn3 === f.id),
        lang,
      ),
    }));
    bindStartingCountry({
      input,
      list,
      button,
      candidates,
      language: lang,
      copy,
      startLabel: pageCopy[lang].start,
      onStart: (id) => {
        track("country-select", { mode: "country", country: id });
        navigate("play", "country:" + id);
      },
    });
    entry.append(input, list);
    const hint = document.createElement("p");
    hint.className = "setup-hint";
    hint.textContent = copy.hint;
    section.append(entry, button);
    $("continentChoices").before(section);
    section.after(hint);
  }

  if (selectionPage !== "continents") return;
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
    count.className = "continent-count";
    const countValue = document.createElement("bdi");
    countValue.textContent = ratio(
      session.answers.length,
      session.order.length,
    );
    const countLabel = document.createElement("span");
    countLabel.textContent = labels[lang][6];
    count.append(countValue, countLabel);
    const progress = document.createElement("div");
    progress.className = "continent-progress";
    progress.setAttribute("aria-hidden", "true");
    const progressFill = document.createElement("div");
    progressFill.style.width =
      Math.min(
        100,
        (session.answers.length / Math.max(1, session.order.length)) * 100,
      ) + "%";
    progress.append(progressFill);
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
    button.append(imagePlaceholder, art, badge, title, count, progress);
    button.href = pagePath(lang, "play", continent);
    button.addEventListener("click", () => {
      track("continent-select", {
        mode: "continent",
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
const comparisonLimit = () =>
  matchMedia("(max-width: 760px)").matches ? 3 : 10;
let comparisonEnabled = false;
const comparedCountries = new Map();
let renderComparison = () => {};
let areaData = { countries: {} };
if (page === "explore")
  fetch(new URL("./data/areas.json", import.meta.url))
    .then((r) => {
      if (!r.ok) throw Error("Area data unavailable");
      return r.json();
    })
    .then((data) => {
      areaData = data;
      renderComparison();
    })
    .catch(() => {});
let flagFontReady;
function loadFlagFont() {
  if (!document.fonts) return;
  flagFontReady ||= document.fonts
    .load('12px "Karshvar Flags"', "🇮🇷")
    .then(() => {
      labelsNeedMeasurement = true;
      queueDraw();
    })
    .catch(() => {
      flagFontReady = null;
      console.warn("Flag font unavailable; using the system emoji font.");
    });
}
function selectComparison(f) {
  if (!f) return;
  const ok = toggleComparison(comparedCountries, f.id, comparisonLimit());
  renderComparison(!ok);
  queueDraw();
}
let cleanupExploreSettings = () => {};
let antipodeMode;
function flyToAntipodePoint(point) {
  cancelAnimationFrame(animation);
  const start = [...rotation];
  const delta = ((((-point[0] - start[0]) % 360) + 540) % 360) - 180;
  const startZoom = zoom;
  const targetZoom = 0.94;
  const began = performance.now();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function step(now) {
    const progress = reduced ? 1 : Math.min(1, (now - began) / 700);
    const ease = d3.easeCubicInOut(progress);
    rotation = [
      start[0] + delta * ease,
      start[1] + (-point[1] - start[1]) * ease,
      start[2] * (1 - ease),
    ];
    zoom = startZoom + (targetZoom - startZoom) * ease;
    draw(progress < 1);
    if (progress < 1) animation = requestAnimationFrame(step);
  }
  animation = requestAnimationFrame(step);
}
function openExplore(continent = "All") {
  cleanupExploreSettings();
  const settingsEvents = new AbortController();
  selected = continent;
  current = null;
  hoveredCountry = null;
  bindHighlightSwitch($("highlightCountries"), (enabled) => {
    current = null;
    hoveredCountry = null;
    land
      .selectAll("path")
      .attr("tabindex", enabled || comparisonEnabled ? 0 : -1)
      .attr("aria-disabled", String(!enabled && !comparisonEnabled))
      .style("cursor", enabled ? "pointer" : null);
    draw();
  });
  const copy = compareCopy[lang] || compareCopy.en;
  const compareLabel = document.createElement("label");
  compareLabel.className = "population-switch";
  const compareInput = document.createElement("input");
  compareInput.id = "showComparison";
  compareInput.type = "checkbox";
  compareInput.checked = comparisonEnabled;
  compareInput.setAttribute("role", "switch");
  const compareText = document.createElement("span");
  compareText.textContent = copy[0];
  compareLabel.append(compareInput, compareText);
  $("showPopulation").closest("label").after(compareLabel);
  const comparePanel = document.createElement("aside");
  comparePanel.className = "compare-panel";
  comparePanel.setAttribute("aria-label", copy[0]);
  document.body.append(comparePanel);
  const updateCompareAccess = () =>
    land
      .selectAll("path")
      .attr(
        "tabindex",
        comparisonEnabled || $("highlightCountries").checked ? 0 : -1,
      )
      .attr(
        "aria-disabled",
        String(!comparisonEnabled && !$("highlightCountries").checked),
      );
  renderComparison = (limit = false) => {
    comparePanel.hidden = !comparisonEnabled;
    comparePanel.replaceChildren();
    const title = document.createElement("strong");
    title.textContent =
      copy[0] + " (" + comparedCountries.size + "/" + comparisonLimit() + ")";
    const help = document.createElement("p");
    help.setAttribute("role", "status");
    help.textContent = limit
      ? copy[4]
      : comparedCountries.size
        ? copy[2]
        : copy[1];
    help.textContent = help.textContent.replace(
      /10|۱۰/g,
      new Intl.NumberFormat(lang).format(comparisonLimit()),
    );
    const list = document.createElement("ol");
    const entries = [...comparedCountries.keys()].sort(
      (a, b) =>
        (areaData.countries[b]?.km2 || 0) - (areaData.countries[a]?.km2 || 0),
    );
    for (const id of entries) {
      const f = features.find((f) => f.id === id);
      const row = document.createElement("li");
      row.style.borderInlineStart = "5px solid " + comparedCountries.get(id);
      const remove = document.createElement("button");
      const area = areaData.countries[id]?.km2;
      remove.textContent =
        name(f) +
        " — " +
        (area ? new Intl.NumberFormat(lang).format(area) + " km²" : copy[5]) +
        " ×";
      remove.onclick = () => selectComparison(f);
      row.append(remove);
      list.append(row);
    }
    const clear = document.createElement("button");
    clear.textContent = copy[3];
    clear.onclick = () => {
      comparedCountries.clear();
      renderComparison();
      queueDraw();
    };
    comparePanel.append(title, help, list, clear);
  };
  compareInput.onchange = () => {
    comparisonEnabled = compareInput.checked;
    if (comparisonEnabled) antipodeMode?.disable();
    if (comparisonEnabled && matchMedia("(max-width: 760px)").matches) {
      panel.open = false;
      mobileDialog.close();
      panel.querySelector("summary")?.focus({ preventScroll: true });
      positionComparison();
    }
    hoveredCountry = null;
    updateCompareAccess();
    renderComparison();
    queueDraw();
  };
  renderComparison();
  const clockLabel = document.createElement("label");
  clockLabel.className = "population-switch";
  clockLabel.title = {
    en: "Capital city time",
    fa: "ساعت پایتخت",
    ar: "وقت العاصمة",
    tr: "Başkent saati",
    fr: "Heure de la capitale",
    ru: "Время столицы",
  }[lang];
  const clock = document.createElement("input");
  clock.type = "checkbox";
  clock.id = "showClock";
  clock.setAttribute("role", "switch");
  try {
    clock.checked = localStorage.getItem("atlas-show-clock") === "true";
  } catch {}
  const clockText = document.createElement("span");
  clockText.textContent = {
    en: "Time",
    fa: "ساعت",
    ar: "الوقت",
    tr: "Saat",
    fr: "Heure",
    ru: "Время",
  }[lang];
  clockLabel.append(clock, clockText);
  $("showPopulation").closest("label").after(clockLabel);
  const flagsLabel = document.createElement("label");
  flagsLabel.className = "population-switch";
  const flags = document.createElement("input");
  flags.type = "checkbox";
  flags.id = "showFlags";
  flags.setAttribute("role", "switch");
  flags.checked = false;
  try {
    flags.checked = localStorage.getItem("atlas-show-flags") === "true";
  } catch {}
  const flagsText = document.createElement("span");
  flagsText.textContent = {
    en: "Flags",
    fa: "پرچم‌ها",
    ar: "الأعلام",
    tr: "Bayraklar",
    fr: "Drapeaux",
    ru: "Флаги",
  }[lang];
  flagsLabel.append(flags, flagsText);
  clockLabel.after(flagsLabel);
  const labelsLabel = document.createElement("label");
  labelsLabel.className = "population-switch";
  const labelsInput = document.createElement("input");
  labelsInput.type = "checkbox";
  labelsInput.id = "showLabels";
  labelsInput.checked = true;
  labelsInput.setAttribute("role", "switch");
  const labelsText = document.createElement("span");
  labelsText.textContent = {
    en: "Labels",
    fa: "برچسب‌ها",
    ar: "التسميات",
    tr: "Etiketler",
    fr: "Étiquettes",
    ru: "Подписи",
  }[lang];
  labelsLabel.append(labelsInput, labelsText);
  $("showPopulation").closest("label").before(labelsLabel);
  antipodeMode = mountAntipode({
    svg,
    projection,
    lang,
    settingsAnchor: compareLabel,
    describe: (point) => {
      const country = features.find((f) => d3.geoContains(f, point));
      return country ? { id: country.id, label: name(country) } : null;
    },
    flyTo: flyToAntipodePoint,
    queueDraw,
    onEnable: () => {
      cancelAnimationFrame(animation);
      zoom = 0.94;
      compareInput.checked = false;
      comparisonEnabled = false;
      renderComparison();
      hoveredCountry = null;
      current = null;
      updateCompareAccess();
      if (matchMedia("(max-width: 760px)").matches) {
        mobileDialog.close();
        summary.focus({ preventScroll: true });
      }
    },
  });
  const settings = document.createElement("div");
  settings.className = "explore-settings-bar";
  settings.setAttribute("role", "group");
  settings.setAttribute(
    "aria-label",
    {
      en: "Map settings",
      fa: "تنظیمات نقشه",
      ar: "إعدادات الخريطة",
      tr: "Harita ayarları",
      fr: "Réglages de la carte",
      ru: "Настройки карты",
    }[lang],
  );
  const panel = $("explorePanel");
  const heading = panel.closest(".explore-heading");
  const mobileDialog = document.createElement("dialog");
  mobileDialog.className = "explore-mobile-dialog";
  const dialogTitle = document.createElement("h2");
  dialogTitle.id = "exploreDialogTitle";
  dialogTitle.textContent = {
    en: "Continents & settings",
    fa: "قاره‌ها و تنظیمات",
    ar: "القارات والإعدادات",
    tr: "Kıtalar ve ayarlar",
    fr: "Continents et réglages",
    ru: "Континенты и настройки",
  }[lang];
  mobileDialog.setAttribute("aria-labelledby", dialogTitle.id);
  const closeDialog = document.createElement("button");
  closeDialog.type = "button";
  closeDialog.className = "explore-dialog-close";
  closeDialog.textContent = "×";
  closeDialog.setAttribute(
    "aria-label",
    {
      en: "Close",
      fa: "بستن",
      ar: "إغلاق",
      tr: "Kapat",
      fr: "Fermer",
      ru: "Закрыть",
    }[lang],
  );
  closeDialog.onclick = () => mobileDialog.close();
  const dialogContent = document.createElement("div");
  dialogContent.className = "explore-dialog-content";
  const dialogFooter = document.createElement("div");
  dialogFooter.className = "explore-dialog-footer";
  const doneButton = document.createElement("button");
  doneButton.type = "button";
  doneButton.className = "primary";
  doneButton.textContent = closeDialog.getAttribute("aria-label");
  doneButton.onclick = () => mobileDialog.close();
  dialogFooter.append(doneButton);
  mobileDialog.append(dialogTitle, closeDialog, dialogContent, dialogFooter);
  document.body.append(mobileDialog);
  const summary = panel.querySelector("summary");
  const originalSummary = summary.textContent;
  summary.addEventListener(
    "click",
    (event) => {
      if (!matchMedia("(max-width: 760px)").matches) return;
      event.preventDefault();
      mobileDialog.showModal();
    },
    { signal: settingsEvents.signal },
  );
  mobileDialog.addEventListener("click", (event) => {
    const r = mobileDialog.getBoundingClientRect();
    if (
      event.target === mobileDialog &&
      (event.clientX < r.left ||
        event.clientX > r.right ||
        event.clientY < r.top ||
        event.clientY > r.bottom)
    )
      mobileDialog.close();
  });
  const arrangeSettings = () => {
    const desktop = matchMedia("(min-width: 761px)").matches;
    while (comparedCountries.size > comparisonLimit())
      comparedCountries.delete([...comparedCountries.keys()].at(-1));
    renderComparison();
    queueDraw();
    if (desktop) {
      mobileDialog.close();
      panel.append(...dialogContent.children);
      summary.textContent = originalSummary;
      summary.removeAttribute("aria-haspopup");
      heading.after(settings);
      panel
        .querySelectorAll(".population-switch")
        .forEach((label) => settings.append(label));
    } else {
      settings
        .querySelectorAll(".population-switch")
        .forEach((label) => panel.append(label));
      settings.remove();
      panel.open = false;
      dialogContent.append(
        ...Array.from(panel.children).filter((child) => child !== summary),
      );
      summary.textContent = dialogTitle.textContent;
      summary.setAttribute("aria-haspopup", "dialog");
    }
  };
  const positionComparison = () => {
    const desktop = matchMedia("(min-width: 761px)").matches;
    comparePanel.style.top = desktop
      ? settings.getBoundingClientRect().bottom + 8 + "px"
      : heading.getBoundingClientRect().bottom + 8 + "px";
  };
  const compareResize = new ResizeObserver(positionComparison);
  compareResize.observe(settings);
  compareResize.observe(heading);
  arrangeSettings();
  positionComparison();
  window.addEventListener("resize", positionComparison, {
    signal: settingsEvents.signal,
  });
  window.addEventListener("resize", arrangeSettings, {
    signal: settingsEvents.signal,
  });
  const exploreName = (f) => {
    const label = $("showPopulation").checked
      ? populationLabel(name(f), f.id, lang)
      : name(f);
    const time = clock.checked ? capitalTime(f.id, lang) : "";
    return label + (time ? " · " + time : "");
  };
  const renderExploreLabels = () =>
    countryLabels.selectAll("text").each(function (f) {
      const text = d3.select(this).text(null);
      const flag = flags.checked
        ? countryFlag(names.find((country) => country.ccn3 === f.id)?.cca2)
        : "";
      if (flag) text.append("tspan").attr("class", "country-flag").text(flag);
      const countryName = name(f);
      text.append("tspan").text((flag ? "\u2009" : "") + countryName);
      const population = exploreName(f).slice(countryName.length);
      if (population)
        text
          .append("tspan")
          .attr("class", "country-population")
          .text(population);
    });
  $("showPopulation").onchange = () => {
    try {
      localStorage.setItem(
        "atlas-show-population",
        String($("showPopulation").checked),
      );
    } catch {
      // The switch still works for this visit if storage is blocked.
    }
    renderExploreLabels();
    land.selectAll("path").attr("aria-label", exploreName);
    labelsNeedMeasurement = true;
    queueDraw();
  };

  const updateExploreLabels = () => {
    renderExploreLabels();
    land.selectAll("path").attr("aria-label", exploreName);
    labelsNeedMeasurement = true;
    queueDraw();
  };
  const unbindLabels = bindLabelsSwitch(
    labelsInput,
    [$("showPopulation"), clock, flags],
    updateExploreLabels,
  );
  flags.onchange = () => {
    try {
      localStorage.setItem("atlas-show-flags", String(flags.checked));
    } catch {}
    if (flags.checked) loadFlagFont();
    updateExploreLabels();
  };
  if (flags.checked) loadFlagFont();
  clock.onchange = () => {
    try {
      localStorage.setItem("atlas-show-clock", String(clock.checked));
    } catch {}
    updateExploreLabels();
  };
  const clockTimer = setInterval(() => {
    if (clock.checked && !document.hidden) updateExploreLabels();
  }, 1000 * 30);
  document.addEventListener(
    "visibilitychange",
    () => {
      if (clock.checked && !document.hidden) updateExploreLabels();
    },
    { signal: settingsEvents.signal },
  );
  cleanupExploreSettings = () => {
    antipodeMode.destroy();
    antipodeMode = null;
    unbindLabels();
    labelsLabel.remove();
    mobileDialog.close();
    panel.append(...dialogContent.children);
    mobileDialog.remove();
    settingsEvents.abort();
    compareResize.disconnect();
    clearInterval(clockTimer);
    settings
      .querySelectorAll(".population-switch")
      .forEach((label) => panel.append(label));
    settings.remove();
    compareLabel.remove();
    comparePanel.remove();
    clockLabel.remove();
    flagsLabel.remove();
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
  zoom = antipodeMode?.active ? 0.94 : continent === "All" ? 1 : 1.5;
  land
    .selectAll("path")
    .data(countries, (f) => f.id)
    .join("path")
    .attr("stroke", "var(--ocean)")
    .attr("stroke-width", 0.7);
  land
    .selectAll("path")
    .attr("tabindex", $("highlightCountries").checked ? 0 : -1)
    .attr("role", "button")
    .attr("aria-label", exploreName)
    .attr("data-country-id", (f) => f.id)
    .attr("aria-disabled", String(!$("highlightCountries").checked))
    .style("cursor", $("highlightCountries").checked ? "pointer" : null)
    .on("pointerenter", (event, f) => {
      if (
        antipodeMode?.active ||
        !$("highlightCountries").checked ||
        event.pointerType === "touch" ||
        event.buttons
      )
        return;
      hoveredCountry = f;
      queueDraw();
    })
    .on("pointerleave", (_, f) => {
      if (hoveredCountry !== f) return;
      hoveredCountry = null;
      queueDraw();
    })
    .on("click", (event, f) => {
      if (antipodeMode?.active) {
        if (event.detail === 0) antipodeMode.select(focusPoint(f));
        return;
      }
      if (comparisonEnabled) {
        if (event.detail === 0) selectComparison(f);
        return;
      }
      if (!$("highlightCountries").checked) return;
      current = f;
      draw();
    })
    .on("keydown", (event, f) => {
      if (antipodeMode?.active) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          antipodeMode.select(focusPoint(f));
        }
        return;
      }
      if (comparisonEnabled) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectComparison(f);
        }
        return;
      }
      if (!$("highlightCountries").checked) return;
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
    .attr("text-anchor", "middle")
    .attr("dy", ".35em");
  updateCompareAccess();
  renderExploreLabels();
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
    if (c === continent) {
      a.setAttribute("aria-current", "page");
      const summary = panel.querySelector("summary");
      summary.textContent =
        c === "All"
          ? {
              en: "Continents",
              fa: "قاره‌ها",
              ar: "القارات",
              tr: "Kıtalar",
              fr: "Continents",
              ru: "Континенты",
            }[lang]
          : a.textContent;
    }
    a.addEventListener("click", (event) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      event.preventDefault();
      if (location.href !== a.href) history.pushState(null, "", a.href);
      const keepOpen = mobileDialog.open;
      const scrollTop = dialogContent.scrollTop;
      openExplore(c);
      if (keepOpen) {
        const nextDialog = document.querySelector(".explore-mobile-dialog");
        nextDialog.showModal();
        nextDialog
          .querySelector('[aria-current="page"]')
          ?.focus({ preventScroll: true });
        nextDialog.querySelector(".explore-dialog-content").scrollTop =
          scrollTop;
      }
      panel.open = false;
    });
    nav.append(a);
  });
  if (matchMedia("(max-width: 760px)").matches)
    summary.textContent = dialogTitle.textContent;
  draw();
}
if (page === "explore")
  window.addEventListener("popstate", () => {
    if (!features.length) return;
    const continent = new URLSearchParams(location.search).get("continent");
    openExplore(continents.includes(continent) ? continent : "All");
  });
function focusAnswer() {
  if (!matchMedia("(pointer: coarse)").matches && !$("answerForm").hidden)
    $("answer").focus({ preventScroll: true });
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
      features.filter(
        (f) =>
          selected?.startsWith("country:") || idsFor(selected).includes(f.id),
      ),
      (f) => f.id,
    )
    .join("path")
    .attr("stroke", "var(--ocean)")
    .attr("stroke-width", 0.7)
    .attr("stroke-linejoin", "round");
  render();
  center(satellite.initiallyEnabled);
  focusAnswer();
  track("game-start", {
    answered: state.answers.length,
    total: state.order.length,
  });
}
$("changeContinent").onclick = () => {
  track("game-change");
  save();
  navigate(selected?.startsWith("country:") ? "countries" : "continents");
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
  $("next").textContent = done ? modeCopy[lang][8] : t("next");
  $("changeContinent").textContent = selected?.startsWith("country:")
    ? {
        en: "Change country",
        fa: "تغییر کشور",
        ar: "تغيير البلد",
        tr: "Ülkeyi değiştir",
        fr: "Changer de pays",
        ru: "Сменить страну",
      }[lang]
    : labels[lang][3];
  $("activeContinent").textContent = selected?.startsWith("country:")
    ? name(features.find((f) => f.id === selected.slice(8)))
    : labels[lang][7 + continents.indexOf(selected)];
  $("feedback").hidden = !record && !done;
  const feedback = $("feedback");
  feedback.replaceChildren();
  document
    .querySelector(".answer-panel")
    .classList.toggle("has-feedback", !!record && !done);
  if (done) {
    feedback.textContent = `${modeCopy[lang][7]} ${number(state.answers.filter((a) => a.correct).length)} / ${number(state.order.length)}`;
  } else if (record) {
    const message = document.createElement("span");
    message.className = "feedback-message";
    message.textContent =
      record.choice === ""
        ? modeCopy[lang][6]
        : t(record.correct ? "correct" : "incorrect");
    const country = document.createElement("strong");
    country.className = "feedback-country";
    country.textContent = name(current);
    feedback.append(message, country);
  }
  document.querySelector(".question").hidden = done || !!record;
  // Label the chosen starting country and completed answers, without revealing quiz answers.
  const labeledIds = new Set(state.answers.map((answer) => answer.id));
  if (selected?.startsWith("country:")) labeledIds.add(selected.slice(8));
  countryLabels
    .selectAll("text")
    .data(
      features.filter((feature) => labeledIds.has(feature.id)),
      (feature) => feature.id,
    )
    .join("text")
    .text(name)
    .attr("text-anchor", "middle")
    .attr("dy", ".35em");
  labelsNeedMeasurement = true;
  labelOrderCurrent = undefined;
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
    track("game-complete", {
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
  track("game-restart");
  state = selected?.startsWith("country:")
    ? { order: idsFor(selected), index: 0, answers: [] }
    : createSession(idsFor(selected));
  save(true);
  navigate("play", selected);
};
$("center").onclick = () => {
  center();
};
$("zoomIn").onclick = () => {
  scale(1.25);
};
$("zoomOut").onclick = () => {
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
$("startGame").onclick = () => track("play-click");
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
  $("languagePicker").open = false;
  appMenu.style.setProperty(
    "--menu-top",
    document.querySelector("body > header").getBoundingClientRect().bottom +
      8 +
      "px",
  );
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
    const responses = await mapData;
    names = responses[1];
    landFeatures = topojson.feature(
      responses[0],
      responses[0].objects.countries,
    ).features;
    features = landFeatures.filter((f) =>
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
    if (
      routeContinent?.startsWith("country:") &&
      features.some((f) => f.id === routeContinent.slice(8))
    ) {
      const order = idsFor(routeContinent);
      sessions[routeContinent] = restoreNearbySession(
        order,
        sessions[routeContinent],
      );
    }
    $("resetOpen").disabled = false;
    $("selectionStatus").textContent = "";
    if (page === "explore")
      openExplore(continents.includes(routeContinent) ? routeContinent : "All");
    else if (page === "continents") renderContinents();
    else if (
      !continents.includes(routeContinent) &&
      !(routeContinent?.startsWith("country:") && sessions[routeContinent])
    )
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
          $("resultsContinent").textContent = selected?.startsWith("country:")
            ? name(features.find((f) => f.id === selected.slice(8)))
            : labels[lang][7 + continents.indexOf(selected)];
          $("resultsScore").textContent =
            number(state.answers.filter((a) => a.correct).length) +
            " / " +
            number(state.order.length);
          $("resultsMessage").textContent = selected.startsWith("country:")
            ? t("complete")
            : labels[lang][4];
          if (selected.startsWith("country:"))
            $("restartContinent").textContent = t("again");
        }
      } else if (state.index >= state.order.length)
        location.replace(
          new URL(pagePath(lang, "results", selected), document.baseURI),
        );
      else openGame(selected);
    }
    if (page !== "explore") await satellite.ready;
    await flagFontReady;
    await document.fonts?.ready;
    labelsNeedMeasurement = true;
    draw();
    await gpuCountries?.whenReady();
    await drawMarineLabels?.whenSettled();
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

await bindHistory({
  language: lang,
  getSessions: () => sessions,
  sessionLabel: (key) => labels[lang][7 + continents.indexOf(key)] || key,
});
await revealPage();
