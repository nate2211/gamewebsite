import { createNoise2D, createNoise3D } from "simplex-noise";
import { EMPTY_ARMOR } from "../../config/armor";
import { DEFAULT_PROGRESSION } from "../../config/progression";
import seedrandom from "seedrandom";
import { BLOCK_TYPES, DEFAULT_HOTBAR, INITIAL_INVENTORY } from "../../config/blockTypes";
import { createMob, MOB_TYPES } from "../../config/mobTypes";
import { DIRECTIONS, blockKey } from "../../utils/worldUtils";
import { buildConnectedCoastalFloodMask } from "../../liquids/coastalFlood";
import { getLandmarkCells, seededUnit, STRUCTURE_SPAWN_PROFILES, STRUCTURE_TREASURE_PROFILES, LANDMARK_MIN_DISTANCE } from "../../config/adventure";
import { getUndergroundSites, deepwildUnit } from "../../config/deepwild";
import { FACTIONS, FACTION_SETTLEMENT_TYPES } from "../../config/factions";

export const CHUNK_SIZE = 10;
export const RENDER_DISTANCE = 3;
// Keep startup fast. The remaining chunks stream during browser idle time.
export const INITIAL_RENDER_DISTANCE = 1;
export const SEA_LEVEL = 8;
export const TERRAIN_GENERATOR_VERSION = 22;
export const COASTAL_FLOOD_MARGIN = 18;
// 1,200 ticks maps to about 7:12 AM in the HUD.
export const WORLD_START_TIME = 1200;
export const BIOME_NAMES = [
  "ocean",
  "tropical_island",
  "volcanic_island",
  "land_volcano",
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

export const ISLAND_CELL_SIZE = 176;
export const LAND_VOLCANO_CELL_SIZE = 384;
export const VOLCANO_ERUPTION_PERIOD_SECONDS = 34;
const ISLAND_MIN_SPAWN_DISTANCE = 112;
const LAND_VOLCANO_MIN_SPAWN_DISTANCE = 190;

function islandFeatureForCell(generator, cellX, cellZ) {
  const centerX = Math.round(cellX * ISLAND_CELL_SIZE + (coordinateRandom(generator.seedHash, cellX, cellZ, 9101) - 0.5) * ISLAND_CELL_SIZE * 0.58);
  const centerZ = Math.round(cellZ * ISLAND_CELL_SIZE + (coordinateRandom(generator.seedHash, cellX, cellZ, 9103) - 0.5) * ISLAND_CELL_SIZE * 0.58);
  if (Math.hypot(centerX, centerZ) < ISLAND_MIN_SPAWN_DISTANCE) return null;
  const continental = generator.continentalNoise((centerX - 150) / 190, (centerZ + 260) / 190);
  if (continental > -0.36) return null;
  const rarity = coordinateRandom(generator.seedHash, cellX, cellZ, 9119);
  if (rarity > 0.11) return null;
  const volcanic = coordinateRandom(generator.seedHash, cellX, cellZ, 9127) > 0.57;
  const radius = Math.round((volcanic ? 24 : 20) + coordinateRandom(generator.seedHash, cellX, cellZ, 9133) * (volcanic ? 13 : 12));
  return {
    id: `${volcanic ? "volcano" : "island"}:${cellX},${cellZ}`,
    type: volcanic ? "volcanic_island" : "tropical_island",
    x: centerX,
    z: centerZ,
    radius,
    cellX,
    cellZ,
    eruptionOffset: coordinateRandom(generator.seedHash, cellX, cellZ, 9151) * VOLCANO_ERUPTION_PERIOD_SECONDS,
  };
}

function getIslandFeatureAt(generator, x, z) {
  const centerCellX = Math.round(x / ISLAND_CELL_SIZE);
  const centerCellZ = Math.round(z / ISLAND_CELL_SIZE);
  let best = null;
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dz = -1; dz <= 1; dz += 1) {
      const feature = islandFeatureForCell(generator, centerCellX + dx, centerCellZ + dz);
      if (!feature) continue;
      const distance = Math.hypot(x - feature.x, z - feature.z);
      if (distance > feature.radius) continue;
      if (!best || distance < best.distance) best = { ...feature, distance, normalizedDistance: distance / feature.radius };
    }
  }
  return best;
}

function landVolcanoFeatureForCell(generator, cellX, cellZ) {
  const centerX = Math.round(cellX * LAND_VOLCANO_CELL_SIZE + (coordinateRandom(generator.seedHash, cellX, cellZ, 9301) - 0.5) * LAND_VOLCANO_CELL_SIZE * 0.52);
  const centerZ = Math.round(cellZ * LAND_VOLCANO_CELL_SIZE + (coordinateRandom(generator.seedHash, cellX, cellZ, 9307) - 0.5) * LAND_VOLCANO_CELL_SIZE * 0.52);
  if (Math.hypot(centerX, centerZ) < LAND_VOLCANO_MIN_SPAWN_DISTANCE) return null;
  const continental = generator.continentalNoise((centerX - 150) / 190, (centerZ + 260) / 190);
  if (continental < -0.2) return null;
  if (coordinateRandom(generator.seedHash, cellX, cellZ, 9311) > 0.045) return null;
  const radius = Math.round(25 + coordinateRandom(generator.seedHash, cellX, cellZ, 9319) * 14);
  return {
    id: `land-volcano:${cellX},${cellZ}`,
    type: "land_volcano",
    x: centerX,
    z: centerZ,
    radius,
    cellX,
    cellZ,
    eruptionOffset: coordinateRandom(generator.seedHash, cellX, cellZ, 9323) * VOLCANO_ERUPTION_PERIOD_SECONDS,
  };
}

function getLandVolcanoFeatureAt(generator, x, z) {
  const centerCellX = Math.round(x / LAND_VOLCANO_CELL_SIZE);
  const centerCellZ = Math.round(z / LAND_VOLCANO_CELL_SIZE);
  let best = null;
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dz = -1; dz <= 1; dz += 1) {
      const feature = landVolcanoFeatureForCell(generator, centerCellX + dx, centerCellZ + dz);
      if (!feature) continue;
      const distance = Math.hypot(x - feature.x, z - feature.z);
      if (distance > feature.radius) continue;
      if (!best || distance < best.distance) best = { ...feature, distance, normalizedDistance: distance / feature.radius };
    }
  }
  return best;
}

function getVolcanoFeatureAt(generator, x, z) {
  return getLandVolcanoFeatureAt(generator, x, z) || (() => {
    const island = getIslandFeatureAt(generator, x, z);
    return island?.type === "volcanic_island" ? island : null;
  })();
}

export function getIslandSites(seedText, radius = 900) {
  const generator = getGenerator(seedText);
  const cellRadius = Math.ceil(radius / ISLAND_CELL_SIZE) + 1;
  const sites = [];
  for (let cellX = -cellRadius; cellX <= cellRadius; cellX += 1) {
    for (let cellZ = -cellRadius; cellZ <= cellRadius; cellZ += 1) {
      const feature = islandFeatureForCell(generator, cellX, cellZ);
      if (!feature || Math.hypot(feature.x, feature.z) > radius + feature.radius) continue;
      sites.push({ ...feature, summitY: biomeHeight(generator, feature.type, feature.x, feature.z) });
    }
  }
  return sites.sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
}

export function getVolcanicIslandSites(seedText, radius = 900) {
  return getIslandSites(seedText, radius).filter((site) => site.type === "volcanic_island");
}

export function getLandVolcanoSites(seedText, radius = 1400) {
  const generator = getGenerator(seedText);
  const cellRadius = Math.ceil(radius / LAND_VOLCANO_CELL_SIZE) + 1;
  const sites = [];
  for (let cellX = -cellRadius; cellX <= cellRadius; cellX += 1) {
    for (let cellZ = -cellRadius; cellZ <= cellRadius; cellZ += 1) {
      const feature = landVolcanoFeatureForCell(generator, cellX, cellZ);
      if (!feature || Math.hypot(feature.x, feature.z) > radius + feature.radius) continue;
      sites.push({ ...feature, summitY: biomeHeight(generator, feature.type, feature.x, feature.z) });
    }
  }
  return sites.sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
}

export function getVolcanoSites(seedText, radius = 1400) {
  return [...getVolcanicIslandSites(seedText, radius), ...getLandVolcanoSites(seedText, radius)]
    .sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
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
    fossilNoise: createNoise3D(random),
    lavaNoise: createNoise3D(random),
    landmarks: [],
    undergroundSites: [],
  };
  generator.landmarks = buildRareLandmarkRegistry(generator, 720);
  generator.undergroundSites = getUndergroundSites(seed, 720);
  generatorCache.set(seed, generator);
  return generator;
}

function findRareLandmarkAnchor(generator, type, occupied, minRadius = 170, maxRadius = 480) {
  for (let attempt = 0; attempt < 96; attempt += 1) {
    const angle = seededUnit(generator.seed, type, attempt, "angle") * Math.PI * 2;
    const distance = minRadius + seededUnit(generator.seed, type, attempt, "distance") * (maxRadius - minRadius);
    const x = Math.round(Math.cos(angle) * distance);
    const z = Math.round(Math.sin(angle) * distance);
    if (chooseBiome(generator, x, z) === "ocean") continue;
    if (occupied.some((entry) => Math.hypot(entry.x - x, entry.z - z) < LANDMARK_MIN_DISTANCE)) continue;
    return { id: `${type}:rare-anchor`, type, x, z, cellX: Math.round(x / 128), cellZ: Math.round(z / 128), rarity: 0.001 };
  }
  return null;
}

function buildRareLandmarkRegistry(generator, radius) {
  const landmarks = getLandmarkCells(generator.seed, radius)
    .filter((landmark) => chooseBiome(generator, landmark.x, landmark.z) !== "ocean");

  // Keep villages and hostile treasure sites rare, but guarantee that a very
  // large explored region can eventually demonstrate both systems.
  if (!landmarks.some((landmark) => landmark.type === "village")) {
    const village = findRareLandmarkAnchor(generator, "village", landmarks, 280, 680);
    if (village) landmarks.push(village);
  }
  if (!landmarks.some((landmark) => ["fortified_ruin", "raider_camp", "ruined_tower", "bone_temple", "war_forge", "gravewatch_crypt", "bandit_watchpost"].includes(landmark.type))) {
    const ruin = findRareLandmarkAnchor(generator, "fortified_ruin", landmarks, 320, 700);
    if (ruin) landmarks.push(ruin);
  }
  return landmarks;
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

  const landVolcano = getLandVolcanoFeatureAt(generator, x, z);
  if (landVolcano) return landVolcano.type;
  const island = getIslandFeatureAt(generator, x, z);
  if (island) return island.type;

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
    case "tropical_island": {
      const island = getIslandFeatureAt(generator, x, z);
      const edge = Math.max(0, 1 - (island?.normalizedDistance ?? 1));
      height = SEA_LEVEL - 2 + edge * 10.5 + detail * 1.15;
      break;
    }
    case "volcanic_island": {
      const island = getIslandFeatureAt(generator, x, z);
      const distance = island?.normalizedDistance ?? 1;
      const edge = Math.max(0, 1 - distance);
      const cone = Math.max(0, 1 - distance / 0.67) * 18;
      const crater = distance < 0.14 ? (1 - distance / 0.14) * 7 : 0;
      height = SEA_LEVEL - 2 + edge * 8 + cone - crater + detail * 0.85;
      break;
    }
    case "land_volcano": {
      const volcano = getLandVolcanoFeatureAt(generator, x, z);
      const distance = volcano?.normalizedDistance ?? 1;
      const shoulder = Math.max(0, 1 - distance) * 6;
      const cone = Math.max(0, 1 - distance / 0.72) * 20;
      const crater = distance < 0.135 ? (1 - distance / 0.135) * 8 : 0;
      height = 10.5 + broad * 2.4 + shoulder + cone - crater + detail * 0.95;
      break;
    }
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
    waterLevel: ["ocean", "tropical_island", "volcanic_island"].includes(biome) && biomeHeight(generator, biome, x, z) < SEA_LEVEL ? SEA_LEVEL : null,
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
  if (biome === "tropical_island") return height <= SEA_LEVEL + 1 ? ["sand", "sand", "sandstone"] : ["grass", "dirt", "sandstone"];
  if (biome === "volcanic_island") return height <= SEA_LEVEL + 1 ? ["black_sand", "basalt", "stone"] : ["volcanic_ash", "basalt", "stone"];
  if (biome === "land_volcano") return ["volcanic_ash", "basalt", "stone"];
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
        if (!blocks[key]) {
          const appleBearing = !jungle && dy <= 0 && coordinateRandom(generator.seedHash, x + dx, z + dz, 1441 + dy * 13) > 0.945;
          setBlock(blocks, ...bounds, x + dx, centerY + dy, z + dz, appleBearing ? "apple_leaves" : leaves);
        }
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
  if (biome === "tropical_island") return 0.068;
  if (biome === "jungle") return 0.105;
  if (biome === "forest") return 0.058;
  if (biome === "ice") return 0.025;
  if (biome === "plains") return 0.007;
  if (biome === "hills") return 0.012;
  return 0;
}


function clearStructureCell(blocks, bounds, x, y, z) {
  const [minX, maxX, minZ, maxZ] = bounds;
  if (x < minX || x > maxX || z < minZ || z > maxZ) return;
  delete blocks[blockKey(x, y, z)];
}

function flattenStructurePad(blocks, bounds, generator, centerX, centerZ, radius, groundY, foundation = "ancient_brick") {
  for (let dx = -radius; dx <= radius; dx += 1) {
    for (let dz = -radius; dz <= radius; dz += 1) {
      const x = centerX + dx;
      const z = centerZ + dz;
      const surface = biomeHeight(generator, chooseBiome(generator, x, z), x, z);
      for (let y = Math.min(surface, groundY); y <= groundY; y += 1) setBlock(blocks, ...bounds, x, y, z, foundation);
      for (let y = groundY + 1; y <= groundY + 7; y += 1) clearStructureCell(blocks, bounds, x, y, z);
    }
  }
}

function addFortifiedRuin(blocks, bounds, generator, landmark) {
  const groundY = biomeHeight(generator, chooseBiome(generator, landmark.x, landmark.z), landmark.x, landmark.z);
  if (chooseBiome(generator, landmark.x, landmark.z) === "ocean") return;
  flattenStructurePad(blocks, bounds, generator, landmark.x, landmark.z, 5, groundY, "ancient_brick");
  for (let dx = -5; dx <= 5; dx += 1) {
    for (let dz = -5; dz <= 5; dz += 1) {
      const edge = Math.abs(dx) === 5 || Math.abs(dz) === 5;
      if (!edge) continue;
      const entrance = dz === -5 && Math.abs(dx) <= 1;
      if (entrance) continue;
      const wallHeight = (Math.abs(dx) === 5 && Math.abs(dz) === 5) ? 5 : 3;
      for (let y = 1; y <= wallHeight; y += 1) {
        const crenel = y < wallHeight || (Math.abs(dx + dz) % 2 === 0);
        if (crenel) setBlock(blocks, ...bounds, landmark.x + dx, groundY + y, landmark.z + dz, y === 2 && (dx + dz) % 3 === 0 ? "carved_rune_brick" : "ancient_brick");
      }
    }
  }
  for (let dx = -2; dx <= 2; dx += 1) for (let dz = -2; dz <= 2; dz += 1) setBlock(blocks, ...bounds, landmark.x + dx, groundY, landmark.z + dz, "carved_rune_brick");
  setBlock(blocks, ...bounds, landmark.x, groundY + 1, landmark.z, "treasure_chest");
  setBlock(blocks, ...bounds, landmark.x + 2, groundY + 1, landmark.z + 1, "enchantment_table");
  setBlock(blocks, ...bounds, landmark.x - 4, groundY + 2, landmark.z - 4, "torch");
  setBlock(blocks, ...bounds, landmark.x + 4, groundY + 2, landmark.z - 4, "torch");
}


function addRaiderCamp(blocks, bounds, generator, landmark) {
  const biome = chooseBiome(generator, landmark.x, landmark.z);
  if (biome === "ocean") return;
  const groundY = biomeHeight(generator, biome, landmark.x, landmark.z);
  flattenStructurePad(blocks, bounds, generator, landmark.x, landmark.z, 6, groundY, "dirt");
  for (let offset = -5; offset <= 5; offset += 1) {
    if (Math.abs(offset) <= 1) continue;
    setBlock(blocks, ...bounds, landmark.x + offset, groundY + 1, landmark.z - 5, "ancient_brick");
    setBlock(blocks, ...bounds, landmark.x + offset, groundY + 1, landmark.z + 5, "ancient_brick");
    setBlock(blocks, ...bounds, landmark.x - 5, groundY + 1, landmark.z + offset, "ancient_brick");
    setBlock(blocks, ...bounds, landmark.x + 5, groundY + 1, landmark.z + offset, "ancient_brick");
  }
  for (const [dx, dz] of [[-4,-4],[4,-4],[-4,4],[4,4]]) {
    for (let y = 1; y <= 4; y += 1) setBlock(blocks, ...bounds, landmark.x + dx, groundY + y, landmark.z + dz, y === 4 ? "torch" : "spruce_wood");
  }
  setBlock(blocks, ...bounds, landmark.x, groundY + 1, landmark.z + 1, "treasure_chest");
  setBlock(blocks, ...bounds, landmark.x - 2, groundY + 1, landmark.z - 1, "oak_table");
  setBlock(blocks, ...bounds, landmark.x + 2, groundY + 1, landmark.z - 1, "oak_chair");
}

function addRuinedTower(blocks, bounds, generator, landmark) {
  const biome = chooseBiome(generator, landmark.x, landmark.z);
  if (biome === "ocean") return;
  const groundY = biomeHeight(generator, biome, landmark.x, landmark.z);
  flattenStructurePad(blocks, bounds, generator, landmark.x, landmark.z, 4, groundY, "cobblestone");
  for (let y = 1; y <= 8; y += 1) {
    const radius = y > 6 ? 2 : 3;
    for (let dx = -radius; dx <= radius; dx += 1) for (let dz = -radius; dz <= radius; dz += 1) {
      if (Math.abs(dx) !== radius && Math.abs(dz) !== radius) continue;
      if (y <= 2 && dz === -radius && dx === 0) continue;
      if ((y + dx * 3 + dz * 5) % 7 === 0) continue;
      setBlock(blocks, ...bounds, landmark.x + dx, groundY + y, landmark.z + dz, y % 3 === 0 ? "carved_rune_brick" : "ancient_brick");
    }
  }
  for (let dx = -2; dx <= 2; dx += 1) for (let dz = -2; dz <= 2; dz += 1) setBlock(blocks, ...bounds, landmark.x + dx, groundY + 6, landmark.z + dz, "ancient_brick");
  setBlock(blocks, ...bounds, landmark.x, groundY + 7, landmark.z, "treasure_chest");
  setBlock(blocks, ...bounds, landmark.x + 1, groundY + 7, landmark.z, "enchantment_table");
}

function addBoneTemple(blocks, bounds, generator, landmark) {
  const biome = chooseBiome(generator, landmark.x, landmark.z);
  if (biome === "ocean") return;
  const groundY = biomeHeight(generator, biome, landmark.x, landmark.z);
  flattenStructurePad(blocks, bounds, generator, landmark.x, landmark.z, 7, groundY, "ancient_brick");
  for (let arm = -6; arm <= 6; arm += 1) {
    for (let y = 1; y <= 3; y += 1) {
      if (Math.abs(arm) <= 1 && y <= 2) continue;
      setBlock(blocks, ...bounds, landmark.x + arm, groundY + y, landmark.z, y === 2 ? "fossil_block" : "carved_rune_brick");
      setBlock(blocks, ...bounds, landmark.x, groundY + y, landmark.z + arm, y === 2 ? "fossil_block" : "carved_rune_brick");
    }
  }
  for (const [dx, dz] of [[-5,-5],[5,-5],[-5,5],[5,5]]) {
    for (let y = 1; y <= 5; y += 1) setBlock(blocks, ...bounds, landmark.x + dx, groundY + y, landmark.z + dz, y % 2 ? "ancient_brick" : "carved_rune_brick");
    setBlock(blocks, ...bounds, landmark.x + dx, groundY + 6, landmark.z + dz, "torch");
  }
  setBlock(blocks, ...bounds, landmark.x, groundY + 1, landmark.z, "treasure_chest");
  setBlock(blocks, ...bounds, landmark.x + 2, groundY + 1, landmark.z + 2, "paleontology_lab");
  setBlock(blocks, ...bounds, landmark.x - 2, groundY + 1, landmark.z - 2, "treasure_chest");
}

function addWarForge(blocks, bounds, generator, landmark) {
  const biome = chooseBiome(generator, landmark.x, landmark.z);
  if (biome === "ocean") return;
  const groundY = biomeHeight(generator, biome, landmark.x, landmark.z);
  flattenStructurePad(blocks, bounds, generator, landmark.x, landmark.z, 7, groundY, "cobblestone");
  for (let dx = -6; dx <= 6; dx += 1) {
    for (let dz = -6; dz <= 6; dz += 1) {
      const edge = Math.abs(dx) === 6 || Math.abs(dz) === 6;
      if (!edge || (dz === -6 && Math.abs(dx) <= 1)) continue;
      for (let y = 1; y <= 4; y += 1) {
        const crenel = y < 4 || (Math.abs(dx + dz) % 2 === 0);
        if (crenel) setBlock(blocks, ...bounds, landmark.x + dx, groundY + y, landmark.z + dz, seededUnit(generator.seed, landmark.id, dx, dz, y, "forge-wall") > 0.74 ? "carved_rune_brick" : "ancient_brick");
      }
    }
  }
  for (let dx = -3; dx <= 3; dx += 1) for (let dz = -3; dz <= 3; dz += 1) {
    setBlock(blocks, ...bounds, landmark.x + dx, groundY, landmark.z + dz, (dx + dz) % 2 === 0 ? "carved_rune_brick" : "cobblestone");
  }
  for (const [dx, dz] of [[-3,-2],[3,-2],[-3,2],[3,2]]) {
    setBlock(blocks, ...bounds, landmark.x + dx, groundY + 1, landmark.z + dz, "furnace");
    setBlock(blocks, ...bounds, landmark.x + dx, groundY + 2, landmark.z + dz, "torch");
  }
  setBlock(blocks, ...bounds, landmark.x, groundY + 1, landmark.z + 2, "enchantment_table");
  setBlock(blocks, ...bounds, landmark.x, groundY + 1, landmark.z - 1, "treasure_chest");
  setBlock(blocks, ...bounds, landmark.x + 2, groundY + 1, landmark.z - 1, "treasure_chest");
}

function addGravewatchCrypt(blocks, bounds, generator, landmark) {
  const biome = chooseBiome(generator, landmark.x, landmark.z);
  if (biome === "ocean") return;
  const groundY = biomeHeight(generator, biome, landmark.x, landmark.z);
  flattenStructurePad(blocks, bounds, generator, landmark.x, landmark.z, 6, groundY, "cobblestone");
  for (let dx = -5; dx <= 5; dx += 1) {
    for (let dz = -5; dz <= 5; dz += 1) {
      const edge = Math.abs(dx) === 5 || Math.abs(dz) === 5;
      if (!edge) continue;
      const entrance = dz === -5 && Math.abs(dx) <= 1;
      if (entrance) continue;
      for (let y = 1; y <= 3; y += 1) {
        setBlock(blocks, ...bounds, landmark.x + dx, groundY + y, landmark.z + dz, y === 2 && (dx + dz) % 3 === 0 ? "carved_rune_brick" : "ancient_brick");
      }
    }
  }
  for (const [dx, dz] of [[-3,-3],[3,-3],[-3,3],[3,3]]) {
    for (let y = 1; y <= 4; y += 1) setBlock(blocks, ...bounds, landmark.x + dx, groundY + y, landmark.z + dz, y === 4 ? "torch" : "fossil_block");
  }
  setBlock(blocks, ...bounds, landmark.x - 2, groundY + 1, landmark.z + 1, "treasure_chest");
  setBlock(blocks, ...bounds, landmark.x + 2, groundY + 1, landmark.z + 1, "treasure_chest");
  setBlock(blocks, ...bounds, landmark.x, groundY + 1, landmark.z - 2, "enchantment_table");
}

function addBanditWatchpost(blocks, bounds, generator, landmark) {
  const biome = chooseBiome(generator, landmark.x, landmark.z);
  if (biome === "ocean") return;
  const groundY = biomeHeight(generator, biome, landmark.x, landmark.z);
  flattenStructurePad(blocks, bounds, generator, landmark.x, landmark.z, 5, groundY, "dirt");
  for (const [dx, dz] of [[-4,-4],[4,-4],[-4,4],[4,4]]) {
    for (let y = 1; y <= 6; y += 1) setBlock(blocks, ...bounds, landmark.x + dx, groundY + y, landmark.z + dz, y === 6 ? "torch" : "spruce_wood");
  }
  for (let dx = -4; dx <= 4; dx += 1) for (let dz = -4; dz <= 4; dz += 1) {
    if (Math.abs(dx) === 4 || Math.abs(dz) === 4) setBlock(blocks, ...bounds, landmark.x + dx, groundY + 4, landmark.z + dz, "spruce_planks");
  }
  setBlock(blocks, ...bounds, landmark.x, groundY + 5, landmark.z, "treasure_chest");
  setBlock(blocks, ...bounds, landmark.x - 1, groundY + 5, landmark.z + 1, "oak_table");
  setBlock(blocks, ...bounds, landmark.x + 1, groundY + 5, landmark.z + 1, "oak_chair");
}

function addVillageHouse(blocks, bounds, x0, groundY, z0, width = 5, depth = 5) {
  const halfX = Math.floor(width / 2);
  const halfZ = Math.floor(depth / 2);
  for (let dx = -halfX; dx <= halfX; dx += 1) {
    for (let dz = -halfZ; dz <= halfZ; dz += 1) {
      setBlock(blocks, ...bounds, x0 + dx, groundY, z0 + dz, "planks");
      const edge = Math.abs(dx) === halfX || Math.abs(dz) === halfZ;
      if (!edge) continue;
      for (let y = 1; y <= 3; y += 1) {
        const doorway = dz === -halfZ && dx === 0 && y <= 2;
        if (doorway) continue;
        const window = y === 2 && ((Math.abs(dx) === halfX && dz === 0) || (Math.abs(dz) === halfZ && dx === 0));
        setBlock(blocks, ...bounds, x0 + dx, groundY + y, z0 + dz, window ? "oak_window" : "planks");
      }
    }
  }
  for (let dx = -halfX - 1; dx <= halfX + 1; dx += 1) for (let dz = -halfZ - 1; dz <= halfZ + 1; dz += 1) {
    if (Math.abs(dx) + Math.abs(dz) > halfX + halfZ + 1) continue;
    setBlock(blocks, ...bounds, x0 + dx, groundY + 4, z0 + dz, "spruce_planks");
  }
  setBlock(blocks, ...bounds, x0, groundY + 1, z0 - halfZ, "oak_door");
  setBlock(blocks, ...bounds, x0, groundY + 1, z0, "oak_table");
}

function addVillage(blocks, bounds, generator, landmark) {
  const biome = chooseBiome(generator, landmark.x, landmark.z);
  if (biome === "ocean") return;
  const groundY = biomeHeight(generator, biome, landmark.x, landmark.z);
  flattenStructurePad(blocks, bounds, generator, landmark.x, landmark.z, 9, groundY, "grass");
  addVillageHouse(blocks, bounds, landmark.x - 5, groundY, landmark.z - 4, 5, 5);
  addVillageHouse(blocks, bounds, landmark.x + 5, groundY, landmark.z - 3, 5, 5);
  addVillageHouse(blocks, bounds, landmark.x, groundY, landmark.z + 6, 7, 5);
  for (let dz = -7; dz <= 7; dz += 1) setBlock(blocks, ...bounds, landmark.x, groundY, landmark.z + dz, "cobblestone");
  setBlock(blocks, ...bounds, landmark.x, groundY + 1, landmark.z, "village_bell");
  setBlock(blocks, ...bounds, landmark.x + 4, groundY + 1, landmark.z + 6, "paleontology_lab");
  setBlock(blocks, ...bounds, landmark.x - 4, groundY + 1, landmark.z + 6, "bookshelf");
  setBlock(blocks, ...bounds, landmark.x + 6, groundY + 1, landmark.z - 3, "furnace");
  setBlock(blocks, ...bounds, landmark.x - 6, groundY + 1, landmark.z - 4, "enchantment_table");
  setBlock(blocks, ...bounds, landmark.x + 1, groundY + 1, landmark.z + 1, "torch");
  // Villages use generated fences, gates, ladders, and hay so the new building set is discoverable in-world.
  for (let dx = -10; dx <= 10; dx += 1) {
    if (Math.abs(dx) > 1) {
      setBlock(blocks, ...bounds, landmark.x + dx, groundY + 1, landmark.z - 10, dx % 5 === 0 ? "fence_post" : "oak_fence");
      setBlock(blocks, ...bounds, landmark.x + dx, groundY + 1, landmark.z + 10, dx % 5 === 0 ? "fence_post" : "oak_fence");
    }
  }
  for (let dz = -9; dz <= 9; dz += 1) {
    setBlock(blocks, ...bounds, landmark.x - 10, groundY + 1, landmark.z + dz, dz % 5 === 0 ? "fence_post" : "oak_fence");
    setBlock(blocks, ...bounds, landmark.x + 10, groundY + 1, landmark.z + dz, dz % 5 === 0 ? "fence_post" : "oak_fence");
  }
  setBlock(blocks, ...bounds, landmark.x, groundY + 1, landmark.z - 10, "oak_fence_gate");
  setBlock(blocks, ...bounds, landmark.x + 7, groundY + 1, landmark.z + 6, "hay_bale");
  setBlock(blocks, ...bounds, landmark.x + 7, groundY + 2, landmark.z + 6, "hay_bale");
  for (let y = 1; y <= 4; y += 1) setBlock(blocks, ...bounds, landmark.x - 7, groundY + y, landmark.z + 6, "ladder");
}

function addFactionSettlement(blocks, bounds, generator, landmark) {
  const factionId = FACTION_SETTLEMENT_TYPES[landmark.type];
  const faction = FACTIONS[factionId];
  if (!faction) return;
  const biome = chooseBiome(generator, landmark.x, landmark.z);
  if (biome === "ocean" && factionId !== "tideborn") return;
  const groundY = Math.max(SEA_LEVEL, biomeHeight(generator, biome, landmark.x, landmark.z));
  const radius = factionId === "tideborn" ? 22 : 20;
  const floor = factionId === "ironroot" ? "cobblestone" : factionId === "tideborn" ? "sandstone" : "grass";
  const wall = factionId === "ironroot" ? "stone" : factionId === "tideborn" ? "sandstone" : "spruce_planks";
  flattenStructurePad(blocks, bounds, generator, landmark.x, landmark.z, radius, groundY, floor);

  // Large rare kingdoms use a perimeter, towers, patrol gates, roads, homes, workshops, farms, and treasure halls.
  for (let offset = -radius; offset <= radius; offset += 1) {
    const gateGap = Math.abs(offset) <= 2;
    if (!gateGap) {
      setBlock(blocks, ...bounds, landmark.x + offset, groundY + 1, landmark.z - radius, offset % 6 === 0 ? "fence_post" : "oak_fence");
      setBlock(blocks, ...bounds, landmark.x + offset, groundY + 1, landmark.z + radius, offset % 6 === 0 ? "fence_post" : "oak_fence");
    }
    setBlock(blocks, ...bounds, landmark.x - radius, groundY + 1, landmark.z + offset, offset % 6 === 0 ? "fence_post" : "oak_fence");
    setBlock(blocks, ...bounds, landmark.x + radius, groundY + 1, landmark.z + offset, offset % 6 === 0 ? "fence_post" : "oak_fence");
  }
  setBlock(blocks, ...bounds, landmark.x, groundY + 1, landmark.z - radius, "oak_fence_gate");
  setBlock(blocks, ...bounds, landmark.x + 1, groundY + 1, landmark.z - radius, "oak_fence_gate");
  for (let step = -radius + 2; step <= radius - 2; step += 1) {
    setBlock(blocks, ...bounds, landmark.x, groundY, landmark.z + step, factionId === "ironroot" ? "cobblestone" : "planks");
    setBlock(blocks, ...bounds, landmark.x + step, groundY, landmark.z, factionId === "tideborn" ? "sandstone" : "cobblestone");
  }

  [[-15,-15],[15,-15],[-15,15],[15,15]].forEach(([dx,dz], towerIndex) => {
    for (let y=1; y<=7; y+=1) {
      setBlock(blocks, ...bounds, landmark.x+dx, groundY+y, landmark.z+dz, wall);
      if (y<=6) setBlock(blocks, ...bounds, landmark.x+dx+(dx<0?1:-1), groundY+y, landmark.z+dz, "ladder");
    }
    setBlock(blocks, ...bounds, landmark.x+dx, groundY+8, landmark.z+dz, "torch");
    setBlock(blocks, ...bounds, landmark.x+dx+(dx<0?1:-1), groundY+1, landmark.z+dz+(dz<0?1:-1), towerIndex % 2 ? "stone_stairs" : "oak_stairs");
  });

  addVillageHouse(blocks, bounds, landmark.x - 8, groundY, landmark.z - 7, 7, 5);
  addVillageHouse(blocks, bounds, landmark.x + 8, groundY, landmark.z - 6, 7, 5);
  addVillageHouse(blocks, bounds, landmark.x - 9, groundY, landmark.z + 8, 5, 7);
  addVillageHouse(blocks, bounds, landmark.x + 9, groundY, landmark.z + 8, 5, 7);
  addVillageHouse(blocks, bounds, landmark.x, groundY, landmark.z + 10, 9, 7);

  setBlock(blocks, ...bounds, landmark.x, groundY + 1, landmark.z, "village_bell");
  setBlock(blocks, ...bounds, landmark.x - 2, groundY + 1, landmark.z + 10, "enchantment_table");
  setBlock(blocks, ...bounds, landmark.x + 2, groundY + 1, landmark.z + 10, "furnace");
  setBlock(blocks, ...bounds, landmark.x, groundY + 1, landmark.z + 12, "treasure_chest");
  setBlock(blocks, ...bounds, landmark.x - 2, groundY + 1, landmark.z + 12, "treasure_chest");
  setBlock(blocks, ...bounds, landmark.x + 2, groundY + 1, landmark.z + 12, "treasure_chest");
  for (let i=0; i<6; i+=1) setBlock(blocks, ...bounds, landmark.x + 12 + (i%2), groundY + 1 + Math.floor(i/2), landmark.z + 3, "hay_bale");
}

function addFossilDig(blocks, bounds, generator, landmark) {
  const biome = chooseBiome(generator, landmark.x, landmark.z);
  if (biome === "ocean") return;
  const groundY = biomeHeight(generator, biome, landmark.x, landmark.z);
  flattenStructurePad(blocks, bounds, generator, landmark.x, landmark.z, 5, groundY, "dirt");
  for (let dx = -4; dx <= 4; dx += 1) {
    for (let dz = -4; dz <= 4; dz += 1) {
      const depth = 1 + Math.floor(seededUnit(generator.seed, landmark.id, dx, dz) * 3);
      for (let step = 0; step < depth; step += 1) clearStructureCell(blocks, bounds, landmark.x + dx, groundY - step, landmark.z + dz);
      if (seededUnit(generator.seed, landmark.id, dx, dz, "fossil") > 0.58) setBlock(blocks, ...bounds, landmark.x + dx, groundY - depth, landmark.z + dz, "fossil_block");
    }
  }
  setBlock(blocks, ...bounds, landmark.x + 5, groundY + 1, landmark.z, "paleontology_lab");
  setBlock(blocks, ...bounds, landmark.x - 5, groundY + 1, landmark.z, "treasure_chest");
  for (const [dx, dz] of [[-5,-5],[5,-5],[-5,5],[5,5]]) setBlock(blocks, ...bounds, landmark.x + dx, groundY + 1, landmark.z + dz, "torch");
}


function clearUndergroundCell(blocks, bounds, x, y, z) {
  const [minX, maxX, minZ, maxZ] = bounds;
  if (x < minX || x > maxX || z < minZ || z > maxZ || y <= 0) return;
  delete blocks[blockKey(x, y, z)];
}

function addGiantMushroom(blocks, bounds, site, x, floorY, z, red = true) {
  const stemHeight = 3 + Math.floor(deepwildUnit(site.id, x, z, "stem") * 3);
  for (let y = 1; y <= stemHeight; y += 1) setBlock(blocks, ...bounds, x, floorY + y, z, "mushroom_stem");
  const capType = red ? "red_mushroom_cap" : "brown_mushroom_cap";
  const capY = floorY + stemHeight;
  for (let dx = -2; dx <= 2; dx += 1) {
    for (let dz = -2; dz <= 2; dz += 1) {
      if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
      setBlock(blocks, ...bounds, x + dx, capY, z + dz, capType);
      if (Math.abs(dx) <= 1 && Math.abs(dz) <= 1) setBlock(blocks, ...bounds, x + dx, capY + 1, z + dz, capType);
    }
  }
}

function addUndergroundSite(blocks, bounds, generator, site) {
  const profile = site.profile;
  const surfaceY = biomeHeight(generator, chooseBiome(generator, site.x, site.z), site.x, site.z);
  const floorY = Math.max(2, Math.min(surfaceY - 4, surfaceY - site.depth));
  const radius = profile.radius;
  const height = profile.chamberHeight;

  for (let x = site.x - radius - 1; x <= site.x + radius + 1; x += 1) {
    for (let z = site.z - radius - 1; z <= site.z + radius + 1; z += 1) {
      const horizontal = Math.hypot((x - site.x) / radius, (z - site.z) / radius);
      if (horizontal > 1.14) continue;
      if (horizontal <= 1) setBlock(blocks, ...bounds, x, floorY, z, profile.floor);
      for (let y = floorY + 1; y <= floorY + height; y += 1) {
        const vertical = (y - (floorY + height * 0.48)) / (height * 0.68);
        const shape = horizontal * horizontal + vertical * vertical;
        if (shape <= 1) clearUndergroundCell(blocks, bounds, x, y, z);
        else if (shape <= 1.13 && deepwildUnit(site.id, x, y, z, "wall") > 0.38) setBlock(blocks, ...bounds, x, y, z, profile.wall);
      }
    }
  }

  // A crooked access gallery links the chamber to nearby natural caves while
  // leaving the site hidden from the surface.
  const tunnelLength = radius + 8;
  const tunnelAngle = deepwildUnit(site.id, "tunnel") * Math.PI * 2;
  for (let step = 0; step <= tunnelLength; step += 1) {
    const x = Math.round(site.x + Math.cos(tunnelAngle) * step);
    const z = Math.round(site.z + Math.sin(tunnelAngle) * step);
    const y = floorY + 1 + Math.floor(step / 7);
    for (let dx = -1; dx <= 1; dx += 1) for (let dy = 0; dy <= 2; dy += 1) clearUndergroundCell(blocks, bounds, x + dx, y + dy, z);
    setBlock(blocks, ...bounds, x, y - 1, z, profile.floor);
  }

  setBlock(blocks, ...bounds, site.x, floorY + 1, site.z, "monster_spawner");
  for (let chest = 0; chest < profile.treasure; chest += 1) {
    const angle = (chest / Math.max(1, profile.treasure)) * Math.PI * 2 + 0.65;
    setBlock(blocks, ...bounds, Math.round(site.x + Math.cos(angle) * (radius - 2)), floorY + 1, Math.round(site.z + Math.sin(angle) * (radius - 2)), "treasure_chest");
  }

  if (site.type === "spider_lair") {
    for (let index = 0; index < 22; index += 1) {
      const angle = deepwildUnit(site.id, index, "web-angle") * Math.PI * 2;
      const distance = 2 + deepwildUnit(site.id, index, "web-distance") * (radius - 2);
      const y = floorY + 1 + Math.floor(deepwildUnit(site.id, index, "web-height") * Math.max(2, height - 1));
      setBlock(blocks, ...bounds, Math.round(site.x + Math.cos(angle) * distance), y, Math.round(site.z + Math.sin(angle) * distance), "cobweb");
    }
  } else if (site.type === "zombie_mound") {
    for (const [dx, dz] of [[-4,-4],[4,-4],[-4,4],[4,4]]) {
      for (let y = 1; y <= 3; y += 1) setBlock(blocks, ...bounds, site.x + dx, floorY + y, site.z + dz, y === 3 ? "torch" : "mossy_cobblestone");
    }
  } else if (site.type === "skeleton_catacomb") {
    for (let lane = -5; lane <= 5; lane += 5) {
      for (let step = -radius + 2; step <= radius - 2; step += 1) {
        setBlock(blocks, ...bounds, site.x + lane, floorY + 1, site.z + step, "cracked_bone_brick");
        if (Math.abs(step) % 4 === 0) setBlock(blocks, ...bounds, site.x + lane, floorY + 2, site.z + step, "torch");
      }
    }
  } else if (site.type === "mushroom_forest") {
    for (let index = 0; index < 34; index += 1) {
      const angle = deepwildUnit(site.id, index, "mushroom-angle") * Math.PI * 2;
      const distance = 2 + deepwildUnit(site.id, index, "mushroom-distance") * (radius - 2);
      const x = Math.round(site.x + Math.cos(angle) * distance);
      const z = Math.round(site.z + Math.sin(angle) * distance);
      setBlock(blocks, ...bounds, x, floorY + 1, z, index % 3 === 0 ? "red_mushroom" : "brown_mushroom");
    }
    addGiantMushroom(blocks, bounds, site, site.x - 4, floorY, site.z + 2, true);
    addGiantMushroom(blocks, bounds, site, site.x + 4, floorY, site.z - 2, false);
  } else if (site.type === "forgotten_vault") {
    for (let dx = -4; dx <= 4; dx += 1) for (let dz = -4; dz <= 4; dz += 1) if (Math.abs(dx) === 4 || Math.abs(dz) === 4) setBlock(blocks, ...bounds, site.x + dx, floorY + 1, site.z + dz, "carved_rune_brick");
    setBlock(blocks, ...bounds, site.x + 2, floorY + 1, site.z, "enchantment_table");
  }
}

function angleDistance(a, b) {
  const wrapped = Math.atan2(Math.sin(a - b), Math.cos(a - b));
  return Math.abs(wrapped);
}

function addVolcanoSurfaceFeatures(blocks, bounds, generator) {
  const [minX, maxX, minZ, maxZ] = bounds;
  for (let x = minX; x <= maxX; x += 1) {
    for (let z = minZ; z <= maxZ; z += 1) {
      const island = getVolcanoFeatureAt(generator, x, z);
      if (!island) continue;
      const groundY = biomeHeight(generator, island.type, x, z);
      const distance = island.normalizedDistance;
      if (distance < 0.105) {
        setBlock(blocks, ...bounds, x, groundY, z, "basalt");
        setBlock(blocks, ...bounds, x, groundY + 1, z, "lava");
        continue;
      }
      if (distance < 0.18) {
        setBlock(blocks, ...bounds, x, groundY, z, "obsidian");
        continue;
      }
      if (distance > 0.82) continue;
      const angle = Math.atan2(z - island.z, x - island.x);
      let channel = false;
      for (let index = 0; index < 4; index += 1) {
        const channelAngle = coordinateRandom(generator.seedHash, island.cellX, island.cellZ, 9200 + index) * Math.PI * 2;
        if (angleDistance(angle, channelAngle) < 0.045 + distance * 0.025) { channel = true; break; }
      }
      if (!channel) continue;
      setBlock(blocks, ...bounds, x, groundY, z, distance > 0.68 ? "obsidian" : "basalt");
      setBlock(blocks, ...bounds, x, groundY + 1, z, "lava");
    }
  }
}

function addUndergroundFeatures(blocks, bounds, generator) {
  const [minX, maxX, minZ, maxZ] = bounds;
  generator.undergroundSites.forEach((site) => {
    const radius = site.profile.radius + 10;
    if (site.x + radius < minX || site.x - radius > maxX || site.z + radius < minZ || site.z - radius > maxZ) return;
    addUndergroundSite(blocks, bounds, generator, site);
  });
}

function addGeneratedLandmarks(blocks, bounds, generator) {
  const [minX, maxX, minZ, maxZ] = bounds;
  generator.landmarks.forEach((landmark) => {
    const factionSettlement = Boolean(FACTION_SETTLEMENT_TYPES[landmark.type]);
    const radius = factionSettlement ? 24 : landmark.type === "village" ? 12 : landmark.type === "ruined_tower" ? 6 : landmark.type === "war_forge" ? 9 : landmark.type === "gravewatch_crypt" ? 8 : landmark.type === "bandit_watchpost" ? 7 : 8;
    if (landmark.x + radius < minX || landmark.x - radius > maxX || landmark.z + radius < minZ || landmark.z - radius > maxZ) return;
    if (factionSettlement) addFactionSettlement(blocks, bounds, generator, landmark);
    else if (landmark.type === "fortified_ruin") addFortifiedRuin(blocks, bounds, generator, landmark);
    else if (landmark.type === "raider_camp") addRaiderCamp(blocks, bounds, generator, landmark);
    else if (landmark.type === "ruined_tower") addRuinedTower(blocks, bounds, generator, landmark);
    else if (landmark.type === "village") addVillage(blocks, bounds, generator, landmark);
    else if (landmark.type === "fossil_dig") addFossilDig(blocks, bounds, generator, landmark);
    else if (landmark.type === "bone_temple") addBoneTemple(blocks, bounds, generator, landmark);
    else if (landmark.type === "war_forge") addWarForge(blocks, bounds, generator, landmark);
    else if (landmark.type === "gravewatch_crypt") addGravewatchCrypt(blocks, bounds, generator, landmark);
    else if (landmark.type === "bandit_watchpost") addBanditWatchpost(blocks, bounds, generator, landmark);
  });
}

function computeChunkVisibleByType(blocks) {
  const byType = {};
  Object.entries(blocks).forEach(([key, current]) => {
    const definition = BLOCK_TYPES[current.type];
    if (!definition) return;
    const [x, y, z] = key.split(",").map(Number);
    const exposed = ["water", "lava"].includes(current.type)
      ? [[0, 1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]]
          .some(([dx, dy, dz]) => blocks[blockKey(x + dx, y + dy, z + dz)]?.type !== current.type)
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
          const caveThreshold = biome === "mountains" ? 0.55 : 0.61;
          const caveValue = generator.caveNoise(x / 10.5, y / 8.5, z / 10.5);
          if (deepEnoughForCave && caveValue > caveThreshold) continue;

          if (y === height) type = surface[0];
          else if (y === height - 1) type = surface[1];
          else if (y >= height - 3) type = surface[2];
          else if (y >= 2 && y <= 5 && generator.lavaNoise((x + 310) / 7, y / 4, (z - 280) / 7) > 0.86) type = "lava";
          else if (y <= 5 && generator.diamondNoise((x - 90) / 5, y / 5, (z + 70) / 5) > 0.79) type = "diamond_ore";
          else if (biome === "mountains" && y <= 20 && generator.emeraldNoise((x + 180) / 5, y / 5, (z - 170) / 5) > 0.805) type = "emerald_ore";
          else if (y <= 8 && generator.redstoneNoise((x + 140) / 5, y / 5, (z + 160) / 5) > 0.77) type = "redstone_ore";
          else if (y <= 11 && generator.goldNoise((x - 80) / 6, y / 6, (z - 120) / 6) > 0.765) type = "gold_ore";
          else if (y <= 17 && generator.ironNoise((x + 25) / 6, y / 6, (z - 25) / 6) > 0.72) type = "iron_ore";
          else if (y <= 21 && generator.copperNoise((x - 45) / 7, y / 7, (z + 35) / 7) > 0.7) type = "copper_ore";
          else if (y <= 18 && generator.fossilNoise((x - 210) / 8, y / 6, (z + 190) / 8) > 0.795) type = "fossil_block";
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
      if (!seaConnected && ["plains", "forest", "jungle", "tropical_island", "hills", "beach"].includes(biome)) {
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
      else addBroadleafTree(blocks, bounds, generator, x, groundY, z, biome === "jungle" || biome === "tropical_island");
    }
  }

  addVolcanoSurfaceFeatures(blocks, bounds, generator);
  addUndergroundFeatures(blocks, bounds, generator);
  addGeneratedLandmarks(blocks, bounds, generator);

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

  const landmarks = getGenerator(seedText).landmarks;
  landmarks.forEach((landmark) => {
    const profile = sampleSurfaceProfile(seedText, landmark.x, landmark.z);
    if (profile.biome === "ocean") return;
    const spawnProfile = STRUCTURE_SPAWN_PROFILES[landmark.type];
    if (!spawnProfile) return;

    const factionId = FACTION_SETTLEMENT_TYPES[landmark.type];
    if (factionId) {
      const faction = FACTIONS[factionId];
      const names = factionId === "sunspire"
        ? ["Marshal Aurelia", "Architect Cael", "Solaris", "Maren", "Cassia", "Darian", "Elio", "Thalia", "Lucan", "Vesta"]
        : factionId === "ironroot"
          ? ["Thane Brunna", "Captain Hroth", "Dagna", "Korr", "Svala", "Borin", "Yrsa", "Torvik", "Edda", "Rurik"]
          : ["Warden Neris", "Quartermaster Ilyra", "Mako", "Sereia", "Corin", "Tala", "Nami", "Orun", "Mirae", "Kai"];
      (spawnProfile.residents || []).forEach((type, index) => {
        const angle = (index / Math.max(1, spawnProfile.residents.length)) * Math.PI * 2;
        const radius = 6 + (index % 3) * 3.5;
        add(type, { ...profile, x: landmark.x + Math.cos(angle) * radius, z: landmark.z + Math.sin(angle) * radius });
        const resident = mobs[mobs.length - 1];
        resident.factionId = factionId;
        resident.settlementId = landmark.id;
        resident.customName = names[index] || `${faction.name} Resident`;
        resident.homeX = landmark.x; resident.homeY = profile.height + 0.55; resident.homeZ = landmark.z;
        resident.homeRadius = spawnProfile.patrolRadius;
        resident.interactionPrompt = "Talk";
      });
      // Additional mobile patrols begin outside the walls and can meet rival patrols in the world.
      (spawnProfile.defenders || []).forEach((type, index) => {
        const angle = (index / Math.max(1, spawnProfile.defenders.length)) * Math.PI * 2 + 0.35;
        const radius = 24 + (index % 2) * 7;
        add(type, { ...profile, x: landmark.x + Math.cos(angle) * radius, z: landmark.z + Math.sin(angle) * radius });
        const patrol = mobs[mobs.length - 1];
        patrol.factionId = factionId; patrol.settlementId = landmark.id; patrol.structureId = landmark.id;
        patrol.customName = `${faction.name} Patrol ${index + 1}`;
        patrol.homeX = landmark.x; patrol.homeY = profile.height + 0.55; patrol.homeZ = landmark.z;
        patrol.homeRadius = spawnProfile.patrolRadius + 26;
        patrol.patrolRouteIndex = index;
      });
      return;
    }

    if (landmark.type === "village") {
      const residentNames = ["Captain Brann", "Scholar Sela", "Farmer Lio", "Warden Mira", "Smith Ansel", "Sister Elara", "Pathfinder Toma", "Merchant Veya"];
      spawnProfile.residents.forEach((type, index) => {
        const angle = (index / spawnProfile.residents.length) * Math.PI * 2;
        const radius = 3.2 + (index % 2) * 1.8;
        add(type, {
          ...profile,
          x: landmark.x + Math.cos(angle) * radius,
          z: landmark.z + Math.sin(angle) * radius,
        });
        const resident = mobs[mobs.length - 1];
        resident.villageId = landmark.id;
        resident.customName = residentNames[index] || resident.customName;
        resident.homeX = landmark.x;
        resident.homeY = profile.height + 0.55;
        resident.homeZ = landmark.z;
        resident.homeRadius = spawnProfile.patrolRadius;
        resident.interactionPrompt = "Talk";
      });
      return;
    }

    (spawnProfile.defenders || []).forEach((type, index) => {
      const angle = (index / Math.max(1, spawnProfile.defenders.length)) * Math.PI * 2;
      const radius = Math.min(5.2, 2.8 + (index % 3) * 1.1);
      add(type, {
        ...profile,
        x: landmark.x + Math.cos(angle) * radius,
        z: landmark.z + Math.sin(angle) * radius,
      });
      const defender = mobs[mobs.length - 1];
      defender.structureId = landmark.id;
      defender.homeX = landmark.x;
      defender.homeY = profile.height + 0.55;
      defender.homeZ = landmark.z;
      defender.homeRadius = spawnProfile.patrolRadius;
      defender.guardsTreasure = Boolean(STRUCTURE_TREASURE_PROFILES[landmark.type]);
      defender.structureTreasureTier = STRUCTURE_TREASURE_PROFILES[landmark.type]?.tier || null;
      defender.structureRole = index === 0 ? "captain" : "guard";
    });
  });

  getGenerator(seedText).undergroundSites
    .slice()
    .sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z))
    .slice(0, 18)
    .forEach((site) => {
      const surface = sampleSurfaceProfile(seedText, site.x, site.z);
      const floorY = Math.max(2, Math.min(surface.height - 4, surface.height - site.depth));
      (site.profile.defenders || []).forEach((type, index) => {
        const angle = (index / Math.max(1, site.profile.defenders.length)) * Math.PI * 2;
        const radius = 2.4 + (index % 2) * 1.6;
        const mob = createMob(`deepwild-${site.id}-${type}-${index}`, type, site.x + Math.cos(angle) * radius, floorY + 0.55, site.z + Math.sin(angle) * radius, random);
        mob.structureId = site.id;
        mob.undergroundSiteType = site.type;
        mob.homeX = site.x;
        mob.homeY = floorY + 0.55;
        mob.homeZ = site.z;
        mob.homeRadius = Math.max(7, site.profile.radius - 1);
        mob.guardsTreasure = true;
        mob.enchantedVariant = Boolean(MOB_TYPES[type]?.enhanced);
        mobs.push(mob);
      });
    });

  add("raptor", findBiomePosition(seedText, ["plains", "forest", "jungle"], random, 55, 175));
  if (random() > 0.52) add("triceratops", findBiomePosition(seedText, ["plains", "hills"], random, 70, 190));
  if (random() > 0.78) add("tyrannosaur", findBiomePosition(seedText, ["forest", "jungle", "hills"], random, 100, 220));
  add("sea_serpent", findBiomePosition(seedText, ["ocean"], random, 85, 240), 0);
  if (random() > 0.62) add("hydra", findBiomePosition(seedText, ["ocean"], random, 110, 260), 0);
  const dragonPosition = findBiomePosition(seedText, ["mountains", "hills"], random, 120, 280);
  if (dragonPosition) {
    dragonPosition.height += 18 + random() * 12;
    add("sky_dragon", { ...dragonPosition, biome: "sky" }, 0);
    mobs[mobs.length - 1].y = dragonPosition.height;
  }
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
    enchantments: {},
    openedTreasureChests: [],
    villageQuests: { accepted: [], claimed: [] },
    factions: { reputation: { sunspire: 0, ironroot: 0, tideborn: 0 }, accepted: [], claimed: [], discovered: [] },
    archaeology: { analyzed: 0, dnaCreated: 0, eggsSpliced: 0, dinosaursRevived: 0 },
  };
}
