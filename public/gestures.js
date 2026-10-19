// Pointer Events work for mouse, pen, real touchscreens, and device emulation.
export function bindGlobeGestures(
  element,
  { onStart, onRotate, onZoom, onEnd },
) {
  const pointers = new Map();
  let changed = false;
  let input = "mouse";
  function measure() {
    const points = [...pointers.values()];
    return {
      x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
      y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
      distance:
        points.length === 2
          ? Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y)
          : 0,
    };
  }
  function down(event) {
    if (event.button !== 0 || pointers.size >= 2) return;
    if (!pointers.size) {
      changed = false;
      input = event.pointerType;
      onStart();
    }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    element.setPointerCapture(event.pointerId);
    if (event.cancelable) event.preventDefault();
  }
  function move(event) {
    if (!pointers.has(event.pointerId)) return;
    const before = measure();
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const after = measure();
    const dx = after.x - before.x,
      dy = after.y - before.y;
    if (dx || dy) {
      changed = true;
      onRotate(dx, dy);
    }
    if (
      before.distance > 0 &&
      after.distance > 0 &&
      before.distance !== after.distance
    ) {
      changed = true;
      onZoom(after.distance / before.distance);
    }
    if (event.cancelable) event.preventDefault();
  }
  function end(event) {
    if (!pointers.delete(event.pointerId)) return;
    if (element.hasPointerCapture(event.pointerId))
      element.releasePointerCapture(event.pointerId);
    if (!pointers.size && changed) onEnd(input);
  }
  const handlers = {
    pointerdown: down,
    pointermove: move,
    pointerup: end,
    pointercancel: end,
    lostpointercapture: end,
  };
  for (const [type, handler] of Object.entries(handlers))
    element.addEventListener(type, handler);
  return () => {
    pointers.clear();
    for (const [type, handler] of Object.entries(handlers))
      element.removeEventListener(type, handler);
  };
}
