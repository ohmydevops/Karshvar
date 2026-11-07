import { pagePath } from "./navigation.js";
import { setUpdateLoading } from "./update-loading.js";
import { resetCopy } from "./reset.js";
import { bindHistory } from "./history.js";
import { revealPage } from "./page-ready.js";
import {
  createAnalytics,
  isProduction,
  loadProductionAnalytics,
} from "./analytics.js";
const $ = (id) => document.getElementById(id);
const page = document.documentElement.dataset.page || "home";
const lang = document.documentElement.dataset.locale || "en";
const analytics = createAnalytics({ enabled: isProduction(location) });
loadProductionAnalytics(document, location)?.addEventListener(
  "load",
  analytics.flush,
);
const track = (event, data = {}) =>
  analytics.track(event, { language: lang, ...data });
document.body.classList.toggle(
  "light",
  document.documentElement.dataset.theme !== "dark",
);
function updateThemeLabel() {
  const light = document.body.classList.contains("light");
  document.documentElement.dataset.theme = light ? "light" : "dark";
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", light ? "#f7f9ff" : "#0d1528");
  const labels = {
    en: ["Dark mode", "Light mode"],
    fa: ["حالت شب", "حالت روز"],
    ar: ["الوضع الليلي", "الوضع النهاري"],
    tr: ["Karanlık mod", "Aydınlık mod"],
    fr: ["Mode sombre", "Mode clair"],
    ru: ["Тёмная тема", "Светлая тема"],
  };
  const label = labels[lang][light ? 0 : 1];
  $("theme").querySelector("[data-text]").textContent = label;
  $("theme").querySelector("[aria-hidden]").textContent = light ? "☾" : "☀";
  $("theme").setAttribute("aria-label", label);
}
const appMenu = $("appMenu");
let menuCloseTimer;
function closeMenu() {
  if (!appMenu.open || appMenu.classList.contains("is-closing")) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    appMenu.close();
    return;
  }
  appMenu.classList.add("is-closing");
  // Fallback if animation events are interrupted or unavailable.
  menuCloseTimer = setTimeout(() => appMenu.close(), 300);
}
$("menuOpen").onclick = () => {
  $("languagePicker").open = false;
  appMenu.style.setProperty(
    "--menu-top",
    document.querySelector("body > header").getBoundingClientRect().bottom +
      8 +
      "px",
  );
  appMenu.showModal();
  $("menuOpen").setAttribute("aria-expanded", "true");
};
$("menuClose").onclick = closeMenu;
appMenu.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeMenu();
});
appMenu.addEventListener("animationend", (event) => {
  if (event.target === appMenu && event.animationName === "drawer-exit")
    appMenu.close();
});
appMenu.addEventListener("close", () => {
  clearTimeout(menuCloseTimer);
  appMenu.classList.remove("is-closing");
  $("menuOpen").setAttribute("aria-expanded", "false");
});
appMenu.addEventListener("click", (event) => {
  if (event.target !== appMenu) return;
  const bounds = appMenu.getBoundingClientRect();
  if (
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom
  )
    closeMenu();
});

updateThemeLabel();
$("theme").onclick = () => {
  document.body.classList.toggle("light");
  updateThemeLabel();
  const theme = document.body.classList.contains("light") ? "light" : "dark";
  try {
    localStorage.setItem("atlas-theme", theme);
  } catch {}
  track("theme-change", { theme });
};
const reset = resetCopy[lang];
$("resetOpen").setAttribute("aria-label", reset[0]);
$("resetOpen").title = reset[0];
$("resetMenuLabel").textContent = reset[0];
["resetTitle", "resetBody", "resetCancel", "resetConfirm"].forEach((id, i) => {
  $(id).textContent = reset[i + 1];
});
$("resetOpen").disabled = false;
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
  try {
    localStorage.removeItem("atlas-progress");
    localStorage.setItem("atlas-continents", "{}");
  } catch {}
  track("progress-reset");
  location.assign(new URL(pagePath(lang), document.baseURI));
});
document.querySelectorAll("[data-language]").forEach((link) => {
  // Preserve each article's server-rendered language URL.
  link.addEventListener("click", () => {
    try {
      localStorage.setItem("atlas-language", link.dataset.language);
    } catch {}
    track("language-change", { to: link.dataset.language });
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
document.querySelectorAll(".site-menu a").forEach((link) => {
  if (new URL(link.href).pathname === location.pathname)
    link.setAttribute("aria-current", "page");
  else link.removeAttribute("aria-current");
});
$("startGame")?.addEventListener("click", () => track("play-click"));
document.querySelectorAll(".home-explore").forEach((link) => {
  link.addEventListener("click", () => track("explore-click"));
});
$("aboutOpen")?.addEventListener("click", () => track("about-open"));
document.querySelector(".blog-cta a")?.addEventListener("click", (event) => {
  track("blog-play-click", { article: event.currentTarget.dataset.article });
});
await bindHistory({
  language: lang,
  getSessions: () => {
    try {
      return JSON.parse(localStorage.getItem("atlas-continents")) || {};
    } catch {
      return {};
    }
  },
});
await revealPage();
if (page === "home") {
  const start = () =>
    import("./home-globe.js")
      .then(({ mountHomeGlobe }) =>
        mountHomeGlobe(document.querySelector(".welcome-art")),
      )
      .catch((error) => {
        const host = document.querySelector(".welcome-art");
        host.classList.add("globe-failed");
        const fallback = host.querySelector(".home-earth");
        if (fallback) fallback.hidden = false;
        console.warn(error);
      });
  if ("requestIdleCallback" in window)
    window.requestIdleCallback(start, { timeout: 1500 });
  else setTimeout(start, 0);
}
// Public pages only initialize offline downloads on an explicit update request.
const updateButton = $("checkUpdates");
if (updateButton && "serviceWorker" in navigator && window.isSecureContext) {
  updateButton.hidden = false;
  const startOffline = async () => {
    setUpdateLoading(updateButton, true);
    try {
      const { offlineReady } = await import("./offline.js");
      await offlineReady;
      if (updateButton.onclick !== startOffline) await updateButton.onclick();
    } catch (error) {
      console.warn("Offline setup unavailable", error);
    } finally {
      setUpdateLoading(updateButton, false);
    }
  };
  updateButton.onclick = startOffline;
}
