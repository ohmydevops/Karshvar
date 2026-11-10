import { buildCountryMesh } from "./country-mesh.js";
self.onmessage = ({ data: { features, job } }) => {
  try {
    const mesh = buildCountryMesh(features);
    self.postMessage(
      { ...mesh, job },
      Object.values(mesh).map((array) => array.buffer),
    );
  } catch (error) {
    self.postMessage({ job, error: error.message });
  }
};
