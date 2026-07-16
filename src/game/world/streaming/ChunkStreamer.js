import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import ChunkWorkerClient from "../../workers/chunkWorkerClient";
import { getPerformanceProfile } from "../../config/performanceProfile";
import {
  generateChunk,
  getChunkIdsAround,
  parseChunkId,
  worldToChunk,
} from "../generation/worldGenerator";
import { worldRuntime } from "../../core/worldRuntime";

function chunkDistanceSquaredFrom(id, centerX, centerZ) {
  const [cx, cz] = parseChunkId(id);
  const dx = cx - centerX;
  const dz = cz - centerZ;
  return dx * dx + dz * dz;
}

export default function ChunkStreamer({
  playerRef,
  enabled = true,
  bootstrapRadius = 0,
  onStreamError,
}) {
  const seed = useSelector((state) => state.world.seed);
  const [profile, setProfile] = useState(getPerformanceProfile);
  const seedRef = useRef(seed);
  const enabledRef = useRef(enabled);
  const bootstrapRadiusRef = useRef(Math.max(0, Number(bootstrapRadius) || 0));
  const profileRef = useRef(profile);
  const queueRef = useRef([]);
  const queuedRef = useRef(new Set());
  const desiredRef = useRef(new Set());
  const inFlightRef = useRef(new Set());
  const pendingApplyRef = useRef([]);
  const pendingApplyIdsRef = useRef(new Set());
  const lastCenterRef = useRef("");
  const workersRef = useRef([]);
  const retriesRef = useRef(new Map());
  const onStreamErrorRef = useRef(onStreamError);

  useEffect(() => {
    const refresh = () => setProfile(getPerformanceProfile());
    window.addEventListener("voxel:runtime-settings-changed", refresh);
    return () => window.removeEventListener("voxel:runtime-settings-changed", refresh);
  }, []);

  useEffect(() => {
    profileRef.current = profile;
    lastCenterRef.current = "";
  }, [profile]);

  useEffect(() => {
    onStreamErrorRef.current = onStreamError;
  }, [onStreamError]);

  useEffect(() => {
    seedRef.current = seed;
    lastCenterRef.current = "";
    queueRef.current = [];
    queuedRef.current.clear();
    desiredRef.current.clear();
    inFlightRef.current.clear();
    pendingApplyRef.current = [];
    pendingApplyIdsRef.current.clear();
    retriesRef.current.clear();
  }, [seed]);

  useEffect(() => {
    enabledRef.current = enabled;
    lastCenterRef.current = "";
  }, [enabled]);

  useEffect(() => {
    bootstrapRadiusRef.current = Math.max(0, Number(bootstrapRadius) || 0);
    lastCenterRef.current = "";
  }, [bootstrapRadius]);

  useEffect(() => {
    const requested = Math.max(1, Math.min(8, Number(profile.chunkGenerationConcurrency) || 1));
    const hardwareThreads = typeof navigator === "undefined" ? 4 : Number(navigator.hardwareConcurrency) || 4;
    const mainThreadReserve = hardwareThreads >= 8 ? 2 : 1;
    const safeWorkerLimit = Math.max(1, Math.min(8, hardwareThreads - mainThreadReserve));
    const concurrency = Math.min(requested, safeWorkerLimit);
    const workers = Array.from({ length: concurrency }, () => new ChunkWorkerClient());
    const inFlight = inFlightRef.current;
    workersRef.current = workers;
    return () => {
      workers.forEach((worker) => worker.dispose());
      workersRef.current = [];
      inFlight.clear();
    };
  }, [profile.chunkGenerationConcurrency]);

  // Generate the center chunk after the first paint, then progressively direct-
  // generate any still-missing bootstrap neighbors during idle time. The worker
  // pool remains the normal path, but loading never depends on worker startup.
  useEffect(() => {
    if (!seed || !playerRef.current) return undefined;
    let cancelled = false;
    let frameId = null;
    let startTimer = null;
    let idleId = null;
    let fallbackTimer = null;

    const generateId = (id) => {
      if (cancelled || worldRuntime.isChunkLoaded(id)) return;
      const [cx, cz] = parseChunkId(id);
      try {
        const chunk = generateChunk(seed, cx, cz);
        if (!cancelled && !worldRuntime.isChunkLoaded(id)) {
          worldRuntime.applyChunk(chunk);
          retriesRef.current.delete(id);
        }
      } catch (error) {
        if (!cancelled) {
          console.error(`Direct bootstrap voxel generation failed for ${id}`, error);
          onStreamErrorRef.current?.(`Bootstrap terrain ${id} could not be generated.`);
        }
      }
    };

    const player = playerRef.current;
    const centerX = worldToChunk(Number(player.x) || 0);
    const centerZ = worldToChunk(Number(player.z) || 0);
    const centerId = `${centerX},${centerZ}`;

    frameId = window.requestAnimationFrame(() => {
      startTimer = window.setTimeout(() => generateId(centerId), 20);
    });

    const bootstrapIds = getChunkIdsAround(
      Number(player.x) || 0,
      Number(player.z) || 0,
      bootstrapRadiusRef.current
    ).filter((id) => id !== centerId);
    let index = 0;

    const scheduleNext = () => {
      if (cancelled || index >= bootstrapIds.length) return;
      const run = () => {
        idleId = null;
        fallbackTimer = null;
        if (cancelled) return;
        generateId(bootstrapIds[index]);
        index += 1;
        scheduleNext();
      };
      if (typeof window.requestIdleCallback === "function") {
        idleId = window.requestIdleCallback(run, { timeout: 650 });
      } else {
        fallbackTimer = window.setTimeout(run, 12);
      }
    };

    fallbackTimer = window.setTimeout(scheduleNext, 360);

    return () => {
      cancelled = true;
      if (frameId != null) window.cancelAnimationFrame(frameId);
      if (startTimer != null) window.clearTimeout(startTimer);
      if (idleId != null && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }
      if (fallbackTimer != null) window.clearTimeout(fallbackTimer);
    };
  }, [bootstrapRadius, playerRef, seed]);

  // Streaming is independent from the simulation frame loop. When configured,
  // it keeps filling the render/preload radius while menus are open or pointer
  // lock is temporarily lost.
  useEffect(() => {
    const refreshDesiredChunks = () => {
      if (!seedRef.current || !playerRef.current) return;

      const player = playerRef.current;
      const centerX = worldToChunk(Number(player.x) || 0);
      const centerZ = worldToChunk(Number(player.z) || 0);
      const settings = profileRef.current;
      const baseRadius = enabledRef.current
        ? Math.max(2, Number(settings.renderDistance) || 2)
        : bootstrapRadiusRef.current;
      const preloadRadius = enabledRef.current
        ? Math.max(0, Number(settings.chunkPreloadRadius) || 0)
        : 0;
      const generationRadius = Math.min(19, baseRadius + preloadRadius);
      const unloadRadius = generationRadius + Math.max(1, Number(settings.chunkUnloadMargin) || 1);
      const centerKey = `${centerX},${centerZ}:${enabledRef.current ? "stream" : "bootstrap"}:${generationRadius}:${unloadRadius}`;
      if (centerKey === lastCenterRef.current) return;
      lastCenterRef.current = centerKey;

      const centerId = `${centerX},${centerZ}`;
      if (!enabledRef.current && generationRadius === 0 && worldRuntime.isChunkLoaded(centerId)) {
        queueRef.current = [];
        queuedRef.current.clear();
        desiredRef.current = new Set(worldRuntime.getLoadedChunkIds());
        return;
      }

      const generationRadiusSquared = (generationRadius + 0.45) ** 2;
      const desired = getChunkIdsAround(player.x, player.z, generationRadius).filter(
        (id) => chunkDistanceSquaredFrom(id, centerX, centerZ) <= generationRadiusSquared
      );
      const desiredSet = new Set(desired);
      desiredRef.current = desiredSet;

      // Keep the current 3×3 collision ring resident even during aggressive
      // unload passes. It moves with the player rather than pinning spawn forever.
      worldRuntime.setPinnedChunks(getChunkIdsAround(player.x, player.z, 1));

      queueRef.current = queueRef.current.filter((id) => desiredSet.has(id));
      queuedRef.current = new Set(queueRef.current);
      pendingApplyRef.current = pendingApplyRef.current.filter((chunk) => {
        if (desiredSet.has(chunk.id)) return true;
        pendingApplyIdsRef.current.delete(chunk.id);
        return false;
      });
      desired.forEach((id) => {
        if (!worldRuntime.isChunkLoaded(id)
          && !queuedRef.current.has(id)
          && !inFlightRef.current.has(id)
          && !pendingApplyIdsRef.current.has(id)) {
          queuedRef.current.add(id);
          queueRef.current.push(id);
        }
      });

      // Preserve a hysteresis ring so walking across chunk edges does not unload
      // and rebuild the same terrain every few frames.
      if (enabledRef.current) {
        const unloadRadiusSquared = (unloadRadius + 0.45) ** 2;
        const unloadIds = worldRuntime.getLoadedChunkIds().filter(
          (id) => chunkDistanceSquaredFrom(id, centerX, centerZ) > unloadRadiusSquared
        );
        if (unloadIds.length) worldRuntime.unloadChunks(unloadIds);
      }
    };

    refreshDesiredChunks();
    const interval = window.setInterval(refreshDesiredChunks, 120);
    return () => window.clearInterval(interval);
  }, [playerRef]);

  // Worker completions are deliberately committed through a small animation-
  // frame budget instead of all at once. This keeps React/Three chunk mounting
  // from producing multi-chunk main-thread spikes while the player is moving.
  useEffect(() => {
    let cancelled = false;
    let frameId = null;

    const flushApplyQueue = () => {
      if (cancelled) return;
      const startedAt = performance.now();
      let applied = 0;
      while (pendingApplyRef.current.length && applied < 2) {
        const chunk = pendingApplyRef.current.shift();
        pendingApplyIdsRef.current.delete(chunk.id);
        if (desiredRef.current.has(chunk.id) && !worldRuntime.isChunkLoaded(chunk.id)) {
          worldRuntime.applyChunk(chunk);
          applied += 1;
        }
        if (applied > 0 && performance.now() - startedAt >= 4) break;
      }
      frameId = window.requestAnimationFrame(flushApplyQueue);
    };

    frameId = window.requestAnimationFrame(flushApplyQueue);
    return () => {
      cancelled = true;
      if (frameId != null) window.cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer = null;

    const startJob = (worker, id) => {
      queuedRef.current.delete(id);
      if (!desiredRef.current.has(id) || worldRuntime.isChunkLoaded(id)) return;
      inFlightRef.current.add(id);
      const [cx, cz] = parseChunkId(id);
      worker.generate(seedRef.current, cx, cz)
        .then((chunk) => {
          if (!cancelled
            && desiredRef.current.has(id)
            && !worldRuntime.isChunkLoaded(id)
            && !pendingApplyIdsRef.current.has(id)) {
            pendingApplyIdsRef.current.add(id);
            pendingApplyRef.current.push(chunk);
            retriesRef.current.delete(id);
          }
        })
        .catch((error) => {
          if (cancelled || error?.message === "Chunk worker disposed") return;
          const attempts = (retriesRef.current.get(id) || 0) + 1;
          retriesRef.current.set(id, attempts);
          console.error(`Chunk generation failed for ${id} (attempt ${attempts})`, error);
          if (attempts < 3 && desiredRef.current.has(id) && !worldRuntime.isChunkLoaded(id)) {
            if (!queuedRef.current.has(id)) {
              queuedRef.current.add(id);
              queueRef.current.unshift(id);
            }
          } else {
            onStreamErrorRef.current?.(`Terrain chunk ${id} failed to generate after ${attempts} attempts.`);
          }
        })
        .finally(() => {
          inFlightRef.current.delete(id);
          worker.__voxelBusy = false;
        });
    };

    const pump = () => {
      if (cancelled) return;
      if (seedRef.current && queueRef.current.length) {
        workersRef.current.forEach((worker) => {
          if (worker.__voxelBusy || !queueRef.current.length) return;
          let id = queueRef.current.shift();
          while (id && (worldRuntime.isChunkLoaded(id) || !desiredRef.current.has(id))) {
            queuedRef.current.delete(id);
            id = queueRef.current.shift();
          }
          if (!id) return;
          worker.__voxelBusy = true;
          startJob(worker, id);
        });
      }
      timer = window.setTimeout(pump, queueRef.current.length ? 18 : 70);
    };

    pump();
    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
    };
  }, [profile.chunkGenerationConcurrency]);

  return null;
}
