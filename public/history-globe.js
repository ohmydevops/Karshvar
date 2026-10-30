import { bindGlobeGestures } from "./gestures.js";
export function latestAnswers(sessions) {
  const records = new Map();
  for (const session of Object.values(sessions))
    for (const a of session?.answers || []) {
      const previous = records.get(a.id);
      if (
        !previous ||
        (Date.parse(a.date) || 0) >= (Date.parse(previous.date) || 0)
      )
        records.set(a.id, a);
    }
  return [...records.values()];
}
export function mountHistoryGlobe(
  host,
  { features, answers, name, copy, status, fill },
) {
  const d3 = globalThis.d3;
  const make = (tag, text) => {
    const e = document.createElement(tag);
    if (text) e.textContent = text;
    return e;
  };
  const labels = {
    en: [
      "Select an answered country",
      "Drag to rotate. Use arrow keys to rotate; + and − to zoom. Latest saved result per country.",
    ],
    fa: [
      "یک کشور پاسخ‌داده‌شده انتخاب کن",
      "برای چرخاندن بکشید یا از کلیدهای جهت استفاده کنید؛ + و − برای بزرگ‌نمایی. آخرین نتیجه ذخیره‌شده هر کشور.",
    ],
    ar: [
      "اختر بلداً أجبت عنه",
      "اسحب أو استخدم الأسهم للدوران؛ + و − للتكبير. آخر نتيجة محفوظة لكل بلد.",
    ],
    tr: [
      "Yanıtlanan bir ülke seç",
      "Döndürmek için sürükle veya ok tuşlarını kullan; yakınlaştırmak için + ve −. Her ülkenin son kaydı.",
    ],
    fr: [
      "Choisir un pays déjà répondu",
      "Glissez ou utilisez les flèches pour tourner ; + et − pour zoomer. Dernier résultat par pays.",
    ],
    ru: [
      "Выберите страну с ответом",
      "Перетаскивайте или используйте стрелки; + и − меняют масштаб. Последний результат для каждой страны.",
    ],
  }[document.documentElement.lang];
  const hint = make("p", labels[1]);
  hint.className = "history-note";
  host.append(hint);
  const svg = d3
    .select(host)
    .append("svg")
    .attr("viewBox", "0 0 600 480")
    .attr("class", "history-globe")
    .attr("tabindex", 0)
    .attr("role", "img")
    .attr("aria-label", labels[1]);
  const projection = d3
    .geoOrthographic()
    .translate([300, 240])
    .scale(220)
    .clipAngle(90);
  const geo = d3.geoPath(projection);
  let rotation = [-30, -20, 0],
    scale = 220,
    moved = false;
  const ocean = svg
    .append("path")
    .datum({ type: "Sphere" })
    .attr("fill", "var(--ocean)");
  const land = svg
    .append("g")
    .selectAll("path")
    .data(features)
    .join("path")
    .attr("fill", (f) => fill(f.id, null, answers))
    .attr("stroke", "var(--bg)")
    .attr("stroke-width", 0.6);
  land.append("title").text((f) => {
    const a = answers.find((a) => a.id === f.id);
    return (
      name(f.id) +
      (a ? " — " + copy[{ correct: 2, wrong: 3, revealed: 4 }[status(a)]] : "")
    );
  });
  const legend = make("div");
  legend.className = "history-legend";
  for (const [key, index] of [
    ["correct", 2],
    ["wrong", 3],
    ["revealed", 4],
  ]) {
    const span = make("span", copy[index]);
    span.className = "history-status " + key;
    legend.append(span);
  }
  host.append(legend);
  const draw = () => {
    projection.rotate(rotation).scale(scale);
    ocean.attr("d", geo);
    land.attr("d", geo);
  };
  bindGlobeGestures(svg.node(), {
    onStart: () => {
      moved = false;
    },
    onRotate: (dx, dy) => {
      moved = true;
      rotation[0] += dx * 0.3;
      rotation[1] = Math.max(-85, Math.min(85, rotation[1] - dy * 0.3));
      draw();
    },
    onZoom: (factor) => {
      scale = Math.max(160, Math.min(600, scale * factor));
      draw();
    },
    onEnd: () => {},
  });
  svg.node().addEventListener("keydown", (e) => {
    if (
      ![
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "+",
        "-",
        "=",
      ].includes(e.key)
    )
      return;
    e.preventDefault();
    if (e.key === "ArrowLeft") rotation[0] -= 10;
    if (e.key === "ArrowRight") rotation[0] += 10;
    if (e.key === "ArrowUp") rotation[1] += 10;
    if (e.key === "ArrowDown") rotation[1] -= 10;
    if (e.key === "+" || e.key === "=") scale *= 1.15;
    if (e.key === "-") scale /= 1.15;
    scale = Math.max(160, Math.min(600, scale));
    rotation[1] = Math.max(-85, Math.min(85, rotation[1]));
    draw();
  });
  draw();
}
