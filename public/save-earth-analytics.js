import { createAnalytics, loadProductionAnalytics } from "./analytics.js";

export const analytics = createAnalytics();
// Track the page even when device support prevents loading the 3D game.
loadProductionAnalytics(document, location)?.addEventListener(
  "load",
  analytics.flush,
);
