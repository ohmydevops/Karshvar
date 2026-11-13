// Expanded records remain part of the map, with no separate panel or controls.
export function mountFossilGraph(host, { records, layout, number, onSelect }) {
  const world = document.createElement("div");
  world.className = "fossil-graph-world";
  const lines = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  lines.setAttribute("class", "fossil-graph-lines");
  lines.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(lines.namespaceURI, "path");
  path.setAttribute(
    "d",
    layout.nodes.map((p) => `M0,0L${p.x},${p.y}`).join(""),
  );
  lines.append(path);
  world.append(lines);
  const fragment = document.createDocumentFragment();
  const buttons = [];
  for (const [i, record] of records.entries()) {
    const p = layout.nodes[i];
    const b = document.createElement("button");
    b.className = "fossil-record-dot";
    b.type = "button";
    b.textContent = number.format(i + 1);
    b.style.left = `${p.x - 14}px`;
    b.style.top = `${p.y - 14}px`;
    b.title = `${record.name} · ${record.place || record.country} · ${record.id}`;
    b.setAttribute("aria-label", b.title);
    b.onclick = () => onSelect(record);
    buttons.push(b);
    fragment.append(b);
  }
  world.append(fragment);
  host.replaceChildren(world);
  let baseZoom = null,
    previousSize = 0,
    previousZoom = 0;
  return {
    resize(size, zoom) {
      if (baseZoom === null) baseZoom = zoom;
      if (size === previousSize && zoom === previousZoom) return;
      previousSize = size;
      previousZoom = zoom;
      const scale =
        (Math.min(1, (size - 40) / (layout.radius * 2)) * zoom) / baseZoom;
      world.style.transform = `translate3d(${size / 2}px,${size / 2}px,0) scale(${scale})`;
    },
    focus() {
      buttons[0]?.focus({ preventScroll: true });
    },
    dispose() {},
  };
}
