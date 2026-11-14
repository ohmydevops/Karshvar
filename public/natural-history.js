import { createSettingsDialog } from "./settings-dialog.js";
import { naturalHistoryText } from "./natural-history-i18n.js";
import { homininColors } from "./fossil-data.js";
const homininPalette = Object.entries(homininColors);
export function mountNaturalHistory({ svg, projection, lang, redraw, focus }) {
  svg.attr("role", "group");
  svg.selectAll(":scope > *").attr("aria-hidden", "true");
  const fa = lang === "fa";
  document.querySelectorAll("[data-language]").forEach((link) => {
    link.href = `./${link.dataset.language}/natural-history/`;
  });
  const t = (faText, en, values) =>
    naturalHistoryText(lang, faText, en, values);
  const make = (tag, text, cls) => {
    const el = document.createElement(tag);
    if (text) el.textContent = text;
    if (cls) el.className = cls;
    return el;
  };
  const number = new Intl.NumberFormat(lang, { maximumFractionDigits: 4 });
  const welcomeKey = "karshvar:natural-history:welcome-dismissed";
  let welcomeHandled = false;
  function showWelcomeOnce() {
    if (welcomeHandled) return;
    welcomeHandled = true;
    try {
      if (localStorage.getItem(welcomeKey) === "1") return;
    } catch {}
    showWelcome();
  }
  function showWelcome() {
    const welcome = make("dialog", null, "fossil-dialog fossil-welcome");
    welcome.setAttribute("aria-labelledby", "fossil-welcome-title");
    const title = make(
      "h2",
      t("به بهتر شدن این اطلس کمک کنید", "Help improve this atlas"),
    );
    title.id = "fossil-welcome-title";
    const intro = make(
      "p",
      t(
        "این بخش همچنان در حال تکمیل و بهبود است. شما هم می‌توانید کمک کنید تا کامل‌تر و دقیق‌تر شود.",
        "This section is still being expanded and improved. You can help make it more complete and accurate.",
      ),
    );
    const invite = make(
      "p",
      t(
        "اگر اشکال یا خطایی دیدید، پیشنهادی دارید یا دوست دارید در تکمیل این بخش کمک کنید، به من ایمیل بزنید:",
        "If you spot an error, have a suggestion or would like to contribute, please email me:",
      ),
    );
    const contact = make("p", "info@karshvar.ir");
    contact.dir = "ltr";
    const dismiss = make("button", t("متوجه شدم", "Got it"));
    dismiss.type = "button";
    dismiss.autofocus = true;
    dismiss.onclick = () => welcome.close();
    welcome.append(title, intro, invite, contact, dismiss);
    welcome.addEventListener(
      "close",
      () => {
        try {
          localStorage.setItem(welcomeKey, "1");
        } catch {}
        welcome.remove();
      },
      { once: true },
    );
    document.body.append(welcome);
    welcome.showModal();
  }
  const heading = document.querySelector(".explore-heading");
  const experimental = make("button", "Experimental", "fossil-experimental");
  experimental.type = "button";
  experimental.lang = "en";
  experimental.setAttribute("aria-haspopup", "dialog");
  experimental.onclick = showWelcome;
  heading.before(experimental);
  heading.querySelector("h1").textContent = t(
    "اطلس کشفیات فسیلی",
    "Fossil discovery atlas",
  );
  heading.querySelector("p").textContent = t(
    "انسان‌تبارها؛ ردّ زندگی گذشته روی زمینِ امروز. یک نقطه را برای دیدن کشفیات و منابع انتخاب کنید.",
    "Hominins: traces of past life on today’s Earth. Select a point to explore finds and sources.",
  );
  const bar = make("form", null, "fossil-controls explore-settings-bar");
  bar.onsubmit = (e) => e.preventDefault();
  const controls = {};
  const controlLabels = {};
  const filterCookie = "karshvar-fossil-filters";
  const filterKeys = ["sapiens", "neanderthal", "hominin"];
  const savedFilters = document.cookie
    .split(/;\s*/)
    .find((entry) => entry.startsWith(filterCookie + "="))
    ?.slice(filterCookie.length + 1);
  function input(key, label, type, value) {
    const wrap = make("label", null, "population-switch " + key);
    wrap.style.setProperty("--fossil-color", homininColors[key]);
    const el = make("input");
    el.type = type;
    el.setAttribute("role", "switch");
    el.id = "fossil-" + key;
    if (type === "checkbox") el.checked = value;
    else el.value = value;

    const caption = make("span", label);
    controlLabels[key] = { caption, label };
    wrap.append(el, caption);
    bar.append(wrap);
    controls[key] = el;
    return el;
  }
  input("sapiens", t("هومو ساپینس", "Homo sapiens"), "checkbox", true);
  input("neanderthal", t("نئاندرتال", "Neanderthals"), "checkbox", true);
  input("hominin", t("سایر انسان‌تبارها", "Other hominins"), "checkbox", true);
  if (/^[01]{3}$/.test(savedFilters ?? "")) {
    filterKeys.forEach((key, index) => {
      controls[key].checked = savedFilters[index] === "1";
    });
  }
  const satelliteControl = document.querySelector(".satellite-control");
  if (satelliteControl) bar.append(satelliteControl);
  const satelliteStatus = satelliteControl?.querySelector(
    ".satellite-download",
  );
  if (satelliteStatus) {
    satelliteStatus.classList.add("fossil-imagery-status");
    document.querySelector(".globe-panel").append(satelliteStatus);
  }
  heading.append(bar);
  const settingsLabel =
    {
      en: "Map settings",
      fa: "تنظیمات نقشه",
      ar: "إعدادات الخريطة",
      tr: "Harita ayarları",
      fr: "Réglages de la carte",
      ru: "Настройки карты",
    }[lang] || "Map settings";
  const settingsOpen = make(
    "button",
    settingsLabel + " ▾",
    "fossil-settings-open",
  );
  settingsOpen.type = "button";
  settingsOpen.setAttribute("aria-haspopup", "dialog");
  const { dialog: settingsDialog, content: settingsContent } =
    createSettingsDialog({
      id: "fossil-settings-title",
      title: settingsLabel,
      closeLabel: t("بستن", "Close"),
      className: "fossil-settings-dialog",
    });
  heading.append(settingsOpen);
  settingsOpen.onclick = () => settingsDialog.showModal();
  const mobileSettings = matchMedia("(max-width: 760px)");
  const arrangeSettings = () => {
    if (mobileSettings.matches) settingsContent.append(bar);
    else {
      settingsDialog.close();
      heading.append(bar);
    }
  };
  mobileSettings.addEventListener("change", arrangeSettings);
  arrangeSettings();
  const status = make(
    "p",
    t("در حال بارگذاری کشفیات…", "Loading fossil records…"),
    "fossil-status",
  );
  status.setAttribute("role", "status");
  heading.append(status);
  heading.append(
    make(
      "p",
      t(
        "فیروزه‌ای: هومو ساپینس · نارنجی: نئاندرتال · بنفش: سایر انسان‌تبارها. نقاط مشترک چندرنگ‌اند. زمان‌ها سن تخمینی فسیل‌اند، نه سال کشف. نقاط نزدیک گروه‌بندی شده‌اند.",
        "Teal: Homo sapiens · Orange: Neanderthals · Purple: other hominins. Shared sites use multiple colors. Dates are estimated fossil ages, not discovery years. Nearby records are grouped.",
      ),
      "fossil-note",
    ),
  );
  const credit = make("p", null, "fossil-note");
  credit.append(
    make(
      "span",
      t(
        "پوشش نقشه شامل یافته‌هایی است که منابع پژوهشی، موزه‌ای یا پایگاه‌های تخصصی برای آن‌ها بقایای جسمی انسان‌تبار ثبت کرده‌اند. مختصات می‌تواند تقریبی باشد.",
        "The map shows physical hominin remains documented by research, museum, or specialist database records. Locations may be approximate.",
      ),
    ),
  );
  const source = make("a", "PBDB · CC BY 4.0");
  source.href = "https://paleobiodb.org";
  source.target = "_blank";
  source.rel = "noopener";
  credit.append(source);
  heading.append(credit);
  const methodology = make("details", null, "fossil-methodology");
  methodology.append(
    make(
      "summary",
      t("راهنمای رنگ‌ها، زمان و منابع", "Legend, ages and sources"),
    ),
  );
  for (const note of heading.querySelectorAll(".fossil-note"))
    methodology.append(note);

  const list = make("details", null, "fossil-results");
  list.append(
    make(
      "summary",
      t("فهرست نقاط؛ دسترسی با صفحه‌کلید", "Site list; keyboard accessible"),
    ),
  );
  const listBody = make("div", null, "fossil-site-list");
  list.append(listBody);
  document.querySelector(".globe-panel").parentElement.after(list);
  const dialog = make("dialog", null, "fossil-dialog fossil-site-dialog");
  dialog.setAttribute("aria-labelledby", "fossil-dialog-title");
  document.body.append(dialog);
  const header = make("div", null, "fossil-site-header");
  const title = make("h2", t("کشفیات این ناحیه", "Finds in this area"));
  title.id = "fossil-dialog-title";
  const close = make("button", null, "fossil-site-close");
  close.setAttribute("aria-label", t("بستن", "Close"));
  close.type = "button";
  close.onclick = () => dialog.close();
  title.dir = "auto";
  header.append(title, close);
  const content = make("div");
  dialog.append(header, content, methodology);
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        dialog.close();
    }
  });
  const worker = new Worker(new URL("./fossil-worker.js", import.meta.url), {
    type: "module",
  });
  let version = 0,
    groups = [],
    visible = [],
    selected = null,
    listPage = 0;
  const layer = svg
    .append("foreignObject")
    .attr("class", "fossil-layer")
    .attr("pointer-events", "none")
    .attr("aria-hidden", "true");
  const canvas = layer
    .append("xhtml:canvas")
    .style("width", "100%")
    .style("height", "100%")
    .node();
  const ctx = canvas.getContext("2d");
  function request() {
    selected = null;
    status.textContent = t("در حال فیلتر کردن…", "Filtering…");
    worker.postMessage({
      type: "filter",
      version: ++version,
      filters: {
        sapiens: controls.sapiens.checked,
        neanderthal: controls.neanderthal.checked,
        hominin: controls.hominin.checked,
        older: Infinity,
        younger: 0,
        query: "",
      },
    });
  }
  bar.addEventListener("change", (event) => {
    if (filterKeys.some((key) => controls[key] === event.target)) {
      const value = filterKeys
        .map((key) => Number(controls[key].checked))
        .join("");
      document.cookie = `${filterCookie}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    }
    request();
  });
  function show(group) {
    selected = group.id;
    worker.postMessage({ type: "details", id: group.id });
  }
  function renderList() {
    listBody.replaceChildren();
    for (const g of groups.slice(listPage * 60, (listPage + 1) * 60)) {
      const b = make(
        "button",
        `${(fa && g.nameFa) || g.name} · ${number.format(g.count)} · ${number.format(g.lat)}, ${number.format(g.lon)}`,
      );
      b.onclick = () => {
        list.open = false;
        svg.node().focus();
        focus([g.lon, g.lat]);
        show(g);
      };
      listBody.append(b);
    }
    if (groups.length > 60) {
      for (const [label, delta] of [
        [t("قبلی", "Previous"), -1],
        [t("بعدی", "Next"), 1],
      ]) {
        const b = make("button", label);
        b.disabled =
          listPage + delta < 0 || (listPage + delta) * 60 >= groups.length;
        b.onclick = () => {
          listPage += delta;
          renderList();
        };
        listBody.append(b);
      }
    }
  }
  function showRecords(records) {
    content.replaceChildren();
    const site = records[0];
    function addFact(facts, label, value, direction = "auto") {
      if (!value) return;
      const detail = make("dd", value);
      detail.dir = direction;
      const field = make("div", null, "fossil-field");
      field.append(make("dt", label), detail);
      facts.append(field);
    }
    const location = make("dl", null, "fossil-facts fossil-location");
    let country = site.country;
    try {
      country = new Intl.DisplayNames([lang, "en"], { type: "region" }).of(
        site.country,
      );
    } catch {}
    addFact(location, t("کشور", "Country"), country);
    addFact(location, t("منطقه", "Region"), site.region);
    addFact(location, t("عرض جغرافیایی", "Latitude"), String(site.lat), "ltr");
    addFact(location, t("طول جغرافیایی", "Longitude"), String(site.lon), "ltr");
    const heading = make(
      "h3",
      t("یافته‌های محوطه ({count})", "Site finds ({count})", {
        count: number.format(records.length),
      }),
      "fossil-finds-title",
    );
    content.append(location, heading);
    let shown = 0;
    const add = () => {
      for (const r of records.slice(shown, shown + 20)) {
        const article = make("article", null, "fossil-find");
        const findTitle = make("h4", r.individualName || r.name);
        findTitle.dir = "auto";
        article.append(findTitle);
        const facts = make("dl", null, "fossil-facts");
        const ageLabel = (fa && r.ageLabel?.fa) || r.ageLabel?.en;
        const bounds = [r.younger, r.older];
        const age =
          ageLabel ||
          (bounds.every(Number.isFinite)
            ? t("{age} میلیون سال پیش", "{age} million years ago", {
                age: bounds.map((value) => number.format(value)).join(" – "),
              })
            : t("ثبت نشده", "Unreported"));
        if (r.individualName) addFact(facts, t("گونه", "Species"), r.name);
        addFact(facts, t("قدمت", "Age"), age);
        addFact(
          facts,
          t("دورهٔ زمین‌شناسی", "Geological interval"),
          r.interval,
        );
        article.append(facts);
        const sources = make("details", null, "fossil-sources");
        sources.append(make("summary", t("منابع علمی", "Scientific sources")));
        for (const ref of r.references || []) {
          const entry = make("div");
          entry.append(make("strong", ref.provider), make("p", ref.citation));
          const links = new Map([
            [ref.recordUrl, t("صفحهٔ رکورد ↗", "Record page ↗")],
          ]);
          if (ref.referenceUrl !== ref.recordUrl)
            links.set(
              ref.referenceUrl,
              t("مرجع علمی ↗", "Scientific reference ↗"),
            );
          if (ref.catalogUrl && !links.has(ref.catalogUrl))
            links.set(ref.catalogUrl, t("پایگاه داده ↗", "Database ↗"));
          for (const [url, label] of links) {
            if (!url) continue;
            const row = make("p");
            const link = make("a", label);
            link.href = url;
            link.target = "_blank";
            link.rel = "noopener";
            row.append(link);
            entry.append(row);
          }
          sources.append(entry);
        }
        if (r.datingSource) {
          const p = make("p");
          const link = make("a", t("منبع تاریخ‌گذاری ↗", "Dating source ↗"));
          link.href = r.datingSource;
          link.target = "_blank";
          link.rel = "noopener";
          p.append(link);
          sources.append(p);
        }
        if (r.coordinateSource) {
          const p = make("p");
          const link = make(
            "a",
            t("منبع موقعیت جغرافیایی ↗", "Location source ↗"),
          );
          link.href = r.coordinateSource;
          link.target = "_blank";
          link.rel = "noopener";
          p.append(link);
          sources.append(p);
        }
        article.append(sources);
        content.append(article);
      }
      shown += 20;
      if (shown < records.length) {
        const more = make("button", t("کشفیات بیشتر", "More finds"));
        more.onclick = () => {
          more.remove();
          add();
        };
        content.append(more);
      }
    };
    add();
  }
  worker.onmessage = ({ data }) => {
    if (data.type === "error") {
      status.classList.add("fossil-error");
      status.textContent = t(
        "داده‌ها بارگیری نشدند.",
        "Could not load fossil data.",
      );
      const retry = make("button", t("تلاش دوباره", "Retry"));
      retry.onclick = () => location.reload();
      status.append(retry);
      return;
    }
    if (data.type === "details") {
      if (data.id !== selected) return;
      const group = groups.find((g) => g.id === data.id);
      selected = null;
      if (group && data.records.length) {
        title.textContent = (fa && group.nameFa) || group.name;
        showRecords(data.records);
        if (!dialog.open) dialog.showModal();
      }
      return;
    }
    if (data.version !== version) return;
    for (const [key, { caption, label }] of Object.entries(controlLabels)) {
      caption.textContent = `${label} (${number.format(data.totals[key])})`;
    }
    groups = data.groups;
    listPage = 0;
    renderList();
    status.textContent = data.count
      ? t(
          "{count} رکورد در {points} نقطه · به‌روزرسانی داده: {date}",
          "{count} records in {points} points · Snapshot: {date}",
          {
            count: number.format(data.count),
            points: number.format(groups.length),
            date: data.retrieved,
          },
        )
      : t(
          "برای دیدن کشفیات، یکی از گروه‌ها را روشن کنید.",
          "Enable a group to see fossil finds.",
        );
    redraw();
    showWelcomeOnce();
  };
  worker.onerror = () => {
    status.classList.add("fossil-error");
    status.textContent = t(
      "بارگذاری داده ناموفق بود؛ صفحه را دوباره بارگذاری کنید.",
      "Could not load data; reload the page.",
    );
  };
  request();
  return {
    draw(x0, y0, x1, y1) {
      const w = x1 - x0,
        h = y1 - y0;
      if (w <= 0 || h <= 0) return;
      layer.attr("x", x0).attr("y", y0).attr("width", w).attr("height", h);
      const width = Math.ceil(w * 2),
        height = Math.ceil(h * 2);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      ctx.setTransform(2, 0, 0, 2, -x0 * 2, -y0 * 2);
      ctx.clearRect(x0, y0, w, h);
      visible = [];
      const center = projection.invert(projection.translate());
      for (const g of groups) {
        if (
          globalThis.d3.geoDistance([g.lon, g.lat], center) >
          Math.PI / 2 - 0.012
        )
          continue;
        const [x, y] = projection([g.lon, g.lat]);
        if (x < x0 - 10 || x > x1 + 10 || y < y0 - 10 || y > y1 + 10) continue;
        const radius = Math.min(7, 3 + Math.log2(g.count + 1) * 0.55);
        let angle = -Math.PI / 2;
        for (const [category, color] of homininPalette) {
          const count = g.categories[category] || 0;
          if (!count) continue;
          const end = angle + (count / g.count) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.arc(x, y, radius, angle, end);
          ctx.closePath();
          ctx.fillStyle = color;
          ctx.fill();
          angle = end;
        }
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = "#16283a";
        ctx.lineWidth = 0.8;
        ctx.stroke();
        visible.push({ g, x, y, radius });
      }
    },
    tap(clientX, clientY) {
      const p = new DOMPoint(clientX, clientY).matrixTransform(
        svg.node().getScreenCTM().inverse(),
      );
      let best = null,
        distance = Infinity;
      for (const dot of visible) {
        const d = Math.hypot(dot.x - p.x, dot.y - p.y);
        if (d < dot.radius + 7 && d < distance) {
          best = dot;
          distance = d;
        }
      }
      if (best) show(best.g);
      else if (selected) {
        selected = null;
        return true;
      }
      return Boolean(best);
    },
  };
}
