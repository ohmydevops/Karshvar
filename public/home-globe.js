import * as THREE from "./vendor/three.module.min.js";
export async function mountHomeGlobe(host) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    const texture = await new THREE.TextureLoader().loadAsync(
      new URL("./art/earth-texture.jpg", import.meta.url).href,
    );
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0.2, 4.6);
    scene.add(new THREE.AmbientLight(0xc7ddff, 1.3));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(-3, 3, 5);
    scene.add(sun);
    const system = new THREE.Group();
    scene.add(system);
    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(1, 64, 40),
      new THREE.MeshPhongMaterial({
        map: texture,
        shininess: 9,
        specular: 0x172334,
      }),
    );
    earth.rotation.y = 2.4;
    earth.rotation.z = 0.12;
    system.add(earth);
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
          "varying vec3 n; varying vec3 v; void main(){float a=pow(1.0-abs(dot(normalize(n),normalize(v))),3.0);gl_FragColor=vec4(0.15,0.42,0.95,a*0.45);}",
      }),
    );
    system.add(atmosphere);
    const orbiters = [];
    for (let i = 0; i < 3; i++) {
      const orbit = new THREE.Group();
      orbit.rotation.set(0.35 + i * 0.65, 0, i * 0.75);
      system.add(orbit);
      const radius = 1.23 + i * 0.11;
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
            0.0025,
            5,
            true,
          ),
          new THREE.MeshBasicMaterial({
            color: [0x7194c7, 0xc89f5c, 0x558c91][i],
            transparent: true,
            opacity: 0.5,
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
      orbit.add(satellite);
      orbiters.push({
        satellite,
        radius,
        phase: i * 2,
        speed: 0.24 + i * 0.05,
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
    host.classList.add("globe-ready");
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let drag = null,
      targetX = 0,
      targetY = 0,
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
        1.7 / Math.sin(Math.min(verticalHalfFov, horizontalHalfFov));
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
      system.rotation.x += (targetX - system.rotation.x) * 0.06;
      system.rotation.y += (targetY - system.rotation.y) * 0.06;
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
    canvas.addEventListener("pointerdown", (e) => {
      drag = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (drag) {
        earth.rotation.y += (e.clientX - drag.x) * 0.009;
        targetX = THREE.MathUtils.clamp(
          targetX + (e.clientY - drag.y) * 0.005,
          -0.7,
          0.7,
        );
        drag = { x: e.clientX, y: e.clientY };
      } else if (e.pointerType === "mouse") {
        const r = canvas.getBoundingClientRect();
        targetY = ((e.clientX - r.left) / r.width - 0.5) * 0.5;
        targetX = ((e.clientY - r.top) / r.height - 0.5) * 0.3;
      }
    });
    const end = () => {
      drag = null;
    };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
    canvas.addEventListener("lostpointercapture", end);
    canvas.addEventListener("pointerleave", () => {
      if (!drag) {
        targetX = 0;
        targetY = 0;
      }
    });
    resize();
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
        renderer.dispose();
      },
      { once: true },
    );
  } catch (error) {
    renderer?.dispose();
    console.warn("Home globe unavailable; using illustration.", error);
  }
}
