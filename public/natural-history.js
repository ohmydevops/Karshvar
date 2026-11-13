import { createSettingsDialog } from "./settings-dialog.js";
import { mountFossilGraph } from "./fossil-graph.js";
import { naturalHistoryText } from "./natural-history-i18n.js";
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
  heading.querySelector("h1").textContent = t(
    "اطلس کشفیات فسیلی",
    "Fossil discovery atlas",
  );
  heading.querySelector("p").textContent = t(
    "دایناسورها و انسان‌تبارها؛ ردّ زندگی گذشته روی زمینِ امروز. یک نقطه را برای دیدن کشفیات و منابع انتخاب کنید.",
    "Dinosaurs and hominins: traces of past life on today’s Earth. Select a point to explore finds and sources.",
  );
  const bar = make("form", null, "fossil-controls explore-settings-bar");
  bar.onsubmit = (e) => e.preventDefault();
  const controls = {};
  const controlLabels = {};
  function input(key, label, type, value) {
    const wrap = make("label", null, "population-switch " + key);
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
  input("dinosaur", t("نمایش دایناسورها", "Dinosaurs"), "checkbox", true);
  input("hominin", t("نمایش انسان‌تبارها", "Hominins"), "checkbox", true);
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
        "نارنجی: دایناسورهای غیرپرنده · فیروزه‌ای: انسان‌تبارها، شامل گونه‌های پیش از انسان خردمند. زمان‌ها سن تخمینی فسیل‌اند، نه سال کشف. نقاط نزدیک گروه‌بندی شده‌اند.",
        "Orange: non-avian dinosaurs · Teal: hominins, including species predating Homo sapiens. Dates are estimated fossil ages, not discovery years. Nearby records are grouped.",
      ),
      "fossil-note",
    ),
  );
  const credit = make("p", null, "fossil-note");
  credit.append(
    make(
      "span",
      t(
        "پوشش: رکوردهای مختصات‌دار PBDB و گزارش‌های منتخب پژوهشی از شش قاره؛ نه تمام کشفیات جهان. مختصات تقریبی‌اند؛ نوع تاریخ‌گذاری و عدم قطعیت در گزارش‌های تکمیلی مشخص شده است. ",
        "Coverage: georeferenced PBDB records and selected research reports across six continents, not every discovery worldwide. Locations are approximate; supplementary reports describe dating methods and uncertainty. ",
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
  const dialog = make("dialog", null, "fossil-dialog");
  dialog.setAttribute("aria-labelledby", "fossil-dialog-title");
  document.body.append(dialog);
  const header = make("header");
  const title = make("h2", t("کشفیات این ناحیه", "Finds in this area"));
  title.id = "fossil-dialog-title";
  const close = make("button", t("بستن", "Close"));
  close.type = "button";
  close.onclick = () => dialog.close();
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
  let images = {};
  fetch(new URL("./data/fossil-images.json", import.meta.url))
    .then((r) => (r.ok ? r.json() : {}))
    .then((d) => (images = d))
    .catch(() => {});
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
  let expanded = null;
  let graph = null;
  const spread = svg
    .append("foreignObject")
    .attr("class", "fossil-spread-layer")
    .attr("width", 320)
    .attr("height", 320)
    .style("display", "none");
  const spreadBody = spread
    .append("xhtml:div")
    .attr("class", "fossil-spread")
    .node();
  spreadBody.setAttribute("role", "group");
  spreadBody.setAttribute(
    "aria-label",
    t("انتخاب یک رکورد", "Choose a record"),
  );
  for (const event of [
    "pointerdown",
    "mousedown",
    "touchstart",
    "click",
    "dblclick",
    "wheel",
  ])
    spreadBody.addEventListener(event, (e) => e.stopPropagation());
  function collapse() {
    graph?.dispose();
    graph = null;
    expanded = null;
    selected = null;
    spread.style("display", "none");
    spreadBody.replaceChildren();
  }
  spreadBody.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      collapse();
      svg.node().focus();
    }
  });
  function openRecord(record) {
    showRecords([record]);
    if (!dialog.open) dialog.showModal();
  }
  function renderSpread() {
    graph?.dispose();
    const { records, group, layout } = expanded;
    spreadBody.style.setProperty(
      "--fossil-color",
      group.group === "dinosaur" ? "#eb9238" : "#26c4c3",
    );
    graph = mountFossilGraph(spreadBody, {
      records,
      layout,
      t,
      number,
      onSelect: openRecord,
      onClose: () => {
        collapse();
        svg.node().focus();
      },
    });
    redraw();
  }
  function request() {
    collapse();
    status.textContent = t("در حال فیلتر کردن…", "Filtering…");
    worker.postMessage({
      type: "filter",
      version: ++version,
      filters: {
        dinosaur: controls.dinosaur.checked,
        hominin: controls.hominin.checked,
        older: Infinity,
        younger: 0,
        query: "",
      },
    });
  }
  bar.addEventListener("change", request);
  function show(group) {
    if (expanded?.group.id === group.id) {
      collapse();
      return;
    }
    collapse();
    selected = group.id;
    worker.postMessage({ type: "details", id: group.id });
  }
  function renderList() {
    listBody.replaceChildren();
    for (const g of groups.slice(listPage * 60, (listPage + 1) * 60)) {
      const b = make(
        "button",
        `${g.name} · ${number.format(g.count)} · ${number.format(g.lat)}, ${number.format(g.lon)}`,
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
    let shown = 0;
    const add = () => {
      for (const r of records.slice(shown, shown + 20)) {
        const article = make("article");
        article.append(make("h3", r.name));
        const age = `${number.format(r.younger)} – ${number.format(r.older)}`;
        article.append(
          make(
            "p",
            r.ageLabel?.en ||
              t(
                "سن تخمینی: {age} میلیون سال پیش. این بازه، سن ثبت‌شدهٔ مجموعهٔ فسیلی در پایگاه است.",
                "Estimated age: {age} million years ago. This is the database’s age range for the fossil collection.",
                { age },
              ),
          ),
        );
        let country = r.country;
        try {
          country = new Intl.DisplayNames([lang], { type: "region" }).of(
            r.country,
          );
        } catch {}
        article.append(
          make(
            "p",
            [country, r.region, fa ? r.placeFa || r.place : r.place]
              .filter(Boolean)
              .join(" · "),
          ),
        );
        article.append(
          make(
            "p",
            `${t("مختصات امروزی", "Present-day coordinates")}: ${r.lat}, ${r.lon}${r.interval ? ` · ${r.interval}` : ""}${r.sourceType === "literature" ? t(" · مکان تقریبی", " · approximate location") : ""}`,
          ),
        );
        const photo =
          r.sourceType === "literature" && r.name === "Homo sapiens"
            ? null
            : r.group === "hominin"
              ? images[r.name]
              : images[r.name] || images[r.name.split(" ")[0]];
        if (photo) {
          const figure = make("figure");
          const img = make("img");
          img.src = photo.url;
          img.alt = r.name;
          img.width = 640;
          img.height = 360;
          img.loading = "lazy";
          img.referrerPolicy = "no-referrer";
          img.onerror = () => {
            img.replaceWith(
              make(
                "p",
                t(
                  "تصویر بارگیری نشد؛ نسخهٔ اصلی در پیوند زیر موجود است.",
                  "The image could not load; use the original source link below.",
                ),
              ),
            );
          };
          const caption = make(
            "figcaption",
            t(
              "تصویر معرف گونه یا سرده؛ لزوماً نمونهٔ همین محل نیست. ",
              "Representative species/genus image, not necessarily a specimen from this locality. ",
            ),
          );
          const a = make("a", `${photo.artist} · ${photo.license}`);
          a.href = photo.source;
          a.target = "_blank";
          a.rel = "noopener";
          caption.append(a);
          figure.append(img, caption);
          article.append(figure);
        } else
          article.append(
            make(
              "p",
              t(
                "تصویر تأییدشده برای این رکورد در مجموعه موجود نیست.",
                "No verified image is available for this record in the collection.",
              ),
            ),
          );
        const sources = make("details", null, "fossil-sources");
        sources.append(make("summary", t("منابع علمی", "Scientific sources")));
        sources.append(
          make(
            "p",
            r.reference ||
              t(
                "مرجع در صفحهٔ اصلی رکورد",
                "See the original record for its reference",
              ),
          ),
        );
        const a = make(
          "a",
          r.sourceUrl
            ? t("مقالهٔ علمی ↗", "Research paper ↗")
            : t(
                "رکورد و منابع علمی در PBDB ↗",
                "Record and scientific sources at PBDB ↗",
              ),
        );
        a.href =
          r.sourceUrl ||
          `https://paleobiodb.org/classic/basicCollectionSearch?collection_no=${r.collection.replace("col:", "")}`;
        a.target = "_blank";
        a.rel = "noopener";
        sources.append(a);
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
      if (data.records.length === 1) openRecord(data.records[0]);
      else if (data.records.length > 1) {
        expanded = {
          group: groups.find((g) => g.id === data.id),
          records: data.records,
          layout: data.layout,
          needsFocus: true,
        };
        renderSpread();
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
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = g.group === "dinosaur" ? "#eb9238" : "#26c4c3";
        ctx.fill();
        ctx.strokeStyle = "#16283a";
        ctx.lineWidth = 0.8;
        ctx.stroke();
        visible.push({ g, x, y, radius });
      }
      if (expanded) {
        const g = expanded.group;
        const onFront =
          globalThis.d3.geoDistance([g.lon, g.lat], center) <
          Math.PI / 2 - 0.012;
        spread.style("display", onFront ? null : "none");
        if (onFront) {
          const [x, y] = projection([g.lon, g.lat]);
          const graphSize = Math.max(160, Math.min(460, w - 12, h - 12));
          graph?.resize(graphSize, projection.scale());
          spread.attr("width", graphSize).attr("height", graphSize);
          spread.attr("x", x - graphSize / 2).attr("y", y - graphSize / 2);
          if (expanded.needsFocus) {
            expanded.needsFocus = false;
            graph?.focus();
          }
        }
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
      else if (expanded || selected) {
        collapse();
        return true;
      }
      return Boolean(best);
    },
  };
}
