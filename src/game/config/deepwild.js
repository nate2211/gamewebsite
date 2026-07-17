const hashText = (value) => {
  let hash = 2166136261;
  const text = String(value ?? "");
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export function deepwildUnit(...parts) {
  let value = hashText(parts.join("|"));
  value = Math.imul(value ^ (value >>> 15), 2246822519);
  value = Math.imul(value ^ (value >>> 13), 3266489917);
  value ^= value >>> 16;
  return (value >>> 0) / 4294967296;
}

export const UNDERGROUND_CELL_SIZE = 72;
export const UNDERGROUND_SITE_TYPES = {
  spider_lair: {
    label: "Silkbound Spider Lair",
    chanceWeight: 0.25,
    radius: 7,
    chamberHeight: 5,
    floor: "mycelium",
    wall: "cobblestone",
    defenders: ["venom_spider", "spider", "spider", "venom_spider"],
    treasure: 1,
  },
  zombie_mound: {
    label: "Buried Zombie Mound",
    chanceWeight: 0.2,
    radius: 8,
    chamberHeight: 5,
    floor: "dirt",
    wall: "mossy_cobblestone",
    defenders: ["plague_zombie", "zombie", "zombie", "plague_zombie"],
    treasure: 1,
  },
  skeleton_catacomb: {
    label: "Skeleton Catacomb",
    chanceWeight: 0.2,
    radius: 9,
    chamberHeight: 6,
    floor: "cracked_bone_brick",
    wall: "ancient_brick",
    defenders: ["rune_skeleton", "skeleton", "skeleton", "rune_skeleton", "warlord_skeleton"],
    treasure: 2,
  },
  mushroom_forest: {
    label: "Underground Mushroom Forest",
    chanceWeight: 0.25,
    radius: 11,
    chamberHeight: 8,
    floor: "mycelium",
    wall: "stone",
    defenders: ["spore_slime", "spore_slime"],
    treasure: 1,
  },
  forgotten_vault: {
    label: "Forgotten Deep Vault",
    chanceWeight: 0.1,
    radius: 7,
    chamberHeight: 5,
    floor: "carved_rune_brick",
    wall: "obsidian",
    defenders: ["rune_skeleton", "plague_zombie", "elite_zombie"],
    treasure: 2,
  },
};

const SITE_ORDER = Object.entries(UNDERGROUND_SITE_TYPES);
const chooseSiteType = (roll) => {
  let cursor = 0;
  for (const [type, profile] of SITE_ORDER) {
    cursor += profile.chanceWeight;
    if (roll <= cursor) return type;
  }
  return SITE_ORDER[SITE_ORDER.length - 1][0];
};

export function getUndergroundSites(seed, radius = 720) {
  const cellRadius = Math.ceil(radius / UNDERGROUND_CELL_SIZE) + 1;
  const candidates = [];
  for (let cellX = -cellRadius; cellX <= cellRadius; cellX += 1) {
    for (let cellZ = -cellRadius; cellZ <= cellRadius; cellZ += 1) {
      const gate = deepwildUnit(seed, cellX, cellZ, "site-gate");
      if (gate > 0.23) continue;
      const x = Math.round((cellX + 0.18 + deepwildUnit(seed, cellX, cellZ, "x") * 0.64) * UNDERGROUND_CELL_SIZE);
      const z = Math.round((cellZ + 0.18 + deepwildUnit(seed, cellX, cellZ, "z") * 0.64) * UNDERGROUND_CELL_SIZE);
      if (Math.hypot(x, z) < 52 || Math.hypot(x, z) > radius) continue;
      const type = chooseSiteType(deepwildUnit(seed, cellX, cellZ, "type"));
      const depth = 8 + Math.floor(deepwildUnit(seed, cellX, cellZ, "depth") * 10);
      candidates.push({
        id: `underground:${type}:${cellX}:${cellZ}`,
        type,
        x,
        z,
        depth,
        cellX,
        cellZ,
        profile: UNDERGROUND_SITE_TYPES[type],
      });
    }
  }
  candidates.sort((a, b) => deepwildUnit(seed, a.id, "order") - deepwildUnit(seed, b.id, "order"));
  const accepted = [];
  candidates.forEach((candidate) => {
    if (accepted.some((site) => Math.hypot(site.x - candidate.x, site.z - candidate.z) < 42)) return;
    accepted.push(candidate);
  });
  const ensureType = (type, angleSalt) => {
    if (accepted.some((site) => site.type === type)) return;
    const angle = deepwildUnit(seed, type, angleSalt) * Math.PI * 2;
    const distance = 150 + deepwildUnit(seed, type, "fallback-distance") * Math.max(90, radius - 180);
    const x = Math.round(Math.cos(angle) * distance);
    const z = Math.round(Math.sin(angle) * distance);
    accepted.push({
      id: `underground:${type}:fallback`,
      type,
      x,
      z,
      depth: 10 + Math.floor(deepwildUnit(seed, type, "fallback-depth") * 7),
      cellX: Math.floor(x / UNDERGROUND_CELL_SIZE),
      cellZ: Math.floor(z / UNDERGROUND_CELL_SIZE),
      profile: UNDERGROUND_SITE_TYPES[type],
      fallback: true,
    });
  };
  ensureType("mushroom_forest", "mushroom");
  ensureType("skeleton_catacomb", "catacomb");
  return accepted;
}

export const BUILDER_HOUSE_OFFSET = [7, 0, 0];

export function createBuilderHousePlan(stationPosition = [0, 0, 0]) {
  const [stationX, stationY, stationZ] = stationPosition.map(Number);
  const origin = [stationX + BUILDER_HOUSE_OFFSET[0], stationY, stationZ + BUILDER_HOUSE_OFFSET[2]];
  const blocks = [];
  const add = (dx, dy, dz, type, phase) => blocks.push({
    position: [origin[0] + dx, origin[1] + dy, origin[2] + dz],
    type,
    phase,
  });

  for (let x = -3; x <= 3; x += 1) {
    for (let z = -3; z <= 3; z += 1) add(x, 0, z, Math.abs(x) === 3 || Math.abs(z) === 3 ? "cobblestone" : "planks", "foundation");
  }
  for (let y = 1; y <= 3; y += 1) {
    for (let x = -3; x <= 3; x += 1) {
      for (let z = -3; z <= 3; z += 1) {
        if (Math.abs(x) !== 3 && Math.abs(z) !== 3) continue;
        const doorway = z === -3 && x === 0 && y <= 2;
        if (doorway) continue;
        const window = y === 2 && ((Math.abs(x) === 3 && z === 0) || (Math.abs(z) === 3 && Math.abs(x) === 1));
        add(x, y, z, window ? "oak_window" : "planks", "walls");
      }
    }
  }
  add(0, 1, -3, "oak_door", "walls");
  for (let x = -4; x <= 4; x += 1) for (let z = -4; z <= 4; z += 1) add(x, 4, z, "spruce_planks", "roof");
  add(-2, 1, 1, "frontier_bed", "furnishing");
  add(1, 1, 1, "oak_table", "furnishing");
  add(2, 1, 1, "oak_chair", "furnishing");
  add(-2, 1, -1, "storage_chest", "furnishing");
  add(2, 2, 2, "wall_lantern", "furnishing");
  add(-2, 2, 2, "wall_lantern", "furnishing");
  return blocks;
}

export const ENHANCED_MOB_POOL = ["plague_zombie", "rune_skeleton", "venom_spider", "spore_slime"];
