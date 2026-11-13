// Shared credit for the real photograph used by both Explore map views.
if (document.documentElement.dataset.page === "explore") {
  const make = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  const skyCredit = make("div", null, "map-sky-credit");
  skyCredit.dir = "ltr";
  skyCredit.lang = "en";
  const skySource = make("a", "Andromeda · R. Gendler / ESO");
  skySource.href =
    "https://supernova.eso.org/exhibition/images/0808_andromeda_visible/";
  const skyLicense = make("a", "CC BY 4.0");
  skyLicense.href = "https://creativecommons.org/licenses/by/4.0/";
  skyCredit.append(skySource, " · ", skyLicense);
  skyCredit.title = "Photograph cropped and dimmed for the map background.";
  for (const link of [skySource, skyLicense]) {
    link.target = "_blank";
    link.rel = "noopener";
  }
  document.querySelector(".globe-panel").append(skyCredit);
}
