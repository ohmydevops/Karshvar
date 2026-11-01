import { loadSatelliteImage, satelliteRegion } from "./satellite-cache.js";
// GPU reprojection of the satellite texture; no per-pixel JavaScript loop.
import * as THREE from "./vendor/three.module.min.js";
export function createSatelliteRenderer(
  canvas,
  projection,
  redraw,
  onDownload = () => {},
) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.5));
  const loader = new THREE.TextureLoader();
  const uniforms = {
    image: { value: null },
    bounds: { value: new THREE.Vector4() },
    globe: { value: new THREE.Vector3() },
    basis: { value: new THREE.Matrix3() },
    detail: { value: null },
    region: { value: new THREE.Vector4(-180, -90, 180, 90) },
    hasDetail: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    vertexShader:
      "varying vec2 vUv; void main(){vUv=position.xy*.5+.5;gl_Position=vec4(position.xy,0.,1.);}",
    fragmentShader: `precision highp float;
      varying vec2 vUv; uniform sampler2D image; uniform vec4 bounds; uniform vec3 globe; uniform mat3 basis; uniform sampler2D detail; uniform vec4 region; uniform float hasDetail;
      void main(){
        vec2 p=mix(bounds.xy,bounds.zw,vec2(vUv.x,1.-vUv.y));
        vec2 q=(p-globe.xy)/globe.z; float r=dot(q,q); if(r>1.)discard;
        vec3 w=basis*vec3(q.x,-q.y,sqrt(1.-r));
        vec2 coord=vec2((atan(w.y,w.x)+3.14159265359)/6.28318530718,(asin(clamp(w.z,-1.,1.))+1.57079632679)/3.14159265359);
        gl_FragColor=texture2D(image,coord);
        vec2 degrees=vec2(coord.x*360.-180.,coord.y*180.-90.);
        vec2 local=(degrees-region.xy)/(region.zw-region.xy);
        if(hasDetail>0.5 && all(greaterThanEqual(local,vec2(0.))) && all(lessThanEqual(local,vec2(1.)))) {
          vec2 edge=min(local,1.-local);
          float blend=smoothstep(0.,.08,min(edge.x,edge.y));
          gl_FragColor=mix(gl_FragColor,texture2D(detail,local),blend);
        }
      }`,
  });
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
  const camera = new THREE.Camera();
  let timer,
    requested = "",
    generation = 0;
  return {
    async ready() {
      uniforms.image.value = await loader.loadAsync(
        new URL("./art/earth-satellite.jpg", import.meta.url).href,
      );
    },
    pause() {
      clearTimeout(timer);
      generation++;
      requested = "";
    },
    draw(bounds) {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width)),
        h = Math.max(1, Math.round(rect.height));
      const size = renderer.getSize(new THREE.Vector2());
      if (size.x !== w || size.y !== h) renderer.setSize(w, h, false);
      uniforms.bounds.value.fromArray(bounds);
      uniforms.globe.value.set(...projection.translate(), projection.scale());
      const inverse = globalThis.d3.geoRotation(projection.rotate()).invert;
      const vectors = [
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
      });
      uniforms.basis.value.fromArray(vectors);
      renderer.render(scene, camera);
      clearTimeout(timer);
      timer = setTimeout(
        async () => {
          const points = [];
          const [cx, cy] = projection.translate(),
            r = projection.scale();
          for (let y = 0; y <= 8; y++)
            for (let x = 0; x <= 8; x++) {
              const px = bounds[0] + ((bounds[2] - bounds[0]) * x) / 8,
                py = bounds[1] + ((bounds[3] - bounds[1]) * y) / 8;
              if ((px - cx) ** 2 + (py - cy) ** 2 < r * r)
                points.push(projection.invert([px, py]));
            }
          if (!points.length) return;
          const west = Math.max(
              -180,
              Math.floor(Math.min(...points.map((p) => p[0])) - 3),
            ),
            east = Math.min(
              180,
              Math.ceil(Math.max(...points.map((p) => p[0])) + 3),
            );
          const south = Math.max(
              -90,
              Math.floor(Math.min(...points.map((p) => p[1])) - 3),
            ),
            north = Math.min(
              90,
              Math.ceil(Math.max(...points.map((p) => p[1])) + 3),
            );
          if (east - west > 150) return;
          const box = [west, south, east, north],
            key = box.join();
          if (key === requested) return;
          requested = key;
          const id = ++generation;
          const height = Math.max(
            256,
            Math.min(
              2048,
              Math.round((2048 * (north - south)) / (east - west)),
            ),
          );
          const url =
            "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=BlueMarble_ShadedRelief_Bathymetry&STYLES=&FORMAT=image/jpeg&SRS=EPSG:4326&BBOX=" +
            key +
            "&WIDTH=2048&HEIGHT=" +
            height;
          try {
            const { blob, url: storedUrl } = await loadSatelliteImage(url, {
              withRegion: true,
              onDownload,
            });
            const storedBox = satelliteRegion(storedUrl)?.box || box;
            const objectUrl = URL.createObjectURL(blob);
            let texture;
            try {
              texture = await loader.loadAsync(objectUrl);
            } finally {
              URL.revokeObjectURL(objectUrl);
            }
            if (id !== generation) {
              texture.dispose();
              return;
            }
            uniforms.detail.value?.dispose();
            uniforms.detail.value = texture;
            uniforms.region.value.fromArray(storedBox);
            uniforms.hasDetail.value = 1;
            redraw();
          } catch {
            if (id === generation) requested = "";
            /* Keep the local image when offline. */
          }
        },
        uniforms.hasDetail.value ? 300 : 0,
      );
    },
  };
}
