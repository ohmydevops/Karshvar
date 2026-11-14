import fs from "node:fs";
import { catalogMapRecords } from "../public/hominin-catalog.js";
export function buildHomininCatalog() {
  const catalog = JSON.parse(
    fs.readFileSync(
      new URL("../public/data/hominin-catalog.json", import.meta.url),
    ),
  );
  const records = catalogMapRecords(catalog);
  fs.writeFileSync(
    new URL("../public/data/hominin-map.json", import.meta.url),
    JSON.stringify({
      retrieved: catalog.updated,
      records,
    }) + "\n",
  );
}
