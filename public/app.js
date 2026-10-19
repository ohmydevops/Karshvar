import { bindGlobeGestures } from "./gestures.js";
import { createAnalytics } from "./analytics.js";
import { resetCopy } from "./reset.js";
import { aboutCopy, seoCopy } from "./about.js";
import {
  continents,
  labels,
  continentFor,
  validSession,
  createSession,
} from "./continents.js";
import { matches, shuffled } from "./logic.js";
const keys = [
  "eyebrow",
  "heading",
  "description",
  "explore",
  "center",
  "gesture",
  "challenge",
  "question",
  "hint",
  "label",
  "check",
  "next",
  "skip",
  "saved",
  "footer",
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
    "A little curiosity. A whole world.",
    "How well do you know Earth?",
    "One highlighted country. Take a look around, then make your guess.",
    "World explorer",
    "Recenter",
    "Drag to explore · Scroll or use + / − to zoom",
    "Your next discovery",
    "Which country is this?",
    "Name the country highlighted in green. Take your time.",
    "Country name",
    "Check answer",
    "Next country →",
    "I don’t know — reveal answer",
    "Your progress stays in this browser.",
    "No timer. Just you and the world.",
    "Map data: Natural Earth",
    "That’s right!",
    "Not quite. The correct answer is",
    "You explored every country!",
    "Play again",
    "Country",
    "Correct",
    "Loading the world…",
    "Could not load the map. Please reload to try again.",
    "Type a country name…",
    "Interactive globe. Use arrow keys to rotate; plus and minus to zoom.",
    "Switch theme",
    "Zoom in",
    "Zoom out",
    "Progress cannot be saved in this browser.",
  ],
  fa: [
    "کمی کنجکاوی، یک دنیا کشف",
    "زمین رو چقدر می‌شناسی؟",
    "کشور روشن‌شده رو نگاه کن، دورش بچرخ و اسمش رو حدس بزن.",
    "جهان‌گردی",
    "برگشت به کشور",
    "بکش تا بچرخه · با + و − بزرگ‌نمایی کن",
    "کشف بعدی تو",
    "این کدوم کشوره؟",
    "اسم کشوری که سبز شده رو بنویس. عجله‌ای نیست.",
    "اسم کشور",
    "بررسی جواب",
    "کشور بعدی ←",
    "نمی‌دونم — جواب رو نشون بده",
    "پیشرفتت توی همین مرورگر ذخیره می‌شه.",
    "بدون زمان‌سنج؛ فقط تو و دنیا.",
    "داده‌های نقشه: Natural Earth",
    "درسته!",
    "این نبود. جواب درست:",
    "همهٔ کشورها رو دیدی!",
    "دوباره بازی کن",
    "کشور",
    "درست",
    "داریم دنیا رو آماده می‌کنیم…",
    "نقشه بارگیری نشد. صفحه رو دوباره باز کن.",
    "اسم کشور رو بنویس…",
    "کرهٔ تعاملی؛ با کلیدهای جهت بچرخان و با مثبت و منفی بزرگ‌نمایی کن.",
    "تغییر ظاهر",
    "بزرگ‌نمایی",
    "کوچک‌نمایی",
    "پیشرفتت توی این مرورگر ذخیره نمی‌شه.",
  ],
  ar: [
    "قليل من الفضول، عالم من الاكتشاف",
    "إلى أي حد تعرف الأرض؟",
    "تأمل البلد المميز، أدر الكرة، ثم خمن اسمه.",
    "استكشاف العالم",
    "إعادة التوسيط",
    "اسحب للتدوير · استخدم + و − للتكبير",
    "اكتشافك التالي",
    "ما هذا البلد؟",
    "اكتب اسم البلد المميز بالأخضر. خذ وقتك.",
    "اسم البلد",
    "تحقق من الإجابة",
    "البلد التالي ←",
    "لا أعرف — أظهر الإجابة",
    "يُحفظ تقدمك في هذا المتصفح.",
    "بلا مؤقت. أنت والعالم فقط.",
    "بيانات الخريطة: Natural Earth",
    "إجابة صحيحة!",
    "ليست صحيحة. الإجابة الصحيحة هي",
    "لقد استكشفت كل البلدان!",
    "العب مجددًا",
    "البلد",
    "صحيح",
    "جارٍ تحميل العالم…",
    "تعذر تحميل الخريطة. أعد تحميل الصفحة.",
    "اكتب اسم بلد…",
    "كرة أرضية تفاعلية. استخدم الأسهم للتدوير وزري الجمع والطرح للتكبير.",
    "تغيير المظهر",
    "تكبير",
    "تصغير",
    "لا يمكن حفظ التقدم في هذا المتصفح.",
  ],
  tr: [
    "Biraz merak. Koca bir dünya.",
    "Dünyayı ne kadar tanıyorsun?",
    "Vurgulanan ülkeye bak, küreyi döndür ve tahmin et.",
    "Dünyayı keşfet",
    "Ortala",
    "Döndürmek için sürükle · Yakınlaştırmak için + / −",
    "Sıradaki keşfin",
    "Bu hangi ülke?",
    "Yeşil renkle vurgulanan ülkenin adını yaz. Acele etme.",
    "Ülke adı",
    "Yanıtı kontrol et",
    "Sonraki ülke →",
    "Bilmiyorum — yanıtı göster",
    "İlerlemen bu tarayıcıda saklanır.",
    "Süre sınırı yok. Sadece sen ve dünya.",
    "Harita verileri: Natural Earth",
    "Doğru!",
    "Tam değil. Doğru yanıt",
    "Tüm ülkeleri keşfettin!",
    "Tekrar oyna",
    "Ülke",
    "Doğru",
    "Dünya yükleniyor…",
    "Harita yüklenemedi. Sayfayı yenile.",
    "Bir ülke adı yaz…",
    "Etkileşimli küre. Döndürmek için okları, yakınlaştırmak için artı ve eksiyi kullan.",
    "Temayı değiştir",
    "Yakınlaştır",
    "Uzaklaştır",
    "İlerleme bu tarayıcıda kaydedilemiyor.",
  ],
  fr: [
    "Un peu de curiosité. Tout un monde.",
    "Connaissez-vous notre planète ?",
    "Un pays en surbrillance. Explorez le globe, puis devinez son nom.",
    "Explorer le monde",
    "Recentrer",
    "Glissez pour tourner · + / − pour zoomer",
    "Votre prochaine découverte",
    "Quel est ce pays ?",
    "Nommez le pays en vert. Prenez votre temps.",
    "Nom du pays",
    "Vérifier",
    "Pays suivant →",
    "Je ne sais pas — révéler",
    "Votre progression reste dans ce navigateur.",
    "Sans chrono. Juste vous et le monde.",
    "Carte : Natural Earth",
    "Bonne réponse !",
    "Pas tout à fait. La bonne réponse est",
    "Vous avez exploré tous les pays !",
    "Rejouer",
    "Pays",
    "Correct",
    "Chargement du monde…",
    "Impossible de charger la carte. Rechargez la page.",
    "Saisissez un pays…",
    "Globe interactif. Flèches pour tourner, plus et moins pour zoomer.",
    "Changer le thème",
    "Zoom avant",
    "Zoom arrière",
    "Impossible de sauvegarder dans ce navigateur.",
  ],
  ru: [
    "Немного любопытства. Целый мир.",
    "Хорошо ли вы знаете Землю?",
    "Посмотрите на выделенную страну, поверните глобус и угадайте её название.",
    "Исследуйте мир",
    "По центру",
    "Перетаскивайте для вращения · + / − для масштаба",
    "Следующее открытие",
    "Что это за страна?",
    "Назовите страну, выделенную зелёным. Не торопитесь.",
    "Название страны",
    "Проверить",
    "Следующая страна →",
    "Не знаю — показать ответ",
    "Прогресс сохраняется в этом браузере.",
    "Без таймера. Только вы и мир.",
    "Данные карты: Natural Earth",
    "Верно!",
    "Не совсем. Правильный ответ:",
    "Вы исследовали все страны!",
    "Играть снова",
    "Страна",
    "Верно",
    "Загружаем мир…",
    "Не удалось загрузить карту. Обновите страницу.",
    "Введите название страны…",
    "Интерактивный глобус. Стрелки вращают, плюс и минус меняют масштаб.",
    "Сменить тему",
    "Приблизить",
    "Отдалить",
    "Не удалось сохранить прогресс в браузере.",
  ],
};
const $ = (id) => document.getElementById(id);
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
  enabled: location.hostname === "ohmydevops.github.io",
});
document
  .querySelector("script[data-website-id]")
  ?.addEventListener("load", analytics.flush);
function track(event, data = {}) {
  analytics.track(event, {
    language: lang,
    ...(selected ? { continent: selected } : {}),
    ...data,
  });
}
const t = (key) => copy[lang][keys.indexOf(key)];
function save() {
  try {
    if (selected && state) sessions[selected] = state;
    localStorage.setItem("atlas-continents", JSON.stringify(sessions));
    localStorage.setItem("atlas-language", lang);
    localStorage.setItem(
      "atlas-theme",
      document.body.classList.contains("light") ? "light" : "dark",
    );
  } catch {
    storage = false;
    document.querySelector(".session-note").textContent = t("storage");
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
  const data = names.find((n) => n.ccn3 === f.id);
  if (!data) return [f.properties.name];
  return [
    f.properties.name,
    data.name.common,
    data.name.official,
    ...data.altSpellings,
    ...Object.values(data.translations).flatMap((n) => [n.common, n.official]),
    ...Object.values(data.name.nativeName || {}).flatMap((n) => [
      n.common,
      n.official,
    ]),
    ...Object.keys(copy).map((l) =>
      new Intl.DisplayNames([l], { type: "region" }).of(data.cca2),
    ),
    ...({
      USA: ["USA", "US", "America"],
      GBR: ["UK", "Britain", "Great Britain"],
      ARE: ["UAE"],
      KOR: ["South Korea"],
      PRK: ["North Korea"],
    }[data.cca3] || []),
  ];
}
const svg = d3.select("#globe").attr("viewBox", "0 0 600 530");
const defs = svg.append("defs");
const glow = defs.append("radialGradient").attr("id", "ocean");
glow.append("stop").attr("offset", "0%").attr("stop-color", "#38594c");
glow.append("stop").attr("offset", "100%").attr("stop-color", "#182d25");
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
const path = d3.geoPath(projection);
const sphere = svg
  .append("path")
  .datum({ type: "Sphere" })
  .attr("fill", "url(#ocean)")
  .attr("stroke", "#8cad7f")
  .attr("stroke-opacity", 0.35);
const grid = svg
  .append("path")
  .datum(d3.geoGraticule10())
  .attr("fill", "none")
  .attr("stroke", "#aacbb4")
  .attr("stroke-opacity", 0.08)
  .attr("stroke-width", 0.6);
const land = svg.append("g");
const shadow = svg
  .append("path")
  .datum({ type: "Sphere" })
  .attr("fill", "url(#shade)")
  .attr("pointer-events", "none");
const marker = svg
  .append("circle")
  .attr("r", 14)
  .attr("fill", "none")
  .attr("stroke", "#e3ffab")
  .attr("stroke-width", 3)
  .attr("pointer-events", "none");
function focusGeometry(f) {
  let geometry = f.geometry;
  if (geometry.type === "MultiPolygon") {
    const polys = geometry.coordinates.map((c) => ({
      type: "Polygon",
      coordinates: c,
    }));
    geometry = polys.sort((a, b) => d3.geoArea(b) - d3.geoArea(a))[0];
  }
  return geometry;
}
function focusPoint(f) {
  return d3.geoCentroid(focusGeometry(f));
}
function queueDraw() {
  if (!pendingDraw)
    pendingDraw = requestAnimationFrame(() => {
      pendingDraw = null;
      draw();
    });
}
function draw() {
  projection.rotate(rotation).scale(220 * zoom);
  sphere.attr("d", path);
  grid.attr("d", path);
  land
    .selectAll("path")
    .attr("d", path)
    .attr("fill", (f) => (f.id === current?.id ? "#e4ff69" : "var(--land)"));
  shadow.attr("d", path);
  if (current) {
    const point = focusPoint(current),
      p = projection(point);
    marker
      .attr("cx", p[0])
      .attr("cy", p[1])
      .attr(
        "display",
        d3.geoArea(current) < 0.00015 &&
          d3.geoDistance(point, projection.invert([300, 267])) < Math.PI / 2
          ? null
          : "none",
      );
  } else marker.attr("display", "none");
}
function center() {
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
function localize() {
  const reset = resetCopy[lang];
  $("resetOpen").setAttribute("aria-label", reset[0]);
  $("resetOpen").title = reset[0];
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
  $("center").title = t("center");
  for (const id of ["globe", "theme", "zoomIn", "zoomOut", "center"])
    $(id).setAttribute("aria-label", t(id));
  document.title = seoCopy[lang][0];
  const about = aboutCopy[lang];
  ["aboutOpen", "aboutTitle"].forEach((id) => ($(id).textContent = about[0]));
  $("aboutBody").textContent = about[1];
  $("aboutSource").textContent = about[2];
  $("aboutClose").textContent = about[3];
  document.querySelector('meta[name="description"]').content = seoCopy[lang][1];
  if (!storage)
    document.querySelector(".session-note").textContent = t("storage");
  document.querySelector(".intro h1").textContent = labels[lang][1];
  document.querySelector(".intro p").textContent = labels[lang][2];
  $("chooseTitle").textContent = labels[lang][0];
  $("changeContinent").textContent = labels[lang][3];
  renderContinents();
  if (state && features.length) render();
}
function idsFor(continent) {
  return features
    .filter(
      (f) => continentFor(names.find((n) => n.ccn3 === f.id)) === continent,
    )
    .map((f) => f.id);
}
function renderContinents() {
  $("continentChoices").replaceChildren();
  if (!features.length) return;
  $("selectionStatus").textContent = "";
  for (const [index, continent] of continents.entries()) {
    const session = sessions[continent];
    const button = document.createElement("button");
    button.className = "continent-card";
    const title = document.createElement("strong");
    title.textContent = labels[lang][7 + index];
    const count = document.createElement("span");
    count.textContent =
      session.answers.length +
      " / " +
      session.order.length +
      " · " +
      labels[lang][6];
    button.append(title, count);
    button.onclick = () => {
      selected = continent;
      document.body.classList.add("playing");
      state = sessions[continent];
      track("continent-select", {
        answered: state.answers.length,
        total: state.order.length,
      });
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
      $("changeContinent").focus();
    };
    $("continentChoices").append(button);
  }
}
$("changeContinent").onclick = () => {
  track("continent-change");
  save();
  cancelAnimationFrame(animation);
  $("gameSection").hidden = true;
  $("gameNavigation").hidden = true;
  $("continentSelection").hidden = false;
  document.body.classList.remove("playing");
  selected = null;
  state = null;
  current = null;
  renderContinents();
  $("chooseTitle").focus();
};
function render() {
  const record = state.answers[state.index];
  const done = state.index >= state.order.length;
  current = features.find((f) => f.id === state.order[state.index]);
  $("position").textContent =
    `${t("country")} ${Math.min(state.index + 1, state.order.length)} / ${state.order.length}`;
  $("score").textContent =
    `${state.answers.filter((a) => a.correct).length} ${t("score")}`;
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
  $("feedback").textContent = done
    ? `${labels[lang][4]} ${state.answers.filter((a) => a.correct).length} / ${state.order.length}`
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
  if (state.index >= state.order.length) {
    track("continent-restart");
    state = {
      order: shuffled(idsFor(selected)),
      index: 0,
      answers: [],
    };
  } else state.index++;
  $("answer").value = "";
  save();
  render();
  center();
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
  for (const continent of continents)
    sessions[continent] = createSession(idsFor(continent));
  legacy = null;
  selected = null;
  state = null;
  current = null;
  try {
    localStorage.removeItem("atlas-progress");
  } catch {
    storage = false;
  }
  save();
  document.body.classList.remove("playing");
  $("gameSection").hidden = true;
  $("gameNavigation").hidden = true;
  $("continentSelection").hidden = false;
  $("answer").value = "";
  renderContinents();
  $("chooseTitle").focus();
});
$("aboutOpen").onclick = () => {
  track("about-open");
  $("aboutDialog").showModal();
};
$("theme").onclick = () => {
  document.body.classList.toggle("light");
  track("theme-change", {
    theme: document.body.classList.contains("light") ? "light" : "dark",
  });
  save();
  draw();
};
localize();
$("selectionStatus").textContent = t("loading");
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
    if (!validSession(sessions[continent], ids))
      sessions[continent] = createSession(ids, legacy);
  }
  $("resetOpen").disabled = false;
  renderContinents();
  draw();
  save();
} catch (error) {
  console.error(error);
  $("selectionStatus").textContent = t("error");
}
