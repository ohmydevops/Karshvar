import { createSpaceStation } from "./save-earth-station.js";
import { createMotionBlur } from "./save-earth-motion-blur.js";
import { createFlightMotion } from "./save-earth-motion.js";
import { planetRadius, earthAnchor } from "./save-earth-flight.js";
import { createDeepSky, celestialSunDirection } from "./save-earth-sky.js";
import * as THREE from "./vendor/three.module.min.js";
import { GLTFLoader } from "./vendor/GLTFLoader.js";
import { createHomeScene, earthAxialTilt } from "./home-scene.js";
import { createPlanet } from "./save-earth-planet.js";
import { createMagazineAnimation } from "./save-earth-weapon.js";
import {
  createWeaponHands,
  createHelmetSleeves,
} from "./save-earth-viewmodel.js";

export async function createSpaceRenderer(canvas, width, height) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(width, height, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const textures = new THREE.TextureLoader(),
    models = new GLTFLoader();
  const url = (name) => new URL("./art/" + name, import.meta.url).href;
  const [day, night, cloud, person, rock, blaster, station] = await Promise.all(
    [
      ...["earth-texture.webp", "earth-night.webp", "earth-clouds.png"].map(
        (n) => textures.loadAsync(url(n)),
      ),
      ...["astronaut.glb", "meteorite.glb", "smg-gun.glb"].map((n) =>
        models.loadAsync(url(n)),
      ),
      createSpaceStation(models),
    ],
  );
  day.colorSpace = night.colorSpace = THREE.SRGBColorSpace;
  day.anisotropy = night.anisotropy = Math.min(
    8,
    renderer.capabilities.getMaxAnisotropy(),
  );
  const scene = new THREE.Scene();
  scene.add(station.object);
  const background = new THREE.Scene();
  background.background = new THREE.Color(0x030812);
  const camera = new THREE.PerspectiveCamera(68, width / height, 0.04, 5000);
  camera.position.set(0, 3.55, 46);
  const sun = new THREE.DirectionalLight(0xffffff, 3.2);
  sun.position.copy(celestialSunDirection);
  const rim = new THREE.DirectionalLight(0x5bafff, 3);
  rim.position.set(200, 50, -100);
  scene.add(sun, rim, new THREE.HemisphereLight(0xb6d9ff, 0x152841, 2));
  const settings = createHomeScene(),
    planet = new THREE.Group(),
    axialFrame = new THREE.Group();
  axialFrame.rotation.set(0, settings.axisHeading, earthAxialTilt);
  planet.add(axialFrame);
  background.add(planet);
  const { earth, clouds } = createPlanet(
    axialFrame,
    settings,
    day,
    night,
    cloud,
    sun,
  );
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(1.045, 64, 48),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { impact: { value: 0 } },
      vertexShader:
        "varying vec3 n;void main(){n=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader:
        "varying vec3 n;uniform float impact;void main(){float a=pow(1.-abs(n.z),4.);gl_FragColor=vec4(mix(vec3(.12,.45,1.),vec3(1.,.2,.05),impact),a*.65);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}",
    }),
  );
  planet.add(halo);
  const sky = createDeepSky();
  background.add(sky);
  const moon = sky.getObjectByName("Moon");
  // Keep the Moon in the same distant reference frame as Earth.
  // Its back hemisphere stays behind Earth, with a visible offset at mission start.
  moon.scale.setScalar(3.6);
  moon.position.set(-16, 9, -18);
  function normalize(model, size, rotation) {
    const group = new THREE.Group();
    group.add(model);
    if (rotation) model.rotation.set(...rotation);
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model),
      extent = box.getSize(new THREE.Vector3());
    model.position.sub(box.getCenter(new THREE.Vector3()));
    group.scale.setScalar(size / Math.max(extent.x, extent.y, extent.z));
    return group;
  }
  // Bake the unrigged model into a normalized aiming pose once, before play.
  person.scene.updateMatrixWorld(true);
  const bodyBox = new THREE.Box3().setFromObject(person.scene),
    bodyCenter = bodyBox.getCenter(new THREE.Vector3());
  const bodyHeight = bodyBox.getSize(new THREE.Vector3()).y;
  const astronaut = new THREE.Group(),
    floatTime = { value: 0 };
  const point = new THREE.Vector3(),
    normal = new THREE.Vector3(),
    posedUpper = new THREE.Vector3(),
    posedLower = new THREE.Vector3(),
    posedNormal = new THREE.Vector3();
  const thirdPersonWeaponPosition = new THREE.Vector3(0.36, 0.44, -0.42);
  const thirdPersonWeaponYaw = Math.PI / 2 + 0.18;
  const thirdPersonWeaponScale = 0.85;
  const thirdPersonWeaponMatrix = new THREE.Matrix4().compose(
    thirdPersonWeaponPosition,
    new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      thirdPersonWeaponYaw,
    ),
    new THREE.Vector3().setScalar(thirdPersonWeaponScale),
  );
  const armBones = new Map(
    [-1, 1].map((side) => {
      const shoulder = new THREE.Vector3(side * 0.17, 0.22, 0);
      const oldElbow = new THREE.Vector3(side * 0.24, 0.1, 0.05);
      const oldPalm = new THREE.Vector3(
        side < 0 ? -0.306714 : 0.307111,
        side < 0 ? 0.011659 : 0.011466,
        side < 0 ? 0.119018 : 0.118956,
      );
      // The authored gloves share receiver space with the gun. Derive both
      // attachment targets from that same transform, then undo the body's Y turn.
      const palm = new THREE.Vector3(
        ...(side < 0 ? [0, -0.015, 0.055] : [0.6, 0.004, -0.06]),
      )
        .applyMatrix4(thirdPersonWeaponMatrix)
        .divideScalar(2.4);
      palm.x = -palm.x;
      palm.z = -palm.z;
      const reach = palm.clone().sub(shoulder),
        distance = reach.length();
      const upperLength = oldElbow.distanceTo(shoulder),
        lowerLength = oldPalm.distanceTo(oldElbow);
      const stretch = Math.max(
        1,
        (distance / (upperLength + lowerLength)) * 1.005,
      );
      const upperSize = upperLength * stretch,
        lowerSize = lowerLength * stretch;
      const direction = reach.divideScalar(distance);
      const along =
        (upperSize * upperSize - lowerSize * lowerSize + distance * distance) /
        (2 * distance);
      const height = Math.sqrt(
        Math.max(0, upperSize * upperSize - along * along),
      );
      const bend = new THREE.Vector3(side, -0.65, 0);
      bend.addScaledVector(direction, -bend.dot(direction)).normalize();
      const elbow = shoulder
        .clone()
        .addScaledVector(direction, along)
        .addScaledVector(bend, height);
      const upper = new THREE.Quaternion().setFromUnitVectors(
        oldElbow.clone().sub(shoulder).normalize(),
        elbow.clone().sub(shoulder).normalize(),
      );
      const lower = new THREE.Quaternion().setFromUnitVectors(
        oldPalm.clone().sub(oldElbow).normalize(),
        palm.clone().sub(elbow).normalize(),
      );
      const axis = oldPalm.clone().sub(shoulder);
      return [
        side,
        {
          shoulder,
          palm,
          oldElbow,
          elbow,
          upper,
          lower,
          stretch,
          axis,
          lengthSq: axis.lengthSq(),
        },
      ];
    }),
  );
  person.scene.traverse((part) => {
    if (!part.isMesh) return;
    const geometry = part.geometry.clone();
    geometry.applyMatrix4(part.matrixWorld);
    geometry.translate(-bodyCenter.x, -bodyCenter.y, -bodyCenter.z);
    geometry.scale(1 / bodyHeight, 1 / bodyHeight, 1 / bodyHeight);
    const positions = geometry.attributes.position,
      handRegion = new Uint8Array(positions.count),
      armRegion = new Float32Array(positions.count),
      armReach = new Float32Array(positions.count),
      armSide = new Float32Array(positions.count);
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i);
      if (Math.abs(point.x) > 0.145 && point.y > -0.19 && point.y < 0.29) {
        const bone = armBones.get(Math.sign(point.x));
        const weight = THREE.MathUtils.smoothstep(
          Math.abs(point.x),
          0.145,
          0.22,
        );
        const along =
          posedUpper.copy(point).sub(bone.shoulder).dot(bone.axis) /
          bone.lengthSq;
        const lowerWeight = THREE.MathUtils.smoothstep(along, 0.35, 0.65);
        normal.fromBufferAttribute(geometry.attributes.normal, i);
        posedUpper
          .copy(point)
          .sub(bone.shoulder)
          .applyQuaternion(bone.upper)
          .multiplyScalar(bone.stretch)
          .add(bone.shoulder);
        posedLower
          .copy(point)
          .sub(bone.oldElbow)
          .applyQuaternion(bone.lower)
          .multiplyScalar(bone.stretch)
          .add(bone.elbow);
        point.lerp(posedUpper.lerp(posedLower, lowerWeight), weight);
        positions.setXYZ(i, point.x, point.y, point.z);
        posedNormal.copy(normal).applyQuaternion(bone.upper);
        posedLower.copy(normal).applyQuaternion(bone.lower);
        normal
          .lerp(posedNormal.lerp(posedLower, lowerWeight), weight)
          .normalize();
        geometry.attributes.normal.setXYZ(i, normal.x, normal.y, normal.z);
      }
    }
    // Bake a relaxed trailing-leg pose once; hands and aim remain unchanged.
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i);
      const weight = 1 - THREE.MathUtils.smoothstep(-0.28, -0.08, point.y);
      if (weight <= 0) continue;
      const angle = 0.42 * weight;
      const c = Math.cos(angle),
        sn = Math.sin(angle);
      const y = point.y + 0.08,
        z = point.z;
      positions.setXYZ(i, point.x, y * c - z * sn - 0.08, y * sn + z * c);
      normal.fromBufferAttribute(geometry.attributes.normal, i);
      geometry.attributes.normal.setXYZ(
        i,
        normal.x,
        normal.y * c - normal.z * sn,
        normal.y * sn + normal.z * c,
      );
    }
    geometry.setAttribute("armRegion", new THREE.BufferAttribute(armRegion, 1));
    geometry.setAttribute("armReach", new THREE.BufferAttribute(armReach, 1));
    geometry.setAttribute("armSide", new THREE.BufferAttribute(armSide, 1));
    const bodyIndices = [];
    const bodyCount = geometry.index ? geometry.index.count : positions.count;
    for (let i = 0; i < bodyCount; i += 3) {
      const ids = [0, 1, 2].map((j) =>
        geometry.index ? geometry.index.getX(i + j) : i + j,
      );
      bodyIndices.push(...ids);
    }
    geometry.setIndex(bodyIndices);
    geometry.computeBoundingSphere();
    const material = part.material.clone();
    material.onBeforeCompile = (shader) => {
      shader.uniforms.floatTime = floatTime;
      shader.vertexShader = "uniform float floatTime;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
      // Slow, intermittent helmet drift, blended through the neck on the GPU.
      float headWeight=smoothstep(.26,.36,position.y);
      float headAngle=sin(floatTime*.47)*pow(max(0.,sin(floatTime*.19)),4.)*.025*headWeight;
      vec3 neckOffset=transformed-vec3(0.,.27,0.);
      float hc=cos(headAngle), hs=sin(headAngle);
      transformed=vec3(hc*neckOffset.x+hs*neckOffset.z,neckOffset.y,-hs*neckOffset.x+hc*neckOffset.z)+vec3(0.,.27,0.);
      float leg=1.-smoothstep(-.35,-.1,position.y);
      float phase=floatTime*.85;
      float side=sign(position.x);
      float drift=sin(phase+side*.65)-sin(side*.65);
      transformed.y+=leg*(sin(phase*.72)*.012+drift*.018);
      transformed.z+=leg*drift*.035;
      transformed.x+=leg*side*sin(phase*.55)*.008;
    `,
      );
    };
    astronaut.add(new THREE.Mesh(geometry, material));
  });
  astronaut.scale.setScalar(2.4);
  astronaut.rotation.y = Math.PI;
  const rig = new THREE.Group();
  scene.add(rig);
  rig.add(astronaut);
  const gunOrientation = new THREE.Group();
  gunOrientation.add(blaster.scene);
  const gun = normalize(gunOrientation, 1.15, [0, Math.PI / 2, 0]);
  const weapon = new THREE.Group();
  weapon.add(gun);
  gun.position.set(0.505, 0.055, 0);
  weapon.rotation.y = Math.PI / 2;
  weapon.position.set(0.48, 0.29, -0.62);
  rig.add(weapon);
  const weaponHands = createWeaponHands();
  weapon.add(weaponHands);
  let aimingDownSight = false;
  function poseWeapon(thirdPerson) {
    if (thirdPerson) weapon.position.copy(thirdPersonWeaponPosition);
    else weapon.position.set(0.27, 0.27, -0.48);
    if (aimingDownSight) weapon.position.set(0, 0.25, -0.48);
    weapon.scale.setScalar(thirdPerson ? thirdPersonWeaponScale : 0.75);
    weapon.rotation.set(
      thirdPerson ? 0 : aimingDownSight ? 0 : 0.08,
      thirdPerson
        ? thirdPersonWeaponYaw
        : Math.PI / 2 + (aimingDownSight ? 0 : 0.15),
      0,
    );
  }
  poseWeapon(false);
  const arms = createHelmetSleeves(weapon);
  rig.add(arms);
  const heldRig = new THREE.Group();
  rig.add(heldRig);
  heldRig.add(astronaut, arms, weapon);
  const magazineAnimation = createMagazineAnimation(gun);
  const template = normalize(rock.scene, 2);
  const pool = (count, make) =>
    Array.from({ length: count }, () => {
      const m = make();
      scene.add(m);
      return m;
    });
  const meteors = pool(64, () => template.clone(true));
  const shotGeometry = new THREE.CylinderGeometry(0.065, 0.065, 2.1, 8);
  shotGeometry.rotateZ(Math.PI / 2);
  const shotMaterial = new THREE.MeshBasicMaterial({
    color: 0xffb52e,
    toneMapped: false,
  });
  // Shared GPU geometry/material: no trail history or allocations while firing.
  const trailGeometry = new THREE.CylinderGeometry(
    0.16,
    0.008,
    5.5,
    12,
    1,
    true,
  );
  trailGeometry.rotateZ(-Math.PI / 2);
  trailGeometry.translate(-2.75, 0, 0);
  const trailMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader:
      "varying float strength; varying vec3 n; varying vec3 v; void main(){strength=uv.y; vec4 p=modelViewMatrix*vec4(position,1.); n=normalize(normalMatrix*normal); v=-p.xyz; gl_Position=projectionMatrix*p;}",
    fragmentShader:
      "varying float strength; varying vec3 n; varying vec3 v; void main(){float edge=pow(abs(dot(normalize(n),normalize(v))),1.4); float tail=smoothstep(0.,.85,strength); gl_FragColor=vec4(mix(vec3(1.,.12,.015),vec3(1.,.65,.08),edge),edge*tail*.95);}",
  });
  const shots = pool(64, () => {
    const shot = new THREE.Mesh(shotGeometry, shotMaterial);
    shot.add(new THREE.Mesh(trailGeometry, trailMaterial));
    const core = new THREE.Mesh(trailGeometry, trailMaterial);
    core.scale.set(0.82, 0.3, 0.3);
    shot.add(core);
    return shot;
  });
  const burstGeometry = new THREE.RingGeometry(0.85, 1, 32);
  const bursts = pool(
    32,
    () =>
      new THREE.Mesh(
        burstGeometry,
        new THREE.MeshBasicMaterial({
          color: 0xffb66e,
          transparent: true,
          depthWrite: false,
        }),
      ),
  );

  const muzzleFlash = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xffdd99 }),
  );
  muzzleFlash.position.set(1.08, 0.17413, 0);
  weapon.add(muzzleFlash);
  const motion = createFlightMotion();
  const motionBlur = createMotionBlur(renderer);
  motionBlur.resize(width, height);
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let visualMotion;
  const direction = new THREE.Vector3(),
    eye = new THREE.Vector3(),
    target = new THREE.Vector3();
  const forward = new THREE.Vector3(1, 0, 0),
    cameraOffset = new THREE.Vector3();
  let lastMeteors = [];
  function posePilot(player, thirdPerson, time, reload = 0, recoil = 0) {
    rig.position.copy(player.position);
    if (visualMotion) rig.position.add(visualMotion.offset);
    rig.quaternion.copy(visualMotion?.orientation || player.orientation);
    floatTime.value = reducedMotion.matches ? 0 : time;
    astronaut.visible = thirdPerson;
    arms.visible = !thirdPerson && !aimingDownSight;
    weaponHands.visible = !thirdPerson && !aimingDownSight;
    poseWeapon(thirdPerson);
    // Hands and receiver share recoil/reload motion, keeping both grip anchors aligned.
    heldRig.position.z = recoil * 0.025;
    heldRig.rotation.x = Math.sin((reload / 1.4) * Math.PI) * 0.12;
    cameraOffset
      .set(
        thirdPerson ? 1.65 : 0,
        thirdPerson ? 1.15 : 0.55,
        thirdPerson ? 4.5 : 0.08,
      )
      .applyQuaternion(player.orientation);
    camera.position.copy(player.position).add(cameraOffset);
    if (visualMotion) camera.position.add(visualMotion.cameraOffset);
    camera.quaternion.copy(player.orientation);
    camera.updateMatrixWorld();
    rig.updateMatrixWorld(true);
    magazineAnimation.update(reload);
  }
  await renderer.compileAsync(scene, camera);
  await motionBlur.warmup(scene, camera, background);
  return {
    shot(player, thirdPerson, time) {
      posePilot(player, thirdPerson, time);
      const position = new THREE.Vector3(1.08, 0.17413, 0).applyMatrix4(
        weapon.matrixWorld,
      );
      eye.copy(camera.position);
      direction.set(0, 0, -1).applyQuaternion(player.orientation);
      // Both camera modes converge on the fixed centre sight at the nearest target.
      let distance = 500;
      for (const meteor of lastMeteors) {
        target.copy(meteor.position).sub(eye);
        const along = target.dot(direction);
        const side = target.lengthSq() - along * along;
        const radius = meteor.renderRadius ?? meteor.radius;
        if (along > 0 && side < radius * radius)
          distance = Math.min(
            distance,
            along - Math.sqrt(radius * radius - side),
          );
      }
      target.copy(eye).addScaledVector(direction, distance);
      return {
        position,
        origin: position.clone(),
        // Own this vector: target is reused by aiming and later shots.
        velocity: target.clone().sub(position).normalize().multiplyScalar(110),
      };
    },
    resize(w, h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      motionBlur.resize(w, h);
    },
    placeMeteorOutsideView(meteor) {
      const depth = 45;
      const halfHeight = Math.tan((camera.fov * Math.PI) / 360) * depth;
      const halfWidth = halfHeight * camera.aspect;
      const margin = meteor.radius * 2 + 2;
      const side = Math.floor(Math.random() * 4);
      const offset = Math.random() * 2 - 1;
      meteor.position
        .set(
          side < 2
            ? (side === 0 ? -1 : 1) * (halfWidth + margin)
            : offset * halfWidth,
          side >= 2
            ? (side === 2 ? -1 : 1) * (halfHeight + margin)
            : offset * halfHeight,
          -depth,
        )
        .applyQuaternion(camera.quaternion)
        .add(camera.position);
      meteor.spawnPosition.copy(meteor.position);
    },
    resetStation: station.reset,
    constrainPilot: station.constrainPilot,
    draw(state) {
      aimingDownSight = !!state.aiming;
      const targetFov = aimingDownSight ? 25 : 68;
      if (camera.fov !== targetFov) {
        camera.fov = targetFov;
        camera.updateProjectionMatrix();
      }
      station.update(state.elapsed);
      lastMeteors = state.meteors;
      visualMotion = motion.update(
        state.player,
        state.elapsed,
        state.thirdPerson,
        reducedMotion.matches,
        state.active,
      );
      planet.scale.setScalar(planetRadius);
      earthAnchor(state.player, planet.position);
      earth.rotation.y = settings.earthRotation + state.elapsed * 0.02;
      clouds.rotation.y = earth.rotation.y + state.elapsed * 0.006;
      halo.material.uniforms.impact.value = state.flash > 0 ? 1 : 0;
      posePilot(
        state.player,
        state.thirdPerson,
        state.elapsed,
        state.reloadIn,
        Math.max(0, state.cooldown - 0.14) / 0.06,
      );
      if (state.orbit?.active) {
        const yaw = state.orbit.yaw + 0.35;
        const pitch = state.orbit.pitch + 0.18;
        cameraOffset
          .set(
            Math.sin(yaw) * Math.cos(pitch),
            Math.sin(pitch),
            Math.cos(yaw) * Math.cos(pitch),
          )
          .multiplyScalar(4.9)
          .applyQuaternion(state.player.orientation);
        camera.position.copy(state.player.position).add(cameraOffset);
        camera.up.set(0, 1, 0).applyQuaternion(state.player.orientation);
        camera.lookAt(state.player.position);
        camera.updateMatrixWorld();
      }
      muzzleFlash.visible = state.cooldown > 0.16;
      sky.position.copy(planet.position);
      const moonPhase = state.elapsed * 0.012;
      moon.position.set(
        -16 * Math.cos(moonPhase),
        9 + 3 * Math.sin(moonPhase),
        -18 - 6 * Math.sin(moonPhase),
      );
      // The LROC map is centered at longitude zero (U=.5, local +X).
      // Keep this near hemisphere facing Earth instead of spinning freely.
      moon.lookAt(planet.position);
      moon.rotateY(-Math.PI / 2);
      sky.userData.update?.(state.elapsed);
      meteors.forEach((m, i) => {
        const p = state.meteors[i];
        m.visible = !!p;
        if (p) {
          m.position.copy(p.position);
          m.scale.setScalar(
            template.scale.x *
              (p.renderRadius ?? p.radius) *
              (1 + (p.hitFlash || 0) * 0.5),
          );
          m.rotation.set(p.angle * 0.7, p.angle, p.angle * 0.3);
        }
      });
      shots.forEach((m, i) => {
        const p = state.shots[i];
        m.visible = !!p;
        if (p) {
          m.position.copy(p.position);
          direction.copy(p.velocity).normalize();
          // Grow only over travelled space: never draw behind the muzzle.
          const travelled = p.position.distanceTo(p.origin);
          m.scale.x = Math.min(1, travelled / 5.5);
          m.quaternion.setFromUnitVectors(forward, direction);
        }
      });
      bursts.forEach((m, i) => {
        const p = state.bursts[i];
        m.visible = !!p;
        if (p) {
          m.position.copy(p.position);
          m.quaternion.copy(camera.quaternion);
          m.scale.setScalar(p.radius * (0.7 + 3 * p.age));
          m.material.opacity = 1 - p.age / 0.32;
        }
      });
      motionBlur.render(scene, camera, visualMotion.blur, background);
    },
  };
  // Read only by the shot query between render frames.
}
