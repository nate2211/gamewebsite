import {
  generateChunk,
  getChunkIdsAround,
  parseChunkId,
} from "../generation/worldGenerator";
import { worldRuntime } from "../../core/worldRuntime";

export const CREATE_WORLD_BOOTSTRAP_RADIUS = 1;

function nextBrowserFrame() {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });
}

function isUsableChunk(chunk, expectedId) {
  if (!chunk || chunk.id !== expectedId) return false;
  if (!chunk.blocks || typeof chunk.blocks !== "object") return false;
  if (!chunk.visibleByType || typeof chunk.visibleByType !== "object") return false;
  return Object.keys(chunk.blocks).length > 0;
}

export async function prepareBootstrapChunks({
  seed,
  position,
  radius = CREATE_WORLD_BOOTSTRAP_RADIUS,
  storedChunks = [],
  onProgress,
  yieldBetweenChunks = true,
} = {}) {
  const safeSeed = String(seed || "frontier");
  const safePosition = position || { x: 0, z: 0 };
  const ids = getChunkIdsAround(
    Number(safePosition.x) || 0,
    Number(safePosition.z) || 0,
    Math.max(0, Number(radius) || 0)
  );
  const storedById = new Map(
    (Array.isArray(storedChunks) ? storedChunks : [])
      .filter((chunk) => chunk?.id)
      .map((chunk) => [chunk.id, chunk])
  );
  const chunks = [];

  for (let index = 0; index < ids.length; index += 1) {
    const id = ids[index];
    let chunk = storedById.get(id);
    if (!isUsableChunk(chunk, id)) {
      const [cx, cz] = parseChunkId(id);
      chunk = generateChunk(safeSeed, cx, cz);
    }
    if (!isUsableChunk(chunk, id)) {
      throw new Error(`Bootstrap chunk ${id} did not contain renderable voxel data.`);
    }
    chunks.push(chunk);
    onProgress?.({ completed: index + 1, total: ids.length, chunkId: id });
    if (yieldBetweenChunks && index < ids.length - 1) await nextBrowserFrame();
  }

  return chunks;
}

export function applyBootstrapChunks(chunks) {
  let applied = 0;
  (Array.isArray(chunks) ? chunks : []).forEach((chunk) => {
    if (worldRuntime.applyChunk(chunk) || worldRuntime.isChunkLoaded(chunk?.id)) applied += 1;
  });
  return applied;
}

export function stripBootstrapChunksForStorage(chunks) {
  return (Array.isArray(chunks) ? chunks : []).map((chunk) => ({
    id: chunk.id,
    cx: chunk.cx,
    cz: chunk.cz,
    blocks: chunk.blocks,
    biomes: chunk.biomes,
    visibleByType: chunk.visibleByType,
  }));
}
