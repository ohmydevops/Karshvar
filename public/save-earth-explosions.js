import * as THREE from "./vendor/three.module.min.js";

export function explosionLifetime(burst) {
  return Math.max(4.2, burst.duration || 4.2);
}

export function explosionScale(age) {
  // Keep drifting outward throughout the fade, rather than reaching a fixed size.
  return 0.45 + Math.max(0, age) * 1.65;
}

// Authored OPREXT spark cards, baked once and shared across all impact slots.
// Reuse geometry and pooled groups; expansion and opacity fade run together.
export function createMeteorExplosions(scene, source) {
  source.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(source);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const fit = 2 / Math.max(size.x, size.y, size.z);
  const parts = [];
  source.traverse((mesh) => {
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    geometry.translate(-center.x, -center.y, -center.z);
    geometry.scale(fit, fit, fit);
    parts.push({ geometry, material: mesh.material });
  });
  const pool = Array.from({ length: 16 }, () => {
    const group = new THREE.Group();
    for (const part of parts) {
      const material = part.material.clone();
      material.transparent = true;
      material.depthWrite = false;
      // Alpha testing clips faint spark edges, making a fading blast look smaller.
      material.alphaTest = 0;
      material.alphaHash = false;
      material.blending = THREE.AdditiveBlending;
      material.toneMapped = false;
      material.vertexColors = false;
      const mesh = new THREE.Mesh(part.geometry, material);
      mesh.frustumCulled = false;
      group.add(mesh);
    }
    group.visible = false;
    scene.add(group);
    return { group };
  });
  return {
    update(bursts) {
      for (let i = 0; i < pool.length; i++) {
        const { group } = pool[i],
          burst = bursts[bursts.length - 1 - i];
        group.visible = !!burst;
        if (!burst) continue;
        group.position.copy(burst.position);
        group.scale.setScalar(burst.radius * explosionScale(burst.age));
        const seed = (burst.seed ?? 0.5) * Math.PI * 2;
        group.rotation.set(seed, seed * 0.7, seed * 0.3);
        // A brief ignition, followed by simultaneous outward spread and fading.
        const fadeStart = 0.18;
        const fade = Math.max(
          0,
          Math.min(
            1,
            1 -
              (burst.age - fadeStart) / (explosionLifetime(burst) - fadeStart),
          ),
        );
        for (const mesh of group.children) {
          mesh.material.opacity = fade * fade * (3 - 2 * fade);
          mesh.material.color.setRGB(
            1.5,
            0.12 + (burst.seed ?? 0.5) * 0.35,
            0.008,
          );
        }
      }
    },
  };
}
