import test from "node:test";
import assert from "node:assert/strict";
import { marineLabels } from "../public/marine-labels.js";
test("marine labels include Persian Gulf and Hormuz with valid coordinates and translations", () => {
  for (const label of marineLabels) {
    assert(label.point.every(Number.isFinite));
    assert(Math.abs(label.point[0]) <= 180 && Math.abs(label.point[1]) <= 90);
    for (const language of ["en", "fa", "ar", "tr", "fr", "ru"])
      assert(label.names[language]);
  }
  const gulf = marineLabels.find((d) => d.names.en === "Persian Gulf");
  assert.equal(gulf.names.fa, "خلیج فارس");
  assert(gulf.point[0] > 48 && gulf.point[0] < 57);
  const hormuz = marineLabels.find((d) => d.names.en === "Strait of Hormuz");
  assert(hormuz.names.fa.includes("هرمز"));
  assert(hormuz.rank > gulf.rank);
});

test("Persian labels distinguish the Caspian Sea, Arabian Sea, and Persian Gulf", () => {
  assert.equal(
    marineLabels.find((d) => d.names.en === "Caspian Sea").names.fa,
    "دریای کاسپین",
  );
  assert.equal(
    marineLabels.find((d) => d.names.en === "Arabian Sea").names.fa,
    "دریای عرب",
  );
  assert.equal(
    marineLabels.filter((d) => d.names.fa === "خلیج فارس").length,
    1,
  );
});
