import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { missionUI, translatedBriefings } from "../scripts/save-earth-i18n.mjs";
for (const lang of ["en", "fa", "ar", "fr", "ru", "tr"]) {
  test(`mission UI and full guide are localized for ${lang}`, async () => {
    assert.equal(missionUI[lang].length, 12);
    const html = await readFile(
      new URL(`../public/${lang}/save-the-earth/index.html`, import.meta.url),
      "utf8",
    );
    const sources = await readFile(
      new URL(`../public/${lang}/sources/index.html`, import.meta.url),
      "utf8",
    );
    for (const label of missionUI[lang].slice(0, 5))
      assert.ok(html.includes(label), label);
    for (const label of missionUI[lang].slice(5))
      assert.ok(sources.includes(label), label);
    assert.ok(html.includes("../sources/#save-earth-credits"));
    assert.ok(sources.includes('id="save-earth-credits"'));
    assert.ok(!html.includes("undefined"));
    if (translatedBriefings[lang])
      for (const line of translatedBriefings[lang])
        assert.ok(
          html.replace(/\s+/g, " ").includes(line.replace(/\s+/g, " ")),
        );
    assert.ok(html.includes("Ctrl"));
  });
}
