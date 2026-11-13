import {
  filterFossils,
  groupFossils,
  mergeFossilRecords,
  layoutFossilGraph,
} from "./fossil-data.js";
let data,
  totals,
  groups = new Map();
const ready = Promise.all(
  ["fossils.json", "hominin-literature.json"].map(async (file) => {
    const r = await fetch(new URL(`./data/${file}`, import.meta.url));
    if (!r.ok) throw Error("data");
    return r.json();
  }),
).then(([snapshot, literature]) => {
  data = {
    ...snapshot,
    records: mergeFossilRecords(snapshot.records, literature.records),
  };
  totals = { dinosaur: 0, hominin: 0 };
  for (const record of data.records) totals[record.group]++;
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
        layout: layoutFossilGraph(group?.records.length || 0),
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
        name: records[0].name,
      })),
    });
  } catch {
    self.postMessage({ type: "error" });
  }
};
