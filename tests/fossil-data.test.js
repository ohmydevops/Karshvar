import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  filterFossils,
  groupFossils,
  mergeFossilRecords,
  layoutFossilGraph,
} from "../public/fossil-data.js";
test("graph includes every record without overlapping selectable nodes", () => {
  for (const count of [2, 16, 593]) {
    const { nodes, radius } = layoutFossilGraph(count);
    assert.equal(nodes.length, count);
    for (let i = 0; i < nodes.length; i++) {
      assert.ok(Math.hypot(nodes[i].x, nodes[i].y) + 22 <= radius);
      for (let j = 0; j < i; j++)
        assert.ok(
          Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y) > 44,
        );
    }
  }
});
const records = JSON.parse(
  fs.readFileSync(new URL("../public/data/fossils.json", import.meta.url)),
).records;
const literature = JSON.parse(
  fs.readFileSync(
    new URL("../public/data/hominin-literature.json", import.meta.url),
  ),
).records;
test("literature preserves uncertainty and only replaces explicit existing reports", () => {
  const combined = mergeFossilRecords(records, literature);
  const replaced = new Set(literature.flatMap((r) => r.replaces));
  assert.equal(
    combined.length,
    records.length + literature.length - replaced.size,
  );
  assert.equal(new Set(combined.map((r) => r.id)).size, combined.length);
  assert.equal(literature.filter((r) => r.country === "IR").length, 5);
  assert.equal(new Set(literature.map((r) => r.country)).size, 11);
  for (const r of literature) {
    assert.match(r.sourceUrl, /^https:\/\/doi.org\//);
    assert.ok(r.ageLabel.fa && r.ageLabel.en && r.coordinateSource);
    assert.equal(r.summary, undefined);
    assert.ok(Math.abs(r.lat) <= 90 && Math.abs(r.lon) <= 180);
    for (const id of r.replaces)
      assert.ok(
        records.some(
          (p) => p.id === id && p.country === r.country && p.name === r.name,
        ),
      );
  }
  assert.deepEqual(
    combined.filter((r) => r.group === "dinosaur"),
    records.filter((r) => r.group === "dinosaur"),
  );
  const unknown = literature.find((r) => r.id === "literature:wezmeh");
  const minimum = literature.find((r) => r.id === "literature:xiahe-1");
  assert.equal(unknown.older, null);
  assert.equal(unknown.younger, null);
  assert.equal(minimum.older, null);
  assert.equal(
    filterFossils([unknown, minimum], {
      hominin: true,
      neanderthal: true,
      older: Infinity,
      younger: 0,
    }).length,
    2,
  );
  assert.equal(
    filterFossils([minimum], { hominin: true, older: 0.1, younger: 0 }).length,
    0,
  );
});
test("snapshot has unique records, present-day coordinates and ordered ages", () => {
  assert.equal(new Set(records.map((r) => r.id)).size, records.length);
  for (const r of records) {
    assert.ok(Math.abs(r.lat) <= 90 && Math.abs(r.lon) <= 180);
    assert.ok(r.older >= r.younger && r.younger >= 0);
    assert.match(r.collection, /^col:\d+$/);
  }
  assert.ok(records.some((r) => r.name === "Australopithecus afarensis"));
  assert.ok(records.some((r) => r.name.startsWith("Tyrannosaurus")));
  assert.ok(
    records.filter((r) => r.group === "dinosaur").every((r) => r.older >= 66),
  );
  assert.ok(
    !records.some(
      (r) => r.group === "dinosaur" && r.name.startsWith("Alectoris"),
    ),
  );
});
const museums = JSON.parse(
  fs.readFileSync(
    new URL("../public/data/hominin-museums.json", import.meta.url),
  ),
).records;
test("museum accounts have distinct specimens and traceable age and location sources", () => {
  const combined = mergeFossilRecords(records, [...literature, ...museums]);
  assert.equal(new Set(combined.map((r) => r.id)).size, combined.length);
  assert.equal(museums.length, 6);
  assert.equal(new Set(museums.map((r) => r.institution)).size, 2);
  for (const r of museums) {
    assert.equal(r.sourceType, "museum");
    assert.match(
      r.sourceUrl,
      /^https:\/\/(humanorigins.si.edu|australian.museum)\//,
    );
    assert.ok(r.ageLabel.fa && r.ageLabel.en && r.coordinateSource);
    assert.ok(r.older >= r.younger && r.younger >= 0);
    assert.ok(Math.abs(r.lat) <= 90 && Math.abs(r.lon) <= 180);
    assert.ok(
      ![...records, ...literature].some(
        (p) =>
          p.group === "hominin" &&
          Math.abs(p.lat - r.lat) < 0.01 &&
          Math.abs(p.lon - r.lon) < 0.01,
      ),
    );
  }
});
test("three independent hominin filters partition records and exclude dinosaurs", () => {
  const combined = mergeFossilRecords(records, [...literature, ...museums]);
  for (let mask = 0; mask < 8; mask++) {
    const filters = {
      sapiens: !!(mask & 1),
      neanderthal: !!(mask & 2),
      hominin: !!(mask & 4),
      older: Infinity,
      younger: 0,
    };
    const result = filterFossils(combined, filters);
    assert.equal(
      result.length,
      (filters.sapiens ? 99 : 0) +
        (filters.neanderthal ? 15 : 0) +
        (filters.hominin ? 298 : 0),
    );
    assert.ok(result.every((r) => r.group === "hominin"));
    assert.equal(
      result.filter((r) => r.name === "Homo sapiens").length,
      filters.sapiens ? 99 : 0,
    );
    assert.equal(
      result.filter((r) => r.name === "Homo neanderthalensis").length,
      filters.neanderthal ? 15 : 0,
    );
  }
});
test("age filtering uses overlap, not discovery date or range midpoint", () => {
  const sample = [
    { group: "dinosaur", older: 100, younger: 90, name: "A" },
    { group: "hominin", older: 4, younger: 3, name: "B" },
  ];
  assert.equal(
    filterFossils(sample, { dinosaur: true, older: 90, younger: 80 }).length,
    0,
  );
  assert.equal(
    filterFossils(sample, { hominin: true, older: 3.5, younger: 3.4 }).length,
    1,
  );
  assert.equal(filterFossils(sample, { older: 300, younger: 0 }).length, 0);
});
test("grouping conserves every record and separates categories at shared sites", () => {
  const grouped = groupFossils(records);
  assert.equal(
    grouped.reduce((n, g) => n + g.records.length, 0),
    records.length,
  );
  assert.ok(grouped.every((g) => g.records.every((r) => r.group === g.group)));
  const shared = groupFossils([
    { group: "hominin", name: "Homo sapiens", lat: 40, lon: 30 },
    { group: "hominin", name: "Homo sapiens", lat: 40, lon: 30 },
    { group: "hominin", name: "Homo neanderthalensis", lat: 40, lon: 30 },
    { group: "hominin", name: "Homo erectus", lat: 40, lon: 30 },
  ]);
  assert.equal(shared.length, 1);
  assert.deepEqual(shared[0].categories, {
    sapiens: 2,
    neanderthal: 1,
    hominin: 1,
  });
});
