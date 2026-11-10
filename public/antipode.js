export function antipode([longitude, latitude]) {
  return [((((longitude + 360) % 360) + 360) % 360) - 180, -latitude];
}

const copy = {
  en: [
    "Other side of Earth",
    "Tap anywhere on the globe to see exactly what is on the other side.",
    "Selected point",
    "Opposite point",
    "Ocean / water",
    "My location",
    "Locating…",
    "Location unavailable. Choose a point on the globe.",
    "Use globe center",
  ],
  fa: [
    "اون‌طرف زمین",
    "یک نقطه روی کره انتخاب کن تا ببینی دقیقاً اون‌طرفش کجاست.",
    "نقطهٔ انتخابی",
    "نقطهٔ مقابل",
    "اقیانوس / آب",
    "موقعیت من",
    "در حال پیدا کردن موقعیت…",
    "موقعیت در دسترس نیست؛ یک نقطه روی کره انتخاب کن.",
    "انتخاب مرکز کره",
  ],
  ar: [
    "الجانب الآخر من الأرض",
    "اضغط على أي نقطة على الكرة لرؤية النقطة المقابلة تمامًا.",
    "النقطة المختارة",
    "النقطة المقابلة",
    "محيط / مياه",
    "موقعي",
    "جارٍ تحديد الموقع…",
    "الموقع غير متاح. اختر نقطة على الكرة.",
    "اختيار مركز الكرة",
  ],
  tr: [
    "Dünyanın öbür tarafı",
    "Tam karşısında ne olduğunu görmek için kürede bir noktaya dokun.",
    "Seçilen nokta",
    "Karşı nokta",
    "Okyanus / su",
    "Konumum",
    "Konum bulunuyor…",
    "Konum alınamadı. Kürede bir nokta seç.",
    "Kürenin merkezini seç",
  ],
  fr: [
    "De l’autre côté de la Terre",
    "Touchez un point du globe pour découvrir son exact opposé.",
    "Point choisi",
    "Point opposé",
    "Océan / eau",
    "Ma position",
    "Localisation…",
    "Position indisponible. Choisissez un point sur le globe.",
    "Choisir le centre du globe",
  ],
  ru: [
    "Обратная сторона Земли",
    "Нажмите на точку глобуса, чтобы увидеть, что точно напротив.",
    "Выбранная точка",
    "Противоположная точка",
    "Океан / вода",
    "Моё местоположение",
    "Определение местоположения…",
    "Местоположение недоступно. Выберите точку на глобусе.",
    "Выбрать центр глобуса",
  ],
};

// Keep the mode and selected pair when Explore rebuilds its continent controls.
let enabled = false;
let origin = null;
export function mountAntipode({
  svg,
  projection,
  lang,
  settingsAnchor,
  describe,
  flyTo,
  queueDraw,
  onEnable,
  onChange = () => {},
}) {
  const t = copy[lang] || copy.en;
  let disposed = false;
  const label = document.createElement("label");
  label.className = "population-switch";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = "showAntipode";
  input.setAttribute("role", "switch");
  input.checked = enabled;
  const title = document.createElement("span");
  title.textContent = t[0];
  label.append(input, title);
  settingsAnchor.after(label);

  const panel = document.createElement("aside");
  panel.className = "antipode-panel";
  panel.setAttribute("aria-label", t[0]);
  const heading = document.createElement("strong");
  heading.textContent = t[0];
  const help = document.createElement("p");
  help.textContent = t[1];
  const pair = document.createElement("div");
  pair.className = "antipode-pair";
  pair.setAttribute("aria-live", "polite");
  const actions = document.createElement("div");
  actions.className = "antipode-actions";
  const locate = document.createElement("button");
  locate.type = "button";
  locate.textContent = t[5];
  const status = document.createElement("p");
  status.className = "antipode-status";
  status.setAttribute("role", "status");
  status.hidden = true;
  actions.append(locate);
  panel.append(heading, help, pair, actions, status);
  svg.node().parentElement.append(panel);

  const markers = svg
    .append("g")
    .attr("class", "antipode-markers")
    .attr("pointer-events", "none");
  const tunnel = markers
    .append("line")
    .attr("stroke", "#ffdc91")
    .attr("stroke-width", 12)
    .attr("stroke-opacity", 0.16);
  const segments = markers
    .selectAll("line.antipode-segment")
    .data([0, 1])
    .join("line")
    .attr("class", "antipode-segment")
    .attr("stroke", (i) => (i ? "#ffbd4a" : "#42d9d0"))
    .attr("stroke-width", 2.5)
    .attr("stroke-linecap", "round");
  const core = markers
    .append("circle")
    .attr("r", 4)
    .attr("fill", "#fff")
    .attr("stroke", "#ffbd4a");
  const dots = markers
    .selectAll("circle.antipode-dot")
    .data([0, 1])
    .join("circle")
    .attr("class", "antipode-dot")
    .attr("r", 7)
    .attr("fill", (i) => (i ? "#ffbd4a" : "#42d9d0"))
    .attr("stroke", "#10243f")
    .attr("stroke-width", 2);
  const endpointLabels = markers
    .selectAll("text")
    .data([0, 1])
    .join("text")
    .attr("text-anchor", "middle")
    .attr("dy", -16)
    .attr("class", "antipode-endpoint-label");
  let places = [];
  function render() {
    panel.hidden = !enabled;
    panel.dataset.selected = String(Boolean(origin));
    svg.classed("antipode-active", enabled);
    svg.node().parentElement.classList.toggle("antipode-mode", enabled);
    pair.replaceChildren();
    places = origin
      ? [origin, antipode(origin)].map((point) => describe(point))
      : [];
    if (!origin) return;
    [origin, antipode(origin)].forEach((point, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "antipode-point";
      const caption = document.createElement("span");
      caption.textContent = t[index + 2];
      const place = document.createElement("strong");
      place.textContent = places[index]?.label || t[4];
      const coords = document.createElement("bdi");
      coords.dir = "ltr";
      coords.textContent = `${point[1].toFixed(3)}°, ${point[0].toFixed(3)}°`;
      button.append(caption, place, coords);
      button.onclick = () => flyTo(pairView(point));
      pair.append(button);
    });
    endpointLabels.text((i) => places[i]?.label || t[4]);
  }
  function select(point) {
    if (!enabled || disposed || !point?.every(Number.isFinite)) return;
    origin = point;
    status.hidden = true;
    render();
    queueDraw();
    // Turn to an oblique view so the diameter through Earth has visible depth.
    flyTo(pairView(point));
  }
  function pairView(point) {
    return globalThis.d3.geoRotation([-point[0], -point[1], 0]).invert([60, 0]);
  }
  locate.onclick = () => {
    status.textContent = t[6];
    status.hidden = false;
    locate.disabled = true;
    const failed = () => {
      if (disposed) return;
      locate.disabled = false;
      status.textContent = t[7];
    };
    if (!navigator.geolocation) return failed();
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (disposed) return;
        locate.disabled = false;
        if (!enabled) return;
        const point = [coords.longitude, coords.latitude];
        select(point);
      },
      failed,
      { timeout: 10000, maximumAge: 60000 },
    );
  };
  input.onchange = () => {
    enabled = input.checked;
    origin = null;
    status.hidden = true;
    if (enabled) {
      onEnable();
    }
    render();
    onChange();
    queueDraw();
  };
  render();
  return {
    get active() {
      return enabled;
    },
    get countryIds() {
      return new Set(places.filter(Boolean).map((place) => place.id));
    },
    color(id) {
      const index = places.findIndex((place) => place?.id === id);
      return index < 0 ? null : index ? "#ffbd4a" : "#42d9d0";
    },
    disable() {
      input.checked = false;
      enabled = false;
      render();
      onChange();
      queueDraw();
    },
    select,
    tap(x, y) {
      const matrix = svg.node().getScreenCTM();
      if (!matrix) return;
      const p = new DOMPoint(x, y).matrixTransform(matrix.inverse());
      const [cx, cy] = projection.translate();
      if (Math.hypot(p.x - cx, p.y - cy) > projection.scale()) return;
      select(projection.invert([p.x, p.y]));
    },
    draw() {
      markers.attr("display", enabled && origin ? null : "none");
      if (!enabled || !origin) return;
      const mapScale = svg.node().getScreenCTM()?.a || 1;
      dots.attr("r", 5 / mapScale).attr("stroke-width", 1.5 / mapScale);
      endpointLabels
        .style("font-size", `${12 / mapScale}px`)
        .style("stroke-width", `${3 / mapScale}px`)
        .attr("dy", -13 / mapScale);
      segments.attr("stroke-width", 2 / mapScale);
      tunnel.attr("stroke-width", 9 / mapScale);
      const center = projection.invert(projection.translate());
      const points = [origin, antipode(origin)].map((point) =>
        projection(point),
      );
      const [cx, cy] = projection.translate();
      tunnel
        .attr("x1", points[0][0])
        .attr("y1", points[0][1])
        .attr("x2", points[1][0])
        .attr("y2", points[1][1]);
      core.attr("cx", cx).attr("cy", cy);
      segments.each(function (index) {
        const behind =
          globalThis.d3.geoDistance(index ? antipode(origin) : origin, center) >
          Math.PI / 2;
        this.setAttribute("x1", cx);
        this.setAttribute("y1", cy);
        this.setAttribute("x2", points[index][0]);
        this.setAttribute("y2", points[index][1]);
        this.setAttribute("stroke-dasharray", behind ? "5 5" : "none");
        this.setAttribute("opacity", behind ? "0.65" : "1");
      });
      endpointLabels
        .attr("x", (i) => points[i][0])
        .attr("y", (i) => points[i][1]);
      dots.each(function (index) {
        const point = index ? antipode(origin) : origin;
        const [x, y] = projection(point);
        this.setAttribute("cx", x);
        this.setAttribute("cy", y);
        const behind = globalThis.d3.geoDistance(point, center) > Math.PI / 2;
        this.setAttribute("fill-opacity", behind ? "0.35" : "1");
        this.setAttribute("stroke-dasharray", behind ? "3 2" : "none");
      });
    },
    destroy() {
      disposed = true;
      label.remove();
      panel.remove();
      markers.remove();
      svg.classed("antipode-active", false);
      svg.node().parentElement.classList.remove("antipode-mode");
    },
  };
}
