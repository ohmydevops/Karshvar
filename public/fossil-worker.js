import { filterFossils, homininCategory, groupFossils } from "./fossil-data.js";
let data,
  totals,
  groups = new Map();
const ready = fetch(new URL("./data/hominin-map.json", import.meta.url))
  .then((response) => {
    if (!response.ok) throw Error("data");
    return response.json();
  })
  .then((catalog) => {
    data = catalog;
    totals = { sapiens: 0, neanderthal: 0, hominin: 0 };
    for (const record of data.records) totals[homininCategory(record)]++;
  });
self.onmessage = async ({ data: message }) => {
  try {
    await ready;
    if (message.type === "details") {
      const group = groups.get(message.id);
      self.postMessage({
        type: "details",
        id: message.id,
        records: group?.records || [],
      });
      return;
    }
    const filtered = filterFossils(data.records, message.filters);
    const clustered = groupFossils(filtered);
    groups = new Map(clustered.map((g) => [g.id, g]));
    self.postMessage({
      type: "filtered",
      version: message.version,
      total: data.records.length,
      totals,
      count: filtered.length,
      retrieved: data.retrieved,
      groups: clustered.map(({ records, ...g }) => ({
        ...g,
        count: records.length,
        name: records[0].place || records[0].name,
        nameFa: records[0].placeFa,
      })),
    });
  } catch {
    self.postMessage({ type: "error" });
  }
};
