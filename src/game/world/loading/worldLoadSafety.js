import { BLOCK_TYPES } from "../../config/blockTypes";
import { worldRuntime } from "../../core/worldRuntime";
import {
  SEA_LEVEL,
  getChunkIdsAround,
  sampleSurfaceProfile,
} from "../generation/worldGenerator";

export const LOAD_SAFETY_RADIUS = 1;
export const MAX_SAFE_WORLD_Y = 72;
const PLAYER_FOOT_OFFSET = 0.52;

function finiteOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function isSolidType(type) {
  return Boolean(type && BLOCK_TYPES[type]?.solid !== false);
}

function hasStandingHeadroom(x, supportY, z) {
  return !isSolidType(worldRuntime.getBlockTypeAt(x, supportY + 1, z))
    && !isSolidType(worldRuntime.getBlockTypeAt(x, supportY + 2, z));
}

function topWaterY(x, z) {
  for (let y = MAX_SAFE_WORLD_Y; y >= 0; y -= 1) {
    const type = worldRuntime.getBlockTypeAt(x, y, z);
    if (type === "water" && worldRuntime.getBlockTypeAt(x, y + 1, z) !== "water") return y;
  }
  return null;
}

function safeSupportYNear(x, z, requestedY) {
  const start = Math.min(MAX_SAFE_WORLD_Y, Math.max(0, Math.floor(requestedY)));
  const minimum = Math.max(0, start - 7);
  for (let y = start; y >= minimum; y -= 1) {
    if (isSolidType(worldRuntime.getBlockTypeAt(x, y, z)) && hasStandingHeadroom(x, y, z)) {
      return y;
    }
  }
  return null;
}

function highestSafeSupportY(x, z) {
  for (let y = MAX_SAFE_WORLD_Y; y >= 0; y -= 1) {
    if (isSolidType(worldRuntime.getBlockTypeAt(x, y, z)) && hasStandingHeadroom(x, y, z)) {
      return y;
    }
  }
  return null;
}

function candidateColumns(x, z, radius = 5) {
  const originX = Math.round(x);
  const originZ = Math.round(z);
  const result = [];
  for (let distance = 0; distance <= radius * 2; distance += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dz = -radius; dz <= radius; dz += 1) {
        if (Math.abs(dx) + Math.abs(dz) !== distance) continue;
        result.push([originX + dx, originZ + dz]);
      }
    }
  }
  return result;
}

export function normalizeSavedPlayer(rawPlayer, seed) {
  const source = rawPlayer || {};
  const x = finiteOr(source.x, 0);
  const z = finiteOr(source.z, 0);
  const profile = sampleSurfaceProfile(seed, x, z);
  const fallbackSurface = profile.biome === "ocean"
    ? Math.max(profile.height, SEA_LEVEL)
    : profile.height;
  let y = finiteOr(source.y, fallbackSurface + PLAYER_FOOT_OFFSET);
  if (y < -2 || y > MAX_SAFE_WORLD_Y + 10) y = fallbackSurface + PLAYER_FOOT_OFFSET;
  return { x, y, z };
}

export function getRequiredLoadChunkIds(position, radius = LOAD_SAFETY_RADIUS) {
  const player = position || { x: 0, z: 0 };
  return getChunkIdsAround(finiteOr(player.x, 0), finiteOr(player.z, 0), radius);
}

export function isLoadAreaReady(snapshot, position, radius = LOAD_SAFETY_RADIUS) {
  if (!snapshot || snapshot.blockCount <= 0) return false;
  const loaded = new Set((snapshot.chunks || []).map((chunk) => chunk.id));
  return getRequiredLoadChunkIds(position, radius).every((id) => loaded.has(id));
}

export function findSafeLoadedPlayerPosition(rawPosition, seed) {
  const requested = normalizeSavedPlayer(rawPosition, seed);
  const columns = candidateColumns(requested.x, requested.z, 5);

  // Prefer a floor close to the saved vertical position. This preserves cave,
  // tower, and interior saves instead of always teleporting to terrain height.
  for (const [columnX, columnZ] of columns) {
    const supportY = safeSupportYNear(columnX, columnZ, requested.y);
    if (supportY == null) continue;
    return {
      x: columnX === Math.round(requested.x) ? requested.x : columnX,
      y: supportY + PLAYER_FOOT_OFFSET,
      z: columnZ === Math.round(requested.z) ? requested.z : columnZ,
      recovered: Math.abs((supportY + PLAYER_FOOT_OFFSET) - requested.y) > 0.08
        || columnX !== Math.round(requested.x)
        || columnZ !== Math.round(requested.z),
    };
  }

  // If the save was in an ocean or water column, recover to its visible surface.
  for (const [columnX, columnZ] of columns) {
    const waterY = topWaterY(columnX, columnZ);
    if (waterY == null) continue;
    return {
      x: columnX,
      y: waterY + PLAYER_FOOT_OFFSET,
      z: columnZ,
      recovered: true,
    };
  }

  // Final runtime fallback: use the highest clear solid column nearby.
  for (const [columnX, columnZ] of columns) {
    const supportY = highestSafeSupportY(columnX, columnZ);
    if (supportY == null) continue;
    return {
      x: columnX,
      y: supportY + PLAYER_FOOT_OFFSET,
      z: columnZ,
      recovered: true,
    };
  }

  // Deterministic generator fallback. This is used only if runtime terrain was
  // malformed or all nearby surface blocks were removed by saved edits.
  const profile = sampleSurfaceProfile(seed, requested.x, requested.z);
  return {
    x: requested.x,
    y: (profile.biome === "ocean" ? Math.max(profile.height, SEA_LEVEL) : profile.height) + PLAYER_FOOT_OFFSET,
    z: requested.z,
    recovered: true,
  };
}
