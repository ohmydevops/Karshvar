const copy = {
  en: [
    "Saving game for offline play…",
    "Game ready offline",
    "Offline download incomplete",
    "Retry",
  ],
  fa: [
    "ذخیرهٔ بازی برای اجرای آفلاین…",
    "بازی برای اجرای آفلاین آماده است",
    "دریافت آفلاین بازی کامل نشد",
    "تلاش دوباره",
  ],
  ar: [
    "حفظ اللعبة للعمل دون اتصال…",
    "اللعبة جاهزة دون اتصال",
    "لم يكتمل تنزيل اللعبة",
    "إعادة المحاولة",
  ],
  fr: [
    "Enregistrement du jeu hors ligne…",
    "Jeu prêt hors ligne",
    "Téléchargement incomplet",
    "Réessayer",
  ],
  ru: [
    "Сохранение игры для офлайн-режима…",
    "Игра доступна офлайн",
    "Загрузка не завершена",
    "Повторить",
  ],
  tr: [
    "Oyun çevrimdışı kullanım için kaydediliyor…",
    "Oyun çevrimdışı hazır",
    "İndirme tamamlanmadı",
    "Tekrar dene",
  ],
};

export function prepareGameOffline() {
  if (
    !navigator.serviceWorker ||
    !isSecureContext ||
    document.querySelector('script[src="/@vite/client"]')
  )
    return;
  const t = copy[document.documentElement.lang] || copy.en;
  const notice = document.createElement("section");
  notice.className = "game-download-status";
  notice.setAttribute("role", "status");
  const label = document.createElement("strong");
  const percentage = document.createElement("span");
  const progress = document.createElement("progress");
  progress.max = 100;
  progress.setAttribute("aria-label", t[0]);
  notice.append(label, percentage, progress);
  document.querySelector(".launch-card").append(notice);
  function show(state, text, value) {
    notice.dataset.state = state;
    label.textContent = text;
    percentage.textContent = value === undefined ? "" : `${value}%`;
    if (value === undefined) progress.removeAttribute("value");
    else progress.value = value;
    progress.hidden = state !== "downloading";
  }
  let busy = false,
    complete = false;
  async function download() {
    if (busy || complete) return;
    busy = true;
    notice.querySelector("button")?.remove();
    show("downloading", t[0]);
    try {
      const { offlineReady } = await import("./offline.js");
      await offlineReady;
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) =>
          setTimeout(() => reject(Error("Worker unavailable")), 30000),
        ),
      ]);
      await new Promise((resolve, reject) => {
        const channel = new MessageChannel();
        let timer;
        const finish = (error) => {
          clearTimeout(timer);
          channel.port1.close();
          error ? reject(error) : resolve();
        };
        const renew = () => {
          clearTimeout(timer);
          timer = setTimeout(() => finish(Error("Download stalled")), 60000);
        };
        channel.port1.onmessage = ({ data }) => {
          renew();
          if (data.phase === "ready") finish();
          else if (data.phase === "error") finish(Error("Download incomplete"));
          else
            show(
              "downloading",
              t[0],
              Math.round((data.completed / data.total) * 100),
            );
        };
        renew();
        registration.active.postMessage({ type: "CACHE_SAVE_EARTH" }, [
          channel.port2,
        ]);
      });
      complete = true;
      show("ready", t[1]);
      window.removeEventListener("online", download);
    } catch {
      show("error", t[2]);
      const retry = document.createElement("button");
      retry.textContent = t[3];
      retry.addEventListener("click", download);
      notice.append(retry);
    } finally {
      busy = false;
    }
  }
  window.addEventListener("online", download);
  download();
}
