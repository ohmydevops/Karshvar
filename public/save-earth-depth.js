// Custom world-space shaders must use the same depth representation as glTF
// materials. Screen-space post-processing is deliberately outside these roots.
export function syncSceneDepth(...roots) {
  const seen = new Set();
  for (const root of roots)
    root.traverse((object) => {
      for (const material of [object.material].flat()) {
        if (!material?.isShaderMaterial || seen.has(material)) continue;
        seen.add(material);
        if (material.vertexShader.includes("logdepthbuf_pars_vertex")) continue;
        material.vertexShader =
          (material.vertexShader.includes("#include <common>")
            ? ""
            : "#include <common>\n") +
          "#include <logdepthbuf_pars_vertex>\n" +
          material.vertexShader.replace(
            /}\s*$/,
            "\n#include <logdepthbuf_vertex>\n}",
          );
        material.fragmentShader =
          "#include <logdepthbuf_pars_fragment>\n" +
          material.fragmentShader.replace(
            /void\s+main\s*\(\s*\)\s*\{/,
            "void main(){\n#include <logdepthbuf_fragment>\n",
          );
        material.needsUpdate = true;
      }
    });
}
