import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  catalogMapRecords,
  validateCatalog,
} from "../public/hominin-catalog.js";
import { mergeFossilRecords } from "../public/fossil-data.js";
const read = (name) =>
  JSON.parse(
    fs.readFileSync(new URL(`../public/data/${name}.json`, import.meta.url)),
  );
const catalog = read("hominin-catalog");
test("migration preserves active identities, coordinates, taxonomy and age bounds", () => {
  const previous = mergeFossilRecords(read("fossils").records, [
    ...read("hominin-literature").records,
    ...read("hominin-museums").records,
  ]).filter((record) => record.group === "hominin");
  const migrated = new Map(
    catalogMapRecords(catalog).map((record) => [record.id, record]),
  );
  assert.equal(migrated.size, previous.length);
  for (const record of previous) {
    const current = migrated.get(record.id);
    for (const key of ["name", "lat", "lon", "younger", "older"])
      assert.equal(current[key], record[key], `${record.id}: ${key}`);
  }
  assert.equal(catalog.findings.length, 423);
  assert.equal(catalog.findings.filter((row) => row.supersededBy).length, 11);
});
test("collection ages retain their scope, unknowns and raw source", () => {
  const report = catalog.reports.find((row) => row.findingId === "occ:1411374");
  assert.equal(report.age.target, "collection");
  assert.equal(report.age.older, 11700);
  assert.equal(report.age.younger, 0);
  assert.equal(report.age.method, null);
  assert.equal(report.review.status, "imported");
  assert.equal(report.provenance.original.collection, "col:194995");
  const unknown = catalog.reports.find(
    (row) => row.findingId === "literature:wezmeh",
  );
  assert.equal(unknown.age.older, null);
});
test("invalid links, cycles and reversed ages fail before export", () => {
  for (const mutate of [
    (copy) => {
      copy.findings[0].siteId = "missing";
    },
    (copy) => {
      copy.findings[0].supersededBy = copy.findings[0].id;
    },
    (copy) => {
      copy.reports[0].age.younger = 1e10;
    },
  ]) {
    const copy = structuredClone(catalog);
    mutate(copy);
    assert.throws(() => validateCatalog(copy));
  }
});
