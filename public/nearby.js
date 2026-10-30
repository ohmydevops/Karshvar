// Direct land neighbors first, then expand by distance from the fixed origin.
export function nearbyOrder(countries, originId) {
  const origin = countries.find((c) => c.id === originId);
  if (!origin) return [];
  const neighbors = new Set(origin.borders || []);
  const distance = ({ point: [lon, lat] }) => {
    const rad = Math.PI / 180;
    const [x, y] = origin.point;
    return (
      Math.sin(((lat - y) * rad) / 2) ** 2 +
      Math.cos(y * rad) *
        Math.cos(lat * rad) *
        Math.sin(((lon - x) * rad) / 2) ** 2
    );
  };
  return countries
    .filter((c) => c.id !== originId)
    .sort(
      (a, b) =>
        Number(neighbors.has(b.code)) - Number(neighbors.has(a.code)) ||
        distance(a) - distance(b) ||
        String(a.id).localeCompare(String(b.id)),
    )
    .map((c) => c.id);
}

// Retain completed answers when a new ordering or dataset is introduced.
export function restoreNearbySession(order, saved) {
  const answers = [];
  const seen = new Set();
  for (const answer of Array.isArray(saved?.answers) ? saved.answers : []) {
    if (
      answer &&
      order.includes(answer.id) &&
      typeof answer.correct === "boolean" &&
      !seen.has(answer.id)
    ) {
      answers.push(answer);
      seen.add(answer.id);
    }
  }
  return {
    order: [
      ...answers.map((a) => a.id),
      ...order.filter((id) => !seen.has(id)),
    ],
    answers,
    index: answers.length,
  };
}
