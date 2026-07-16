import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import ChunkWorkerClient from "./chunkWorkerClient";
import { getPerformanceProfile } from "./performanceProfile";
import {
  getChunkIdForPosition,
  getChunkIdsAround,
  parseChunkId,
  worldToChunk,
} from "./worldGenerator";
import { worldRuntime } from "./worldRuntime";

function editsForChunk(blockEdits, id) {
  const result = {};
  Object.entries(blockEdits || {}).forEach(([key, edit]) => {
    const [x, , z] = key.split(",").map(Number);
    if (getChunkIdForPosition(x, z) === id) result[key] = edit;
  });
  return result;
}

export default function ChunkStreamer({ playerRef, enabled = true, onStreamError }) {
  const seed = useSelector((state) => state.world.seed);
  const seedRef = useRef(seed);
  const enabledRef = useRef(enabled);
  const queueRef = useRef([]);
  const queuedRef = useRef(new Set());
  const desiredRef = useRef(new Set());
  const inFlightRef = useRef(false);
  const lastCenterRef = useRef("");
  const workerRef = useRef(null);
  const profileRef = useRef(getPerformanceProfile());
  const retriesRef = useRef(new Map());
  const onStreamErrorRef = useRef(onStreamError);

  useEffect(() => {
    onStreamErrorRef.current = onStreamError;
  }, [onStreamError]);

  useEffect(() => {
    seedRef.current = seed;
    lastCenterRef.current = "";
    queueRef.current = [];
    queuedRef.current.clear();
    desiredRef.current.clear();
    retriesRef.current.clear();
  }, [seed]);

  useEffect(() => {
    enabledRef.current = enabled;
    lastCenterRef.current = "";
  }, [enabled]);

  useEffect(() => {
    workerRef.current = new ChunkWorkerClient();
    return () => {
      workerRef.current?.dispose();
      workerRef.current = null;
    };
  }, []);

  // Chunk streaming deliberately runs outside the render loop. This allows the
  // spawn chunk to load while the Canvas is in demand mode on pause/inventory,
  // and prevents camera frame rate from controlling terrain generation.
  useEffect(() => {
    const refreshDesiredChunks = () => {
      // Bootstrap terrain must load even while gameplay is paused. Requiring
      // `enabled` here creates a circular wait: Resume needs terrainReady, but
      // terrainReady cannot become true until a chunk is generated.
      if (!seedRef.current || !playerRef.current) return;

      const player = playerRef.current;
      const centerX = worldToChunk(player.x);
      const centerZ = worldToChunk(player.z);
      const centerKey = `${centerX},${centerZ}:${enabledRef.current ? "play" : "paused"}`;
      if (centerKey === lastCenterRef.current) return;
      lastCenterRef.current = centerKey;

      const centerId = `${centerX},${centerZ}`;
      if (!enabledRef.current && worldRuntime.isChunkLoaded(centerId)) {
        queueRef.current = [];
        queuedRef.current.clear();
        desiredRef.current = new Set(worldRuntime.getLoadedChunkIds());
        return;
      }

      // While paused before the first Resume, load only the spawn chunk. Once
      // gameplay starts, expand to the selected render distance. Inventory and
      // pause screens stop outer streaming so they remain responsive.
      const radius = enabledRef.current ? profileRef.current.renderDistance : 0;
      const desired = getChunkIdsAround(player.x, player.z, radius);
      const desiredSet = new Set(desired);
      desiredRef.current = desiredSet;

      queueRef.current = queueRef.current.filter((id) => desiredSet.has(id));
      queuedRef.current = new Set(queueRef.current);
      desired.forEach((id) => {
        if (!worldRuntime.isChunkLoaded(id) && !queuedRef.current.has(id)) {
          queuedRef.current.add(id);
          queueRef.current.push(id);
        }
      });

      if (enabledRef.current) {
        const unloadIds = worldRuntime.getLoadedChunkIds().filter((id) => {
          if (desiredSet.has(id)) return false;
          const [cx, cz] = parseChunkId(id);
          return Math.max(Math.abs(cx - centerX), Math.abs(cz - centerZ)) > radius;
        });
        if (unloadIds.length) worldRuntime.unloadChunks(unloadIds);
      }
    };

    refreshDesiredChunks();
    const interval = window.setInterval(refreshDesiredChunks, 160);
    return () => window.clearInterval(interval);
  }, [playerRef]);

  useEffect(() => {
    let cancelled = false;
    let timer = null;

    const pump = async () => {
      if (cancelled) return;
      if (
        seedRef.current &&
        !inFlightRef.current &&
        queueRef.current.length
      ) {
        const id = queueRef.current.shift();
        queuedRef.current.delete(id);
        if (desiredRef.current.has(id) && !worldRuntime.isChunkLoaded(id)) {
          if (!workerRef.current) {
            queueRef.current.unshift(id);
            queuedRef.current.add(id);
            timer = window.setTimeout(pump, 30);
            return;
          }
          inFlightRef.current = true;
          const [cx, cz] = parseChunkId(id);
          try {
            const chunk = await workerRef.current.generate(seedRef.current, cx, cz);
            if (!cancelled && desiredRef.current.has(id)) {
              worldRuntime.applyChunk(chunk, editsForChunk(worldRuntime.blockEdits, id));
              retriesRef.current.delete(id);
            }
          } catch (error) {
            if (!cancelled && error?.message !== "Chunk worker disposed") {
              const attempts = (retriesRef.current.get(id) || 0) + 1;
              retriesRef.current.set(id, attempts);
              console.error(`Chunk generation failed for ${id} (attempt ${attempts})`, error);

              if (attempts < 3 && desiredRef.current.has(id) && !worldRuntime.isChunkLoaded(id)) {
                if (!queuedRef.current.has(id)) {
                  queuedRef.current.add(id);
                  queueRef.current.unshift(id);
                }
              } else {
                onStreamErrorRef.current?.(
                  `Terrain chunk ${id} failed to generate after ${attempts} attempts.`
                );
              }
            }
          } finally {
            inFlightRef.current = false;
          }
        }
      }
      timer = window.setTimeout(pump, queueRef.current.length ? 8 : 45);
    };

    pump();
    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
    };
  }, []);

  return null;
}
