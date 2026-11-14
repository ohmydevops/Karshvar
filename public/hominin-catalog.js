// Ages use years before present. Null denotes an unreported bound or attribute.
export function validateCatalog(catalog) {
  if (catalog.schemaVersion !== 1) throw Error("Unsupported catalog version");
  const indexes = {};
  for (const table of ["sites", "findings", "sources", "reports"]) {
    indexes[table] = new Map();
    for (const row of catalog[table]) {
      if (!row.id || indexes[table].has(row.id))
        throw Error(`Duplicate ${table} ID`);
      indexes[table].set(row.id, row);
    }
  }
  for (const site of catalog.sites) {
    if (
      !Number.isFinite(site.latitude) ||
      Math.abs(site.latitude) > 90 ||
      !Number.isFinite(site.longitude) ||
      Math.abs(site.longitude) > 180
    )
      throw Error(`Invalid coordinates: ${site.id}`);
  }
  for (const finding of catalog.findings) {
    if (!indexes.sites.has(finding.siteId))
      throw Error(`Missing site: ${finding.id}`);
    const report = indexes.reports.get(finding.preferredReportId);
    if (!report || report.findingId !== finding.id)
      throw Error(`Missing preferred report: ${finding.id}`);
    if (finding.supersededBy && !indexes.findings.has(finding.supersededBy))
      throw Error(`Missing replacement: ${finding.id}`);
    const visited = new Set([finding.id]);
    let next = finding.supersededBy;
    while (next) {
      if (visited.has(next)) throw Error("Replacement cycle");
      visited.add(next);
      next = indexes.findings.get(next)?.supersededBy;
    }
  }
  for (const report of catalog.reports) {
    if (
      !indexes.findings.has(report.findingId) ||
      !indexes.sources.has(report.sourceId)
    )
      throw Error(`Broken report reference: ${report.id}`);
    const { younger, older, unit, target } = report.age;
    if (
      unit !== "years-before-present" ||
      ![
        "specimen",
        "layer",
        "occupation",
        "collection",
        "unspecified",
      ].includes(target)
    )
      throw Error(`Invalid age metadata: ${report.id}`);
    for (const value of [younger, older])
      if (value !== null && (!Number.isFinite(value) || value < 0))
        throw Error("Invalid age");
    if (younger !== null && older !== null && younger > older)
      throw Error("Reversed age");
  }
  return indexes;
}

export function catalogMapRecords(catalog) {
  const tables = validateCatalog(catalog);
  return catalog.findings
    .filter((finding) => !finding.supersededBy)
    .map((finding) => {
      const site = tables.sites.get(finding.siteId);
      const report = tables.reports.get(finding.preferredReportId);
      const source = tables.sources.get(report.sourceId);
      return {
        ...finding.legacyDisplay,
        id: finding.id,
        group: "hominin",
        name: report.taxonomy.name,
        lat: site.latitude,
        lon: site.longitude,
        country: site.country,
        region: site.region,
        place: site.name || "",
        placeFa: site.nameFa || undefined,
        younger: report.age.younger === null ? null : report.age.younger / 1e6,
        older: report.age.older === null ? null : report.age.older / 1e6,
        ageLabel: report.age.label || undefined,
        interval: report.age.interval || "",
        reference: source.citation,
        sourceUrl: source.url,
        ageTarget: report.age.target,
        catalogSiteId: site.id,
        catalogReportId: report.id,
      };
    });
}
