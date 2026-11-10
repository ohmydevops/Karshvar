// Country fills and borders use spherical vector meshes built off the main
// thread. The low-resolution atlas is only used for the translucent interior
// view or as a compatibility fallback when workers cannot run.
import * as THREE from "./vendor/three.module.min.js";
export function mountGpuCountries(svg, projection, redraw = () => {}) {
  // WebKit can composite accelerated foreignObject children outside the SVG
  // transform and paint order. Keep GPU rendering, but present its frame as an
  // SVG image there so the SVG owns positioning, scaling and stacking.
  const ua = globalThis.navigator?.userAgent || "";
  const svgFrame =
    /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && globalThis.navigator?.maxTouchPoints > 1) ||
    (/AppleWebKit/.test(ua) && !/Chrome|Chromium|Edg|OPR/.test(ua));
  const layer = svg
    .append(svgFrame ? "image" : "foreignObject")
    .attr("preserveAspectRatio", "none")
    .attr("pointer-events", "none")
    .attr("aria-hidden", "true");
  const canvas = svgFrame
    ? document.createElement("canvas")
    : layer
        .append("xhtml:canvas")
        .style("width", "100%")
        .style("height", "100%")
        .node();
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
  } catch {
    layer.remove();
    return null;
  }
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
  const palette = new Uint8Array(256 * 4),
    paletteTexture = new THREE.DataTexture(palette, 256, 1);
  const uniforms = {
    atlas: { value: null },
    palette: { value: paletteTexture },
    bounds: { value: new THREE.Vector4() },
    globe: { value: new THREE.Vector3() },
    basis: { value: new THREE.Matrix3() },
    border: { value: new THREE.Color() },
    alpha: { value: 1 },
    interior: { value: 0 },
    satellite: { value: 0 },
    viewport: { value: new THREE.Vector2(1, 1) },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    vertexShader:
      "varying vec2 vUv; void main(){vUv=position.xy*.5+.5;gl_Position=vec4(position.xy,0.,1.);}",
    fragmentShader: `precision highp float;
      varying vec2 vUv;uniform sampler2D atlas;uniform sampler2D palette;uniform vec4 bounds;uniform vec3 globe;uniform mat3 basis;uniform vec3 border;uniform float interior;
      vec4 countryAt(vec3 w){
        vec2 coord=vec2((atan(w.y,w.x)+3.14159265359)/6.28318530718,(asin(clamp(w.z,-1.,1.))+1.57079632679)/3.14159265359);
        vec4 id=texture2D(atlas,coord);if(id.a<.5)return vec4(0.);
        return texture2D(palette,vec2((floor(id.r*255.+.5)+.5)/256.,.5));
      }
      float gridAt(vec3 w){vec2 a=vec2(atan(w.y,w.x),asin(clamp(w.z,-1.,1.)));vec2 cell=abs(mod(a+.261799,.523599)-.261799);return 1.-smoothstep(.002,.006,min(cell.x,cell.y));}
      void main(){vec2 p=mix(bounds.xy,bounds.zw,vec2(vUv.x,1.-vUv.y));vec2 q=(p-globe.xy)/globe.z;float r=dot(q,q);if(r>1.)discard;
      if(interior>.5){
        float front=sqrt(1.-r);vec3 ray=vec3(q.x,-q.y,0.);vec3 surface=ray+vec3(0.,0.,front);
        vec4 nearLand=countryAt(basis*surface);vec4 farLand=countryAt(basis*(ray-vec3(0.,0.,front)));
        vec3 ocean=vec3(.12,.48,.68);vec3 landColor=mix(nearLand.rgb,vec3(.25,.64,.43),.45);
        vec3 color=mix(ocean,landColor,step(.001,nearLand.a));
        color=mix(color,farLand.rgb,.13*step(.001,farLand.a));
        float light=.64+.36*max(0.,dot(surface,normalize(vec3(-.5,.7,1.))));
        float rim=pow(1.-front,3.);color=color*light+vec3(.3,.62,.78)*rim*.35;
        color=mix(color,vec3(.74,.89,1.),gridAt(basis*surface)*.25);
        color=mix(color,vec3(.74,.89,1.),gridAt(basis*(ray-vec3(0.,0.,front)))*.07);
        gl_FragColor=vec4(color,.68+rim*.24);return;
      }
      vec3 w=basis*vec3(q.x,-q.y,sqrt(1.-r));vec2 coord=vec2((atan(w.y,w.x)+3.14159265359)/6.28318530718,(asin(clamp(w.z,-1.,1.))+1.57079632679)/3.14159265359);
      vec4 id=texture2D(atlas,coord);if(id.a<.5)discard;float index=floor(id.r*255.+.5);vec4 color=texture2D(palette,vec2((index+.5)/256.,.5));
      if(color.a<.001)discard;gl_FragColor=color;}`,
  });
  const scene = new THREE.Scene();
  const fillPlane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  scene.add(fillPlane);
  const camera = new THREE.Camera();
  const lineMaterial = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `uniform vec4 bounds; uniform vec3 globe; uniform mat3 basis; uniform vec2 viewport; uniform float satellite;
      attribute vec3 endpoint; attribute vec2 corner; varying float front; varying float edge;
      vec3 rotate(vec3 p){return vec3(dot(p,basis[0]),dot(p,basis[1]),dot(p,basis[2]));}
      vec2 project(vec3 p){vec2 uv=(globe.xy+vec2(p.x,-p.y)*globe.z-bounds.xy)/(bounds.zw-bounds.xy); return vec2(uv.x*2.-1.,1.-uv.y*2.);}
      void main(){vec3 a=rotate(position), b=rotate(endpoint); vec2 pa=project(a), pb=project(b);
        vec2 delta=(pb-pa)*viewport; float len=length(delta); vec2 normal=len>.00001?vec2(-delta.y,delta.x)/len:vec2(0.);
        float width=mix(.65,1.8,satellite); vec2 offset=normal*corner.y*width*2./viewport;
        front=mix(a.z,b.z,corner.x);edge=corner.y;
        gl_Position=vec4(mix(pa,pb,corner.x)+offset,0.,1.);}`,
    fragmentShader: `precision highp float; uniform vec3 border; uniform float interior; uniform float satellite; varying float front; varying float edge;
      void main(){if(interior<.5 && front<0.)discard;
        float coverage=1.-smoothstep(.72,1.,abs(edge));
        vec3 color=mix(border,mix(vec3(.035,.07,.12),vec3(.92,.96,1.),1.-smoothstep(.30,.55,abs(edge))),satellite);
        float alpha=interior>.5?(front<0.?.10:.28):.95;
        gl_FragColor=vec4(color,alpha*coverage);}`,
  });
  let lines,
    fillMesh,
    texture,
    previous = [],
    job = 0,
    ready = Promise.resolve();
  let atlasFeatures = null;
  const vectorMaterial = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `uniform vec4 bounds; uniform vec3 globe; uniform mat3 basis; attribute float countryId; varying float front; varying float id;
      void main(){vec3 v=vec3(dot(position,basis[0]),dot(position,basis[1]),dot(position,basis[2])); front=v.z; id=countryId;
      vec2 p=globe.xy+vec2(v.x,-v.y)*globe.z; vec2 uv=(p-bounds.xy)/(bounds.zw-bounds.xy); gl_Position=vec4(uv.x*2.-1.,1.-uv.y*2.,0.,1.);}`,
    fragmentShader: `precision highp float; uniform sampler2D palette; varying float front; varying float id;
      void main(){if(front<0.)discard; vec4 color=texture2D(palette,vec2((id+.5)/256.,.5)); if(color.a<.001)discard; gl_FragColor=color;}`,
  });
  let worker,
    failed = false;
  try {
    worker = new Worker(new URL("./country-mesh-worker.js", import.meta.url), {
      type: "module",
    });
  } catch {
    failed = true;
  }
  let resolveReady;
  if (worker)
    worker.onmessage = ({ data }) => {
      if (data.job !== job) return;
      if (data.error) {
        console.error(data.error);
        failed = true;
        resolveReady?.();
        redraw();
        return;
      }
      for (const mesh of [fillMesh, lines])
        if (mesh) {
          scene.remove(mesh);
          mesh.geometry.dispose();
        }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(data.positions, 3),
      );
      geometry.setAttribute(
        "countryId",
        new THREE.BufferAttribute(data.ids, 1),
      );
      fillMesh = new THREE.Mesh(geometry, vectorMaterial);
      fillMesh.frustumCulled = false;
      scene.add(fillMesh);
      const lineGeometry = new THREE.BufferGeometry();
      lineGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(data.strokeStarts, 3),
      );
      lineGeometry.setAttribute(
        "endpoint",
        new THREE.BufferAttribute(data.strokeEnds, 3),
      );
      lineGeometry.setAttribute(
        "corner",
        new THREE.BufferAttribute(data.strokeCorners, 2),
      );
      lines = new THREE.Mesh(lineGeometry, lineMaterial);
      lines.frustumCulled = false;
      lines.renderOrder = 1;
      scene.add(lines);
      resolveReady?.();
      redraw();
    };
  if (worker)
    worker.onerror = (error) => {
      console.error(error);
      failed = true;
      resolveReady?.();
      redraw();
    };
  function build(features) {
    if (failed) return;
    resolveReady?.();
    ready = new Promise((resolve) => {
      resolveReady = resolve;
    });
    worker.postMessage({ features, job: ++job });
  }
  function buildInteriorAtlas(features) {
    const source = document.createElement("canvas");
    source.width = 4096;
    source.height = 2048;
    const ctx = source.getContext("2d");
    const geo = globalThis.d3.geoPath(
      globalThis.d3
        .geoEquirectangular()
        .scale(4096 / (2 * Math.PI))
        .translate([2048, 1024]),
      ctx,
    );
    features.forEach((f, i) => {
      ctx.beginPath();
      geo(f);
      ctx.fillStyle = "rgb(" + (i + 1) + ",0,0)";
      ctx.fill();
    });
    texture?.dispose();
    texture = new THREE.CanvasTexture(source);
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    uniforms.atlas.value = texture;
  }
  return {
    whenReady: () => ready,
    draw(
      features,
      color,
      opacity,
      bounds,
      interior = false,
      satellite = false,
    ) {
      uniforms.interior.value = interior ? 1 : 0;
      uniforms.satellite.value = satellite && !interior ? 1 : 0;
      if (
        features.length !== previous.length ||
        features.some((f, i) => f !== previous[i])
      ) {
        previous = features.slice();
        build(features);
      }
      if (!features.length) return;
      fillPlane.visible = !!interior || failed;
      if (fillMesh) fillMesh.visible = !interior && !failed;
      if ((interior || failed) && atlasFeatures !== previous) {
        buildInteriorAtlas(features);
        atlasFeatures = previous;
      }
      const styles = getComputedStyle(document.body),
        resolve = (value) =>
          value.startsWith("var(")
            ? styles.getPropertyValue(value.slice(4, -1)).trim()
            : value;
      features.forEach((f, i) => {
        const c = new THREE.Color(resolve(color(f))).convertLinearToSRGB();
        palette.set(
          [
            Math.round(c.r * 255),
            Math.round(c.g * 255),
            Math.round(c.b * 255),
            Math.round(opacity(f) * 255),
          ],
          (i + 1) * 4,
        );
      });
      paletteTexture.needsUpdate = true;
      uniforms.border.value.set(
        satellite
          ? "#e9f3ff"
          : styles.getPropertyValue("--ocean").trim() || "#203a52",
      );
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
      layer
        .attr("x", bounds[0])
        .attr("y", bounds[1])
        .attr("width", bounds[2] - bounds[0])
        .attr("height", bounds[3] - bounds[1]);
      const rect = (svgFrame ? layer.node() : canvas).getBoundingClientRect(),
        w = Math.max(1, Math.round(rect.width)),
        h = Math.max(1, Math.round(rect.height));
      uniforms.viewport.value.set(w, h);
      const size = renderer.getSize(new THREE.Vector2());
      if (size.x !== w || size.y !== h) renderer.setSize(w, h, false);
      renderer.render(scene, camera);
      // Capture synchronously before WebGL clears the drawing buffer. This
      // avoids preserveDrawingBuffer and leaves other browsers on direct GPU
      // presentation. PNG retains transparent oceans and country opacity.
      if (svgFrame) layer.attr("href", canvas.toDataURL("image/png"));
    },
  };
}
