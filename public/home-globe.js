import { homeSpeech } from "./home-speech.js";
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
    // Start model downloads alongside the planet textures, so the astronaut
    // does not have to wait for the planet to finish loading first.
    const gltfLoader = import("./vendor/GLTFLoader.js").then(
      ({ GLTFLoader }) => new GLTFLoader(),
    );
    const loadModel = (url, label) =>
      gltfLoader
        .then((loader) => loader.loadAsync(url.href))
        .catch((error) => {
          console.warn(label + " unavailable", error);
          return null;
        });
    const astronautModel = loadModel(
      new URL("./art/astronaut.glb", import.meta.url),
      "Astronaut",
    );
    const meteorModel = loadModel(
      new URL("./art/meteorite.glb", import.meta.url),
      "Meteorite",
    );
    const loader = new THREE.TextureLoader();
    const [texture, nightTexture, cloudTexture, moonTexture] =
      await Promise.all([
        loader.loadAsync(
          new URL("./art/earth-texture.webp", import.meta.url).href,
        ),
        loader.loadAsync(
          new URL("./art/earth-night.webp", import.meta.url).href,
        ),
        loader.loadAsync(
          new URL("./art/earth-clouds.webp", import.meta.url).href,
        ),
        loader
          .loadAsync(new URL("./art/moon.jpg", import.meta.url).href)
          .catch(() => null),
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
    if (moonTexture) {
      moonTexture.colorSpace = THREE.SRGBColorSpace;
      moonTexture.anisotropy = texture.anisotropy;
    }
    // Compressed orbit keeps both bodies readable within the homepage artwork.
    const moonOrbit = new THREE.Group();
    // Keep the Moon on the opposite side of the astronaut, including when
    // the user rotates Earth. Its decorative orbit stays in the scene frame.
    scene.add(moonOrbit);
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 40, 28),
      new THREE.ShaderMaterial({
        uniforms: {
          moonMap: { value: moonTexture || texture },
          sunDirection: { value: sun.position.clone().normalize() },
        },
        vertexShader: earth.material.vertexShader,
        fragmentShader: `
          uniform sampler2D moonMap;
          uniform vec3 sunDirection;
          varying vec2 vUv;
          varying vec3 vNormalWorld;
          void main() {
            float light = max(dot(normalize(vNormalWorld), sunDirection), 0.0);
            vec3 surface = texture2D(moonMap, vUv).rgb;
            float gray = dot(surface, vec3(0.2126, 0.7152, 0.0722));
            gl_FragColor = vec4(vec3(gray) * (0.07 + light * 1.15), 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
      }),
    );
    moon.name = "home-moon";
    const moonOrbitX = compact ? 1.55 : 2;
    const moonOrbitZ = compact ? -0.22 : -1.4;
    moon.position.set(moonOrbitX, 0.55, moonOrbitZ);
    moon.lookAt(0, 0, 0);
    moon.rotateY(-Math.PI / 2);
    moonOrbit.add(moon);
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
      ["medium", initialAssets[1]],
      ["far", initialAssets[2]],
    ]) {
      const ship = document.createElement("img");
      ship.src = new URL("./art/" + asset, import.meta.url).href;
      ship.alt = "";
      ship.className = "passing-ship depth-" + depth;
      ships.push(ship);
      (depth === "medium" ? mediumTraffic : traffic).append(ship);
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
    let astronaut;
    let meteorite;
    let meteorScale = 1;
    let meteorCycle = -1;
    let encounterStartedAt = null;
    const meteorStart = new THREE.Vector3();
    const astronautTime = { value: 0 };
    const headTurn = { value: new THREE.Quaternion() };
    let headInitialized = false;
    const speech = document.createElement("div");
    speech.className = "astronaut-speech";
    const language = document.documentElement?.lang || "en";
    speech.lang = language;
    speech.dir = language === "fa" || language === "ar" ? "rtl" : "ltr";
    const speechMessages = homeSpeech(language);
    const characterTime = 0.055;
    const firstDuration = speechMessages[0].length * characterTime + 4;
    const secondStart = firstDuration + 1;
    const secondDuration = speechMessages[1].length * characterTime + 5;
    let lastSpeechText = "";
    let speechStartedAt = null;
    let speechCycle = -1;
    speech.hidden = true;
    host.append(speech);
    const speechAnchor = new THREE.Vector3();
    const speechBounds = [];
    const meteorOnScreen = new THREE.Vector3();
    const meteorLowerEdge = new THREE.Vector3();
    let meteorRadius = 0;
    let firstMeteorSeenAt = null;
    let sceneViewport;
    const headTarget = new THREE.Vector3();
    const headForward = new THREE.Vector3(0, 0, 1);
    const desiredHeadTurn = new THREE.Quaternion();
    const astronautOffset = new THREE.Vector2();
    const earthCenter = new THREE.Vector3();
    const bodyDirection = new THREE.Vector3();
    const bodyAngles = new THREE.Euler(0, 0, 0, "YXZ");
    const bodyTurn = new THREE.Quaternion();
    const astronautDragDepth = 0.8;
    const astronautSize = compact ? 0.6 : 1.7;
    {
      meteorModel
        .then((gltf) => {
          if (disposed || !gltf) return;
          const rock = gltf.scene;
          const bounds = new THREE.Box3().setFromObject(rock);
          const size = bounds.getSize(new THREE.Vector3());
          rock.position.sub(bounds.getCenter(new THREE.Vector3()));
          meteorite = new THREE.Group();
          meteorite.add(rock);
          meteorScale = 0.22 / Math.max(size.x, size.y, size.z);
          meteorRadius = size.length() / 2;
          meteorite.visible = false;
          scene.add(meteorite);
        })
        .catch((error) => console.warn("Meteorite unavailable", error));
      astronautModel
        .then((gltf) => {
          if (disposed || !gltf) return;
          const model = gltf.scene;
          const bounds = new THREE.Box3().setFromObject(model);
          const size = bounds.getSize(new THREE.Vector3());
          const center = bounds.getCenter(new THREE.Vector3());
          // Include room for the shader's helmet turn and limb movement.
          for (const x of [-1, 1])
            for (const y of [-1, 1])
              for (const z of [-1, 1])
                speechBounds.push(
                  new THREE.Vector3(
                    x * (size.x / size.y / 2 + 0.08),
                    y * 0.58,
                    z * (size.z / size.y / 2 + 0.08),
                  ),
                );
          model.updateMatrixWorld(true);
          const parts = [];
          model.traverse((part) => {
            if (!part.isMesh) return;
            const geometry = part.geometry.clone();
            geometry.applyMatrix4(part.matrixWorld);
            geometry.translate(-center.x, -center.y, -center.z);
            geometry.scale(1 / size.y, 1 / size.y, 1 / size.y);
            const material = part.material.clone();
            material.onBeforeCompile = (shader) => {
              shader.uniforms.floatTime = astronautTime;
              shader.uniforms.headTurn = headTurn;
              shader.vertexShader =
                "uniform float floatTime;\nuniform vec4 headTurn;\nvec3 turnHead(vec3 v) { return v + 2.0 * cross(headTurn.xyz, cross(headTurn.xyz, v) + headTurn.w * v); }\n" +
                shader.vertexShader;
              shader.vertexShader = shader.vertexShader.replace(
                "#include <beginnormal_vertex>",
                `
              #include <beginnormal_vertex>
              float headNormalWeight = smoothstep(0.26, 0.34, position.y);
              objectNormal = normalize(mix(objectNormal, turnHead(objectNormal), headNormalWeight));
            `,
              );
              shader.vertexShader = shader.vertexShader.replace(
                "#include <begin_vertex>",
                `
              #include <begin_vertex>
              vec3 neck = vec3(0.0, 0.28, 0.0);
              float headWeight = smoothstep(0.26, 0.34, position.y);
              transformed = mix(transformed, neck + turnHead(transformed - neck), headWeight);
              float side = sign(position.x);
              float arm = smoothstep(0.13, 0.29, abs(position.x)) * smoothstep(-0.18, 0.02, position.y);
              float leg = 1.0 - smoothstep(-0.35, -0.08, position.y);
              transformed.z += arm * sin(floatTime * 0.7 + side) * 0.018;
              transformed.x += side * arm * sin(floatTime * 0.6 + side) * 0.012;
              transformed.z += leg * sin(floatTime * 0.55 + side * 1.4) * 0.018;
            `,
              );
            };
            parts.push(new THREE.Mesh(geometry, material));
          });
          const posedModel = new THREE.Group();
          posedModel.add(...parts);
          astronaut = new THREE.Group();
          astronaut.add(posedModel);
          astronaut.scale.setScalar(astronautSize);
          astronaut.position.set(
            compact ? -1.1 : -3.8,
            -0.65,
            astronautDragDepth,
          );
          astronaut.visible = false;
          scene.add(astronaut);
          render();
        })
        .catch((error) => console.warn("Astronaut unavailable", error));
    }
    let suspended = false;
    let meteorTimer = null;
    const scheduleMeteor = () => {
      if (
        disposed ||
        suspended ||
        !visible ||
        document.hidden ||
        motion.matches
      )
        return;
      meteorTimer = setTimeout(
        () => {
          meteorTimer = null;
          if (
            disposed ||
            suspended ||
            !visible ||
            document.hidden ||
            motion.matches
          )
            return;
          spawnMeteor();
          scheduleMeteor();
        },
        1000 + Math.random() * 2000,
      );
    };
    const launchMeteor = (event) => {
      if (
        disposed ||
        suspended ||
        !visible ||
        document.hidden ||
        motion.matches
      )
        return;
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
    // Only medium/far traffic remains; no large foreground flybys.
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
      if (!visible || document.hidden || motion.matches) flight.pause();
    };
    ships.forEach((ship, index) => fly(ship, index + 1, true));
    const frameInterval = 32;
    function render() {
      renderer.render(scene, camera);
    }
    function resize() {
      const sky = skyBounds();
      for (const layer of [traffic, mediumTraffic]) {
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
      const sceneWidth = globalThis.innerWidth;
      renderer.setSize(sceneWidth, globalThis.innerHeight, false);
      {
        canvas.style.width = sceneWidth + "px";
        canvas.style.maxWidth = "none";
        host.style.position = "relative";
        canvas.style.position = "absolute";
        canvas.style.left = "50%";
        canvas.style.right = "auto";
        canvas.style.top = -r.top + "px";
        canvas.style.height = globalThis.innerHeight + "px";
        canvas.style.transform = "translateX(-50%)";
        canvas.style.marginLeft = "0";
        host.style.overflow = "visible";
      }
      camera.aspect = sceneWidth / r.height;
      const verticalHalfFov = THREE.MathUtils.degToRad(camera.fov / 2);
      const horizontalHalfFov = Math.atan(
        Math.tan(verticalHalfFov) * camera.aspect,
      );
      const distance =
        1.62 / Math.sin(Math.min(verticalHalfFov, horizontalHalfFov));
      camera.position.set(0, 0, distance);
      camera.lookAt(0, 0, 0);
      camera.setViewOffset(
        sceneWidth,
        r.height,
        0,
        -r.top,
        sceneWidth,
        globalThis.innerHeight,
      );
      camera.updateProjectionMatrix();
      meteorCycle = -1;
      const bounds = canvas.getBoundingClientRect?.();
      sceneViewport = {
        width: sceneWidth,
        height: sky.height,
        left: bounds?.left ?? 0,
        pageTop: (bounds?.top ?? 0) + (globalThis.scrollY || 0),
        skyBottom: sky.bottom,
        hostLeft: r.left,
        hostPageTop: r.top + (globalThis.scrollY || 0),
      };
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
        clouds.rotation.y += dt * 0.168;
      }
      time += dt;
      if (
        encounterStartedAt === null &&
        meteorite &&
        astronaut &&
        sceneViewport
      ) {
        encounterStartedAt = time;
      }
      const encounterTime =
        encounterStartedAt === null ? 0 : time - encounterStartedAt;
      const currentSpeechCycle = Math.floor(encounterTime / 30);
      if (encounterStartedAt !== null) {
        const phase = encounterTime % 30;
        const progress = Math.min(phase / 24, 1);
        meteorite.visible = phase < 24;
        const cycle = currentSpeechCycle;
        if (cycle !== meteorCycle) {
          meteorCycle = cycle;
          const x = 0;
          const y = 1.6;
          meteorStart.set(x, y, 0.5).unproject(camera);
          meteorStart.sub(camera.position).normalize();
          const distance = (2.4 - camera.position.z) / meteorStart.z;
          meteorStart.multiplyScalar(distance).add(camera.position);
        }
        // Straight approach: fast entry, gradually slower near Earth.
        const travel = 1 - Math.pow(1 - progress, 1.5);
        meteorite.position.set(
          meteorStart.x * (1 - travel),
          meteorStart.y * (1 - travel),
          // Stay in front of the unit-radius Earth until atmospheric burnout.
          2.4 - travel * 1.36,
        );
        meteorite.rotation.set(time * 0.7, time * 0.9, time * 0.3);
        meteorite.scale.setScalar(
          meteorScale * (compact ? 4 : 6) * Math.pow(1 - travel, 1.4),
        );
      }
      if (astronaut) {
        // Keep the whole suit in front of the atmosphere. Compensate for
        // perspective so moving the model forward preserves its screen size.
        const referenceDistance = camera.position.z - astronautDragDepth;
        const scale =
          (camera.position.z - atmosphereRadius) /
          (referenceDistance + 0.55 * astronautSize);
        const x =
          (compact ? -1.1 : -Math.max(1.6, (camera.aspect - 1) * 1.05)) +
          astronautOffset.x;
        const y =
          (compact ? -0.75 : -0.25) +
          Math.sin(time * 0.55) * 0.07 +
          astronautOffset.y;
        astronaut.position.set(
          x * scale,
          y * scale,
          camera.position.z - referenceDistance * scale,
        );
        astronaut.scale.setScalar(astronautSize * scale);
        astronautTime.value = time;
        earth.getWorldPosition(earthCenter);
        bodyDirection.subVectors(earthCenter, astronaut.position);
        // Soften perspective in the torso pose; the helmet still aims at the
        // exact center of Earth.
        bodyDirection.z = -0.24 * scale;
        const horizontalDistance = Math.hypot(bodyDirection.x, bodyDirection.z);
        bodyAngles.set(
          -Math.atan2(bodyDirection.y, horizontalDistance),
          Math.atan2(bodyDirection.x, bodyDirection.z),
          0.2 + Math.sin(time * 0.4) * 0.06,
        );
        bodyTurn.setFromEuler(bodyAngles);
        if (headInitialized) {
          const turnAngle = astronaut.quaternion.angleTo(bodyTurn);
          // Large drags can move the target across the astronaut in one frame.
          // Limit the turn speed, then ease in as the body nears its target.
          const turnStep = Math.min(
            turnAngle * (1 - Math.exp(-dt * 2.6)),
            dt * 0.85,
          );
          astronaut.quaternion.rotateTowards(bodyTurn, turnStep);
        } else {
          astronaut.quaternion.copy(bodyTurn);
        }
        astronaut.updateMatrixWorld(true);
        if (
          firstMeteorSeenAt === null &&
          currentSpeechCycle === 0 &&
          meteorite?.visible &&
          sceneViewport
        ) {
          // The leading edge appears before the meteor's center reaches the viewport.
          meteorLowerEdge.copy(meteorite.position);
          meteorLowerEdge.y -= meteorRadius * meteorite.scale.x;
          meteorLowerEdge.project(camera);
          const canvasTop = sceneViewport.pageTop - (globalThis.scrollY || 0);
          const edgeY =
            canvasTop + ((1 - meteorLowerEdge.y) * sceneViewport.height) / 2;
          if (
            Math.abs(meteorLowerEdge.x) < 1 &&
            edgeY >= 6 &&
            edgeY < sceneViewport.height
          ) {
            firstMeteorSeenAt = time;
          }
        }
        const watchingMeteor =
          firstMeteorSeenAt !== null && time - firstMeteorSeenAt < 4;
        if (watchingMeteor && meteorite?.visible) {
          headTarget.copy(meteorite.position);
        } else {
          headTarget.copy(earthCenter);
        }
        astronaut.worldToLocal(headTarget);
        headTarget.y -= 0.28;
        headTarget.normalize();
        desiredHeadTurn.setFromUnitVectors(headForward, headTarget);
        if (!headInitialized) {
          headTurn.value.copy(desiredHeadTurn);
          headInitialized = true;
          astronaut.visible = true;
        } else {
          headTurn.value.slerp(desiredHeadTurn, 1 - Math.exp(-dt * 8));
        }
      }
      if (currentSpeechCycle !== speechCycle) {
        speechCycle = currentSpeechCycle;
        speechStartedAt = null;
        speech.textContent = "";
        lastSpeechText = "";
      }
      const canvasTop =
        (sceneViewport?.pageTop ?? 0) - (globalThis.scrollY || 0);
      if (
        speechStartedAt === null &&
        headInitialized &&
        meteorite?.visible &&
        sceneViewport
      ) {
        // The mesh is enabled while it is still above the canvas. Wait until
        // its center is inside the visible sky, past the clipped entry edge.
        meteorOnScreen.copy(meteorite.position).project(camera);
        const y = ((1 - meteorOnScreen.y) * sceneViewport.height) / 2;
        if (
          Math.abs(meteorOnScreen.x) < 1 &&
          Math.abs(meteorOnScreen.z) < 1 &&
          y >= 12 &&
          y < sceneViewport.skyBottom &&
          canvasTop + y >= 12 &&
          canvasTop + y < sceneViewport.height
        ) {
          speechStartedAt = time;
        }
      }
      const speechTime =
        speechStartedAt === null ? -1 : time - speechStartedAt - 1;
      const messageIndex = speechTime >= secondStart ? 1 : 0;
      const messageTime = messageIndex ? speechTime - secondStart : speechTime;
      const message = speechMessages[messageIndex];
      const messageDuration = messageIndex ? secondDuration : firstDuration;
      speech.hidden = !(
        astronaut?.visible &&
        messageTime >= 0 &&
        messageTime < messageDuration
      );
      if (!speech.hidden) {
        const count = Math.min(
          message.length,
          Math.floor(messageTime / characterTime) + 1,
        );
        const text = message.slice(0, count).join("");
        if (text !== lastSpeechText) {
          speech.textContent = text;
          lastSpeechText = text;
        }
        speech.style.opacity = String(
          Math.min(
            1,
            messageTime / 0.35,
            (messageDuration - messageTime) / 0.4,
          ),
        );
      }
      if (!speech.hidden) {
        astronaut.updateWorldMatrix(true, false);
        let top = Infinity;
        for (const corner of speechBounds) {
          speechAnchor
            .copy(corner)
            .applyMatrix4(astronaut.matrixWorld)
            .project(camera);
          top = Math.min(
            top,
            ((1 - speechAnchor.y) * sceneViewport.height) / 2,
          );
        }
        speechAnchor
          .set(0, 0.4, 0)
          .applyMatrix4(astronaut.matrixWorld)
          .project(camera);
        const halfWidth = Math.min(
          compact ? 110 : 140,
          globalThis.innerWidth * 0.36,
        );
        const left =
          sceneViewport.left + ((speechAnchor.x + 1) * sceneViewport.width) / 2;
        const bubbleLeft = Math.max(
          halfWidth + 12,
          Math.min(globalThis.innerWidth - halfWidth - 12, left),
        );
        speech.style.width = `${halfWidth * 2}px`;
        speech.style.transform = `translate3d(${bubbleLeft - sceneViewport.hostLeft}px, ${sceneViewport.pageTop - sceneViewport.hostPageTop + top - 10}px, 0) translate(-50%, -100%)`;
        speech.style.setProperty(
          "--speech-tail-x",
          `${Math.max(18, Math.min(halfWidth * 2 - 24, halfWidth + left - bubbleLeft))}px`,
        );
      }
      const moonPhase = time * 0.27;
      moon.position.set(
        moonOrbitX + Math.sin(moonPhase) * (compact ? 0.1 : 0.17),
        0.55 + Math.sin(moonPhase + 0.5) * 0.27,
        moonOrbitZ + (1 - Math.cos(moonPhase)) * 0.12,
      );
      moon.lookAt(0, 0, 0);
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
      if (!visible || document.hidden || motion.matches) speech.hidden = true;
      if (!visible || document.hidden || motion.matches) {
        clearTimeout(meteorTimer);
        meteorTimer = null;
      } else if (meteorTimer === null) scheduleMeteor();
      traffic.setAttribute(
        "data-paused",
        String(!visible || document.hidden || motion.matches),
      );
      for (const flight of flights.values()) {
        if (!visible || document.hidden || motion.matches) flight.pause();
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
    visibilityObserver.observe(host.closest?.(".welcome") || host);
    document.addEventListener("visibilitychange", updateAnimation);
    motion.addEventListener("change", updateAnimation);
    const dragSensitivity = 0.009;
    const horizontalAxis = new THREE.Vector3(0, 1, 0);
    const verticalAxis = new THREE.Vector3(1, 0, 0);
    const pointer = new THREE.Vector2();
    const pointerRay = new THREE.Raycaster();
    const astronautHitArea = new THREE.Sphere();
    const astronautDragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1));
    const astronautDragPoint = new THREE.Vector3();
    const astronautNextPoint = new THREE.Vector3();
    function aimPointerRay(event, keepInFrame = false) {
      const { left, pageTop, width, height } = sceneViewport;
      const top = pageTop - (globalThis.scrollY || 0);
      let x = event.clientX - left;
      let y = event.clientY - top;
      if (keepInFrame) {
        x = THREE.MathUtils.clamp(x, 24, width - 24);
        y = THREE.MathUtils.clamp(y, 24, height - 24);
      }
      pointer.set((2 * x) / width - 1, 1 - (2 * y) / height);
      pointerRay.setFromCamera(pointer, camera);
    }
    canvas.addEventListener("pointerdown", (e) => {
      let movingAstronaut = false;
      if (sceneViewport && astronaut?.visible) {
        aimPointerRay(e);
        astronautHitArea.center.copy(astronaut.position);
        astronautHitArea.radius = astronaut.scale.x * 0.52;
        if (pointerRay.ray.intersectsSphere(astronautHitArea)) {
          astronautDragPlane.constant = -astronautDragDepth;
          movingAstronaut = Boolean(
            pointerRay.ray.intersectPlane(
              astronautDragPlane,
              astronautDragPoint,
            ),
          );
        }
      }
      drag = { x: e.clientX, y: e.clientY, movingAstronaut };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (drag) {
        if (drag.movingAstronaut) {
          aimPointerRay(e, true);
          if (
            pointerRay.ray.intersectPlane(
              astronautDragPlane,
              astronautNextPoint,
            )
          ) {
            astronautOffset.x += astronautNextPoint.x - astronautDragPoint.x;
            astronautOffset.y += astronautNextPoint.y - astronautDragPoint.y;
            astronautDragPoint.copy(astronautNextPoint);
          }
          return;
        }
        system.rotateOnWorldAxis(
          horizontalAxis,
          (e.clientX - drag.x) * dragSensitivity,
        );
        system.rotateOnWorldAxis(
          verticalAxis,
          (e.clientY - drag.y) * dragSensitivity,
        );
        drag.x = e.clientX;
        drag.y = e.clientY;
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
      speech.remove();
      document.removeEventListener("click", launchMeteor);
      for (const flight of flights.values()) flight.cancel();
      traffic.remove();
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
      cloudTexture.dispose();
      moonTexture?.dispose();
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
