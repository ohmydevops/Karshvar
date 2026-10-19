import { createHomeScene, earthAxialTilt } from "./home-scene.js";
import * as THREE from "./vendor/three.module.min.js";
export async function mountHomeGlobe(host) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    const settings = createHomeScene();
    const loader = new THREE.TextureLoader();
    const [texture, nightTexture] = await Promise.all([
      loader.loadAsync(
        new URL("./art/earth-texture.jpg", import.meta.url).href,
      ),
      loader.loadAsync(new URL("./art/earth-night.png", import.meta.url).href),
    ]);
    nightTexture.colorSpace = THREE.SRGBColorSpace;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0.2, 4.6);
    scene.add(new THREE.AmbientLight(0xe3edff, 1.8));
    const sun = new THREE.DirectionalLight(0xffffff, 2.5);
    sun.position.fromArray(settings.sunDirection);
    scene.add(sun);
    const system = new THREE.Group();
    scene.add(system);
    const axialFrame = new THREE.Group();
    axialFrame.rotation.set(0, settings.axisHeading, earthAxialTilt);
    system.add(axialFrame);
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
        vec3 color=surface*(0.055+max(sunlight,0.0)*1.15)+cities*(1.0-day)*1.6;
        gl_FragColor=vec4(color,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
      }),
    );
    earth.rotation.y = settings.earthRotation;
    axialFrame.add(earth);
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.025, 48, 32),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        vertexShader:
          "varying vec3 n; varying vec3 v; void main(){vec4 p=modelViewMatrix*vec4(position,1.0);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}",
        fragmentShader:
          "varying vec3 n; varying vec3 v; void main(){float a=pow(1.0-abs(dot(normalize(n),normalize(v))),3.0);gl_FragColor=vec4(0.15,0.42,0.95,a*0.25);}",
      }),
    );
    system.add(atmosphere);
    const orbiters = [];
    for (const [i, configuration] of settings.satellites.entries()) {
      const orbit = new THREE.Group();
      orbit.rotation.set(configuration.inclination, 0, configuration.node);
      system.add(orbit);
      const radius = configuration.radius;
      const points = Array.from(
        { length: 128 },
        (_, k) =>
          new THREE.Vector3(
            Math.cos((k / 128) * Math.PI * 2) * radius,
            0,
            Math.sin((k / 128) * Math.PI * 2) * radius,
          ),
      );
      orbit.add(
        new THREE.Mesh(
          new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3(points, true),
            192,
            0.0018,
            5,
            true,
          ),
          new THREE.MeshBasicMaterial({
            color: [0x7194c7, 0xc89f5c, 0x558c91][i % 3],
            transparent: true,
            opacity: 0.32,
            depthWrite: false,
          }),
        ),
      );
      const satellite = new THREE.Group();
      satellite.add(
        new THREE.Mesh(
          new THREE.BoxGeometry(0.055, 0.065, 0.055),
          new THREE.MeshPhongMaterial({ color: 0xe2c58d, shininess: 60 }),
        ),
      );
      for (const side of [-1, 1]) {
        const panel = new THREE.Mesh(
          new THREE.BoxGeometry(0.09, 0.008, 0.06),
          new THREE.MeshPhongMaterial({ color: 0x3263a0, shininess: 80 }),
        );
        panel.position.x = side * 0.08;
        satellite.add(panel);
      }
      satellite.scale.setScalar(configuration.scale);
      orbit.add(satellite);
      orbiters.push({
        satellite,
        radius,
        phase: configuration.phase,
        speed: configuration.speed,
      });
    }
    const traffic = document.createElement("div");
    traffic.className = "space-traffic";
    traffic.setAttribute("aria-hidden", "true");
    for (const route of ["crossing", "returning", "departing"]) {
      const ship = document.createElement("img");
      ship.src = new URL("./art/spaceship.svg", import.meta.url).href;
      ship.alt = "";
      ship.className = "passing-ship " + route;
      traffic.append(ship);
    }
    document.querySelector("main").prepend(traffic);
    const canvas = renderer.domElement;
    canvas.className = "home-canvas";
    canvas.setAttribute("aria-hidden", "true");
    host.replaceChildren(canvas);

    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let drag = null,
      last = 0,
      time = 0,
      frame;
    function render() {
      renderer.render(scene, camera);
    }
    function resize() {
      const r = host.getBoundingClientRect();
      if (!r.width || !r.height) return;
      renderer.setSize(r.width, r.height, false);
      camera.aspect = r.width / r.height;
      const verticalHalfFov = THREE.MathUtils.degToRad(camera.fov / 2);
      const horizontalHalfFov = Math.atan(
        Math.tan(verticalHalfFov) * camera.aspect,
      );
      const distance =
        1.62 / Math.sin(Math.min(verticalHalfFov, horizontalHalfFov));
      camera.position.set(0, 0, distance);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      render();
    }
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    function tick(now) {
      frame = requestAnimationFrame(tick);
      if (document.hidden || now - last < 32) return;
      const dt = Math.min((now - last) / 1000, 0.06);
      last = now;
      if (!motion.matches && !drag) {
        earth.rotation.y += dt * 0.16;
        time += dt;
      }
      orbiters.forEach((o) => {
        const a = time * o.speed + o.phase;
        o.satellite.position.set(
          Math.cos(a) * o.radius,
          0,
          Math.sin(a) * o.radius,
        );
        o.satellite.rotation.y = -a;
      });
      render();
    }
    const dragSensitivity = 0.009;
    const horizontalAxis = new THREE.Vector3(0, 1, 0);
    const verticalAxis = new THREE.Vector3(1, 0, 0);
    canvas.addEventListener("pointerdown", (e) => {
      drag = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (drag) {
        system.rotateOnWorldAxis(
          horizontalAxis,
          (e.clientX - drag.x) * dragSensitivity,
        );
        system.rotateOnWorldAxis(
          verticalAxis,
          (e.clientY - drag.y) * dragSensitivity,
        );
        drag = { x: e.clientX, y: e.clientY };
      }
    });
    const end = () => {
      drag = null;
    };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
    canvas.addEventListener("lostpointercapture", end);
    resize();
    host.classList.add("globe-ready");
    frame = requestAnimationFrame(tick);
    addEventListener(
      "pagehide",
      () => {
        traffic.remove();
        cancelAnimationFrame(frame);
        observer.disconnect();
        scene.traverse((o) => {
          o.geometry?.dispose();
          o.material?.dispose();
        });
        texture.dispose();
        nightTexture.dispose();
        renderer.dispose();
      },
      { once: true },
    );
  } catch (error) {
    renderer?.dispose();
    host.classList.add("globe-failed");
    const fallback = document.createElement("img");
    fallback.src = new URL("./art/earth.svg", import.meta.url).href;
    fallback.className = "home-earth";
    fallback.alt = "";
    host.replaceChildren(fallback);
    console.warn("Home globe unavailable; using illustration.", error);
  }
}
