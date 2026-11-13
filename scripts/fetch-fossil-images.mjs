import fs from "node:fs/promises";
const data = JSON.parse(
  await fs.readFile(new URL("../public/data/fossils.json", import.meta.url)),
);
const counts = new Map();
for (const r of data.records) {
  const key = r.group === "hominin" ? r.name : r.name.split(" ")[0];
  counts.set(key, (counts.get(key) || 0) + 1);
}
const names = [
  ...new Set(
    [...counts]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 150)
      .map((x) => x[0])
      .concat(
        data.records.filter((r) => r.group === "hominin").map((r) => r.name),
      ),
  ),
];
const images = {};
async function query(host, params) {
  const url = new URL(`https://${host}/w/api.php`);
  url.search = new URLSearchParams({
    action: "query",
    format: "json",
    ...params,
  });
  await new Promise((r) => setTimeout(r, 2000));
  let res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 15000));
    res = await fetch(url);
  }
  if (!res.ok) throw Error(res.status);
  return (await res.json()).query?.pages || {};
}
for (let i = 0; i < names.length; i += 40) {
  const pages = await query("en.wikipedia.org", {
    prop: "pageimages",
    piprop: "thumbnail|name",
    pithumbsize: "640",
    titles: names.slice(i, i + 40).join("|"),
  });
  const candidates = Object.values(pages).filter(
    (p) => p.thumbnail && p.pageimage,
  );
  const files = await query("commons.wikimedia.org", {
    prop: "imageinfo",
    iiprop: "extmetadata|url",
    titles: candidates.map((p) => "File:" + p.pageimage).join("|"),
  });
  for (const p of candidates) {
    const f = Object.values(files).find(
      (f) =>
        f.title.replaceAll("_", " ") ===
        "File:" + p.pageimage.replaceAll("_", " "),
    );
    const info = f?.imageinfo?.[0];
    if (!info) continue;
    const m = info.extmetadata || {};
    const plain = (s) =>
      (s || "")
        .replace(/<[^>]*>/g, "")
        .replace(/&[^;]+;/g, " ")
        .trim();
    images[p.title] = {
      url: p.thumbnail.source,
      source: info.descriptionurl,
      artist: plain(m.Artist?.value),
      license: plain(m.LicenseShortName?.value),
      title: p.pageimage,
    };
  }
  console.log("Images", Object.keys(images).length);
}
await fs.writeFile(
  new URL("../public/data/fossil-images.json", import.meta.url),
  JSON.stringify(images),
);
