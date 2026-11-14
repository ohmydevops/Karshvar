import fs from "node:fs";
import { validateCatalog } from "../public/hominin-catalog.js";

// Explicit migration, never called during a build: curated edits must survive builds.
const destination = new URL(
  "../public/data/hominin-catalog.json",
  import.meta.url,
);
if (fs.existsSync(destination))
  throw Error("Catalog already exists; update its records explicitly.");
const catalog = {
  schemaVersion: 1,
  updated: "2026-11-15",
  sites: [],
  findings: [],
  sources: [],
  reports: [],
};
const sites = new Map();
const sources = new Map();
const replacements = new Map();
for (const filename of [
  "fossils.json",
  "hominin-literature.json",
  "hominin-museums.json",
]) {
  const dataset = JSON.parse(
    fs.readFileSync(new URL(`../public/data/${filename}`, import.meta.url)),
  );
  for (const record of dataset.records.filter(
    (row) => row.group === "hominin",
  )) {
    const pbdb = filename === "fossils.json";
    // Only explicit collection identity joins sites. Nearby coordinates are insufficient.
    const siteId = `site:${record.collection || record.id}`;
    if (!sites.has(siteId))
      sites.set(siteId, {
        id: siteId,
        name: record.place || null,
        nameFa: record.placeFa || null,
        country: record.country,
        region: record.region || "",
        latitude: record.lat,
        longitude: record.lon,
        precision: record.locationPrecision || "unspecified",
        uncertaintyMeters: null,
        coordinateSource:
          record.coordinateSource ||
          `https://paleobiodb.org/classic/basicCollectionSearch?collection_no=${record.collection?.split(":")[1]}`,
      });
    const sourceId = `source:${record.referenceId || record.id}`;
    if (!sources.has(sourceId))
      sources.set(sourceId, {
        id: sourceId,
        citation: record.reference || null,
        url:
          record.sourceUrl ||
          `https://paleobiodb.org/classic/displayReference?reference_no=${record.referenceId?.split(":")[1]}`,
        type: pbdb ? "pbdb-reference" : record.sourceType,
        reuseLicense: pbdb ? dataset.license : null,
      });
    const {
      name,
      lat,
      lon,
      country,
      region,
      place,
      placeFa,
      younger,
      older,
      ageLabel,
      interval,
      reference,
      sourceUrl,
      ...legacyDisplay
    } = record;
    const reportId = `report:${record.id}`;
    catalog.findings.push({
      id: record.id,
      siteId,
      specimenId: null,
      skeletalElement: null,
      evidenceType: record.evidenceType || "unspecified",
      recordKind: pbdb ? "taxon-occurrence" : "source-report",
      preferredReportId: reportId,
      supersededBy: null,
      legacyDisplay,
    });
    catalog.reports.push({
      id: reportId,
      findingId: record.id,
      sourceId,
      taxonomy: { name, confidence: null },
      age: {
        younger: younger === null ? null : younger * 1e6,
        older: older === null ? null : older * 1e6,
        unit: "years-before-present",
        target: pbdb ? "collection" : "unspecified",
        method: null,
        label: ageLabel || null,
        interval: interval || null,
        uncertainty: null,
      },
      review: {
        status: "imported",
        reviewedAt: null,
        sourceReviewedAt: record.reviewed || null,
      },
      provenance: {
        file: filename,
        recordId: record.id,
        sourceDate: dataset.retrieved || dataset.reviewed,
        importedAt: catalog.updated,
        original: record,
      },
    });
    for (const id of record.replaces || []) {
      if (replacements.has(id))
        throw Error(`Conflicting replacement for ${id}`);
      replacements.set(id, record.id);
    }
  }
}
catalog.sites = [...sites.values()];
catalog.sources = [...sources.values()];
for (const finding of catalog.findings)
  finding.supersededBy = replacements.get(finding.id) || null;
validateCatalog(catalog);
fs.writeFileSync(destination, JSON.stringify(catalog, null, 2) + "\n", {
  flag: "wx",
});
console.log(
  `Imported ${catalog.findings.length} findings with original provenance.`,
);
