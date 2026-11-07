import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { interiorLabelPoint } from "../public/label-anchor.js";

const context = vm.createContext({});
for (const vendor of ["d3.min.js", "topojson-client.min.js"])
  vm.runInContext(
    readFileSync(
      new URL(`../public/vendor/${vendor}`, import.meta.url),
      "utf8",
    ),
    context,
  );
const { d3, topojson } = context;
const topology = JSON.parse(
  readFileSync(
    new URL("../public/data/countries.json", import.meta.url),
    "utf8",
  ),
);
const countries = topojson.feature(
  topology,
  topology.objects.countries,
).features;

test("Vietnam's label belongs inside Vietnam, not neighboring Laos", () => {
  const vietnam = countries.find((f) => f.id === "704");
  const laos = countries.find((f) => f.id === "418");
  const anchor = interiorLabelPoint(vietnam.geometry, d3);
  assert.ok(d3.geoContains(vietnam, anchor));
  assert.equal(d3.geoContains(laos, anchor), false);
});

test("all country label anchors remain inside their largest polygon", () => {
  for (const country of countries) {
    const polygons =
      country.geometry.type === "MultiPolygon"
        ? country.geometry.coordinates.map((coordinates) => ({
            type: "Polygon",
            coordinates,
          }))
        : [country.geometry];
    const geometry = polygons.sort((a, b) => d3.geoArea(b) - d3.geoArea(a))[0];
    const point = interiorLabelPoint(geometry, d3);
    assert.ok(d3.geoContains(geometry, point), country.properties.name);
  }
});
