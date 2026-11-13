// Cosmetic camera motion only; gameplay position and aiming remain unchanged.
export function explosionDelay(distance) {
  return 0.5 + Math.min(1, Math.max(0, distance) / 160);
}
export function rumbleStrength(state) {
  if (!state.active) return 0;
  let strength = 0;
  for (const meteor of state.meteors || []) {
    if (!meteor.giant) continue;
    const gap = Math.max(
      0,
      meteor.position.distanceTo(state.player.position) -
        (meteor.renderRadius ?? meteor.radius),
    );
    const proximity = Math.max(0, 1 - gap / 24);
    strength += 0.18 * proximity * proximity;
  }

  for (const burst of state.bursts || []) {
    const distance = burst.position.distanceTo(state.player.position);
    const age = burst.age - explosionDelay(distance);
    if (age >= 0 && age < 0.8)
      strength +=
        (0.05 * Math.sin((Math.PI * age) / 0.8) ** 2) / (1 + distance / 40);
  }
  return Math.min(0.18, strength);
}
