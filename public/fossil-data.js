export function homininCategory(record) {
  if (record.group !== "hominin") return null;
  if (record.name === "Homo sapiens") return "sapiens";
  if (record.name === "Homo neanderthalensis") return "neanderthal";
  return "hominin";
}
export function filterFossils(records, filters) {
  const query = (filters.query || "").trim().toLowerCase();
  return records.filter(
    (r) =>
      filters[homininCategory(r)] &&
      (r.younger ?? 0) <= filters.older &&
      (r.older ?? Infinity) >= filters.younger &&
      (!query ||
        `${r.name} ${r.country} ${r.region} ${r.place}`
          .toLowerCase()
          .includes(query)),
  );
}
export function mergeFossilRecords(records, literature) {
  const replaced = new Set(literature.flatMap((r) => r.replaces || []));
  return [...literature, ...records.filter((r) => !replaced.has(r.id))];
}
export function groupFossils(records) {
  const groups = new Map();
  for (const record of records) {
    const key = `${record.group}:${Math.round(record.lon * 4)}:${Math.round(record.lat * 4)}`;
    if (!groups.has(key))
      groups.set(key, {
        id: key,
        group: record.group,
        lon: record.lon,
        lat: record.lat,
        records: [],
      });
    groups.get(key).records.push(record);
  }
  return [...groups.values()];
}
// Linear-time, non-overlapping graph layout, computed in the data worker.
export function layoutFossilGraph(count) {
  const nodes = [];
  let radius = 86;
  while (nodes.length < count) {
    const capacity = Math.floor((2 * Math.PI * radius) / 60);
    const size = Math.min(capacity, count - nodes.length);
    for (let i = 0; i < size; i++) {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / size;
      nodes.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
    }
    radius += 64;
  }
  return { nodes, radius: count ? radius - 64 + 28 : 28 };
}
