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

export function hasBlock(blocks, x, y, z) {
  return Boolean(blocks[blockKey(x, y, z)]);
}

export function getVisibleBlocksByType(blocks) {
  const byType = {};

  Object.entries(blocks).forEach(([key, block]) => {
    const [x, y, z] = parseBlockKey(key);
    const exposed = DIRECTIONS.some(
      ([dx, dy, dz]) => !hasBlock(blocks, x + dx, y + dy, z + dz)
    );

    if (!exposed) return;
    if (!byType[block.type]) byType[block.type] = [];
    byType[block.type].push([x, y, z]);
  });

  return byType;
}

export function createHeightMap(blocks) {
  const map = {};
  Object.entries(blocks).forEach(([key, block]) => {
    if (block.type === "leaves" || block.type === "wood") return;
    const [x, y, z] = parseBlockKey(key);
    const columnKey = `${x},${z}`;
    if (map[columnKey] == null || y > map[columnKey]) map[columnKey] = y;
  });
  return map;
}

export function findHighestBlock(blocks, x, z) {
  let highest = -Infinity;

  Object.keys(blocks).forEach((key) => {
    const [bx, by, bz] = parseBlockKey(key);
    if (bx === x && bz === z && by > highest) highest = by;
  });

  return Number.isFinite(highest) ? highest : 0;
}
