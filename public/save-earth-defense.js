import { Vector3 } from "./vendor/three.module.min.js";
import {
  earthAnchor,
  planetRadius,
  damageMeteor,
} from "./save-earth-flight.js";
import { missionDifficulty } from "./save-earth-difficulty.js";

// Limited assistance: normal salvos every 22–32 seconds; when more than eight
// meteors are present, launch two together from different surface positions.
// These kills do not earn the player's score.
export function createEarthDefense(random = Math.random) {
  const rockets = [];
  const trails = [];
  const anchor = new Vector3(),
    direction = new Vector3();
  let cooldown = 2,
    opening = true;
  let difficulty = missionDifficulty("normal");
  return {
    rockets,
    trails,
    reset(mode = "normal") {
      difficulty = missionDifficulty(mode);
      rockets.length = 0;
      trails.length = 0;
      cooldown = 2;
      opening = true;
    },
    update(dt, player, meteors, onHit, openingTarget, onLaunch, shields = 8) {
      for (let i = trails.length - 1; i >= 0; i--) {
        trails[i].trailLife -= dt;
        if (trails[i].trailLife <= 0) trails.splice(i, 1);
      }
      cooldown -= dt * (shields <= 3 ? 1.3 : 1);
      if (!rockets.length && cooldown <= 0) {
        // Leave newly spawned and almost-impacting meteors to the player.
        const candidates = meteors.filter(
          (m) =>
            (opening || m.age > 8) &&
            m.duration - m.age > 8 &&
            !rockets.some((r) => r.target === m),
        );
        if (opening && !candidates.length && openingTarget)
          candidates.push(openingTarget());
        candidates.sort((a, b) => Number(!!b.giant) - Number(!!a.giant));
        const salvo = difficulty.randomSalvo
          ? 2 + Math.floor(random() * 2)
          : meteors.length > 8
            ? 2
            : 1;
        const count = Math.min(candidates.length, salvo);
        for (let slot = 0; slot < count; slot++) {
          const [target] = candidates.splice(
            candidates[0]?.giant ? 0 : Math.floor(random() * candidates.length),
            1,
          );
          earthAnchor(player, anchor);
          direction.copy(target.position).sub(anchor).normalize();
          const sideways = new Vector3()
            .crossVectors(direction, new Vector3(0, 1, 0))
            .normalize();
          if (sideways.lengthSq() < 0.01)
            sideways.crossVectors(direction, new Vector3(1, 0, 0)).normalize();
          direction
            .addScaledVector(sideways, [0.3, -0.3, 0.8][slot])
            .normalize();
          const origin = anchor
            .clone()
            .addScaledVector(direction, planetRadius + 0.2);
          const control = origin
            .clone()
            .addScaledVector(direction, 18)
            .addScaledVector(sideways, 12);
          rockets.push({
            target,
            origin,
            control,
            position: origin.clone(),
            direction: direction.clone(),
            age: 0,
            justLaunched: true,
            duration: 4 + random() * 4,
            trail: Array.from({ length: 128 }, () => origin.clone()),
            trailCount: 0,
            trailIn: 0,
          });
          opening = false;
          cooldown = difficulty.defense + random() * difficulty.defenseSpread;
          onLaunch?.();
        }
      }
      for (let r = rockets.length - 1; r >= 0; r--) {
        const rocket = rockets[r];
        if (rocket.justLaunched) {
          rocket.justLaunched = false;
          continue;
        }
        rocket.age += dt;
        const index = meteors.indexOf(rocket.target);
        if (rocket.age > 16) {
          rocket.retired = true;
          rocket.trailLife = 3;
          trails.push(rocket);
          rockets.splice(r, 1);
          continue;
        }
        if (index < 0) {
          // Keep coasting after a player kill; never retarget or detonate in air.
          rocket.position.addScaledVector(rocket.direction, 18 * dt);
        } else if (rocket.age >= rocket.duration) {
          const destroyed = damageMeteor(rocket.target, 8);
          if (destroyed) meteors.splice(index, 1);
          onHit(rocket.target, destroyed);
          rocket.retired = true;
          rocket.trailLife = 3;
          trails.push(rocket);
          rockets.splice(r, 1);
          continue;
        } else {
          direction.copy(rocket.position);
          const t = rocket.age / rocket.duration;
          rocket.position
            .copy(rocket.origin)
            .multiplyScalar((1 - t) ** 2)
            .addScaledVector(rocket.control, 2 * (1 - t) * t)
            .addScaledVector(rocket.target.position, t * t);
          rocket.direction.copy(rocket.position).sub(direction).normalize();
        }
        rocket.trailIn -= dt;
        if (rocket.trailIn <= 0) {
          for (let i = Math.min(127, rocket.trailCount); i > 0; i--)
            rocket.trail[i].copy(rocket.trail[i - 1]);
          rocket.trail[0].copy(rocket.position);
          rocket.trailCount = Math.min(128, rocket.trailCount + 1);
          rocket.trailIn += 0.04;
        }
      }
    },
  };
}
