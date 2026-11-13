import * as THREE from "./vendor/three.module.min.js";

// Six small, shared geometry/material variants; no additional downloads and no
// geometry work while flying. The source's bright emissive veins become stone.
export function createMeteorLooks(template) {
  const palettes = [0x69645b, 0x55595d, 0x756354, 0x606251, 0x454950, 0x81796b];
  const shapes = [
    [1, 0.9, 0.86],
    [0.79, 1, 0.85],
    [1, 0.76, 0.91],
    [0.88, 0.84, 1],
    [0.94, 1, 0.73],
    [0.82, 0.96, 1],
  ];
  const sources = [];
  template.traverse((mesh) => {
    if (mesh.isMesh) sources.push(mesh);
  });
  const variants = palettes.map((tint, variant) =>
    sources.map((source) => {
      const geometry = source.geometry.clone();
      geometry.computeBoundingSphere();
      const { center, radius } = geometry.boundingSphere;
      const positions = geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i) - center.x,
          y = positions.getY(i) - center.y,
          z = positions.getZ(i) - center.z;
        const relief =
          0.94 +
          0.055 *
            Math.sin((x / radius) * 3.2 + variant) *
            Math.sin((y / radius) * 2.7 + (z / radius) * 1.9);
        positions.setXYZ(
          i,
          center.x + x * shapes[variant][0] * relief,
          center.y + y * shapes[variant][1] * relief,
          center.z + z * shapes[variant][2] * relief,
        );
      }
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
      geometry.computeBoundingBox();
      const material = source.material.clone();
      material.emissive.setScalar(0);
      material.emissiveMap = null;
      material.metalness = 0;
      material.roughness = 0.96;
      material.roughnessMap = null;
      material.metalnessMap = null;
      material.color.setScalar(1);
      material.normalScale?.multiplyScalar(0.6);
      material.onBeforeCompile = (shader) => {
        shader.uniforms.stoneTint = { value: new THREE.Color(tint) };
        shader.fragmentShader =
          "uniform vec3 stoneTint;\n" +
          shader.fragmentShader.replace(
            "#include <map_fragment>",
            `#include <map_fragment>
        float stoneDetail = clamp(dot(diffuseColor.rgb, vec3(.2126,.7152,.0722)), 0., 1.);
        diffuseColor.rgb = stoneTint * mix(.58, 1.08, sqrt(stoneDetail));`,
          );
      };
      material.customProgramCacheKey = () => "save-earth-stone-v1";
      return { geometry, material };
    }),
  );
  let next = 0;
  function apply(object, variant) {
    variant = (variant ?? 0) % variants.length;
    if (object.userData.stoneVariant === variant) return;
    object.userData.stoneVariant = variant;
    object.userData.stoneMeshes.forEach((mesh, i) => {
      mesh.geometry = variants[variant][i].geometry;
      mesh.material = variants[variant][i].material;
    });
  }
  return {
    apply,
    create() {
      const object = template.clone(true),
        meshes = [];
      object.traverse((mesh) => {
        if (mesh.isMesh) meshes.push(mesh);
      });
      object.userData.stoneMeshes = meshes;
      apply(object, next++ % variants.length);
      return object;
    },
  };
}
