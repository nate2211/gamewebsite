import { SEA_LEVEL, getChunkIdForPosition, sampleSurfaceProfile } from "../world/generation/worldGenerator";

export const STREAMING_PLAYER_FOOT_OFFSET = 0.52;

export function createStreamingBoundarySampler(seed) {
  const cache = new Map();
  const safeSeed = String(seed || "frontier");

  const sample = (x, z) => {
    const columnX = Math.round(Number(x) || 0);
    const columnZ = Math.round(Number(z) || 0);
    const key = `${columnX},${columnZ}`;
    if (cache.has(key)) return cache.get(key);
    const profile = sampleSurfaceProfile(safeSeed, columnX, columnZ);
    const supportBlockY = profile.biome === "ocean"
      ? Math.max(profile.height, SEA_LEVEL)
      : profile.height;
    const result = Object.freeze({
      ...profile,
      x: columnX,
      z: columnZ,
      supportBlockY,
      standingY: supportBlockY + STREAMING_PLAYER_FOOT_OFFSET,
      chunkId: getChunkIdForPosition(columnX, columnZ),
    });
    cache.set(key, result);
    return result;
  };

  sample.clear = () => cache.clear();
  return sample;
}

export function touchesUnloadedChunk(worldRuntime, position, radius = 0.3) {
  const minX = Math.floor((Number(position?.x) || 0) - radius);
  const maxX = Math.ceil((Number(position?.x) || 0) + radius);
  const minZ = Math.floor((Number(position?.z) || 0) - radius);
  const maxZ = Math.ceil((Number(position?.z) || 0) + radius);
  for (let x = minX; x <= maxX; x += 1) {
    for (let z = minZ; z <= maxZ; z += 1) {
      if (!worldRuntime.isChunkLoaded(getChunkIdForPosition(x, z))) return true;
    }
  }
  return false;
}
