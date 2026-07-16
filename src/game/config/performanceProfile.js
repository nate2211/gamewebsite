import { readRuntimeSettings } from "./runtimeSettings";

export const PERFORMANCE_PROFILES = {
  performance: {
    id: "performance",
    label: "Performance",
    renderDistance: 5,
    initialPixelRatio: 0.68,
    minPixelRatio: 0.5,
    maxPixelRatio: 0.82,
    targetFps: 55,
    maxVisibleMobs: 26,
    mobRenderRadius: 52,
    overlayDistance: 14,
    torchLights: 4,
    cameraFar: 180,
  },
  balanced: {
    id: "balanced",
    label: "Balanced",
    renderDistance: 8,
    initialPixelRatio: 0.78,
    minPixelRatio: 0.52,
    maxPixelRatio: 0.96,
    targetFps: 58,
    maxVisibleMobs: 34,
    mobRenderRadius: 72,
    overlayDistance: 18,
    torchLights: 6,
    cameraFar: 280,
  },
  quality: {
    id: "quality",
    label: "Quality",
    renderDistance: 12,
    initialPixelRatio: 1,
    minPixelRatio: 0.68,
    maxPixelRatio: 1.25,
    targetFps: 52,
    maxVisibleMobs: 48,
    mobRenderRadius: 98,
    overlayDistance: 26,
    torchLights: 9,
    cameraFar: 420,
  },
  ultra: {
    id: "ultra",
    label: "Ultra",
    renderDistance: 16,
    initialPixelRatio: 1.1,
    minPixelRatio: 0.72,
    maxPixelRatio: 1.4,
    targetFps: 48,
    maxVisibleMobs: 64,
    mobRenderRadius: 130,
    overlayDistance: 34,
    torchLights: 12,
    cameraFar: 580,
  },
};

export function getPerformanceProfile() {
  if (typeof window === "undefined") return PERFORMANCE_PROFILES.balanced;
  const selected = localStorage.getItem("voxel:quality") || "balanced";
  const base = PERFORMANCE_PROFILES[selected] || PERFORMANCE_PROFILES.balanced;
  const runtime = readRuntimeSettings();
  const renderDistance = Math.max(2, Math.min(16, Number(runtime.renderDistance) || base.renderDistance));
  const automaticFar = Math.max(base.cameraFar, (renderDistance + 4) * 30);
  return {
    ...base,
    ...runtime,
    renderDistance,
    cameraFar: runtime.cameraFarMode === "manual" ? runtime.cameraFar : automaticFar,
  };
}

export function getInitialPixelRatio(profile = getPerformanceProfile()) {
  const deviceRatio = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  return Math.max(
    Math.min(deviceRatio, profile.minPixelRatio),
    Math.min(deviceRatio, profile.maxPixelRatio, profile.initialPixelRatio)
  );
}
