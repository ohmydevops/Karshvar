// Public pages do not need the quiz engine or map libraries.
const page = document.documentElement.dataset.page || "home";
if (["continents", "play", "results", "explore"].includes(page)) {
  await Promise.all([
    import("./vendor/d3.min.js"),
    import("./vendor/topojson-client.min.js"),
  ]);
  await import("./app.js");
} else {
  await import("./site.js");
}
