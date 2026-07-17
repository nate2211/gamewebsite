export const ADVENTURE_VERSION = 4;



export const LANDMARK_CELL_SIZE = 128;
export const LANDMARK_MIN_DISTANCE = 96;

// A world-wide deterministic registry keeps landmarks discoverable but rare.
// The combined chance is intentionally near five percent per 128x128 cell, and
// accepted landmarks must also pass a minimum-spacing gate.
export const LANDMARK_GENERATION_RULES = Object.freeze([
  { type: "sunspire_kingdom", chance: 0.0007 },
  { type: "ironroot_hold", chance: 0.0007 },
  { type: "tideborn_enclave", chance: 0.0007 },
  { type: "war_forge", chance: 0.003 },
  { type: "bone_temple", chance: 0.004 },
  { type: "gravewatch_crypt", chance: 0.005 },
  { type: "fortified_ruin", chance: 0.006 },
  { type: "ruined_tower", chance: 0.007 },
  { type: "bandit_watchpost", chance: 0.006 },
  { type: "raider_camp", chance: 0.008 },
  { type: "village", chance: 0.007 },
  { type: "fossil_dig", chance: 0.008 },
]);

export const STRUCTURE_SPAWN_PROFILES = Object.freeze({
  sunspire_kingdom: Object.freeze({ residents: ["sunspire_guard", "sunspire_guard", "sunspire_citizen", "sunspire_citizen", "sunspire_citizen", "sunspire_guard", "sunspire_citizen", "sunspire_citizen", "sunspire_guard", "sunspire_citizen"], defenders: ["sunspire_guard", "sunspire_guard", "sunspire_guard", "sunspire_guard"], patrolRadius: 44 }),
  ironroot_hold: Object.freeze({ residents: ["ironroot_guard", "ironroot_guard", "ironroot_citizen", "ironroot_citizen", "ironroot_citizen", "ironroot_guard", "ironroot_citizen", "ironroot_citizen", "ironroot_guard", "ironroot_citizen"], defenders: ["ironroot_guard", "ironroot_guard", "ironroot_guard", "ironroot_guard"], patrolRadius: 42 }),
  tideborn_enclave: Object.freeze({ residents: ["tideborn_guard", "tideborn_guard", "tideborn_citizen", "tideborn_citizen", "tideborn_citizen", "tideborn_guard", "tideborn_citizen", "tideborn_citizen", "tideborn_guard", "tideborn_citizen"], defenders: ["tideborn_guard", "tideborn_guard", "tideborn_guard", "tideborn_guard"], patrolRadius: 46 }),
  fortified_ruin: Object.freeze({
    defenders: ["elite_zombie", "warlord_skeleton", "elite_zombie", "skeleton"],
    patrolRadius: 9.5,
  }),
  raider_camp: Object.freeze({
    defenders: ["elite_zombie", "elite_zombie", "warlord_skeleton", "zombie"],
    patrolRadius: 11,
  }),
  ruined_tower: Object.freeze({
    defenders: ["warlord_skeleton", "skeleton", "elite_zombie"],
    patrolRadius: 7,
  }),
  bone_temple: Object.freeze({
    defenders: ["warlord_skeleton", "elite_zombie", "raptor", "warlord_skeleton", "skeleton"],
    patrolRadius: 12,
  }),
  war_forge: Object.freeze({
    defenders: ["elite_zombie", "warlord_skeleton", "elite_zombie", "warlord_skeleton", "skeleton"],
    patrolRadius: 12,
  }),
  village: Object.freeze({
    residents: [
      "villager_guard", "villager_scholar", "villager_farmer", "villager_guard",
      "villager_blacksmith", "villager_healer", "villager_cartographer", "villager_merchant",
    ],
    patrolRadius: 16,
  }),
  fossil_dig: Object.freeze({
    defenders: ["skeleton", "raptor"],
    patrolRadius: 8,
  }),
  gravewatch_crypt: Object.freeze({
    defenders: ["warlord_skeleton", "skeleton", "skeleton", "elite_zombie"],
    patrolRadius: 10,
  }),
  bandit_watchpost: Object.freeze({
    defenders: ["elite_zombie", "elite_zombie", "warlord_skeleton"],
    patrolRadius: 9,
  }),
});

export const STRUCTURE_TREASURE_PROFILES = Object.freeze({
  sunspire_kingdom: Object.freeze({ minimum: 3, maximum: 3, tier: "kingdom" }),
  ironroot_hold: Object.freeze({ minimum: 3, maximum: 3, tier: "kingdom" }),
  tideborn_enclave: Object.freeze({ minimum: 3, maximum: 3, tier: "kingdom" }),
  fortified_ruin: Object.freeze({ minimum: 1, maximum: 1, tier: "rare" }),
  raider_camp: Object.freeze({ minimum: 1, maximum: 1, tier: "uncommon" }),
  ruined_tower: Object.freeze({ minimum: 1, maximum: 1, tier: "rare" }),
  bone_temple: Object.freeze({ minimum: 2, maximum: 2, tier: "ancient" }),
  war_forge: Object.freeze({ minimum: 2, maximum: 2, tier: "elite" }),
  fossil_dig: Object.freeze({ minimum: 1, maximum: 1, tier: "archaeology" }),
  gravewatch_crypt: Object.freeze({ minimum: 2, maximum: 2, tier: "ancient" }),
  bandit_watchpost: Object.freeze({ minimum: 1, maximum: 1, tier: "rare" }),
});

export const ENCHANTMENTS = Object.freeze({
  sharpness: { id: "sharpness", name: "Keen Edge", target: "weapon", maxLevel: 4, cost: 4, description: "Raises melee damage." },
  sweeping: { id: "sweeping", name: "Sweeping Force", target: "weapon", maxLevel: 3, cost: 5, description: "Adds a chance to strike a nearby hostile." },
  reach: { id: "reach", name: "Long Reach", target: "weapon", maxLevel: 2, cost: 4, description: "Improves the effective reach of polearms." },
  efficiency: { id: "efficiency", name: "Miner's Rhythm", target: "tool", maxLevel: 4, cost: 4, description: "Speeds up block breaking." },
  fortune: { id: "fortune", name: "Prospector", target: "tool", maxLevel: 3, cost: 6, description: "Improves ore and fossil yields." },
  durability: { id: "durability", name: "Tempered", target: "equipment", maxLevel: 3, cost: 4, description: "Reduces durability loss." },
  protection: { id: "protection", name: "Guardian Weave", target: "armor", maxLevel: 4, cost: 5, description: "Reduces incoming damage." },
  vitality: { id: "vitality", name: "Vital Thread", target: "armor", maxLevel: 2, cost: 7, description: "Improves recovery after combat." },
  vampiric: { id: "vampiric", name: "Blood Echo", target: "weapon", maxLevel: 3, cost: 8, description: "Returns a small portion of melee damage as health." },
});

export const ENCHANTMENT_LIST = Object.freeze(Object.values(ENCHANTMENTS));

export const VILLAGE_QUESTS = Object.freeze([
  {
    id: "village_wolf_problem",
    name: "The Howling Ridge",
    giver: "Ranger Mira",
    description: "Defeat 4 hostile creatures threatening the village road.",
    metric: "hostilesDefeated",
    target: 4,
    rewardXp: 120,
    rewards: { emerald: 2, ancient_coin: 5 },
  },
  {
    id: "village_rebuild",
    name: "Timber for the Hall",
    giver: "Builder Oren",
    description: "Mine or gather 24 blocks for village repairs.",
    metric: "blocksMined",
    target: 24,
    rewardXp: 95,
    rewards: { planks: 16, iron_nugget: 6 },
  },
  {
    id: "village_fossil",
    name: "Bones Beneath the Hill",
    giver: "Scholar Sela",
    description: "Recover 6 fossil fragments from buried fossil blocks.",
    metric: "fossilsRecovered",
    target: 6,
    rewardXp: 180,
    rewards: { primal_crystal: 1, arcane_dust: 5 },
  },
  {
    id: "village_elite_hunt",
    name: "Banner of the Warlord",
    giver: "Captain Brann",
    description: "Defeat 2 enhanced enemies guarding hostile ruins.",
    metric: "eliteEnemiesDefeated",
    target: 2,
    rewardXp: 260,
    rewards: { diamond: 1, enchantment_shard: 3 },
  },
  {
    id: "village_bone_temple",
    name: "Vaults of the First Beasts",
    giver: "Scholar Sela",
    description: "Open 3 guarded treasure chests in ruins or bone temples.",
    metric: "treasureChestsOpened",
    target: 3,
    rewardXp: 240,
    rewards: { fossil_fragment: 4, enchantment_shard: 2, iron_warhammer: 1 },
  },
  {
    id: "village_war_forge",
    name: "Break the Black Forge",
    giver: "Captain Brann",
    description: "Defeat 4 elite structure defenders.",
    metric: "eliteEnemiesDefeated",
    target: 4,
    rewardXp: 330,
    rewards: { iron_scythe: 1, emerald: 3, ancient_coin: 8 },
  },
  {
    id: "village_crypt_watch",
    name: "Silence the Gravewatch",
    giver: "Sister Elara",
    description: "Defeat 3 undead defenders assigned to rare crypts.",
    metric: "eliteEnemiesDefeated",
    target: 3,
    rewardXp: 290,
    rewards: { enchantment_shard: 3, ancient_coin: 10 },
  },
  {
    id: "village_watchpost_maps",
    name: "Maps from the Watchposts",
    giver: "Pathfinder Toma",
    description: "Open 2 guarded structure treasure chests.",
    metric: "treasureChestsOpened",
    target: 2,
    rewardXp: 210,
    rewards: { treasure_map_fragment: 3, emerald: 2 },
  },
  {
    id: "village_forge_supply",
    name: "Steel for the Smithy",
    giver: "Smith Ansel",
    description: "Mine 36 blocks while gathering ore for the village forge.",
    metric: "blocksMined",
    target: 36,
    rewardXp: 180,
    rewards: { iron_ingot: 5, enchantment_shard: 1 },
  },
]);

export const VILLAGE_DIALOGUE = Object.freeze({
  villager_scholar: [
    "The old strata hold creatures no living eye has seen.",
    "Bring fossil fragments to a Paleontology Lab and we can rebuild their genome.",
    "Rare sky dragons circle beyond the mountain line. Their scales resonate with arcana.",
    "Bone temples hold intact genomes, but their undead wardens never abandon the vaults.",
  ],
  villager_guard: [
    "Ruins beyond the road are occupied. Their chests are valuable, but never unguarded.",
    "Elite raiders carry enchanted equipment. Watch their attack wind-up.",
    "Sea serpents move beneath deep water. A spear gives you safer reach.",
    "Black forges produce warhammers and scythes for elite raiders. Break their guard before looting.",
  ],
  villager_farmer: [
    "Our village grows while travelers complete contracts and trade supplies.",
    "Dinosaurs revived from eggs may be dangerous until they learn your scent.",
    "The enchantment table responds to arcane dust and hard-earned experience.",
  ],
  villager_blacksmith: [
    "Rare watchposts carry better steel than ordinary raiders.",
    "Bring ore and enchantment shards if you want equipment worthy of a stronghold.",
    "Crypt blades are brittle, but their runes can be reclaimed.",
  ],
  villager_healer: [
    "The Gravewatch dead carry a cold that lingers after battle.",
    "Rest before entering a defended landmark; its guardians will hold their ground.",
    "I can point you toward contracts that protect travelers and village roads.",
  ],
  villager_cartographer: [
    "True landmarks are widely separated. A long expedition should feel meaningful.",
    "Bandit watchposts overlook roads and usually hide one guarded chest.",
    "Treasure map fragments can lead you toward the next distant structure.",
  ],
  villager_merchant: [
    "I trade only with travelers who return from defended sites.",
    "Ancient coins and enchanted equipment fetch the best prices in frontier settlements.",
    "Speak with every resident; each profession offers different contracts.",
  ],
});

export const DINOSAUR_TYPES = Object.freeze(["raptor", "triceratops", "tyrannosaur"]);

export function stableHash(text) {
  let hash = 2166136261;
  const value = String(text || "");
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function seededUnit(seed, ...parts) {
  let value = stableHash(`${seed}:${parts.join(":")}`);
  value = Math.imul(value ^ (value >>> 15), 2246822519);
  value = Math.imul(value ^ (value >>> 13), 3266489917);
  value ^= value >>> 16;
  return (value >>> 0) / 4294967296;
}

export function getTreasureLoot(seed, chestKey) {
  const roll = (salt) => seededUnit(seed, chestKey, salt);
  const loot = {
    ancient_coin: 4 + Math.floor(roll(1) * 9),
    iron_ingot: 1 + Math.floor(roll(2) * 4),
    arcane_dust: 1 + Math.floor(roll(3) * 5),
  };
  if (roll(4) > 0.46) loot.enchantment_shard = 1 + Math.floor(roll(5) * 3);
  if (roll(6) > 0.63) loot.fossil_fragment = 1 + Math.floor(roll(7) * 3);
  if (roll(8) > 0.74) loot.primal_crystal = 1;
  if (roll(9) > 0.88) loot.storm_warhammer = 1;
  else if (roll(10) > 0.84) loot.dragon_scythe = 1;
  else if (roll(11) > 0.8) loot.raider_katana = 1;
  else if (roll(12) > 0.75) loot.guardian_halberd = 1;
  else if (roll(13) > 0.71) loot.runed_greatsword = 1;
  return loot;
}

export function getLandmarkCells(seed, radius = 220, cellSize = LANDMARK_CELL_SIZE) {
  const candidates = [];
  const accepted = [];
  const cellRadius = Math.ceil(radius / cellSize);
  const totalChance = LANDMARK_GENERATION_RULES.reduce((sum, rule) => sum + rule.chance, 0);

  for (let cellX = -cellRadius; cellX <= cellRadius; cellX += 1) {
    for (let cellZ = -cellRadius; cellZ <= cellRadius; cellZ += 1) {
      const centerX = cellX * cellSize + Math.floor((seededUnit(seed, cellX, cellZ, "x") - 0.5) * cellSize * 0.5);
      const centerZ = cellZ * cellSize + Math.floor((seededUnit(seed, cellX, cellZ, "z") - 0.5) * cellSize * 0.5);
      const distance = Math.hypot(centerX, centerZ);
      if (distance < 86 || distance > radius) continue;

      const selector = seededUnit(seed, cellX, cellZ, "rare-landmark");
      if (selector >= totalChance) continue;
      let cursor = 0;
      let type = null;
      for (const rule of LANDMARK_GENERATION_RULES) {
        cursor += rule.chance;
        if (selector < cursor) {
          type = rule.type;
          break;
        }
      }
      if (!type) continue;
      candidates.push({
        id: `${type}:${cellX}:${cellZ}`,
        type,
        x: centerX,
        z: centerZ,
        cellX,
        cellZ,
        rarity: Math.max(0.001, LANDMARK_GENERATION_RULES.find((rule) => rule.type === type)?.chance || 0.01),
      });
    }
  }

  // Rarest rolls are accepted first, then a spatial gate prevents landmark
  // clusters from making exploration feel saturated.
  candidates
    .sort((a, b) => seededUnit(seed, a.id, "priority") - seededUnit(seed, b.id, "priority"))
    .forEach((candidate) => {
      const crowded = accepted.some((entry) => Math.hypot(entry.x - candidate.x, entry.z - candidate.z) < LANDMARK_MIN_DISTANCE);
      if (!crowded) accepted.push(candidate);
    });

  return accepted;
}

export function enchantmentApplies(definition, enchantment) {
  if (!definition || !enchantment) return false;
  if (enchantment.target === "equipment") return definition.category === "tool" || definition.category === "armor";
  if (enchantment.target === "weapon") return definition.category === "tool" && Boolean(definition.weaponClass || definition.toolType === "sword");
  if (enchantment.target === "tool") return definition.category === "tool" && !definition.arcaneFocus;
  if (enchantment.target === "armor") return definition.category === "armor";
  return false;
}
