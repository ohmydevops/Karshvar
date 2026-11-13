import * as THREE from "./vendor/three.module.min.js";

// Authored OPREXT spark cards, baked once and shared across all impact slots.
// Animation is driven by uniforms on the GPU, without creating objects on hits.
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
    const phase = { value: 0 };
    for (const part of parts) {
      const material = part.material.clone();
      material.transparent = true;
      material.depthWrite = false;
      material.blending = THREE.AdditiveBlending;
      material.toneMapped = false;
      material.vertexColors = false;
      material.onBeforeCompile = (shader) => {
        shader.uniforms.explosionAge = phase;
        shader.vertexShader =
          "uniform float explosionAge;\n" + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\n transformed *= .25 + 3.5 * (1. - exp(-explosionAge * 4.5));",
        );
      };
      const mesh = new THREE.Mesh(part.geometry, material);
      mesh.frustumCulled = false;
      group.add(mesh);
    }
    group.visible = false;
    scene.add(group);
    return { group, phase };
  });
  return {
    update(bursts) {
      for (let i = 0; i < pool.length; i++) {
        const { group, phase } = pool[i],
          burst = bursts[bursts.length - 1 - i];
        group.visible = !!burst;
        if (!burst) continue;
        group.position.copy(burst.position);
        group.scale.setScalar(burst.radius);
        const seed = (burst.seed ?? 0.5) * Math.PI * 2;
        group.rotation.set(seed, seed * 0.7 + burst.age * 0.15, seed * 0.3);
        phase.value = burst.age * (0.85 + (burst.seed ?? 0.5) * 0.45);
        const fade = Math.max(0, 1 - burst.age / (burst.duration || 1.8));
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
