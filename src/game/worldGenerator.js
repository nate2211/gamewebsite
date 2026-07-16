import { createNoise2D, createNoise3D } from "simplex-noise";
import seedrandom from "seedrandom";
import { DEFAULT_HOTBAR, INITIAL_INVENTORY } from "./blockTypes";
import { createMob } from "./mobTypes";
import { blockKey } from "./worldUtils";

export const WORLD_RADIUS = 20;

function setBlock(blocks, x, y, z, type) {
  blocks[blockKey(x, y, z)] = { type };
}

function addTree(blocks, x, groundY, z, random) {
  const trunkHeight = 3 + Math.floor(random() * 3);

  for (let y = 1; y <= trunkHeight; y += 1) {
    setBlock(blocks, x, groundY + y, z, "wood");
  }

  const leafCenterY = groundY + trunkHeight;
  for (let dx = -2; dx <= 2; dx += 1) {
    for (let dy = -1; dy <= 2; dy += 1) {
      for (let dz = -2; dz <= 2; dz += 1) {
        const distance = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
        if (distance > 4) continue;
        if (dx === 0 && dz === 0 && dy <= 0) continue;

        const key = blockKey(x + dx, leafCenterY + dy, z + dz);
        if (!blocks[key]) blocks[key] = { type: "leaves" };
      }
    }
  }
}

function spawnMob(mobs, type, x, z, surfaceHeights, random) {
  const y = (surfaceHeights[`${x},${z}`] ?? 6) + 0.55;
  mobs.push(createMob(`${type}-${mobs.length}-${Math.floor(random() * 1e8)}`, type, x, y, z, random));
}

export function generateWorld(seedText = "frontier") {
  const seed = String(seedText || "frontier");
  const random = seedrandom(seed);
  const terrainNoise = createNoise2D(random);
  const detailNoise = createNoise2D(random);
  const caveNoise = createNoise3D(random);
  const coalNoise = createNoise3D(random);
  const ironNoise = createNoise3D(random);
  const diamondNoise = createNoise3D(random);
  const blocks = {};
  const surfaceHeights = {};

  for (let x = -WORLD_RADIUS; x < WORLD_RADIUS; x += 1) {
    for (let z = -WORLD_RADIUS; z < WORLD_RADIUS; z += 1) {
      const broad = terrainNoise(x / 48, z / 48) * 4.2;
      const detail = detailNoise((x + 200) / 15, (z - 200) / 15) * 2;
      const height = Math.max(4, Math.floor(8 + broad + detail));
      surfaceHeights[`${x},${z}`] = height;
      const sandy = height <= 6;

      for (let y = 0; y <= height; y += 1) {
        if (y === 0) {
          setBlock(blocks, x, y, z, "bedrock");
          continue;
        }

        const deepEnoughForCave = y > 1 && y < height - 2;
        if (deepEnoughForCave && caveNoise(x / 10, y / 8, z / 10) > 0.67) {
          continue;
        }

        let type = "stone";
        if (y === height) type = sandy ? "sand" : "grass";
        else if (y >= height - 2) type = sandy ? "sand" : "dirt";
        else if (y <= 4 && diamondNoise((x - 90) / 5, y / 5, (z + 70) / 5) > 0.79) {
          type = "diamond_ore";
        } else if (y <= 8 && ironNoise((x + 25) / 6, y / 6, (z - 25) / 6) > 0.73) {
          type = "iron_ore";
        } else if (coalNoise((x + 50) / 7, y / 7, (z - 50) / 7) > 0.69) {
          type = "coal_ore";
        }

        setBlock(blocks, x, y, z, type);
      }
    }
  }

  const trees = [];
  for (let x = -WORLD_RADIUS + 3; x < WORLD_RADIUS - 3; x += 1) {
    for (let z = -WORLD_RADIUS + 3; z < WORLD_RADIUS - 3; z += 1) {
      if (Math.abs(x) < 4 && Math.abs(z) < 4) continue;
      if (random() > 0.022) continue;

      const tooClose = trees.some(
        ([tx, tz]) => Math.abs(tx - x) < 4 && Math.abs(tz - z) < 4
      );
      if (tooClose) continue;

      const groundY = surfaceHeights[`${x},${z}`];
      if (blocks[blockKey(x, groundY, z)]?.type !== "grass") continue;

      addTree(blocks, x, groundY, z, random);
      trees.push([x, z]);
    }
  }

  const mobs = [];
  const passiveTypes = ["sheep", "cow", "pig"];
  for (let index = 0; index < 10; index += 1) {
    const x = Math.floor(random() * 30) - 15;
    const z = Math.floor(random() * 30) - 15;
    if (Math.abs(x) < 4 && Math.abs(z) < 4) continue;
    spawnMob(mobs, passiveTypes[index % passiveTypes.length], x, z, surfaceHeights, random);
  }
  for (let index = 0; index < 7; index += 1) {
    const x = Math.floor(random() * 34) - 17;
    const z = Math.floor(random() * 34) - 17;
    if (Math.abs(x) < 7 && Math.abs(z) < 7) continue;
    spawnMob(mobs, index % 3 === 0 ? "slime" : "zombie", x, z, surfaceHeights, random);
  }

  const spawnGround = surfaceHeights["0,0"] ?? 8;
  const spawn = { x: 0, y: spawnGround + 0.52, z: 0 };

  return {
    blocks,
    inventory: { ...INITIAL_INVENTORY },
    toolDurability: {},
    hotbar: [...DEFAULT_HOTBAR],
    selectedIndex: 0,
    player: { ...spawn },
    spawn,
    health: 20,
    hunger: 20,
    deaths: 0,
    worldTime: 5500,
    mobs,
  };
}
