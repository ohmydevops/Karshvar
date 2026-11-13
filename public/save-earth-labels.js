import * as THREE from "./vendor/three.module.min.js";

const names = {
  en: [
    "Earth",
    "Moon",
    "Sun",
    "Mercury",
    "Venus",
    "Mars",
    "Jupiter",
    "Saturn",
    "Uranus",
    "Neptune",
    "Andromeda",
  ],
  fa: [
    "زمین",
    "ماه",
    "خورشید",
    "تیر",
    "ناهید",
    "بهرام",
    "مشتری",
    "زحل",
    "اورانوس",
    "نپتون",
    "کهکشان آندرومدا",
  ],
  ar: [
    "الأرض",
    "القمر",
    "الشمس",
    "عطارد",
    "الزهرة",
    "المريخ",
    "المشتري",
    "زحل",
    "أورانوس",
    "نبتون",
    "مجرة أندروميدا",
  ],
  tr: [
    "Dünya",
    "Ay",
    "Güneş",
    "Merkür",
    "Venüs",
    "Mars",
    "Jüpiter",
    "Satürn",
    "Uranüs",
    "Neptün",
    "Andromeda",
  ],
  fr: [
    "Terre",
    "Lune",
    "Soleil",
    "Mercure",
    "Vénus",
    "Mars",
    "Jupiter",
    "Saturne",
    "Uranus",
    "Neptune",
    "Andromède",
  ],
  ru: [
    "Земля",
    "Луна",
    "Солнце",
    "Меркурий",
    "Венера",
    "Марс",
    "Юпитер",
    "Сатурн",
    "Уран",
    "Нептун",
    "Андромеда",
  ],
};
export function celestialName(name, language) {
  const index = names.en.indexOf(name);
  return index < 0 ? name : (names[language] || names.en)[index];
}

// Analytic bounds for eleven bodies, not raycasts through their dense meshes.
export function createCelestialLabels(
  host,
  camera,
  planet,
  sky,
  width,
  height,
) {
  const label = document.createElement("div");
  label.className = "celestial-name";
  label.setAttribute("aria-hidden", "true");
  host.append(label);
  const language = document.documentElement.lang;
  const bodies = [{ object: planet, name: "Earth", radius: 1 }];
  for (const name of names.en.slice(1)) {
    const object = sky.getObjectByName(
      name === "Andromeda" ? "Andromeda — R. Gendler / ESO" : name,
    );
    if (object)
      bodies.push({
        object,
        name,
        radius: name === "Sun" ? 40 : name === "Andromeda" ? 90 : 1,
      });
  }
  const center = new THREE.Vector3(),
    scale = new THREE.Vector3();
  const direction = new THREE.Vector3(),
    hit = new THREE.Vector3();
  const anchor = new THREE.Vector3(),
    cameraUp = new THREE.Vector3();
  const inverse = new THREE.Matrix4(),
    ray = new THREE.Ray(),
    localRay = new THREE.Ray();
  const localPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  let current = null;
  return {
    resize(w, h) {
      width = w;
      height = h;
    },
    update(active) {
      if (!active) {
        label.classList.remove("is-visible");
        current = null;
        return;
      }
      camera.getWorldDirection(direction);
      ray.set(camera.position, direction);
      let selected = null,
        nearest = Infinity;
      for (const body of bodies) {
        center.setFromMatrixPosition(body.object.matrixWorld);
        scale.setFromMatrixScale(body.object.matrixWorld);
        const radius = body.radius * Math.max(scale.x, scale.y, scale.z);
        let distance;
        if (body.name === "Andromeda") {
          inverse.copy(body.object.matrixWorld).invert();
          localRay.copy(ray).applyMatrix4(inverse);
          if (
            !localRay.intersectPlane(localPlane, hit) ||
            (hit.x / 74) ** 2 + (hit.y / 27) ** 2 > 1
          )
            continue;
          distance = hit
            .applyMatrix4(body.object.matrixWorld)
            .distanceTo(camera.position);
        } else {
          hit.copy(center).sub(camera.position);
          const along = hit.dot(direction),
            side = hit.lengthSq() - along * along;
          if (along <= 0 || side > radius * radius) continue;
          distance = along - Math.sqrt(Math.max(0, radius * radius - side));
        }
        if (distance < nearest) {
          nearest = distance;
          selected = body;
        }
      }
      if (!selected) {
        label.classList.remove("is-visible");
        current = null;
        return;
      }
      center.setFromMatrixPosition(selected.object.matrixWorld);
      scale.setFromMatrixScale(selected.object.matrixWorld);
      cameraUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
      const radius =
        selected.name === "Andromeda"
          ? 36
          : selected.radius * Math.max(scale.x, scale.y, scale.z);
      anchor.copy(center).addScaledVector(cameraUp, radius).project(camera);
      const x = Math.max(
        70,
        Math.min(width - 70, ((anchor.x + 1) * width) / 2),
      );
      const y = Math.max(
        30,
        Math.min(height - 25, ((1 - anchor.y) * height) / 2 - 12),
      );
      if (current !== selected) {
        label.textContent = celestialName(selected.name, language);
        current = selected;
      }
      label.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(-50%,-100%)`;
      label.classList.add("is-visible");
    },
  };
}
