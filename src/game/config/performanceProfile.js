export const PERFORMANCE_PROFILES = {
  performance: {
    id: "performance",
    label: "Performance",
    renderDistance: 2,
    initialPixelRatio: 0.68,
    minPixelRatio: 0.52,
    maxPixelRatio: 0.82,
    targetFps: 55,
    maxVisibleMobs: 26,
    mobRenderRadius: 48,
    overlayDistance: 14,
    torchLights: 4,
    cameraFar: 105,
  },
  balanced: {
    id: "balanced",
    label: "Balanced",
    renderDistance: 3,
    initialPixelRatio: 0.86,
    minPixelRatio: 0.58,
    maxPixelRatio: 1.05,
    targetFps: 55,
    maxVisibleMobs: 36,
    mobRenderRadius: 62,
    overlayDistance: 18,
    torchLights: 6,
    cameraFar: 145,
  },
  quality: {
    id: "quality",
    label: "Quality",
    renderDistance: 4,
    initialPixelRatio: 1,
    minPixelRatio: 0.68,
    maxPixelRatio: 1.3,
    targetFps: 52,
    maxVisibleMobs: 46,
    mobRenderRadius: 76,
    overlayDistance: 24,
    torchLights: 8,
    cameraFar: 185,
  },
};

export function getPerformanceProfile() {
  if (typeof window === "undefined") return PERFORMANCE_PROFILES.balanced;
  const selected = localStorage.getItem("voxel:quality") || "balanced";
  return PERFORMANCE_PROFILES[selected] || PERFORMANCE_PROFILES.balanced;
}

export function getInitialPixelRatio(profile = getPerformanceProfile()) {
  const deviceRatio = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  return Math.max(
    Math.min(deviceRatio, profile.minPixelRatio),
    Math.min(deviceRatio, profile.maxPixelRatio, profile.initialPixelRatio)
  );
}
