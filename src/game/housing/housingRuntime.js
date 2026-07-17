import { BLOCK_TYPES } from "../config/blockTypes";
import { worldRuntime } from "../core/worldRuntime";
import { parseBlockKey } from "../utils/worldUtils";

const MAX_RADIUS = 6;
const MAX_ROOM_CELLS = 180;
const LIGHT_BLOCKS = new Set(["torch", "wall_lantern", "arcane_lantern", "wardstone"]);
const DOOR_BLOCKS = new Set(["oak_door", "oak_door_ew", "oak_door_open", "oak_door_ew_open"]);

function isSolidAt(x, y, z) {
  const type = worldRuntime.getBlockTypeAt(x, y, z);
  return Boolean(type && BLOCK_TYPES[type]?.solid !== false);
}

function isWalkableAt(x, y, z) {
  const type = worldRuntime.getBlockTypeAt(x, y, z);
  return !type || BLOCK_TYPES[type]?.solid === false || type === "frontier_bed";
}

function nearestInteriorStart([bedX, bedY, bedZ]) {
  const candidates = [
    [bedX + 1, bedY, bedZ], [bedX - 1, bedY, bedZ],
    [bedX, bedY, bedZ + 1], [bedX, bedY, bedZ - 1],
    [bedX, bedY, bedZ],
  ];
  return candidates.find(([x, y, z]) => isWalkableAt(x, y, z) && isWalkableAt(x, y + 1, z)) || candidates[0];
}

export function analyzeHousingRoom(bedKey) {
  const position = typeof bedKey === "string" ? parseBlockKey(bedKey) : null;
  if (!position || position.length !== 3) {
    return { valid: false, reason: "The bed position is invalid.", position: [0, 0, 0] };
  }
  const [bedX, bedY, bedZ] = position.map(Number);
  const start = nearestInteriorStart([bedX, bedY, bedZ]);
  const queue = [start];
  const visited = new Set();
  let openBoundary = false;
  let floorCells = 0;
  let ceilingCells = 0;
  let doorCount = 0;
  let lightCount = 0;
  let chairCount = 0;
  let tableCount = 0;
  let minX = start[0]; let maxX = start[0]; let minZ = start[2]; let maxZ = start[2];

  while (queue.length && visited.size < MAX_ROOM_CELLS) {
    const [x, y, z] = queue.shift();
    const id = `${x},${y},${z}`;
    if (visited.has(id)) continue;
    if (Math.abs(x - bedX) > MAX_RADIUS || Math.abs(z - bedZ) > MAX_RADIUS) {
      openBoundary = true;
      continue;
    }
    if (!isWalkableAt(x, y, z) || !isWalkableAt(x, y + 1, z)) continue;
    visited.add(id);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
    if (isSolidAt(x, y - 1, z)) floorCells += 1;
    if ([y + 2, y + 3, y + 4].some((ceilingY) => isSolidAt(x, ceilingY, z))) ceilingCells += 1;

    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx; const nz = z + dz;
      const wallTypeLow = worldRuntime.getBlockTypeAt(nx, y, nz);
      const wallTypeHigh = worldRuntime.getBlockTypeAt(nx, y + 1, nz);
      const isDoorBoundary = DOOR_BLOCKS.has(wallTypeLow) || DOOR_BLOCKS.has(wallTypeHigh);
      if (isDoorBoundary) doorCount += 1;
      // An open door is traversable for the player but still defines a valid
      // housing boundary, just as it does in Minecraft-style room checks.
      if (!isDoorBoundary && isWalkableAt(nx, y, nz) && isWalkableAt(nx, y + 1, nz)) queue.push([nx, y, nz]);
    }
  }

  for (let x = bedX - MAX_RADIUS; x <= bedX + MAX_RADIUS; x += 1) {
    for (let y = bedY - 1; y <= bedY + 4; y += 1) {
      for (let z = bedZ - MAX_RADIUS; z <= bedZ + MAX_RADIUS; z += 1) {
        const type = worldRuntime.getBlockTypeAt(x, y, z);
        if (LIGHT_BLOCKS.has(type)) lightCount += 1;
        if (type === "oak_chair") chairCount += 1;
        if (type === "oak_table") tableCount += 1;
      }
    }
  }

  const cells = visited.size;
  const floorCoverage = cells ? floorCells / cells : 0;
  const ceilingCoverage = cells ? ceilingCells / cells : 0;
  const valid = cells >= 6
    && cells <= MAX_ROOM_CELLS
    && !openBoundary
    && floorCoverage >= 0.75
    && ceilingCoverage >= 0.68
    && doorCount > 0
    && lightCount > 0;
  let reason = "Room ready for a resident.";
  if (cells < 6) reason = "The room needs at least six walkable floor cells.";
  else if (openBoundary) reason = "The room is open to the outside. Finish the walls and door.";
  else if (floorCoverage < 0.75) reason = "The room needs a more complete solid floor.";
  else if (ceilingCoverage < 0.68) reason = "The room needs a roof over most of its interior.";
  else if (!doorCount) reason = "Add an oak door to the room.";
  else if (!lightCount) reason = "Add a torch, lantern, or arcane light.";

  return {
    valid,
    reason,
    position: [bedX, bedY, bedZ],
    cells,
    floorCoverage,
    ceilingCoverage,
    doorCount,
    lightCount,
    chairCount,
    tableCount,
    comfort: Math.min(100, Math.round(45 + chairCount * 12 + tableCount * 10 + lightCount * 6 + cells * 0.7)),
    bounds: { minX, maxX, minY: bedY, maxY: bedY + 4, minZ, maxZ },
  };
}
