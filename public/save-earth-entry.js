import { mountSaveEarthEntry } from "./save-earth-access.js";
import "./save-earth-analytics.js";
import { prepareGameOffline } from "./save-earth-offline.js";

mountSaveEarthEntry({
  loadGame: () => {
    prepareGameOffline();
    return import("./save-earth.js");
  },
});
