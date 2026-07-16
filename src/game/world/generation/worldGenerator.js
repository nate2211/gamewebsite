import { createNoise2D, createNoise3D } from "simplex-noise";
import { EMPTY_ARMOR } from "../../config/armor";
import { DEFAULT_PROGRESSION } from "../../config/progression";
import seedrandom from "seedrandom";
import { BLOCK_TYPES, DEFAULT_HOTBAR, INITIAL_INVENTORY } from "../../config/blockTypes";
import { createMob } from "../../config/mobTypes";
import { DIRECTIONS, blockKey } from "../../utils/worldUtils";
import { buildConnectedCoastalFloodMask } from "../../liquids/coastalFlood";

export const CHUNK_SIZE = 10;
export const RENDER_DISTANCE = 3;
// Keep startup fast. The remaining chunks stream during browser idle time.
export const INITIAL_RENDER_DISTANCE = 1;
export const SEA_LEVEL = 8;
export const TERRAIN_GENERATOR_VERSION = 14;
export const COASTAL_FLOOD_MARGIN = 18;
// 1,200 ticks maps to about 7:12 AM in the HUD.
export const WORLD_START_TIME = 1200;
export const BIOME_NAMES = [
  "ocean",
  "ice",
  "beach",
  "jungle",
  "forest",
  "plains",
  "hills",
  "mountains",
];

const generatorCache = new Map();

function stringHash(value) {
  let hash = 2166136261;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function coordinateRandom(seedText, x, z, salt = 0) {
  const seedHash = typeof seedText === "number" ? seedText : stringHash(seedText);
  let value =
    seedHash ^
    Math.imul(x | 0, 374761393) ^
    Math.imul(z | 0, 668265263) ^
    Math.imul(salt | 0, 2246822519);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  value ^= value >>> 16;
  return (value >>> 0) / 4294967296;
}

function getGenerator(seedText) {
  const seed = String(seedText || "frontier");
  if (generatorCache.has(seed)) return generatorCache.get(seed);

  const random = seedrandom(seed);
  const generator = {
    seed,
    seedHash: stringHash(seed),
    terrainNoise: createNoise2D(random),
    detailNoise: createNoise2D(random),
    temperatureNoise: createNoise2D(random),
    moistureNoise: createNoise2D(random),
    continentalNoise: createNoise2D(random),
    ridgeNoise: createNoise2D(random),
    biomeNoise: createNoise2D(random),
    caveNoise: createNoise3D(random),
    coalNoise: createNoise3D(random),
    copperNoise: createNoise3D(random),
    ironNoise: createNoise3D(random),
    goldNoise: createNoise3D(random),
    redstoneNoise: createNoise3D(random),
    emeraldNoise: createNoise3D(random),
    diamondNoise: createNoise3D(random),
  };
  generatorCache.set(seed, generator);
  return generator;
}

export function chunkId(cx, cz) {
  return `${cx},${cz}`;
}

export function parseChunkId(id) {
  return String(id).split(",").map(Number);
}

export function worldToChunk(value) {
  return Math.floor(value / CHUNK_SIZE);
}

export function getChunkIdForPosition(x, z) {
  return chunkId(worldToChunk(x), worldToChunk(z));
}

export function getChunkIdsAround(x, z, radius = RENDER_DISTANCE) {
  const centerX = worldToChunk(x);
  const centerZ = worldToChunk(z);
  const ids = [];
  for (let distance = 0; distance <= radius * 2; distance += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dz = -radius; dz <= radius; dz += 1) {
        if (Math.abs(dx) + Math.abs(dz) !== distance) continue;
        ids.push(chunkId(centerX + dx, centerZ + dz));
      }
    }
  }
  return ids;
}

function chooseBiome(generator, x, z) {
  // A safe and bright plains spawn remains guaranteed.
  if (Math.abs(x) < 18 && Math.abs(z) < 18) return "plains";

  const temperature = generator.temperatureNoise((x - 900) / 150, (z + 600) / 150);
  const moisture = generator.moistureNoise((x + 300) / 135, (z - 700) / 135);
  const continental = generator.continentalNoise((x - 150) / 190, (z + 260) / 190);
  const ridge = 1 - Math.abs(generator.ridgeNoise((x + 60) / 82, (z - 90) / 82));
  const selector = generator.biomeNoise((x + 410) / 230, (z - 330) / 230);

  if (continental < -0.52) return temperature < -0.28 ? "ice" : "ocean";
  if (continental < -0.34) return "beach";
  if (temperature < -0.38 || (temperature < -0.2 && selector < -0.1)) return "ice";
  if (ridge > 0.73 && continental > -0.1) return "mountains";
  if (ridge > 0.48 || selector > 0.72) return "hills";
  if (temperature > 0.28 && moisture > 0.22) return "jungle";
  if (moisture > 0.12 || selector > 0.18) return "forest";
  return "plains";
}

export function sampleBiome(seedText, x, z) {
  return chooseBiome(getGenerator(seedText), x, z);
}

function biomeHeight(generator, biome, x, z) {
  const broad = generator.terrainNoise(x / 64, z / 64);
  const detail = generator.detailNoise((x + 240) / 21, (z - 180) / 21);
  const ridge = 1 - Math.abs(generator.ridgeNoise((x + 60) / 47, (z - 90) / 47));
  let height;

  switch (biome) {
    case "ocean":
      height = SEA_LEVEL - 5 + broad * 1.8 + detail * 0.9;
      break;
    case "mountains":
      height = 14 + Math.abs(broad) * 9 + Math.max(0, ridge - 0.35) * 21 + detail * 2.8;
      break;
    case "hills":
      height = 10 + broad * 4.2 + Math.max(0, ridge - 0.2) * 7 + detail * 2;
      break;
    case "jungle":
      height = 10 + broad * 3 + detail * 1.8;
      break;
    case "forest":
      height = 9.5 + broad * 2.8 + detail * 1.6;
      break;
    case "ice":
      height = 8.5 + broad * 2.7 + detail * 1.3;
      break;
    case "beach":
      height = SEA_LEVEL + broad * 1.15 + detail * 0.65;
      break;
    default:
      height = 8.7 + broad * 2 + detail * 1.2;
  }

  return Math.max(2, Math.min(38, Math.floor(height)));
}

export function sampleSurfaceHeight(seedText, x, z) {
  const generator = getGenerator(seedText);
  const biome = chooseBiome(generator, x, z);
  return biomeHeight(generator, biome, x, z);
}

export function sampleSurfaceProfile(seedText, x, z) {
  const generator = getGenerator(seedText);
  const biome = chooseBiome(generator, x, z);
  return {
    biome,
    height: biomeHeight(generator, biome, x, z),
    waterLevel: biome === "ocean" ? SEA_LEVEL : null,
  };
}

function surfaceProfileKey(x, z) {
  return `${x},${z}`;
}

function buildCoastalFloodMask(generator, minX, maxX, minZ, maxZ) {
  return buildConnectedCoastalFloodMask({
    minX,
    maxX,
    minZ,
    maxZ,
    margin: COASTAL_FLOOD_MARGIN,
    seaLevel: SEA_LEVEL,
    profileAt: (x, z) => {
      const biome = chooseBiome(generator, x, z);
      return { biome, height: biomeHeight(generator, biome, x, z) };
    },
  });
}

function surfaceBlocksForBiome(generator, biome, x, z, height) {
  if (biome === "ocean") return ["sand", "sand", "sandstone"];
  if (biome === "beach") return ["sand", "sand", "sandstone"];
  if (biome === "ice") {
    const patch = generator.detailNoise((x + 40) / 6, (z - 40) / 6) > -0.12;
    if (height <= SEA_LEVEL + 1 && patch) return ["ice", "snow", "dirt"];
    return ["snow", "frozen_grass", "dirt"];
  }
  if (biome === "mountains" && height > 25) return ["snow", "stone", "stone"];
  return ["grass", "dirt", "dirt"];
}

function setBlock(blocks, minX, maxX, minZ, maxZ, x, y, z, type) {
  if (x < minX || x > maxX || z < minZ || z > maxZ) return;
  blocks[blockKey(x, y, z)] = { type };
}

function addBroadleafTree(blocks, bounds, generator, x, groundY, z, jungle = false) {
  const randomHeight = coordinateRandom(generator.seedHash, x, z, jungle ? 811 : 409);
  const trunk = jungle ? "jungle_wood" : "wood";
  const leaves = jungle ? "jungle_leaves" : "leaves";
  const trunkHeight = (jungle ? 6 : 4) + Math.floor(randomHeight * (jungle ? 5 : 3));

  for (let y = 1; y <= trunkHeight; y += 1) setBlock(blocks, ...bounds, x, groundY + y, z, trunk);

  const centerY = groundY + trunkHeight;
  const radius = jungle ? 3 : 2;
  for (let dx = -radius; dx <= radius; dx += 1) {
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dz = -radius; dz <= radius; dz += 1) {
        const normalized = Math.abs(dx) / radius + Math.abs(dz) / radius + Math.abs(dy) / 2;
        const trim = coordinateRandom(generator.seedHash, x + dx, z + dz, 913 + dy * 17);
        if (normalized > 2.15 || (normalized > 1.72 && trim < 0.32)) continue;
        if (dx === 0 && dz === 0 && dy <= 0) continue;
        const key = blockKey(x + dx, centerY + dy, z + dz);
        if (!blocks[key]) setBlock(blocks, ...bounds, x + dx, centerY + dy, z + dz, leaves);
      }
    }
  }

  // Jungle trees carry deterministic hanging vines. Vines are non-solid and
  // extend downward until they meet terrain or their seeded length expires.
  if (jungle) {
    const vineSides = [[radius + 1, 0], [-radius - 1, 0], [0, radius + 1], [0, -radius - 1]];
    vineSides.forEach(([vx, vz], sideIndex) => {
      if (coordinateRandom(generator.seedHash, x + vx, z + vz, 3201 + sideIndex) < 0.34) return;
      const length = 2 + Math.floor(coordinateRandom(generator.seedHash, x + vx, z + vz, 3249 + sideIndex) * 6);
      for (let step = 0; step < length; step += 1) {
        const vy = centerY + 1 - step;
        const key = blockKey(x + vx, vy, z + vz);
        if (blocks[key]) break;
        setBlock(blocks, ...bounds, x + vx, vy, z + vz, "vine");
      }
    });
  }
}

function addSpruceTree(blocks, bounds, generator, x, groundY, z) {
  const trunkHeight = 6 + Math.floor(coordinateRandom(generator.seedHash, x, z, 617) * 4);
  for (let y = 1; y <= trunkHeight; y += 1) setBlock(blocks, ...bounds, x, groundY + y, z, "spruce_wood");

  const top = groundY + trunkHeight;
  for (let layer = 0; layer < 6; layer += 1) {
    const y = top - layer + 1;
    const radius = Math.max(1, Math.floor((layer + 1) / 2));
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dz = -radius; dz <= radius; dz += 1) {
        if (Math.abs(dx) + Math.abs(dz) > radius + 1) continue;
        setBlock(blocks, ...bounds, x + dx, y, z + dz, "spruce_leaves");
      }
    }
  }
}

function treeChance(biome) {
  if (biome === "jungle") return 0.105;
  if (biome === "forest") return 0.058;
  if (biome === "ice") return 0.025;
  if (biome === "plains") return 0.007;
  if (biome === "hills") return 0.012;
  return 0;
}

function computeChunkVisibleByType(blocks) {
  const byType = {};
  Object.entries(blocks).forEach(([key, current]) => {
    const definition = BLOCK_TYPES[current.type];
    if (!definition) return;
    const [x, y, z] = key.split(",").map(Number);
    const exposed = current.type === "water"
      ? [[0, 1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]]
          .some(([dx, dy, dz]) => blocks[blockKey(x + dx, y + dy, z + dz)]?.type !== "water")
      : definition.solid === false || DIRECTIONS.some(([dx, dy, dz]) => {
          const neighbor = blocks[blockKey(x + dx, y + dy, z + dz)];
          if (!neighbor) return true;
          if (neighbor.type === current.type && definition.transparent) return false;
          const neighborDefinition = BLOCK_TYPES[neighbor.type];
          return neighborDefinition?.transparent || neighborDefinition?.solid === false;
        });
    if (!exposed) return;
    if (!byType[current.type]) byType[current.type] = [];
    byType[current.type].push([x, y, z]);
  });
  return byType;
}

export function generateChunk(seedText, cx, cz) {
  const generator = getGenerator(seedText);
  const id = chunkId(cx, cz);
  const minX = cx * CHUNK_SIZE;
  const minZ = cz * CHUNK_SIZE;
  const maxX = minX + CHUNK_SIZE - 1;
  const maxZ = minZ + CHUNK_SIZE - 1;
  const bounds = [minX, maxX, minZ, maxZ];
  const blocks = {};
  const biomes = {};
  const coastalFlood = buildCoastalFloodMask(generator, minX, maxX, minZ, maxZ);

  for (let x = minX; x <= maxX; x += 1) {
    for (let z = minZ; z <= maxZ; z += 1) {
      const profileKey = surfaceProfileKey(x, z);
      const cachedProfile = coastalFlood.profiles.get(profileKey);
      const biome = cachedProfile?.biome || chooseBiome(generator, x, z);
      const height = cachedProfile?.height ?? biomeHeight(generator, biome, x, z);
      const seaConnected = coastalFlood.flooded.has(profileKey);
      biomes[`${x},${z}`] = biome;
      const surface = seaConnected && biome !== "ice"
        ? ["sand", "sand", "sandstone"]
        : surfaceBlocksForBiome(generator, biome, x, z, height);

      for (let y = 0; y <= height; y += 1) {
        let type = "stone";
        if (y === 0) type = "bedrock";
        else {
          const deepEnoughForCave = y > 2 && y < height - 3;
          const caveThreshold = biome === "mountains" ? 0.59 : 0.65;
          const caveValue = generator.caveNoise(x / 10.5, y / 8.5, z / 10.5);
          if (deepEnoughForCave && caveValue > caveThreshold) continue;

          if (y === height) type = surface[0];
          else if (y === height - 1) type = surface[1];
          else if (y >= height - 3) type = surface[2];
          else if (y <= 5 && generator.diamondNoise((x - 90) / 5, y / 5, (z + 70) / 5) > 0.79) type = "diamond_ore";
          else if (biome === "mountains" && y <= 20 && generator.emeraldNoise((x + 180) / 5, y / 5, (z - 170) / 5) > 0.805) type = "emerald_ore";
          else if (y <= 8 && generator.redstoneNoise((x + 140) / 5, y / 5, (z + 160) / 5) > 0.77) type = "redstone_ore";
          else if (y <= 11 && generator.goldNoise((x - 80) / 6, y / 6, (z - 120) / 6) > 0.765) type = "gold_ore";
          else if (y <= 17 && generator.ironNoise((x + 25) / 6, y / 6, (z - 25) / 6) > 0.72) type = "iron_ore";
          else if (y <= 21 && generator.copperNoise((x - 45) / 7, y / 7, (z + 35) / 7) > 0.7) type = "copper_ore";
          else if (generator.coalNoise((x + 50) / 7, y / 7, (z - 50) / 7) > 0.68) type = "coal_ore";
        }
        blocks[blockKey(x, y, z)] = { type };
      }

      if (seaConnected) {
        for (let y = height + 1; y <= SEA_LEVEL; y += 1) blocks[blockKey(x, y, z)] = { type: "water" };
        const plantRoll = coordinateRandom(generator.seedHash, x, z, 1703);
        const waterDepth = SEA_LEVEL - height;
        if (waterDepth >= 2 && plantRoll > 0.79) {
          blocks[blockKey(x, height + 1, z)] = { type: plantRoll > 0.94 ? "kelp" : "seagrass" };
          if (plantRoll > 0.96 && height + 2 < SEA_LEVEL) blocks[blockKey(x, height + 2, z)] = { type: "kelp" };
        }
      }
      if (!seaConnected && ["plains", "forest", "jungle", "hills", "beach"].includes(biome)) {
        const plantRoll = coordinateRandom(generator.seedHash, x, z, 2609);
        const plantKey = blockKey(x, height + 1, z);
        const groundType = blocks[blockKey(x, height, z)]?.type;
        if (biome === "beach" && height <= SEA_LEVEL + 1 && plantRoll > 0.94) {
          blocks[plantKey] = { type: "reeds" };
        } else if (groundType === "grass") {
          // Ground foliage is always a separate walk-through plant block above
          // the grass cube. This keeps the grass top static and prevents the old
          // colored slab artifacts from appearing inside the terrain surface.
          if (plantRoll > 0.955) blocks[plantKey] = { type: "yellow_flower_2" };
          else if (plantRoll > 0.7) blocks[plantKey] = { type: "meadow_grass_2" };
        }
      }
      if (!seaConnected && biome === "ice" && blocks[blockKey(x, height, z)]?.type === "snow") {
        const layerRoll = coordinateRandom(generator.seedHash, x, z, 2819);
        if (layerRoll > 0.43) blocks[blockKey(x, height + 1, z)] = { type: "snow_layer" };
      }
      // Jungle cliff faces can also trail vines away from trees.
      if (!seaConnected && biome === "jungle" && coordinateRandom(generator.seedHash, x, z, 2927) > 0.965) {
        const neighborHeight = biomeHeight(generator, biome, x + 1, z);
        const drop = height - neighborHeight;
        if (drop >= 3) {
          const length = Math.min(7, drop - 1);
          for (let step = 1; step <= length; step += 1) {
            const vineKey = blockKey(x + 1, height - step + 1, z);
            if (!blocks[vineKey]) blocks[vineKey] = { type: "vine" };
          }
        }
      }
    }
  }

  // Generate roots with a margin, then clip the tree into this chunk.
  for (let x = minX - 4; x <= maxX + 4; x += 1) {
    for (let z = minZ - 4; z <= maxZ + 4; z += 1) {
      if (Math.abs(x) < 7 && Math.abs(z) < 7) continue;
      const biome = chooseBiome(generator, x, z);
      const chance = treeChance(biome);
      if (chance <= 0 || coordinateRandom(generator.seedHash, x, z, 101) > chance) continue;
      const neighborGate = coordinateRandom(generator.seedHash, Math.floor(x / 3), Math.floor(z / 3), 233);
      if (neighborGate < 0.42) continue;
      const groundY = biomeHeight(generator, biome, x, z);
      if (biome === "ice") addSpruceTree(blocks, bounds, generator, x, groundY, z);
      else addBroadleafTree(blocks, bounds, generator, x, groundY, z, biome === "jungle");
    }
  }

  return { id, cx, cz, blocks, biomes, visibleByType: computeChunkVisibleByType(blocks) };
}

function findBiomePosition(seed, wantedBiomes, random, minRadius = 8, maxRadius = 140) {
  for (let attempt = 0; attempt < 180; attempt += 1) {
    const angle = random() * Math.PI * 2;
    const distance = minRadius + random() * (maxRadius - minRadius);
    const x = Math.round(Math.cos(angle) * distance);
    const z = Math.round(Math.sin(angle) * distance);
    const profile = sampleSurfaceProfile(seed, x, z);
    if (wantedBiomes.includes(profile.biome)) return { x, z, ...profile };
  }
  return null;
}

function createInitialMobs(seedText) {
  const random = seedrandom(`${seedText}:creatures-v2`);
  const mobs = [];
  const add = (type, position, yOffset = 0.55) => {
    if (!position) return;
    const y = position.biome === "ocean" ? SEA_LEVEL - 1.2 + (random() - 0.5) * 2.5 : position.height + yOffset;
    mobs.push(createMob(`${type}-${mobs.length}-${Math.floor(random() * 1e9)}`, type, position.x, y, position.z, random));
  };

  const landTypes = ["sheep", "cow", "pig", "chicken", "horse", "horse", "turtle"];
  for (let index = 0; index < 22; index += 1) {
    add(landTypes[index % landTypes.length], findBiomePosition(seedText, ["plains", "forest", "hills", "beach"], random));
  }
  ["wolf", "wolf", "iron_golem"].forEach((type) => add(type, findBiomePosition(seedText, ["plains", "forest"], random)));
  ["zombie", "skeleton", "spider", "slime", "zombie", "skeleton", "spider", "zombie", "skeleton"].forEach((type) =>
    add(type, findBiomePosition(seedText, ["plains", "forest", "hills", "mountains"], random, 14, 90))
  );
  ["fish", "fish", "fish", "big_fish", "shark", "dolphin", "dolphin", "turtle"].forEach((type) =>
    add(type, findBiomePosition(seedText, ["ocean"], random, 22, 180), type === "turtle" ? 0.5 : 0)
  );
  ["bird", "bird", "seagull", "seagull", "crow", "bird", "crow"].forEach((type) => {
    const position = findBiomePosition(seedText, ["plains", "forest", "jungle", "beach", "ocean"], random, 12, 100);
    if (position) {
      position.height = Math.max(position.height, SEA_LEVEL) + 8 + random() * 8;
      add(type, { ...position, biome: "sky" }, 0);
      mobs[mobs.length - 1].y = position.height;
    }
  });
  return mobs;
}

export function generateLoadedRegion(seedText, centerX, centerZ, radius = INITIAL_RENDER_DISTANCE, blockEdits = {}) {
  const seed = String(seedText || "frontier");
  const blocks = {};
  const biomes = {};
  const loadedChunks = {};
  getChunkIdsAround(centerX, centerZ, radius).forEach((id) => {
    const [cx, cz] = parseChunkId(id);
    const chunk = generateChunk(seed, cx, cz);
    Object.entries(chunk.blocks).forEach(([key, value]) => {
      if (Object.prototype.hasOwnProperty.call(blockEdits, key) && blockEdits[key] == null) return;
      const edit = blockEdits[key];
      blocks[key] = { type: edit?.type || value.type, chunk: id };
    });
    Object.entries(blockEdits).forEach(([key, edit]) => {
      if (!edit) return;
      const [x, , z] = key.split(",").map(Number);
      if (getChunkIdForPosition(x, z) === id) blocks[key] = { type: edit.type, chunk: id };
    });
    Object.assign(biomes, chunk.biomes);
    loadedChunks[id] = true;
  });
  return { blocks, biomes, loadedChunks };
}

export function generateWorld(seedText = "frontier") {
  const seed = String(seedText || "frontier");
  const spawnGround = sampleSurfaceHeight(seed, 0, 0);
  const spawn = { x: 0, y: spawnGround + 0.52, z: 0 };

  // Terrain is generated after navigation by a dedicated Web Worker. World
  // creation therefore stays responsive and never blocks the menu thread.
  return {
    blocks: {},
    biomes: {},
    loadedChunks: {},
    blockEdits: {},
    inventory: { ...INITIAL_INVENTORY },
    toolDurability: {},
    armor: { ...EMPTY_ARMOR },
    armorDurability: {},
    progression: { ...DEFAULT_PROGRESSION, stats: { ...DEFAULT_PROGRESSION.stats } },
    levelUpEvent: 0,
    hotbar: [...DEFAULT_HOTBAR],
    selectedIndex: 0,
    player: { ...spawn },
    spawn,
    health: 20,
    hunger: 20,
    deaths: 0,
    worldTime: WORLD_START_TIME,
    mobs: createInitialMobs(seed),
    mount: null,
    furnaces: {},
    colony: { stations: [], storage: {}, crops: [], totals: { blocksMined: 0, cropsHarvested: 0, animalsManaged: 0, fishCaught: 0, hostilesStopped: 0 } },
    crops: [],
    droppedItems: [],
    fishing: { active: false, bite: false, message: "", caught: 0 },
    weather: { type: "clear", intensity: 0, startedAt: 0, endsAt: 0 },
    liquids: [],
  };
}
