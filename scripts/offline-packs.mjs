// Assets used by the rest of the site (home globe, map, fonts) remain shared.
// Save Earth's simulation, models, planetary textures and audio are opt-in.
export function isSaveEarthAsset(path) {
  if (path.startsWith("audio/")) return true;
  if (/^save-earth-.*\.js$/.test(path))
    return !/^save-earth-(access|entry|analytics|offline)\.js$/.test(path);
  return /^art\/(?:game-earth\.glb|game-moon\.glb|moon-landing\.glb|moon-color-8k\.webp|iss\.glb|earth-rocket\.glb|meteor-explosion\.glb|smg-gun\.glb|save-earth-blaster\.png|andromeda\.jpg|lunar-vista\.webp|(?:mercury|venus|mars|jupiter|saturn|neptune)\.jpg|(?:saturn-rings|uranus)\.webp)$/.test(
    path,
  );
}
