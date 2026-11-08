import { createHomeScene, earthAxialTilt } from "./home-scene.js";
import * as THREE from "./vendor/three.module.min.js";
export async function mountHomeGlobe(host) {
  let renderer;
  try {
    const compact = matchMedia("(max-width: 767px), (pointer: coarse)").matches;
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    const settings = createHomeScene();
    const loader = new THREE.TextureLoader();
    const [texture, nightTexture] = await Promise.all([
      loader.loadAsync(
        new URL("./art/earth-texture.webp", import.meta.url).href,
      ),
      loader.loadAsync(new URL("./art/earth-night.webp", import.meta.url).href),
    ]);
    nightTexture.colorSpace = THREE.SRGBColorSpace;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    nightTexture.anisotropy = texture.anisotropy;
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
      new THREE.SphereGeometry(1, compact ? 64 : 96, compact ? 48 : 64),
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
    const atmosphereRadius = 1.11;
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(atmosphereRadius, 64, 48),
      new THREE.ShaderMaterial({
        uniforms: { sunDirection: { value: sun.position.clone().normalize() } },
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        vertexShader: `
          varying vec3 viewPosition;
          varying vec3 viewCenter;
          varying vec3 worldNormal;
          void main() {
            vec4 p = modelViewMatrix * vec4(position, 1.0);
            viewPosition = p.xyz;
            viewCenter = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
            worldNormal = normalize(mat3(modelMatrix) * normal);
            gl_Position = projectionMatrix * p;
          }`,
        fragmentShader: `
          uniform vec3 sunDirection;
          varying vec3 viewPosition;
          varying vec3 viewCenter;
          varying vec3 worldNormal;
          void main() {
            float altitude = length(cross(normalize(viewPosition), viewCenter));
            float rim = exp(-pow((altitude - 1.012) / 0.058, 2.0));
            float edge = 1.0 - smoothstep(1.06, 1.11, altitude);
            float daylight = smoothstep(-0.3, 0.6, dot(normalize(worldNormal), sunDirection));
            vec3 blue = mix(vec3(0.08, 0.25, 0.8), vec3(0.28, 0.64, 1.0), daylight);
            gl_FragColor = vec4(blue, rim * edge * mix(0.15, 0.46, daylight));
          }`,
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
            compact ? 96 : 192,
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
      satellite.position.set(
        Math.cos(configuration.phase) * radius,
        0,
        Math.sin(configuration.phase) * radius,
      );
      satellite.rotation.y = -configuration.phase;
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
    const foregroundTraffic = document.createElement("div");
    foregroundTraffic.className = "space-traffic space-traffic-near";
    foregroundTraffic.setAttribute("aria-hidden", "true");
    const mediumTraffic = document.createElement("div");
    mediumTraffic.className = "space-traffic space-traffic-medium";
    mediumTraffic.setAttribute("aria-hidden", "true");
    const ships = [];
    const shipAssets = [
      "orbital-telescope.svg",
      "orbital-station.svg",
      "earth-imager.svg",
      "crew-capsule.svg",
      "space-observer.svg",
    ];
    const occasionalAssets = [
      "radar-satellite.svg",
      "communications-satellite.svg",
      "cubesat.svg",
    ];
    const initialAssets = [...shipAssets];
    for (let i = initialAssets.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [initialAssets[i], initialAssets[j]] = [
        initialAssets[j],
        initialAssets[i],
      ];
    }
    // Depth is independent of the randomly generated flight path.
    for (const [depth, asset] of [
      ["near", initialAssets[0]],
      ["medium", initialAssets[1]],
      ["far", initialAssets[2]],
    ]) {
      const ship = document.createElement("img");
      ship.src = new URL("./art/" + asset, import.meta.url).href;
      ship.alt = "";
      ship.className = "passing-ship depth-" + depth;
      ships.push(ship);
      (depth === "near"
        ? foregroundTraffic
        : depth === "medium"
          ? mediumTraffic
          : traffic
      ).append(ship);
    }
    let atmosphereTarget = null;
    const skyBounds = () => {
      const width = globalThis.innerWidth || 1440;
      const height = globalThis.innerHeight || 900;
      const backdropHeight = Math.max(height, (width * 941) / 1672);
      return {
        width,
        height,
        bottom: Math.max(0, height - backdropHeight * 0.18),
      };
    };
    const meteorColors = [
      ["#e34d25", "#ffbb70"],
      ["#66c97b", "#ccffbe"],
      ["#569be8", "#d6efff"],
      ["#cf83dc", "#ffe0ff"],
      ["#e4b557", "#fff0bf"],
    ];
    const spawnMeteor = (origin = null) => {
      const sky = skyBounds();
      if (origin && origin.y >= sky.bottom) return;
      const meteor = document.createElement("span");
      const longTrail = Math.random() < 0.5;
      const [color, headColor] =
        meteorColors[Math.floor(Math.random() * meteorColors.length)];
      let impact = null;
      meteor.className =
        "distant-meteor " + (longTrail ? "meteor-0" : "meteor-1");
      const randomizePosition = () => {
        const width = sky.width;
        const padding = Math.min(110, sky.bottom * 0.15);
        const height = Math.max(1, sky.bottom - padding * 2);
        const radians = Math.random() * Math.PI * 2;
        let angle = (radians * 180) / Math.PI;
        const fraction = longTrail ? 2 / 3 : 1 / 3;
        const distance =
          Math.min(
            width / Math.abs(Math.cos(radians)),
            height / Math.abs(Math.sin(radians)),
          ) * fraction;
        let dx = Math.cos(radians) * distance;
        let dy = Math.sin(radians) * distance;
        // Both endpoints stay on screen: meteors burn out before the edge.
        const startX =
          origin?.x ??
          Math.max(0, -dx) + Math.random() * (width - Math.abs(dx));
        const startY =
          origin?.y ??
          padding + Math.max(0, -dy) + Math.random() * (height - Math.abs(dy));
        if (atmosphereTarget && Math.random() < 0.25) {
          const { x, y, radius } = atmosphereTarget;
          const fromX = startX - x;
          const fromY = startY - y;
          const fromDistance = Math.hypot(fromX, fromY);
          if (fromDistance > radius * 1.3 && y + radius < sky.bottom) {
            impact = {
              x: x + (fromX / fromDistance) * radius,
              y: y + (fromY / fromDistance) * radius,
            };
            dx = impact.x - startX;
            dy = impact.y - startY;
            angle = (Math.atan2(dy, dx) * 180) / Math.PI;
            meteor.className += " meteor-impact";
          }
        }
        if (origin && !impact) {
          // Click-launched paths burn out before reaching the lunar foreground.
          const limit =
            dy > 0 ? (sky.bottom - 2 - startY) / dy : dy < 0 ? -startY / dy : 1;
          const scale = Math.max(0, Math.min(1, limit));
          dx *= scale;
          dy *= scale;
        }
        const length = longTrail
          ? 70 + Math.random() * 40
          : 34 + Math.random() * 14;
        // Screen-space speed stays consistent across display sizes.
        const pixelsPerSecond = longTrail ? 360 : 240;
        const duration = Math.max(2.24, Math.hypot(dx, dy) / pixelsPerSecond);
        meteor.setAttribute(
          "style",
          `left:${startX}px;top:${startY}px;` +
            `--meteor-angle:${angle}deg;--meteor-x:${dx}px;` +
            `--meteor-y:${dy}px;--meteor-length:${length}px;` +
            `--meteor-duration:${duration}s;` +
            `--meteor-start-opacity:${origin ? 0.65 : 0};` +
            `--meteor-color:${color};--meteor-head:${headColor}`,
        );
      };
      randomizePosition();
      meteor.addEventListener("animationend", (event) => {
        if (
          event.animationName !== "distant-meteor-pass" &&
          event.animationName !== "meteor-atmosphere-pass"
        )
          return;
        meteor.remove();
      });
      traffic.append(meteor);
    };
    document.querySelector("main").prepend(traffic);
    document.querySelector("main").prepend(mediumTraffic);
    document.body.append(foregroundTraffic);
    const canvas = renderer.domElement;
    canvas.className = "home-canvas";
    canvas.setAttribute("aria-hidden", "true");
    host.replaceChildren(canvas);

    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let drag = null,
      last = 0,
      time = 0,
      frame;
    let visible = true;
    let disposed = false;
    let suspended = false;
    let meteorTimer = null;
    const scheduleMeteor = () => {
      if (disposed || suspended || document.hidden || motion.matches) return;
      meteorTimer = setTimeout(
        () => {
          meteorTimer = null;
          if (disposed || suspended || document.hidden || motion.matches)
            return;
          spawnMeteor();
          scheduleMeteor();
        },
        1000 + Math.random() * 2000,
      );
    };
    const launchMeteor = (event) => {
      if (disposed || suspended || document.hidden || motion.matches) return;
      if (
        event.button !== 0 ||
        event.target.closest(
          'a, button, input, select, textarea, label, summary, dialog, #appMenu, [role="button"], [role="menu"], [contenteditable], canvas, .welcome-art',
        )
      )
        return;
      spawnMeteor({ x: event.clientX, y: event.clientY });
    };
    document.addEventListener("click", launchMeteor);
    const flights = new Map();
    // The medium/far schedules overlap even when mobile hides the near craft.
    // Route changes happen beyond the viewport, never in the visible scene.
    const fly = (ship, index, initial = false) => {
      if (disposed) return;
      if (!initial) {
        const pool = Math.random() < 0.25 ? occasionalAssets : shipAssets;
        const choices = pool.filter((asset) => !ship.src.endsWith("/" + asset));
        const asset = choices[Math.floor(Math.random() * choices.length)];
        ship.src = new URL("./art/" + asset, import.meta.url).href;
      }
      const direction = Math.random() < 0.5 ? 1 : -1;
      const margin = index === 0 ? 30 : 18;
      const viewportWidth = globalThis.innerWidth || 1440;
      const viewportHeight = globalThis.innerHeight || 900;
      // Match the cover-scaled lunar backdrop. Reserve the full rotated
      // spacecraft silhouette above its highest ridge, not just its center.
      const backdropHeight = Math.max(
        viewportHeight,
        (viewportWidth * 941) / 1672,
      );
      const clearance = [168, 84, 42][index] * 0.75 + 24;
      const minY = Math.min(30, (clearance / viewportHeight) * 100);
      const maxY = Math.max(
        minY,
        ((viewportHeight - backdropHeight * 0.18 - clearance) /
          viewportHeight) *
          100,
      );
      const edgeStart = direction === 1 ? -margin : 100 + margin;
      const edgeEnd = direction === 1 ? 100 + margin : -margin;
      const startX = edgeStart;
      const startY = minY + Math.random() * (maxY - minY);
      const endX = edgeEnd;
      const endY = minY + Math.random() * (maxY - minY);
      const dx = endX - startX;
      const dy = endY - startY;
      const angle =
        (Math.atan2(
          dy * (globalThis.innerHeight || 900),
          dx * (globalThis.innerWidth || 1440),
        ) *
          180) /
        Math.PI;
      const keyframes = Array.from({ length: 25 }, (_, i) => {
        const t = i / 24;
        const x = startX + dx * t;
        const y = startY + dy * t;
        return {
          offset: t,
          transform: `translate3d(${x}vw, ${y}vh, 0) translate(-50%, -50%) rotate(${angle}deg)`,
        };
      });
      const flight = ship.animate(keyframes, {
        duration: [16000, 24000, 48000][index],
        delay: index === 0 ? 16000 + Math.random() * 24000 : 0,
        easing: "linear",
        fill: "both",
      });
      const previous = flights.get(ship);
      flights.set(ship, flight);
      previous?.cancel();
      // Every flight starts outside the viewport, including the first visit.
      flight.currentTime = 0;
      flight.onfinish = () => fly(ship, index);
      if (document.hidden || motion.matches) flight.pause();
    };
    ships.forEach((ship, index) => fly(ship, index, true));
    const frameInterval = 32;
    function render() {
      renderer.render(scene, camera);
    }
    function resize() {
      const sky = skyBounds();
      for (const layer of [traffic, mediumTraffic, foregroundTraffic]) {
        layer.setAttribute(
          "style",
          `clip-path:inset(0 0 ${sky.height - sky.bottom}px 0)`,
        );
      }
      const r = host.getBoundingClientRect();
      if (!r.width || !r.height) return;
      // Retina clarity on phones and desktops, with a bounded GPU buffer.
      renderer.setPixelRatio(
        Math.min(devicePixelRatio || 1, 2, 1024 / Math.max(r.width, r.height)),
      );
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
      // Project the atmospheric limb once on resize, never during a flight.
      const atmosphericRadius = atmosphereRadius;
      atmosphereTarget = {
        x: (r.left || 0) + r.width / 2,
        y: (r.top || 0) + r.height / 2,
        radius:
          ((r.height / 2 / Math.tan(verticalHalfFov)) * atmosphericRadius) /
          Math.sqrt(
            distance * distance - atmosphericRadius * atmosphericRadius,
          ),
      };
      render();
    }
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    function tick(now) {
      frame = null;
      if (disposed || document.hidden || !visible || motion.matches) return;
      frame = requestAnimationFrame(tick);
      if (now - last < frameInterval) return;
      const dt = Math.min((now - last) / 1000, 0.06);
      last = now;
      if (!motion.matches && !drag) {
        earth.rotation.y += dt * 0.16;
      }
      time += dt;
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
    function updateAnimation() {
      if (disposed || suspended) return;
      if (document.hidden || motion.matches) {
        clearTimeout(meteorTimer);
        meteorTimer = null;
      } else if (meteorTimer === null) scheduleMeteor();
      traffic.setAttribute(
        "data-paused",
        String(document.hidden || motion.matches),
      );
      for (const flight of flights.values()) {
        if (document.hidden || motion.matches) flight.pause();
        else flight.play();
      }
      cancelAnimationFrame(frame);
      frame = null;
      last = 0;
      if (!disposed && !document.hidden && visible && !motion.matches)
        frame = requestAnimationFrame(tick);
    }
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      updateAnimation();
    });
    visibilityObserver.observe(host);
    document.addEventListener("visibilitychange", updateAnimation);
    motion.addEventListener("change", updateAnimation);
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
        if (motion.matches) render();
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
    updateAnimation();
    addEventListener("pageshow", (event) => {
      if (!event.persisted || disposed) return;
      suspended = false;
      drag = null;
      visible = true;
      resize();
      updateAnimation();
    });
    addEventListener("pagehide", (event) => {
      clearTimeout(meteorTimer);
      meteorTimer = null;
      if (event?.persisted) {
        suspended = true;
        traffic.setAttribute("data-paused", "true");
        drag = null;
        cancelAnimationFrame(frame);
        frame = null;
        for (const flight of flights.values()) flight.pause();
        return;
      }
      disposed = true;
      document.removeEventListener("click", launchMeteor);
      for (const flight of flights.values()) flight.cancel();
      traffic.remove();
      foregroundTraffic.remove();
      mediumTraffic.remove();
      cancelAnimationFrame(frame);
      observer.disconnect();
      visibilityObserver.disconnect();
      document.removeEventListener("visibilitychange", updateAnimation);
      motion.removeEventListener("change", updateAnimation);
      scene.traverse((o) => {
        o.geometry?.dispose();
        o.material?.dispose();
      });
      texture.dispose();
      nightTexture.dispose();
      renderer.dispose();
    });
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
