import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";

function readViewportHeight() {
  return Math.max(1, Math.round(window.visualViewport?.height || window.innerHeight || 1));
}

function readViewportWidth() {
  return Math.max(1, Math.round(window.visualViewport?.width || window.innerWidth || 1));
}

export default function ViewportController() {
  const { camera, gl, invalidate, setSize, size } = useThree();
  const frameRef = useRef(0);
  const lastSizeRef = useRef({ width: 0, height: 0 });
  const stateSizeRef = useRef(size);

  useEffect(() => {
    stateSizeRef.current = size;
  }, [size]);

  useEffect(() => {
    const canvas = gl.domElement;
    const host = canvas.parentElement;
    if (!host) return undefined;

    const syncViewport = () => {
      frameRef.current = 0;
      const rect = host.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width || readViewportWidth()));
      const height = Math.max(1, Math.round(rect.height || readViewportHeight()));

      document.documentElement.style.setProperty("--app-width", `${readViewportWidth()}px`);
      document.documentElement.style.setProperty("--app-height", `${readViewportHeight()}px`);

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.style.left = "0";
      canvas.style.top = "0";

      if (lastSizeRef.current.width !== width || lastSizeRef.current.height !== height) {
        lastSizeRef.current = { width, height };
        const current = stateSizeRef.current;
        if (current.width !== width || current.height !== height) {
          setSize(width, height);
        }
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }

      invalidate();
    };

    const scheduleSync = () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(syncViewport);
    };

    const resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(scheduleSync)
      : null;
    resizeObserver?.observe(host);
    resizeObserver?.observe(document.documentElement);

    window.addEventListener("resize", scheduleSync, { passive: true });
    window.addEventListener("orientationchange", scheduleSync, { passive: true });
    document.addEventListener("fullscreenchange", scheduleSync);
    window.visualViewport?.addEventListener("resize", scheduleSync, { passive: true });
    window.visualViewport?.addEventListener("scroll", scheduleSync, { passive: true });

    scheduleSync();

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", scheduleSync);
      window.removeEventListener("orientationchange", scheduleSync);
      document.removeEventListener("fullscreenchange", scheduleSync);
      window.visualViewport?.removeEventListener("resize", scheduleSync);
      window.visualViewport?.removeEventListener("scroll", scheduleSync);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [camera, gl, invalidate, setSize]);

  return null;
}
