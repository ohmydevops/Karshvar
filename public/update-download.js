// Small release discovery is separate from the browser-owned offline download.
const copy = {
  en: [
    "New version available",
    "Download the update? You can keep browsing while it downloads. Saved progress will be kept.",
    "Download",
    "Later",
    "Downloading update",
    "Update ready",
    "Apply and reload",
    "Update download interrupted. Your current version is still available. Retry to resume.",
    "Retry",
    "Close",
  ],
  fa: [
    "نسخهٔ جدید موجود است",
    "به‌روزرسانی دانلود شود؟ هنگام دانلود می‌توانید بین صفحات جابه‌جا شوید. پیشرفت ذخیره‌شده حفظ می‌شود.",
    "دانلود",
    "بعداً",
    "در حال دانلود به‌روزرسانی",
    "به‌روزرسانی آماده است",
    "اعمال و بارگیری مجدد",
    "دانلود به‌روزرسانی متوقف شد؛ نسخهٔ فعلی همچنان قابل استفاده است. برای ادامه دوباره تلاش کنید.",
    "تلاش مجدد",
    "بستن",
  ],
  ar: [
    "إصدار جديد متاح",
    "تنزيل التحديث؟ يمكنك متابعة التصفح أثناء التنزيل. سيُحفظ تقدمك.",
    "تنزيل",
    "لاحقًا",
    "جارٍ تنزيل التحديث",
    "التحديث جاهز",
    "تطبيق وإعادة التحميل",
    "توقف التنزيل. ستُستخدم الملفات المكتملة عند إعادة المحاولة.",
    "إعادة المحاولة",
    "إغلاق",
  ],
  tr: [
    "Yeni sürüm mevcut",
    "Güncelleme indirilsin mi? İndirme sırasında gezinmeye devam edebilirsiniz. İlerlemeniz korunur.",
    "İndir",
    "Daha sonra",
    "Güncelleme indiriliyor",
    "Güncelleme hazır",
    "Uygula ve yenile",
    "İndirme kesildi. Tamamlanan dosyalar yeniden kullanılacak.",
    "Tekrar dene",
    "Kapat",
  ],
  fr: [
    "Nouvelle version disponible",
    "Télécharger la mise à jour ? Vous pouvez continuer à naviguer. Votre progression sera conservée.",
    "Télécharger",
    "Plus tard",
    "Téléchargement en cours",
    "Mise à jour prête",
    "Appliquer et recharger",
    "Téléchargement interrompu. Les fichiers terminés seront réutilisés.",
    "Réessayer",
    "Fermer",
  ],
  ru: [
    "Доступна новая версия",
    "Скачать обновление? Во время загрузки можно переходить между страницами. Прогресс сохранится.",
    "Скачать",
    "Позже",
    "Загрузка обновления",
    "Обновление готово",
    "Применить и перезагрузить",
    "Загрузка прервана. Готовые файлы будут использованы повторно.",
    "Повторить",
    "Закрыть",
  ],
};
export function createDownloadManager({
  registration,
  requestUpdate,
  onReady,
  onState = () => {},
}) {
  const t = copy[document.documentElement.lang] || copy.en;
  const scope = registration.scope || new URL("./", import.meta.url).href;
  const cacheName = "karshvar-update-state-" + encodeURIComponent(scope);
  const stateURL = new URL(".update-state", scope).href;
  const approvalURL = new URL(".update-approval", scope).href;
  const dismissKey = "karshvar:update-dismissed:" + scope;
  let latest, discovery, dialog, banner, label, progress, action, pollTimer;
  let polling,
    starting = false,
    lastProgressAt = Date.now(),
    lastProgress;
  let displayedPhase,
    ownDownload = false;
  const make = (tag, text) => {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    return node;
  };
  function show(phase, completed = 0, total = 0) {
    if (!banner) {
      banner = make("aside");
      banner.className = "update-download";
      banner.setAttribute("aria-label", t[4]);
      label = make("span");
      label.setAttribute("role", "status");
      progress = make("progress");
      progress.setAttribute("aria-label", t[4]);
      action = make("button");
      action.type = "button";
      banner.append(label, progress, action);
      document.body.append(banner);
    }
    banner.hidden = false;
    progress.hidden = phase !== "downloading";
    if (total) {
      progress.max = total;
      progress.value = completed;
    } else progress.removeAttribute("value");
    const percent = total ? Math.floor((completed / total) * 100) : null;
    label.textContent =
      phase === "ready"
        ? t[5]
        : phase === "error"
          ? t[7]
          : t[4] +
            (percent === null
              ? "…"
              : " · " +
                new Intl.NumberFormat(document.documentElement.lang).format(
                  percent,
                ) +
                "%");
    action.hidden = phase === "downloading";
    action.textContent = phase === "ready" ? t[6] : t[8];
    action.onclick =
      phase === "ready"
        ? onReady
        : () => check(true).catch(() => show("error"));
    displayedPhase = phase;
    onState(phase);
  }
  function stopWatch() {
    window.clearInterval(pollTimer);
    pollTimer = undefined;
  }
  function poll() {
    if (!polling)
      polling = runPoll().finally(() => {
        polling = undefined;
      });
    return polling;
  }
  async function runPoll() {
    try {
      if (registration.waiting) {
        show("ready");
        window.clearInterval(pollTimer);
        pollTimer = undefined;
        return;
      }
      const state = await (
        await (await caches.open(cacheName)).match(stateURL)
      )?.json();
      const progressKey = JSON.stringify([
        state?.version,
        state?.phase,
        state?.completed,
      ]);
      if (progressKey !== lastProgress) {
        lastProgress = progressKey;
        lastProgressAt = Date.now();
      }
      if (registration.waiting) {
        show("ready");
        stopWatch();
        return;
      }
      if (registration.installing) {
        // Automatic script checks can be rejected by the consent gate. Only
        // display progress once that worker actually starts an approved pack.
        const installing = await workerStatus(registration.installing);
        if (registration.waiting) {
          show("ready");
          stopWatch();
          return;
        }
        if (
          installing &&
          !["downloading", "ready"].includes(installing.phase)
        ) {
          if (ownDownload && !starting && Date.now() - lastProgressAt > 5000)
            show("error");
          return false;
        }
        if (!installing && state?.phase !== "downloading") return false;
        if (Date.now() - lastProgressAt > 45000) {
          show("error");
          return false;
        }
        show("downloading", state?.completed, state?.total);
        return true;
      } else if (
        state?.phase === "error" &&
        (ownDownload || displayedPhase === "downloading")
      ) {
        show("error");
        window.clearInterval(pollTimer);
        pollTimer = undefined;
      } else if (displayedPhase === "downloading" && !registration.installing) {
        // Installation may finish while every old page is navigating away.
        const active = await workerStatus(registration.active);
        if (registration.waiting) {
          show("ready");
          stopWatch();
          return;
        }
        if (registration.installing || starting) return;
        if (active?.version === state?.version && state?.phase === "active") {
          show("ready");
          action.onclick = () => location.reload();
          window.clearInterval(pollTimer);
          pollTimer = undefined;
        } else if (Date.now() - lastProgressAt > 5000) {
          show("error");
          stopWatch();
        }
      }
    } catch {
      /* A transient storage failure must not block navigation. */
    }
  }
  function watch() {
    if (!pollTimer) pollTimer = window.setInterval(poll, 1500);
    poll();
  }
  async function start() {
    if (!latest) return check(true);
    const cache = await caches.open(cacheName);
    await cache.put(
      approvalURL,
      new Response(JSON.stringify({ version: latest.version })),
    );
    await cache.put(
      stateURL,
      new Response(
        JSON.stringify({
          version: latest.version,
          phase: "downloading",
          completed: 0,
          total: latest.files,
        }),
      ),
    );
    ownDownload = true;
    starting = true;
    lastProgressAt = Date.now();
    lastProgress = undefined;
    dialog?.close();
    show("downloading");
    watch();
    try {
      await requestUpdate();
    } catch {
      if (!registration.installing && !registration.waiting) show("error");
    } finally {
      starting = false;
    }
    await poll();
  }
  function offer(manual) {
    if (dialog?.open) return;
    try {
      if (!manual && sessionStorage.getItem(dismissKey) === latest.version)
        return;
    } catch {}
    dialog = make("dialog");
    dialog.className = "update-dialog";
    const heading = make("h2", t[0]);
    heading.id = "update-download-title";
    dialog.setAttribute("aria-labelledby", heading.id);
    const description = make("p", t[1]);
    const actions = make("div");
    actions.className = "dialog-actions";
    const later = make("button", t[3]);
    later.autofocus = true;
    later.onclick = () => dialog.close();
    const download = make("button", t[2]);
    download.className = "primary";
    download.onclick = () =>
      start().catch(() => {
        dialog.close();
        show("error");
      });
    actions.append(later, download);
    dialog.append(heading, description, actions);
    dialog.addEventListener(
      "close",
      () => {
        try {
          sessionStorage.setItem(dismissKey, latest.version);
        } catch {}
        dialog.remove();
      },
      { once: true },
    );
    document.body.append(dialog);
    dialog.showModal();
  }
  function workerStatus(worker) {
    if (!worker) return Promise.resolve(null);
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      const finish = (value) => {
        window.clearTimeout(timer);
        channel.port1.close();
        resolve(value);
      };
      const timer = window.setTimeout(() => finish(null), 1200);
      channel.port1.onmessage = (event) => finish(event.data);
      try {
        worker.postMessage({ type: "UPDATE_STATUS" }, [channel.port2]);
      } catch {
        finish(null);
      }
    });
  }
  async function discover(manual) {
    if (registration.waiting) {
      show("ready");
      return 5;
    }
    if (registration.installing) {
      watch();
      if (await poll()) return 2;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 10000);
    try {
      const url = new URL("update-manifest.json", scope);
      // Old workers preserve query identity; this also bypasses their cache.
      url.searchParams.set("check", String(Date.now()));
      const response = await fetch(url, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw Error("Release discovery failed");
      latest = await response.json();
      if (!/^[a-f0-9]{20}$/.test(latest.version))
        throw Error("Invalid release");
      const active = await workerStatus(registration.active);
      if (active?.version === latest.version) {
        // A retry can discover that the release already activated elsewhere.
        // Do not leave a stale failure banner over a working offline game.
        if (banner) banner.hidden = true;
        displayedPhase = undefined;
        ownDownload = false;
        stopWatch();
        return 1;
      }
      if (!active) {
        const local = await (
          await fetch(new URL("build-info.json", scope))
        ).json();
        if (local.version === latest.build) return 1;
      }
      offer(manual);
      return 6;
    } finally {
      window.clearTimeout(timer);
    }
  }
  function check(manual = false) {
    if (!discovery)
      discovery = discover(manual).finally(() => {
        discovery = null;
      });
    return discovery;
  }
  registration.addEventListener("updatefound", watch);
  if (registration.installing) watch();
  return { check, poll };
}
