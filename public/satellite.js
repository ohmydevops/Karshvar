import { createSatelliteRenderer } from "./satellite-renderer.js";
// Reproject the bundled Earth image into the same orthographic view as the map.
export function mountSatellite(svg, projection, language, redraw) {
  const labels = {
    en: "Satellite",
    fa: "ماهواره‌ای",
    ar: "صور الأقمار الصناعية",
    tr: "Uydu",
    fr: "Satellite",
    ru: "Спутник",
  };
  const layer = svg
    .append("foreignObject")
    .attr("pointer-events", "none")
    .attr("aria-hidden", "true");
  const canvas = layer
    .append("xhtml:canvas")
    .style("width", "100%")
    .style("height", "100%")
    .node();
  let renderer;
  const inExplore = document.documentElement?.dataset.page === "explore";
  const button = document.createElement(inExplore ? "input" : "button");
  button.type = "button";
  button.className = "satellite-toggle";
  button.textContent = labels[language] || labels.en;
  button.setAttribute("aria-pressed", "false");
  if (inExplore) {
    button.type = "checkbox";
    button.id = "showSatellite";
    button.setAttribute("role", "switch");
    button.removeAttribute("aria-pressed");
    button.checked = false;
    const label = document.createElement("label");
    label.className = "population-switch";
    const text = document.createElement("span");
    text.textContent = labels[language] || labels.en;
    label.append(button, text);
    document.querySelector("#explorePanel").append(label);
  } else document.querySelector(".map-controls").append(button);
  function reflectState(value) {
    if (inExplore) button.checked = value;
    else button.setAttribute("aria-pressed", String(value));
  }
  const credit = document.createElement("a");
  credit.className = "satellite-credit";
  credit.href = "https://www.earthdata.nasa.gov/data/tools/gibs";
  credit.textContent = "NASA GIBS / MODIS";
  credit.hidden = true;
  document.querySelector(".globe-panel").append(credit);
  const downloadIndicator = document.createElement("div");
  downloadIndicator.className = "satellite-download";
  downloadIndicator.setAttribute("role", "status");
  downloadIndicator.setAttribute("aria-live", "polite");
  downloadIndicator.textContent =
    {
      en: "Downloading imagery…",
      fa: "در حال دانلود تصویر…",
      ar: "جارٍ تنزيل الصور…",
      tr: "Görüntü indiriliyor…",
      fr: "Téléchargement de l’image…",
      ru: "Загрузка снимка…",
    }[language] || "Downloading imagery…";
  downloadIndicator.hidden = true;
  document.querySelector(".globe-panel").append(downloadIndicator);
  let downloads = 0;
  function onDownload(active) {
    downloads = Math.max(0, downloads + (active ? 1 : -1));
    downloadIndicator.hidden = !enabled || downloads === 0;
  }
  let enabled = false,
    pixels,
    loading;
  layer.attr("display", "none");
  async function toggle(value) {
    enabled = value;
    reflectState(enabled);
    downloadIndicator.hidden = !enabled || downloads === 0;
    if (!enabled) renderer?.pause();
    try {
      localStorage.setItem("atlas-satellite", String(enabled));
    } catch {}
    if (enabled && !pixels) {
      button.setAttribute("aria-busy", "true");
      try {
        renderer ||= createSatelliteRenderer(
          canvas,
          projection,
          redraw,
          onDownload,
        );
        loading ||= renderer.ready();
        await loading;
        pixels = true;
      } catch {
        enabled = false;
        loading = null;
        reflectState(false);
        try {
          localStorage.setItem("atlas-satellite", "false");
        } catch {}
        button.textContent = (labels[language] || labels.en) + " ↻";
      } finally {
        button.removeAttribute("aria-busy");
      }
    }
    redraw();
  }
  button.addEventListener(inExplore ? "change" : "click", () =>
    toggle(inExplore ? button.checked : !enabled),
  );
  try {
    if (localStorage.getItem("atlas-satellite") === "true") toggle(true);
  } catch {}
  return {
    get active() {
      return enabled && !!pixels;
    },
    draw(left, top, right, bottom) {
      layer.attr("display", this.active ? null : "none");
      credit.hidden = !this.active;
      if (!this.active) return;
      layer
        .attr("x", left)
        .attr("y", top)
        .attr("width", right - left)
        .attr("height", bottom - top);
      renderer.draw([left, top, right, bottom]);
    },
  };
}
