import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { getInitialPixelRatio, getPerformanceProfile } from "../config/performanceProfile";
import { readRuntimeSettings } from "../config/runtimeSettings";

export const PERFORMANCE_EVENT = "voxel:performance-sample";

export default function PerformanceGovernor({ enabled = true }) {
  const { gl } = useThree();
  const profileRef = useRef(getPerformanceProfile());
  const dynamicResolutionRef = useRef(readRuntimeSettings().dynamicResolution !== false);
  const pixelRatioRef = useRef(getInitialPixelRatio(profileRef.current));
  const accumulatorRef = useRef({ elapsed: 0, frames: 0, lowWindows: 0, highWindows: 0 });

  useEffect(() => {
    gl.setPixelRatio(pixelRatioRef.current);
  }, [gl]);

  useFrame((_, rawDelta) => {
    if (!enabled || !dynamicResolutionRef.current) return;
    const delta = Math.min(rawDelta, 0.1);
    const sample = accumulatorRef.current;
    sample.elapsed += delta;
    sample.frames += 1;
    if (sample.elapsed < 1.25) return;

    const fps = sample.frames / sample.elapsed;
    const profile = profileRef.current;
    const deviceRatio = window.devicePixelRatio || 1;
    const minRatio = Math.min(deviceRatio, profile.minPixelRatio);
    const maxRatio = Math.min(deviceRatio, profile.maxPixelRatio);

    if (fps < profile.targetFps - 8) {
      sample.lowWindows += 1;
      sample.highWindows = 0;
    } else if (fps > profile.targetFps + 4) {
      sample.highWindows += 1;
      sample.lowWindows = 0;
    } else {
      sample.lowWindows = Math.max(0, sample.lowWindows - 1);
      sample.highWindows = Math.max(0, sample.highWindows - 1);
    }

    if (sample.lowWindows >= 2 && pixelRatioRef.current > minRatio + 0.01) {
      pixelRatioRef.current = Math.max(minRatio, pixelRatioRef.current - 0.08);
      gl.setPixelRatio(pixelRatioRef.current);
      sample.lowWindows = 0;
    } else if (sample.highWindows >= 4 && pixelRatioRef.current < maxRatio - 0.01) {
      pixelRatioRef.current = Math.min(maxRatio, pixelRatioRef.current + 0.04);
      gl.setPixelRatio(pixelRatioRef.current);
      sample.highWindows = 0;
    }

    window.dispatchEvent(new CustomEvent(PERFORMANCE_EVENT, {
      detail: {
        fps: Math.round(fps),
        pixelRatio: Number(pixelRatioRef.current.toFixed(2)),
        profile: profile.id,
      },
    }));

    sample.elapsed = 0;
    sample.frames = 0;
  });

  return null;
}
