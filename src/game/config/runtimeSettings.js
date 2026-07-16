const DEFAULTS = Object.freeze({
  renderDistance: 3,
  particleDensity: 1,
  creatureDensity: 1,
  waterQuality: "high",
  dynamicResolution: true,
  shorelineWaves: true,
});

export function readRuntimeSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem("voxel:runtimeSettings") || "{}") };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveRuntimeSettings(settings) {
  localStorage.setItem("voxel:runtimeSettings", JSON.stringify({ ...DEFAULTS, ...(settings || {}) }));
}
