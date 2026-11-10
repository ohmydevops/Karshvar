// The build writes the same version into the online and offline asset packs.
import { brandName } from "./brand.js";

const menuFooter = document.querySelector("#appMenu .drawer-footer");
if (menuFooter) {
  const name = document.createElement("span");
  name.lang = document.documentElement.lang;
  name.dir = name.lang === "fa" ? "rtl" : "ltr";
  name.textContent = brandName(name.lang);
  menuFooter.replaceChildren(name);
}
fetch(new URL("./build-info.json", import.meta.url))
  .then((response) => (response.ok ? response.json() : null))
  .then((info) => {
    const footer = document.querySelector("#appMenu .drawer-footer");
    if (!footer || !info?.version || footer.querySelector(".build-version"))
      return;
    const version = document.createElement("span");
    version.className = "build-version";
    version.dir = "ltr";
    version.textContent = info.version;
    const lang = document.documentElement.lang;
    const copy = {
      en: ["Version", "local changes"],
      fa: ["نسخه", "تغییرات محلی"],
      ar: ["الإصدار", "تغييرات محلية"],
      tr: ["Sürüm", "yerel değişiklikler"],
      fr: ["Version", "modifications locales"],
      ru: ["Версия", "локальные изменения"],
    }[lang] || ["Version", "local changes"];
    version.title = `${copy[0]} ${info.commit}${info.dirty ? ` · ${copy[1]}` : ""}`;
    version.setAttribute("aria-label", version.title);
    footer.append(version);
  })
  .catch(() => {});
