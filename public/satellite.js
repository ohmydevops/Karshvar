// Keep the download status at the bottom unless a nearby control occupies that space.
export function satelliteStatusBottom(
  panel,
  status,
  obstacles,
  inset = 8,
  gap = 8,
) {
  let bottom = inset;
  for (const obstacle of [...obstacles].sort((a, b) => b.top - a.top)) {
    const statusBottom = panel.bottom - bottom;
    const statusTop = statusBottom - status.height;
    if (
      status.left < obstacle.right + gap &&
      status.right > obstacle.left - gap &&
      statusTop < obstacle.bottom + gap &&
      statusBottom > obstacle.top - gap
    )
      bottom = panel.bottom - obstacle.top + gap;
  }
  return bottom;
}

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
  const button = document.createElement("input");
  button.type = "checkbox";
  button.className = "satellite-toggle";
  button.id = "showSatellite";
  button.setAttribute("role", "switch");
  button.checked = false;
  const label = document.createElement("label");
  label.className =
    "population-switch" + (inExplore ? "" : " map-satellite-switch");
  const text = document.createElement("span");
  text.textContent = labels[language] || labels.en;
  label.append(button, text);
  document
    .querySelector(inExplore ? "#explorePanel" : ".map-controls")
    .append(label);
  function reflectState(value) {
    button.checked = value;
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
  const downloadText = document.createElement("span");
  downloadText.className = "satellite-download-copy";
  downloadText.textContent =
    {
      en: "Downloading imagery…",
      fa: "در حال دانلود تصویر…",
      ar: "جارٍ تنزيل الصور…",
      tr: "Görüntü indiriliyor…",
      fr: "Téléchargement de l’image…",
      ru: "Загрузка снимка…",
    }[language] || "Downloading imagery…";
  downloadIndicator.hidden = true;
  downloadIndicator.append(downloadText);
  if (inExplore)
    document.querySelector(".globe-panel").append(downloadIndicator);
  else label.append(downloadIndicator);
  const panel = document.querySelector(".globe-panel");
  const controls = document.querySelector(".map-controls");
  const answers = document.querySelector(".answer-panel");
  const visibleBounds = (elements) =>
    elements
      .filter(
        (element) =>
          element &&
          !element.hidden &&
          element.getBoundingClientRect?.().width > 0,
      )
      .map((element) => element.getBoundingClientRect());
  function placeStatus() {
    if (!panel.getBoundingClientRect) return;
    const panelBounds = panel.getBoundingClientRect();
    if (!inExplore && controls) {
      const bottom = satelliteStatusBottom(
        panelBounds,
        controls.getBoundingClientRect(),
        visibleBounds([answers, credit]),
        16,
      );
      controls.style.bottom = bottom + "px";
    }
    if (!inExplore || downloadIndicator.hidden) return;
    const obstacles = visibleBounds([controls, credit, answers]);
    const bottom = satelliteStatusBottom(
      panelBounds,
      downloadIndicator.getBoundingClientRect(),
      obstacles,
    );
    downloadIndicator.style.bottom = bottom + "px";
  }
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(placeStatus);
    for (const element of [panel, controls, credit, downloadIndicator, answers])
      if (element) observer.observe(element);
    globalThis.addEventListener?.("pagehide", () => observer.disconnect(), {
      once: true,
    });
    globalThis.addEventListener?.("resize", placeStatus);
  }
  let downloads = 0;
  function onDownload(active) {
    downloads = Math.max(0, downloads + (active ? 1 : -1));
    downloadIndicator.hidden = !enabled || downloads === 0;
    placeStatus();
  }
  let enabled = false,
    pixels,
    loading;
  layer.attr("display", "none");
  async function toggle(value) {
    enabled = value;
    reflectState(enabled);
    downloadIndicator.hidden = !enabled || downloads === 0;
    placeStatus();
    if (!enabled) renderer?.pause();
    try {
      localStorage.setItem("atlas-satellite", String(enabled));
    } catch {}
    if (enabled && !pixels) {
      button.setAttribute("aria-busy", "true");
      try {
        const { createSatelliteRenderer } =
          await import("./satellite-renderer.js");
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
        label.title = (labels[language] || labels.en) + " ↻";
      } finally {
        button.removeAttribute("aria-busy");
      }
    }
    redraw();
  }
  button.addEventListener("change", () => toggle(button.checked));
  let initiallyEnabled = false;
  let ready = Promise.resolve();
  try {
    if (localStorage.getItem("atlas-satellite") === "true") {
      initiallyEnabled = true;
      ready = toggle(true);
    }
  } catch {}
  return {
    initiallyEnabled,
    ready,
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
