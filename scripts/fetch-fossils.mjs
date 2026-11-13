import fs from "node:fs/promises";

// Reproducible PBDB snapshot; never substitute palaeocoordinates for find sites.
const groups = {
  dinosaur: "Dinosauria",
  hominin:
    "Sahelanthropus,Orrorin,Ardipithecus,Australopithecus,Kenyanthropus,Paranthropus,Homo",
};
const records = [];
const queries = [];
for (const [group, taxa] of Object.entries(groups)) {
  const url = new URL("https://paleobiodb.org/data1.2/occs/list.json");
  url.search = new URLSearchParams({
    base_name: taxa,
    show: "coords,loc,ref",
    limit: "all",
  });
  if (group === "dinosaur") {
    url.searchParams.set("exclude_id", "36616,53211"); // Aves and Avialae
    url.searchParams.set("min_ma", "66");
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(180000) });
  if (!response.ok) throw Error(`PBDB ${response.status}`);
  const data = await response.json();
  if (data.errors?.length || !data.records?.length)
    throw Error(JSON.stringify(data));
  queries.push(url.href);
  for (const r of data.records) {
    if (
      r.lat == null ||
      r.lng == null ||
      !Number.isFinite(+r.lat) ||
      !Number.isFinite(+r.lng) ||
      r.eag == null ||
      r.lag == null
    )
      continue;
    if (Math.abs(+r.lat) > 90 || Math.abs(+r.lng) > 180) continue;
    records.push({
      id: r.oid,
      collection: r.cid,
      group,
      name: r.tna || r.idn,
      lat: +r.lat,
      lon: +r.lng,
      older: +r.eag,
      younger: +r.lag,
      country: r.cc2 || "",
      region: r.stp || "",
      place: r.cny || "",
      interval: [r.oei, r.oli].filter(Boolean).join(" — "),
      reference: r.ref || "",
      referenceId: r.rid,
    });
  }
  console.log(group, data.records.length);
}
await fs.mkdir(new URL("../public/data/", import.meta.url), {
  recursive: true,
});
await fs.writeFile(
  new URL("../public/data/fossils.json", import.meta.url),
  JSON.stringify({
    source: "Paleobiology Database",
    license: "CC BY 4.0",
    retrieved: new Date().toISOString().slice(0, 10),
    queries,
    records,
  }),
);
console.log(`Saved ${records.length} georeferenced records`);
