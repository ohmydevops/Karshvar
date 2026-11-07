export const densityCopy = {
  en: [
    "Population density",
    "People / km²",
    "2025 estimate · ~5.6 km grid",
    "Loading population…",
    "Population layer unavailable. Toggle to retry.",
    "Below 1: transparent",
  ],
  fa: [
    "پراکندگی جمعیت",
    "نفر در کیلومتر مربع",
    "برآورد ۲۰۲۵ · شبکهٔ حدود ۵٫۶ کیلومتری",
    "بارگیری جمعیت…",
    "لایهٔ جمعیت بارگیری نشد؛ دوباره فعال کنید.",
    "کمتر از ۱: شفاف",
  ],
  ar: [
    "الكثافة السكانية",
    "نسمة / كم²",
    "تقدير ٢٠٢٥ · شبكة نحو ٥٫٦ كم",
    "تحميل السكان…",
    "تعذّر تحميل الطبقة. فعّلها مجددًا.",
    "أقل من ١: شفاف",
  ],
  tr: [
    "Nüfus yoğunluğu",
    "Kişi / km²",
    "2025 tahmini · ~5,6 km ızgara",
    "Nüfus yükleniyor…",
    "Katman yüklenemedi. Yeniden açın.",
    "1’in altı: saydam",
  ],
  fr: [
    "Densité de population",
    "Habitants / km²",
    "Estimation 2025 · grille ~5,6 km",
    "Chargement de la population…",
    "Couche indisponible. Réactivez pour réessayer.",
    "Moins de 1 : transparent",
  ],
  ru: [
    "Плотность населения",
    "Человек / км²",
    "Оценка 2025 · сетка ~5,6 км",
    "Загрузка населения…",
    "Слой недоступен. Включите повторно.",
    "Менее 1: прозрачно",
  ],
};

export function mountPopulationLayer(svg, projection, language, redraw) {
  const copy = densityCopy[language] || densityCopy.en;
  const layer = svg
    .append("foreignObject")
    .attr("class", "population-layer")
    .attr("pointer-events", "none")
    .attr("aria-hidden", "true")
    .attr("display", "none");
  const canvas = layer
    .append("xhtml:canvas")
    .style("width", "100%")
    .style("height", "100%")
    .node();
  const label = document.createElement("label");
  label.className = "population-switch";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = "showPopulationDensity";
  input.setAttribute("role", "switch");
  const text = document.createElement("span");
  text.textContent = copy[0];
  label.append(input, text);
  document.getElementById("explorePanel").append(label);

  const legend = document.createElement("aside");
  legend.className = "population-legend";
  legend.hidden = true;
  legend.setAttribute("aria-label", copy[0]);
  const title = document.createElement("strong");
  title.textContent = copy[1];
  const ramp = document.createElement("div");
  ramp.className = "population-ramp";
  ramp.setAttribute("aria-hidden", "true");
  const ticks = document.createElement("div");
  ticks.className = "population-ticks";
  ticks.dir = "ltr";
  for (const value of [1, 10, 100, 1000, 10000]) {
    const tick = document.createElement("span");
    tick.textContent =
      new Intl.NumberFormat(language).format(value) +
      (value === 10000 ? "+" : "");
    const minimum = Math.log1p(1) / Math.log1p(10000);
    const position =
      (Math.log1p(value) / Math.log1p(10000) - minimum) / (1 - minimum);
    tick.style.left = `${position * 100}%`;
    ticks.append(tick);
  }
  const detail = document.createElement("p");
  detail.textContent = copy[2];
  const threshold = document.createElement("p");
  threshold.textContent = copy[5];
  legend.append(title, ramp, ticks, detail, threshold);
  const status = document.createElement("p");
  status.className = "population-status";
  status.setAttribute("role", "status");
  status.hidden = true;
  document.querySelector(".globe-panel").append(legend, status);
  let renderer,
    loaded = false,
    enabled = false,
    disposed = false;
  async function toggle() {
    enabled = input.checked;
    status.hidden = true;
    if (enabled && !loaded) {
      input.disabled = true;
      input.setAttribute("aria-busy", "true");
      status.textContent = copy[3];
      status.hidden = false;
      try {
        const { createPopulationRenderer } =
          await import("./population-renderer.js");
        if (disposed) return;
        renderer = createPopulationRenderer(canvas, projection);
        await renderer.ready();
        if (disposed) {
          renderer.dispose();
          return;
        }
        loaded = true;
        status.hidden = true;
      } catch {
        renderer?.dispose();
        renderer = null;
        enabled = input.checked = false;
        status.textContent = copy[4];
      } finally {
        input.disabled = false;
        input.removeAttribute("aria-busy");
      }
    }
    try {
      localStorage.setItem("atlas-population-density", String(enabled));
    } catch {}
    legend.hidden = !enabled || !loaded;
    if (!disposed) redraw();
  }
  input.addEventListener("change", toggle);
  try {
    input.checked = localStorage.getItem("atlas-population-density") === "true";
  } catch {}
  if (input.checked) toggle();
  window.addEventListener(
    "pagehide",
    (event) => {
      if (event.persisted) return;
      disposed = true;
      renderer?.dispose();
    },
    { once: true },
  );
  return {
    draw(left, top, right, bottom) {
      const active = enabled && loaded;
      layer.attr("display", active ? null : "none");
      if (!active) return;
      layer
        .attr("x", left)
        .attr("y", top)
        .attr("width", right - left)
        .attr("height", bottom - top);
      renderer.draw([left, top, right, bottom]);
    },
  };
}
