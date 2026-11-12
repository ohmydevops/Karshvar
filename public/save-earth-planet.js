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
        vec3 color=surface*(0.055+day*0.18+max(sunlight,0.0)*1.15)+cities*(1.0-day)*1.6;
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
            gl_FragColor = vec4(vec3(0.12 + light * 1.05), density * 0.82);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
    }),
  );
  clouds.rotation.y = settings.earthRotation;
  axialFrame.add(clouds);

  return { earth, clouds };
}
