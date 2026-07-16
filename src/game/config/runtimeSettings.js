const DEFAULTS = Object.freeze({
  renderDistance: 8,
  simulationDistance: 6,
  chunkGenerationConcurrency: 4,
  chunkUnloadMargin: 3,
  chunkPreloadRadius: 1,
  continueStreamingWhilePaused: true,
  preventVoidFall: true,
  walkAcrossStreamingBoundary: true,
  cameraFov: 70,
  cameraFarMode: "auto",
  cameraFar: 420,
  particleDensity: 1,
  creatureDensity: 1,
  waterQuality: "high",
  dynamicResolution: true,
  shorelineWaves: true,
});

const clamp = (value, min, max, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
};

export function normalizeRuntimeSettings(settings = {}) {
  const merged = { ...DEFAULTS, ...(settings || {}) };
  return {
    ...merged,
    renderDistance: Math.round(clamp(merged.renderDistance, 2, 16, DEFAULTS.renderDistance)),
    simulationDistance: Math.round(clamp(merged.simulationDistance, 2, 12, DEFAULTS.simulationDistance)),
    chunkGenerationConcurrency: Math.round(clamp(merged.chunkGenerationConcurrency, 1, 8, DEFAULTS.chunkGenerationConcurrency)),
    chunkUnloadMargin: Math.round(clamp(merged.chunkUnloadMargin, 1, 6, DEFAULTS.chunkUnloadMargin)),
    chunkPreloadRadius: Math.round(clamp(merged.chunkPreloadRadius, 0, 3, DEFAULTS.chunkPreloadRadius)),
    cameraFov: clamp(merged.cameraFov, 55, 100, DEFAULTS.cameraFov),
    cameraFar: clamp(merged.cameraFar, 140, 900, DEFAULTS.cameraFar),
    particleDensity: clamp(merged.particleDensity, 0.25, 1.5, DEFAULTS.particleDensity),
    creatureDensity: clamp(merged.creatureDensity, 0.5, 1.5, DEFAULTS.creatureDensity),
    cameraFarMode: merged.cameraFarMode === "manual" ? "manual" : "auto",
    waterQuality: ["low", "medium", "high"].includes(merged.waterQuality)
      ? merged.waterQuality
      : DEFAULTS.waterQuality,
    continueStreamingWhilePaused: merged.continueStreamingWhilePaused !== false,
    preventVoidFall: merged.preventVoidFall !== false,
    walkAcrossStreamingBoundary: merged.walkAcrossStreamingBoundary !== false,
    dynamicResolution: merged.dynamicResolution !== false,
    shorelineWaves: merged.shorelineWaves !== false,
  };
}

export function readRuntimeSettings() {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    return normalizeRuntimeSettings(JSON.parse(localStorage.getItem("voxel:runtimeSettings") || "{}"));
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveRuntimeSettings(settings) {
  const normalized = normalizeRuntimeSettings(settings);
  localStorage.setItem("voxel:runtimeSettings", JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent("voxel:runtime-settings-changed", { detail: normalized }));
  return normalized;
}

export { DEFAULTS as DEFAULT_RUNTIME_SETTINGS };
