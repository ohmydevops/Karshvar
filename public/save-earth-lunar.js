import { lunarField } from "./save-earth-lunar-field.js";
import * as THREE from "./vendor/three.module.min.js";

// Display radius is compressed to reveal the lunar limb while preserving
// human-sized landing props and slow flight. This is not an orbital simulator.
export const lunarRadius = 450;
export const landingOrigin = new THREE.Vector3(0, -12, 65);
const normal = new THREE.Vector3();
export function constrainLunarPilot(pilot) {
  normal.copy(pilot.position).sub(landingOrigin);
  normal.y += lunarRadius;
  const distance = normal.length();
  if (distance < lunarRadius + 2.5) {
    normal.divideScalar(distance);
    pilot.position
      .copy(landingOrigin)
      .addScaledVector(normal, lunarRadius + 2.5);
    pilot.position.y -= lunarRadius;
    pilot.velocity.addScaledVector(
      normal,
      -Math.min(0, pilot.velocity.dot(normal)),
    );
  }
}

export async function createLunarSite(models, textures) {
  const [asset, moonAsset, lunarMap] = await Promise.all([
    models.loadAsync(new URL("./art/moon-landing.glb", import.meta.url).href),
    models.loadAsync(new URL("./art/game-moon.glb", import.meta.url).href),
    textures.loadAsync(
      new URL("./art/moon-color-8k.webp", import.meta.url).href,
    ),
  ]);
  lunarMap.colorSpace = THREE.SRGBColorSpace;
  lunarMap.flipY = false;
  lunarMap.anisotropy = 8;
  const group = new THREE.Group();
  group.name = "Lunar landing site";
  group.position.copy(landingOrigin);
  const site = asset.scene;
  site.scale.setScalar(2.4 / 1.8);
  group.add(site);
  const globe = moonAsset.scene;
  globe.name = "Complete Moon";
  globe.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(globe);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const scale = (lunarRadius * 2) / Math.max(size.x, size.y, size.z);
  const meshes = [];
  globe.traverse((mesh) => {
    if (mesh.isMesh) meshes.push(mesh);
  });
  // Bake source transforms once, preserving its authored relief, UVs and map.
  for (const mesh of meshes) {
    mesh.geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    mesh.geometry
      .translate(-center.x, -center.y, -center.z)
      .scale(scale, scale, scale);
    mesh.geometry.rotateZ(Math.PI / 2);
    mesh.geometry.translate(0, -lunarRadius, 0);
    mesh.removeFromParent();
    globe.add(mesh);
    mesh.position.set(0, 0, 0);
    mesh.quaternion.identity();
    mesh.scale.setScalar(1);
    mesh.material.map = lunarMap;
    mesh.material.emissive.setScalar(0);
    mesh.material.roughness = 1;
    mesh.material.side = THREE.FrontSide;
  }
  globe.position.set(0, 0, 0);
  globe.quaternion.identity();
  globe.scale.setScalar(1);
  globe.updateMatrixWorld(true);
  // Exact surface/UV samples are baked once, avoiding 625 full-mesh raycasts at startup.
  const { top, cells, extent, field } = lunarField;
  const fieldUV = lunarField.fieldUV.map(([u, v]) => new THREE.Vector2(u, v));
  for (const mesh of meshes) mesh.geometry.translate(0, -top, 0);
  globe.updateMatrixWorld(true);
  function ground(x, z) {
    const u = THREE.MathUtils.clamp(
      ((x + extent) / (extent * 2)) * cells,
      0,
      cells - 0.0001,
    );
    const v = THREE.MathUtils.clamp(
      ((z + extent) / (extent * 2)) * cells,
      0,
      cells - 0.0001,
    );
    const ix = Math.floor(u),
      iz = Math.floor(v),
      k = iz * (cells + 1) + ix;
    return THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(field[k], field[k + 1], u - ix),
      THREE.MathUtils.lerp(field[k + cells + 1], field[k + cells + 2], u - ix),
      v - iz,
    );
  }
  function surfaceUV(x, z) {
    const u = THREE.MathUtils.clamp(
      ((x + extent) / (extent * 2)) * cells,
      0,
      cells - 0.0001,
    );
    const v = THREE.MathUtils.clamp(
      ((z + extent) / (extent * 2)) * cells,
      0,
      cells - 0.0001,
    );
    const ix = Math.floor(u),
      iz = Math.floor(v),
      k = iz * (cells + 1) + ix;
    return fieldUV[k]
      .clone()
      .lerp(fieldUV[k + 1], u - ix)
      .lerp(
        fieldUV[k + cells + 1].clone().lerp(fieldUV[k + cells + 2], u - ix),
        v - iz,
      );
  }
  group.add(globe);
  // Feather the source's square terrain perimeter into the spherical ground.
  site.updateMatrixWorld(true);
  const point = new THREE.Vector3();
  site.traverse((mesh) => {
    if (!mesh.isMesh) return;
    mesh.castShadow = mesh.receiveShadow = false;
    if (!mesh.name.includes("Moon_Surface")) return;
    const material = mesh.material;
    material.color.setRGB(1, 1, 1);
    material.roughness = 1;
    material.aoMapIntensity = 0.15;
    if (material.normalScale) material.normalScale.multiplyScalar(0.25);
    material.transparent = true;
    material.depthWrite = false;
    material.onBeforeCompile = (shader) => {
      shader.uniforms.lunarSurfaceMap = { value: lunarMap };
      shader.vertexShader =
        "attribute vec2 lunarUv; varying vec2 matchingUv; varying vec3 landingPoint;\n" +
        shader.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nlandingPoint = position; matchingUv = lunarUv;",
        );
      shader.fragmentShader =
        "uniform sampler2D lunarSurfaceMap; varying vec2 matchingUv; varying vec3 landingPoint;\n" +
        shader.fragmentShader
          .replace(
            "#include <map_fragment>",
            `#include <map_fragment>
          vec3 groundColor = texture2D(lunarSurfaceMap, matchingUv).rgb;
          float detail = dot(diffuseColor.rgb, vec3(.2126,.7152,.0722));
          float detailWeight = 1. - smoothstep(.2, .9, length(landingPoint.xz / vec2(16.458,15.987)));
          diffuseColor.rgb = groundColor * mix(1., .92 + .16 * clamp(detail * 3.,0.,1.), detailWeight);
        `,
          )
          .replace(
            "#include <alphamap_fragment>",
            "#include <alphamap_fragment>\ndiffuseColor.a *= 1. - smoothstep(.48, 1.08, length(landingPoint.xz / vec2(16.458, 15.987)));",
          );
    };
    const position = mesh.geometry.attributes.position;
    const inverse = mesh.matrixWorld.clone().invert();
    const lunarUVs = new Float32Array(position.count * 2);
    for (let i = 0; i < position.count; i++) {
      point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
      const uv = surfaceUV(point.x, point.z);
      lunarUVs[i * 2] = uv.x;
      lunarUVs[i * 2 + 1] = uv.y;
      const edge = Math.hypot(
        point.x / ((16.458 * 4) / 3),
        point.z / ((15.987 * 4) / 3),
      );
      const fade = THREE.MathUtils.smoothstep(edge, 0.3, 1.04);
      point.y =
        ground(point.x, point.z) +
        THREE.MathUtils.lerp(point.y + 0.12, 0.08, fade);
      point.applyMatrix4(inverse);
      position.setXYZ(i, point.x, point.y, point.z);
    }
    mesh.geometry.setAttribute(
      "lunarUv",
      new THREE.BufferAttribute(lunarUVs, 2),
    );
    position.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
    const normals = mesh.geometry.attributes.normal;
    const radial = new THREE.Vector3(),
      authored = new THREE.Vector3();
    for (let i = 0; i < position.count; i++) {
      point.fromBufferAttribute(position, i);
      const edge = Math.hypot(point.x / 16.458, point.z / 15.987);
      radial.set(point.x, point.y + lunarRadius / (4 / 3), point.z).normalize();
      authored
        .fromBufferAttribute(normals, i)
        .lerp(radial, 0.45 + 0.5 * THREE.MathUtils.smoothstep(edge, 0.25, 1))
        .normalize();
      normals.setXYZ(i, authored.x, authored.y, authored.z);
    }
    normals.needsUpdate = true;
  });
  group.visible = false;
  return group;
}
