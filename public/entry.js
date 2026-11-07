// Public pages do not need the quiz engine or map libraries.
const page = document.documentElement.dataset.page || "home";
if (["continents", "play", "results", "explore"].includes(page)) {
  await Promise.all([
    import("./vendor/d3.min.js"),
    import("./vendor/topojson-client.min.js"),
  ]);
  try {
    await import("./app.js");
  } finally {
    // Let the initial map render before the offline pack competes for bandwidth.
    // Still attempt installation if startup fails, so recovery remains possible.
    import("./offline.js").catch((error) =>
      console.warn("Offline setup unavailable", error),
    );
  }
} else {
  await import("./site.js");
}
