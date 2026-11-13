import * as THREE from "./vendor/three.module.min.js";

// Each array slowly changes its tracking angle, then rests for most of a cycle.
export function solarArrayAngle(time, array) {
  const start = 5 + array * 2.3;
  if (time <= start) return 0;
  const period = 26 + (array % 3) * 5;
  const cycle = Math.floor((time - start) / period);
  const progress = Math.min(1, ((time - start) % period) / 7);
  const blend = progress ** 3 * (progress * (progress * 6 - 15) + 10);
  const amplitude = (0.12 + (array % 3) * 0.025) * (array % 2 ? -1 : 1);
  const target = cycle % 2 ? -amplitude : amplitude;
  const previous = cycle === 0 ? 0 : -target;
  return previous + (target - previous) * blend;
}

export function createSolarArrayMotion(model) {
  const angles = { value: new Float32Array(8) };
  model.traverse((mesh) => {
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry;
    const positions = geometry.attributes.position;
    const hinges = new Float32Array(positions.count * 4);
    let selected = 0;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i),
        y = positions.getY(i),
        z = positions.getZ(i);
      // The source's eight main blankets and their thin supporting frames.
      // Keep the central truss, radiators and cabin completely rigid.
      if (
        Math.abs(x) < 0.034 ||
        Math.abs(y + 0.001) > 0.0024 ||
        Math.abs(z) < 0.0035
      )
        continue;
      const outer = Math.abs(x) > 0.053;
      const pivot = Math.sign(x) * (outer ? 0.0633 : 0.043);
      const array = (x > 0 ? 4 : 0) + (outer ? 2 : 0) + (z > 0 ? 1 : 0);
      hinges.set([pivot, -0.001, array, 1], i * 4);
      selected++;
    }
    if (!selected) return;
    geometry.setAttribute("solarHinge", new THREE.BufferAttribute(hinges, 4));
    geometry.computeBoundingBox();
    // Conservative swept bounds cover all tracking angles, including collisions.
    geometry.boundingBox.expandByScalar(0.002);
    geometry.computeBoundingSphere();
    geometry.boundingSphere.radius += 0.002;
    mesh.userData.solarMotion = true;
    const material = mesh.material.clone();
    material.onBeforeCompile = (shader) => {
      shader.uniforms.solarAngles = angles;
      shader.vertexShader =
        "attribute vec4 solarHinge; uniform float solarAngles[8];\n" +
        shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <beginnormal_vertex>",
        `
        #include <beginnormal_vertex>
        float solarAngle = solarAngles[int(solarHinge.z)] * solarHinge.w;
        float solarC = cos(solarAngle), solarS = sin(solarAngle);
        mat2 solarRotation = mat2(solarC, solarS, -solarS, solarC);
        objectNormal.xy = solarRotation * objectNormal.xy;
        #ifdef USE_TANGENT
          objectTangent.xy = solarRotation * objectTangent.xy;
        #endif
      `,
      );
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `
        #include <begin_vertex>
        transformed.xy = solarRotation * (transformed.xy - solarHinge.xy) + solarHinge.xy;
      `,
      );
    };
    material.customProgramCacheKey = () => "iss-solar-tracking-v1";
    mesh.material = material;
  });
  return {
    update(time, reducedMotion = false) {
      for (let i = 0; i < 8; i++)
        angles.value[i] = reducedMotion ? 0 : solarArrayAngle(time, i);
    },
  };
}
