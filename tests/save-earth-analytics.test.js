import test from "node:test";
import assert from "node:assert/strict";
import { createAnalytics } from "../public/analytics.js";

test("mission starts queue until Umami loads and preserve each page language", () => {
  const sent = [];
  let tracker;
  const analytics = createAnalytics({
    enabled: true,
    getTracker: () => tracker,
  });
  for (const language of ["en", "fa", "ar", "fr", "ru", "tr"]) {
    analytics.track("save-earth-start", { language, privateData: "excluded" });
  }
  assert.equal(sent.length, 0);
  tracker = { track: (...args) => sent.push(args) };
  analytics.flush();
  analytics.flush();
  assert.deepEqual(
    sent,
    ["en", "fa", "ar", "fr", "ru", "tr"].map((language) => [
      "save-earth-start",
      { language },
    ]),
  );
});
