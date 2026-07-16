import { BLOCK_TYPES } from "./blockTypes";

export const DIRECTIONS = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

export function blockKey(x, y, z) {
  return `${x},${y},${z}`;
}

export function parseBlockKey(key) {
  return key.split(",").map(Number);
}

export function hasSolidBlock(blocks, x, y, z) {
  const type = blocks[blockKey(x, y, z)]?.type;
  return Boolean(type && BLOCK_TYPES[type]?.solid !== false);
}

export function getVisibleBlocksByType(blocks) {
  const byType = {};

  Object.entries(blocks).forEach(([key, current]) => {
    const [x, y, z] = parseBlockKey(key);
    const definition = BLOCK_TYPES[current.type];
    if (!definition) return;

    const exposed = current.type === "water"
      ? blocks[blockKey(x, y + 1, z)]?.type !== "water"
      : definition.solid === false || DIRECTIONS.some(([dx, dy, dz]) => {
          const neighbor = blocks[blockKey(x + dx, y + dy, z + dz)];
          if (!neighbor) return true;
          if (neighbor.type === current.type && definition.transparent) return false;
          return BLOCK_TYPES[neighbor.type]?.transparent || BLOCK_TYPES[neighbor.type]?.solid === false;
        });

    if (!exposed) return;
    if (!byType[current.type]) byType[current.type] = [];
    byType[current.type].push([x, y, z]);
  });

  return byType;
}

export function createHeightMap(blocks) {
  const map = {};
  Object.entries(blocks).forEach(([key, current]) => {
    const definition = BLOCK_TYPES[current.type];
    if (!definition || definition.solid === false) return;
    if (["leaves", "spruce_leaves", "jungle_leaves", "wood", "spruce_wood", "jungle_wood"].includes(current.type)) return;
    const [x, y, z] = parseBlockKey(key);
    const columnKey = `${x},${z}`;
    if (map[columnKey] == null || y > map[columnKey]) map[columnKey] = y;
  });
  return map;
}
