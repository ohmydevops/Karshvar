const modes = {
  normal: {
    initialMeteors: 1,
    firstSpawn: 10,
    spawn: 8,
    minimum: 1.5,
    ramp: 60,
    defense: 28,
    defenseSpread: 14,
  },
  hard: {
    initialMeteors: 10,
    firstSpawn: 2,
    spawn: 2.5,
    minimum: 0.5,
    ramp: 30,
    randomSalvo: true,
    defense: 18,
    defenseSpread: 10,
  },
};
export function missionDifficulty(mode) {
  return modes[mode] || modes.normal;
}
export function meteorSpawnInterval(mode, elapsed) {
  const settings = missionDifficulty(mode);
  return Math.max(
    settings.minimum,
    settings.spawn * Math.pow(0.7, Math.floor(elapsed / settings.ramp)),
  );
}
