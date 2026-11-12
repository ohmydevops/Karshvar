import * as THREE from "./vendor/three.module.min.js";

// Static nearby geometry stays in local flight space, unlike the distant sky.
export async function createSpaceStation(loader) {
  const gltf = await loader.loadAsync(
    new URL("./art/iss.glb", import.meta.url).href,
  );
  const model = gltf.scene;
  // A subtle neutral earthshine floor keeps unlit panel backs legible against
  // black space. Preserve the original texture, roughness and material colors.
  const litMaterials = new Set();
  model.traverse((mesh) => {
    if (!mesh.isMesh) return;
    for (const material of [mesh.material].flat()) {
      if (!material?.emissive || litMaterials.has(material)) continue;
      litMaterials.add(material);
      material.emissive.setRGB(0.025, 0.032, 0.04);
      material.emissiveIntensity = 1;
      // The source's glossy clearcoat blows out the solar-cell texture under
      // the game's sun. Broad, subdued highlights preserve the panel pattern.
      material.roughness = Math.max(material.roughness, 0.6);
      if ("clearcoat" in material) {
        material.clearcoat = Math.min(material.clearcoat, 0.08);
        material.clearcoatRoughness = Math.max(
          material.clearcoatRoughness,
          0.6,
        );
      }
    }
  });
  model.updateMatrixWorld(true);
  const sourceBounds = new THREE.Box3().setFromObject(model);
  const size = sourceBounds.getSize(new THREE.Vector3());
  model.position.sub(sourceBounds.getCenter(new THREE.Vector3()));
  const object = new THREE.Group();
  object.name = "International Space Station";
  object.add(model);
  // A 2.4-unit pilot represents a 1.8 m adult; ISS span is about 109 m.
  const stationSpan = 109 * (2.4 / 1.8);
  object.scale.setScalar(stationSpan / Math.max(size.x, size.y, size.z));
  object.rotation.set(0, -0.3, -0.06);
  object.position.set(0, 20, 68);
  object.updateMatrixWorld(true);

  const radius = 0.45;
  const collisionBoxes = [];
  const broadphase = new THREE.Box3();
  model.traverse((mesh) => {
    if (!mesh.isMesh) return;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox
      .clone()
      .applyMatrix4(mesh.matrixWorld);
    collisionBoxes.push(box);
    broadphase.union(box);
  });
  broadphase.expandByScalar(radius);
  const closest = new THREE.Vector3();
  const normal = new THREE.Vector3();
  function constrainPilot(pilot) {
    const position = pilot.position;
    if (!broadphase.containsPoint(position)) return false;
    let touched = false;
    // Three small passes settle corners without per-frame allocations. Flight
    // steps are capped below the pilot radius, so thin panels cannot be skipped.
    for (let pass = 0; pass < 3; pass++) {
      let changed = false;
      for (const box of collisionBoxes) {
        box.clampPoint(position, closest);
        normal.subVectors(position, closest);
        const squared = normal.lengthSq();
        if (squared >= radius * radius) continue;
        let penetration;
        if (squared > 1e-12) {
          const distance = Math.sqrt(squared);
          normal.multiplyScalar(1 / distance);
          penetration = radius - distance;
        } else {
          // A center inside a panel box exits through its nearest face.
          let depth = position.x - box.min.x;
          normal.set(-1, 0, 0);
          if (box.max.x - position.x < depth) {
            depth = box.max.x - position.x;
            normal.set(1, 0, 0);
          }
          if (position.y - box.min.y < depth) {
            depth = position.y - box.min.y;
            normal.set(0, -1, 0);
          }
          if (box.max.y - position.y < depth) {
            depth = box.max.y - position.y;
            normal.set(0, 1, 0);
          }
          if (position.z - box.min.z < depth) {
            depth = position.z - box.min.z;
            normal.set(0, 0, -1);
          }
          if (box.max.z - position.z < depth) {
            depth = box.max.z - position.z;
            normal.set(0, 0, 1);
          }
          penetration = radius + depth;
        }
        position.addScaledVector(normal, penetration + 0.0001);
        const inward = pilot.velocity.dot(normal);
        if (inward < 0) pilot.velocity.addScaledVector(normal, -inward);
        touched = changed = true;
      }
      if (!changed) break;
    }
    return touched;
  }
  const displacement = new THREE.Vector3();
  let previousHeight = 0;
  function update(time) {
    const height = Math.sin(time * 0.08) * 0.8;
    displacement.set(0, height - previousHeight, 0);
    object.position.add(displacement);
    broadphase.translate(displacement);
    for (const box of collisionBoxes) box.translate(displacement);
    previousHeight = height;
  }
  function reset(pilot) {
    const azimuth = Math.random() * Math.PI * 2;
    const elevation = (Math.random() - 0.5) * 1.4;
    const distance = 220 + Math.random() * 30;
    displacement
      .set(
        Math.cos(azimuth) * Math.cos(elevation),
        Math.sin(elevation),
        Math.sin(azimuth) * Math.cos(elevation),
      )
      .multiplyScalar(distance)
      .add(pilot.position)
      .sub(object.position);
    object.position.add(displacement);
    broadphase.translate(displacement);
    for (const box of collisionBoxes) box.translate(displacement);
    previousHeight = 0;
  }
  return { object, constrainPilot, update, reset };
}
