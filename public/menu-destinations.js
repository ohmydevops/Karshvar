const language = document.documentElement.dataset.locale || "en";
const labels = {
  en: ["Geography game", "Natural history"],
  fa: ["بازی جغرافیا", "تاریخ طبیعی"],
  ar: ["لعبة الجغرافيا", "التاريخ الطبيعي"],
  tr: ["Coğrafya oyunu", "Doğa tarihi"],
  fr: ["Jeu de géographie", "Histoire naturelle"],
  ru: ["Географическая игра", "Естественная история"],
}[language] || ["Geography game", "Natural history"];
const menu = document.querySelector(".site-menu nav");
if (menu) {
  const before = menu.querySelector(".footer-about, .sources-link");
  ["modes", "natural-history"].forEach((route, index) => {
    const link = document.createElement("a");
    link.href = new URL(`./${language}/${route}/`, document.baseURI).href;
    link.textContent = labels[index];
    if (new URL(link.href).pathname === location.pathname)
      link.setAttribute("aria-current", "page");
    menu.insertBefore(link, before);
  });
}
