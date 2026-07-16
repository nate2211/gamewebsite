import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useDispatch, useSelector } from "react-redux";
import { applyGeneratedChunk, unloadGeneratedChunks } from "../features/world/worldSlice";
import {
  RENDER_DISTANCE,
  generateChunk,
  getChunkIdsAround,
  parseChunkId,
  worldToChunk,
} from "./worldGenerator";

const GENERATION_INTERVAL_SECONDS = 0.12;

export default function ChunkStreamer({ playerRef, enabled = true }) {
  const dispatch = useDispatch();
  const seed = useSelector((state) => state.world.seed);
  const loadedChunks = useSelector((state) => state.world.loadedChunks);
  const loadedRef = useRef(loadedChunks);
  const queueRef = useRef([]);
  const queuedRef = useRef(new Set());
  const timerRef = useRef(0);
  const lastCenterRef = useRef("");

  useEffect(() => {
    loadedRef.current = loadedChunks;
  }, [loadedChunks]);

  useFrame((_, rawDelta) => {
    if (!enabled || !seed || !playerRef.current) return;
    const delta = Math.min(rawDelta, 0.05);
    const player = playerRef.current;
    const centerX = worldToChunk(player.x);
    const centerZ = worldToChunk(player.z);
    const centerKey = `${centerX},${centerZ}`;

    if (centerKey !== lastCenterRef.current) {
      lastCenterRef.current = centerKey;
      const desired = getChunkIdsAround(player.x, player.z, RENDER_DISTANCE);
      const desiredSet = new Set(desired);
      queueRef.current = queueRef.current.filter((id) => desiredSet.has(id));
      queuedRef.current = new Set(queueRef.current);
      const nextQueue = desired.filter(
        (id) => !loadedRef.current[id] && !queuedRef.current.has(id)
      );
      nextQueue.forEach((id) => queuedRef.current.add(id));
      queueRef.current.push(...nextQueue);

      const unloadIds = Object.keys(loadedRef.current).filter((id) => {
        if (desiredSet.has(id)) return false;
        const [cx, cz] = parseChunkId(id);
        return Math.max(Math.abs(cx - centerX), Math.abs(cz - centerZ)) > RENDER_DISTANCE;
      });
      if (unloadIds.length) dispatch(unloadGeneratedChunks(unloadIds));
    }

    timerRef.current += delta;
    if (timerRef.current < GENERATION_INTERVAL_SECONDS || queueRef.current.length === 0) return;
    timerRef.current = 0;

    const id = queueRef.current.shift();
    queuedRef.current.delete(id);
    if (loadedRef.current[id]) return;
    const [cx, cz] = parseChunkId(id);
    const chunk = generateChunk(seed, cx, cz);
    dispatch(applyGeneratedChunk(chunk));
  });

  return null;
}
