// Country shapes are rasterized once into an ID atlas. Rotation and coloring run on the GPU.
import * as THREE from "./vendor/three.module.min.js";
export function mountGpuCountries(svg, projection) {
  const layer = svg
    .append("foreignObject")
    .attr("pointer-events", "none")
    .attr("aria-hidden", "true");
  const canvas = layer
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
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    vertexShader:
      "varying vec2 vUv; void main(){vUv=position.xy*.5+.5;gl_Position=vec4(position.xy,0.,1.);}",
    fragmentShader: `precision highp float;
      varying vec2 vUv;uniform sampler2D atlas;uniform sampler2D palette;uniform vec4 bounds;uniform vec3 globe;uniform mat3 basis;uniform vec3 border;
      void main(){vec2 p=mix(bounds.xy,bounds.zw,vec2(vUv.x,1.-vUv.y));vec2 q=(p-globe.xy)/globe.z;float r=dot(q,q);if(r>1.)discard;
      vec3 w=basis*vec3(q.x,-q.y,sqrt(1.-r));vec2 coord=vec2((atan(w.y,w.x)+3.14159265359)/6.28318530718,(asin(clamp(w.z,-1.,1.))+1.57079632679)/3.14159265359);
      vec4 id=texture2D(atlas,coord);if(id.a<.5)discard;float index=floor(id.r*255.+.5);vec4 color=texture2D(palette,vec2((index+.5)/256.,.5));
      if(color.a<.001)discard;gl_FragColor=color;}`,
  });
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
  const camera = new THREE.Camera();
  const lineMaterial = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    vertexShader: `uniform vec4 bounds; uniform vec3 globe; uniform mat3 basis; varying float front;
      void main(){vec3 v=vec3(dot(position,basis[0]),dot(position,basis[1]),dot(position,basis[2]));front=v.z;
      vec2 p=globe.xy+vec2(v.x,-v.y)*globe.z;vec2 uv=(p-bounds.xy)/(bounds.zw-bounds.xy);gl_Position=vec4(uv.x*2.-1.,1.-uv.y*2.,0.,1.);}`,
    fragmentShader: `precision highp float; uniform vec3 border; varying float front; void main(){if(front<0.)discard;gl_FragColor=vec4(border,.85);}`,
  });
  let lines;
  let previous = [],
    texture;
  function build(features) {
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
    const vertices = [];
    const vector = (p) => {
      const lon = (p[0] * Math.PI) / 180,
        lat = (p[1] * Math.PI) / 180;
      return [
        Math.cos(lat) * Math.cos(lon),
        Math.cos(lat) * Math.sin(lon),
        Math.sin(lat),
      ];
    };
    features.forEach((f, i) => {
      const polygons =
        f.geometry.type === "Polygon"
          ? [f.geometry.coordinates]
          : f.geometry.coordinates;
      for (const polygon of polygons)
        for (const ring of polygon)
          for (let j = 1; j < ring.length; j++) {
            const start = ring[j - 1],
              end = ring[j],
              distance = globalThis.d3.geoDistance(start, end);
            const steps = Math.max(1, Math.ceil(distance / (Math.PI / 360)));
            const interpolate = globalThis.d3.geoInterpolate(start, end);
            for (let k = 0; k < steps; k++)
              vertices.push(
                ...vector(interpolate(k / steps)),
                ...vector(interpolate((k + 1) / steps)),
              );
          }
      ctx.beginPath();
      geo(f);
      ctx.fillStyle = "rgb(" + (i + 1) + ",0,0)";
      ctx.fill();
    });
    if (lines) {
      scene.remove(lines);
      lines.geometry.dispose();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    lines = new THREE.LineSegments(geometry, lineMaterial);
    lines.frustumCulled = false;
    lines.renderOrder = 1;
    scene.add(lines);
    texture?.dispose();
    texture = new THREE.CanvasTexture(source);
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    uniforms.atlas.value = texture;
  }
  return {
    draw(features, color, opacity, bounds) {
      if (
        features.length !== previous.length ||
        features.some((f, i) => f !== previous[i])
      ) {
        previous = features.slice();
        build(features);
      }
      if (!features.length) return;
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
        styles.getPropertyValue("--ocean").trim() || "#203a52",
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
      const rect = canvas.getBoundingClientRect(),
        w = Math.max(1, Math.round(rect.width)),
        h = Math.max(1, Math.round(rect.height));
      const size = renderer.getSize(new THREE.Vector2());
      if (size.x !== w || size.y !== h) renderer.setSize(w, h, false);
      renderer.render(scene, camera);
    },
  };
}
