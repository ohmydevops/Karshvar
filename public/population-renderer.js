import * as THREE from "./vendor/three.module.min.js";

// Reproject the local data texture into the same orthographic view as the map.
export function createPopulationRenderer(canvas, projection) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.5));
  const uniforms = {
    image: { value: null },
    bounds: { value: new THREE.Vector4() },
    globe: { value: new THREE.Vector3() },
    basis: { value: new THREE.Matrix3() },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    vertexShader:
      "varying vec2 vUv; void main(){vUv=position.xy*.5+.5;gl_Position=vec4(position.xy,0.,1.);}",
    fragmentShader: `precision highp float;
      varying vec2 vUv; uniform sampler2D image; uniform vec4 bounds; uniform vec3 globe; uniform mat3 basis;
      void main(){
        vec2 p=mix(bounds.xy,bounds.zw,vec2(vUv.x,1.-vUv.y));
        vec2 q=(p-globe.xy)/globe.z; float r=dot(q,q); if(r>1.)discard;
        vec3 w=basis*vec3(q.x,-q.y,sqrt(1.-r));
        vec2 coord=vec2((atan(w.y,w.x)+3.14159265359)/6.28318530718,(asin(clamp(w.z,-1.,1.))+1.57079632679)/3.14159265359);
        float value=texture2D(image,coord).r;
        // Below one resident per square kilometre remains transparent.
        float minimum=0.0752567; if(value<minimum)discard;
        float t=clamp((value-minimum)/(1.-minimum),0.,1.);
        vec3 low=vec3(.65,.27,.10), mid=vec3(1.,.45,.04), high=vec3(1.,.95,.65);
        vec3 color=t<.5?mix(low,mid,t*2.):mix(mid,high,(t-.5)*2.);
        // Rural cells stay faint; dense urban cells approach full opacity.
        float opacity=.04+.94*smoothstep(.12,.82,t);
        gl_FragColor=vec4(color,opacity);
      }`,
  });
  const geometry = new THREE.PlaneGeometry(2, 2);
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(geometry, material));
  const camera = new THREE.Camera();
  return {
    async ready() {
      const texture = await new THREE.TextureLoader().loadAsync(
        new URL("./data/population-density.png", import.meta.url).href,
      );
      // Preserve the numerical channel; this image is data, not sRGB artwork.
      texture.colorSpace = THREE.NoColorSpace;
      texture.generateMipmaps = false;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      if (texture.image.width > renderer.capabilities.maxTextureSize) {
        const resized = document.createElement("canvas");
        resized.width = renderer.capabilities.maxTextureSize;
        resized.height = Math.round(
          (texture.image.height * resized.width) / texture.image.width,
        );
        resized
          .getContext("2d")
          .drawImage(texture.image, 0, 0, resized.width, resized.height);
        texture.image = resized;
      }
      texture.needsUpdate = true;
      uniforms.image.value = texture;
    },
    draw(bounds) {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width)),
        height = Math.max(1, Math.round(rect.height));
      const size = renderer.getSize(new THREE.Vector2());
      if (size.x !== width || size.y !== height)
        renderer.setSize(width, height, false);
      uniforms.bounds.value.fromArray(bounds);
      uniforms.globe.value.set(...projection.translate(), projection.scale());
      const inverse = globalThis.d3.geoRotation(projection.rotate()).invert;
      uniforms.basis.value.fromArray(
        [
          [90, 0],
          [0, 90],
          [0, 0],
        ].flatMap((p) => {
          const [lon, lat] = inverse(p).map((n) => (n * Math.PI) / 180);
          return [
            Math.cos(lat) * Math.cos(lon),
            Math.cos(lat) * Math.sin(lon),
            Math.sin(lat),
          ];
        }),
      );
      renderer.render(scene, camera);
    },
    dispose() {
      uniforms.image.value?.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}
