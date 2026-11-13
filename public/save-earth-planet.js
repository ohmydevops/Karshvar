import * as THREE from "./vendor/three.module.min.js";
export function createPlanet(
  axialFrame,
  settings,
  texture,
  nightTexture,
  cloudTexture,
  sun,
) {
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(1, 96, 64),
    new THREE.ShaderMaterial({
      uniforms: {
        dayMap: { value: texture },
        nightMap: { value: nightTexture },
        sunDirection: { value: sun.position.clone().normalize() },
      },
      vertexShader: `varying vec2 vUv;varying vec3 vNormalWorld;
      void main(){vUv=uv;vNormalWorld=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `uniform sampler2D dayMap;uniform sampler2D nightMap;uniform vec3 sunDirection;
      varying vec2 vUv;varying vec3 vNormalWorld;
      void main(){
        float sunlight=dot(normalize(vNormalWorld),normalize(sunDirection));
        float day=smoothstep(-0.12,0.15,sunlight);
        vec3 surface=texture2D(dayMap,vUv).rgb;

        vec3 cities=texture2D(nightMap,vUv).rgb;
        vec3 color=surface*(0.008+day*0.12+max(sunlight,0.0)*1.35)+cities*(1.0-day)*1.6;
        gl_FragColor=vec4(color,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    }),
  );
  earth.rotation.y = settings.earthRotation;
  axialFrame.add(earth);
  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(1.012, 64, 48),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        cloudMap: { value: cloudTexture },
        sunDirection: { value: sun.position.clone().normalize() },
      },
      vertexShader: earth.material.vertexShader,
      fragmentShader: `
          uniform sampler2D cloudMap;
          uniform vec3 sunDirection;
          varying vec2 vUv;
          varying vec3 vNormalWorld;
          void main() {
            float light = max(dot(normalize(vNormalWorld), sunDirection), 0.0);
            float density = texture2D(cloudMap, vUv).a;
            gl_FragColor = vec4(vec3(0.015 + light * 1.15), density * 0.82);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
    }),
  );
  clouds.rotation.y = settings.earthRotation;
  axialFrame.add(clouds);

  return { earth, clouds };
}

// Use the downloaded model's geometry, UVs and maps only in Save Earth.
export function createModelPlanet(axialFrame, settings, source, sun) {
  source.updateMatrixWorld(true);
  const surfaces = [],
    cloudParts = [];
  source.traverse((mesh) => {
    if (!mesh.isMesh) return;
    if (mesh.material.name === "lambert7") return; // Existing atmospheric halo.
    const copy = mesh.clone();
    copy.geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    copy.position.set(0, 0, 0);
    copy.quaternion.identity();
    copy.scale.setScalar(1);
    (mesh.material.name === "lambert6" ? cloudParts : surfaces).push(copy);
  });
  const bounds = new THREE.Box3();
  for (const mesh of surfaces) {
    mesh.geometry.computeBoundingBox();
    bounds.union(mesh.geometry.boundingBox);
  }
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z) / 2;
  const prototype = createPlanet(
    axialFrame,
    settings,
    surfaces[0].material.map,
    surfaces[0].material.emissiveMap,
    cloudParts[0].material.map,
    sun,
  );
  const earth = new THREE.Group(),
    clouds = new THREE.Group();
  for (const [parts, group, material] of [
    [surfaces, earth, prototype.earth.material],
    [cloudParts, clouds, prototype.clouds.material],
  ]) {
    for (const mesh of parts) {
      mesh.geometry
        .translate(-center.x, -center.y, -center.z)
        .scale(1 / radius, 1 / radius, 1 / radius)
        .rotateY(Math.PI);
      mesh.material = material;
      group.add(mesh);
    }
    group.rotation.y = settings.earthRotation;
    axialFrame.add(group);
  }
  for (const mesh of Object.values(prototype)) {
    axialFrame.remove(mesh);
    mesh.geometry.dispose();
  }
  return { earth, clouds };
}
