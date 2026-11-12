import * as THREE from "./vendor/three.module.min.js";

// A bounded, single-frame camera blur. No history buffer, so stopping the
// camera cannot leave ghosts. Every frame shares the same MSAA and output
// transform; the idle shader takes one sample. DOM sights/HUD stay separate.
export function createMotionBlur(renderer) {
  const size = new THREE.Vector2();
  renderer.getDrawingBufferSize(size);
  const target = new THREE.WebGLRenderTarget(size.x, size.y, {
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: true,
    stencilBuffer: false,
    generateMipmaps: false,
    samples: Math.min(4, renderer.capabilities.maxSamples || 0),
  });
  target.texture.colorSpace = THREE.LinearSRGBColorSpace;
  target.texture.name = "Space camera motion";
  const uniforms = {
    source: { value: target.texture },
    direction: { value: new THREE.Vector2() },
    inverseSize: { value: new THREE.Vector2(1 / size.x, 1 / size.y) },
    strength: { value: 0 },
    aspect: { value: size.x / size.y },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    depthTest: false,
    depthWrite: false,
    blending: THREE.NoBlending,
    toneMapped: true,
    vertexShader: `varying vec2 vUv;
      void main(){vUv=position.xy*.5+.5;gl_Position=vec4(position.xy,0.,1.);}`,
    fragmentShader: `
      uniform sampler2D source;
      uniform vec2 direction;
      uniform vec2 inverseSize;
      uniform float strength;
      uniform float aspect;
      varying vec2 vUv;
      void main(){
        vec4 color=texture2D(source,vUv);
        if(strength>.002){
          vec2 centre=(vUv-.5)*vec2(aspect,1.);
          float peripheral=smoothstep(.055,.28,length(centre));
          vec2 axis=direction/max(length(direction),.00001);
          // Eight physical pixels end-to-end at full strength, independent of DPR.
          vec2 offset=axis*inverseSize*8.*strength*peripheral;
          color*=.28;
          color+=texture2D(source,clamp(vUv+offset*.1667,vec2(0.),vec2(1.)))*.20;
          color+=texture2D(source,clamp(vUv-offset*.1667,vec2(0.),vec2(1.)))*.20;
          color+=texture2D(source,clamp(vUv+offset*.3333,vec2(0.),vec2(1.)))*.11;
          color+=texture2D(source,clamp(vUv-offset*.3333,vec2(0.),vec2(1.)))*.11;
          color+=texture2D(source,clamp(vUv+offset*.5,vec2(0.),vec2(1.)))*.05;
          color+=texture2D(source,clamp(vUv-offset*.5,vec2(0.),vec2(1.)))*.05;
        }
        gl_FragColor=color;
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3),
  );
  const pass = new THREE.Scene();
  const triangle = new THREE.Mesh(geometry, material);
  triangle.frustumCulled = false;
  pass.add(triangle);
  const passCamera = new THREE.Camera();
  return {
    async warmup(scene, camera) {
      const previous = renderer.getRenderTarget();
      try {
        renderer.initRenderTarget(target);
        renderer.setRenderTarget(target);
        await renderer.compileAsync(scene, camera);
        renderer.setRenderTarget(previous);
        await renderer.compileAsync(pass, passCamera);
      } finally {
        renderer.setRenderTarget(previous);
      }
    },
    render(scene, camera, motion) {
      const amount = Math.max(0, Math.min(1, motion?.strength || 0));
      const x = motion?.x || 0;
      const y = motion?.y || 0;
      uniforms.direction.value.set(x, y);
      uniforms.strength.value = x * x + y * y < 0.000001 ? 0 : amount;
      const previous = renderer.getRenderTarget();
      try {
        renderer.setRenderTarget(target);
        renderer.render(scene, camera);
        renderer.setRenderTarget(previous);
        renderer.render(pass, passCamera);
      } finally {
        renderer.setRenderTarget(previous);
      }
    },
    resize(width, height) {
      const ratio = renderer.getPixelRatio();
      const w = Math.max(1, Math.floor(width * ratio));
      const h = Math.max(1, Math.floor(height * ratio));
      target.setSize(w, h);
      uniforms.inverseSize.value.set(1 / w, 1 / h);
      uniforms.aspect.value = w / h;
    },
    dispose() {
      target.dispose();
      geometry.dispose();
      material.dispose();
    },
  };
}
