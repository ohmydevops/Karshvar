import * as THREE from "./vendor/three.module.min.js";

export function createRocketView(model, scene) {
  const views = Array.from({ length: 6 }, () =>
    createSingleRocketView(model.clone(true), scene),
  );
  return {
    update(rockets = [], camera, trails = []) {
      views.forEach((view, i) =>
        view.update(
          i < rockets.length ? rockets[i] : trails[i - rockets.length],
          camera,
        ),
      );
    },
  };
}
function createSingleRocketView(model, scene) {
  const object = new THREE.Group();
  // Source authoring axis is +Y; keep the body small next to the meteor.
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const scale = 1.0 / (box.max.y - box.min.y);
  model.position.copy(center).multiplyScalar(-scale);
  model.scale.setScalar(scale);
  object.add(model);
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.065, 0.8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffba51, toneMapped: false }),
  );
  flame.rotation.z = Math.PI;
  flame.position.y = -0.7;
  object.add(flame);
  scene.add(object);
  const positions = new Float32Array(128 * 6 * 3);
  const ages = new Float32Array(128 * 6);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage),
  );
  geometry.setAttribute("age", new THREE.BufferAttribute(ages, 1));
  const edges = new Float32Array(128 * 6);
  for (let i = 0; i < ages.length; i++) {
    const vertex = i % 6;
    ages[i] =
      (Math.floor(i / 6) +
        (vertex === 2 || vertex === 3 || vertex === 5 ? 1 : 0)) /
      128;
    edges[i] = vertex === 1 || vertex === 4 || vertex === 5 ? -1 : 1;
  }
  geometry.setAttribute("edge", new THREE.BufferAttribute(edges, 1));
  const trail = new THREE.Mesh(
    geometry,
    new THREE.ShaderMaterial({
      uniforms: { fade: { value: 1 } },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader:
        "attribute float age, edge; varying float a,e; void main(){a=age;e=edge; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader:
        "uniform float fade; varying float a,e; void main(){vec3 c=mix(vec3(1.,.48,.08),vec3(.035,.038,.045),smoothstep(0.,.18,a)); float tail=1.-smoothstep(.55,1.,a); float soft=exp(-e*e*3.)*(1.-smoothstep(.75,1.,abs(e))); gl_FragColor=vec4(c,tail*soft*fade*.7);}",
    }),
  );
  trail.frustumCulled = false;
  scene.add(trail);
  const up = new THREE.Vector3(0, 1, 0),
    side = new THREE.Vector3(),
    eye = new THREE.Vector3(),
    tangent = new THREE.Vector3();
  return {
    update(rocket, camera) {
      trail.visible = !!rocket;
      object.visible = !!rocket && !rocket.retired;
      if (!rocket) return;
      trail.material.uniforms.fade.value = rocket.retired
        ? Math.max(0, rocket.trailLife / 3)
        : 1;
      object.position.copy(rocket.position);
      const progress = Math.min(1, rocket.age / rocket.duration);
      const growth = 0.035 + 0.565 * progress * progress * (3 - 2 * progress);
      object.scale.setScalar(growth * Math.min(1, (16 - rocket.age) / 2));
      object.quaternion.setFromUnitVectors(up, rocket.direction);
      flame.scale.y = 0.85 + Math.sin(rocket.age * 37) * 0.15;
      let offset = 0;
      for (let i = 0; i < rocket.trailCount; i++) {
        const a = i === 0 ? rocket.position : rocket.trail[i - 1],
          b = rocket.trail[i];
        tangent.copy(a).sub(b);
        eye.copy(camera.position).sub(a);
        side
          .crossVectors(tangent, eye)
          .normalize()
          .multiplyScalar((0.1 + i * 0.0025) * growth);
        for (let vertex = 0; vertex < 6; vertex++) {
          const point = vertex === 0 || vertex === 1 || vertex === 4 ? a : b;
          const sign = vertex === 1 || vertex === 4 || vertex === 5 ? -1 : 1;
          positions[offset++] = point.x + side.x * sign;
          positions[offset++] = point.y + side.y * sign;
          positions[offset++] = point.z + side.z * sign;
        }
      }
      geometry.setDrawRange(0, offset / 3);
      geometry.attributes.position.needsUpdate = true;
    },
  };
}
