export function mountJourneyArt(features, target) {
  if (document.getElementById("journeyArt") || !features.length || !target)
    return;
  const d3 = globalThis.d3;
  const host = document.createElement("div");
  host.id = "journeyArt";
  host.className = "journey-art";
  host.setAttribute("aria-hidden", "true");
  target.before(host);
  const svg = d3.select(host).append("svg").attr("viewBox", "0 0 520 340");
  const projection = d3
    .geoOrthographic()
    .rotate([-40, -25])
    .translate([260, 170])
    .scale(133)
    .clipAngle(90);
  const path = d3.geoPath(projection);
  svg
    .append("ellipse")
    .attr("cx", 260)
    .attr("cy", 310)
    .attr("rx", 105)
    .attr("ry", 8)
    .attr("fill", "var(--accent)")
    .attr("opacity", 0.08);
  svg
    .append("circle")
    .attr("cx", 260)
    .attr("cy", 170)
    .attr("r", 156)
    .attr("fill", "none")
    .attr("stroke", "var(--line)")
    .attr("stroke-dasharray", "3 9");
  svg
    .append("path")
    .datum({ type: "Sphere" })
    .attr("d", path)
    .attr("fill", "var(--ocean)")
    .attr("stroke", "var(--line)");
  svg
    .append("g")
    .selectAll("path")
    .data(features)
    .join("path")
    .attr("d", path)
    .attr("fill", "var(--land)")
    .attr("stroke", "var(--ocean)")
    .attr("stroke-width", 0.6);
  const rings = svg
    .append("g")
    .attr("fill", "none")
    .attr("stroke", "var(--accent)");
  [24, 50, 79].forEach((r, i) =>
    rings
      .append("circle")
      .attr("cx", 290)
      .attr("cy", 155)
      .attr("r", r)
      .attr("opacity", 0.65 - i * 0.15)
      .attr("stroke-width", 1.4),
  );
  svg
    .append("circle")
    .attr("cx", 290)
    .attr("cy", 155)
    .attr("r", 5)
    .attr("fill", "var(--accent)")
    .attr("stroke", "var(--bg)")
    .attr("stroke-width", 3);
  svg
    .append("path")
    .attr("d", "M290 155 Q350 85 414 117")
    .attr("fill", "none")
    .attr("stroke", "var(--accent)")
    .attr("stroke-dasharray", "4 5")
    .attr("opacity", 0.6);
  svg
    .append("circle")
    .attr("cx", 414)
    .attr("cy", 117)
    .attr("r", 4)
    .attr("fill", "var(--accent)")
    .attr("opacity", 0.6);
}
