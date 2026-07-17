export const TOOL_TIERS = {
  hand: 0,
  wood: 1,
  stone: 2,
  iron: 3,
  gold: 3,
  diamond: 4,
};

const block = ({
  id,
  name,
  color,
  hardness,
  preferredTool = null,
  requiredTier = 0,
  drop = id,
  placeable = true,
  transparent = false,
  solid = true,
  station = null,
  light = false,
  dropChance = 1,
  bonusDrops = [],
  plantType = null,
  growthStage = null,
  growthMs = null,
  seedItem = null,
  harvestDrop = null,
}) => ({
  id,
  name,
  color,
  hardness,
  preferredTool,
  requiredTier,
  drop,
  placeable,
  transparent,
  solid,
  station,
  light,
  dropChance,
  bonusDrops,
  plantType,
  growthStage,
  growthMs,
  seedItem,
  harvestDrop,
});

export const BLOCK_TYPES = {
  bedrock: block({
    id: "bedrock",
    name: "Bedrock",
    color: "#25282b",
    hardness: Infinity,
    preferredTool: "pickaxe",
    requiredTier: Infinity,
    drop: null,
    placeable: false,
  }),
  grass: block({ id: "grass", name: "Grass Block", color: "#67a93b", hardness: 0.65, preferredTool: "shovel", drop: "dirt", bonusDrops: [{ item: "grass_seeds", chance: 0.28 }, { item: "wheat_seeds", chance: 0.1 }] }),
  frozen_grass: block({ id: "frozen_grass", name: "Frozen Grass", color: "#8fb7a5", hardness: 0.8, preferredTool: "shovel", drop: "dirt" }),
  snow: block({ id: "snow", name: "Snow Block", color: "#edf7ff", hardness: 0.35, preferredTool: "shovel", solid: false }),
  snow_layer: block({ id: "snow_layer", name: "Snow Layer", color: "#f4fbff", hardness: 0.08, preferredTool: "shovel", drop: null, placeable: false, transparent: true, solid: false }),
  ice: block({ id: "ice", name: "Ice", color: "#8fd6ef", hardness: 0.55, preferredTool: "pickaxe", transparent: true, drop: null }),
  dirt: block({ id: "dirt", name: "Dirt", color: "#795334", hardness: 0.6, preferredTool: "shovel" }),
  stone: block({ id: "stone", name: "Stone", color: "#7b8084", hardness: 1.8, preferredTool: "pickaxe", requiredTier: 1, drop: "cobblestone", placeable: false }),
  cobblestone: block({ id: "cobblestone", name: "Cobblestone", color: "#696f74", hardness: 2, preferredTool: "pickaxe", requiredTier: 1 }),
  sand: block({ id: "sand", name: "Sand", color: "#d9c27a", hardness: 0.5, preferredTool: "shovel" }),
  sandstone: block({ id: "sandstone", name: "Sandstone", color: "#c8aa63", hardness: 1.4, preferredTool: "pickaxe", requiredTier: 1 }),
  wood: block({ id: "wood", name: "Oak Log", color: "#795129", hardness: 1.7, preferredTool: "axe" }),
  spruce_wood: block({ id: "spruce_wood", name: "Spruce Log", color: "#4c3525", hardness: 1.8, preferredTool: "axe" }),
  jungle_wood: block({ id: "jungle_wood", name: "Jungle Log", color: "#78522f", hardness: 1.9, preferredTool: "axe" }),
  planks: block({ id: "planks", name: "Oak Planks", color: "#b78348", hardness: 1.35, preferredTool: "axe" }),
  spruce_planks: block({ id: "spruce_planks", name: "Spruce Planks", color: "#755233", hardness: 1.35, preferredTool: "axe" }),
  jungle_planks: block({ id: "jungle_planks", name: "Jungle Planks", color: "#bd8050", hardness: 1.35, preferredTool: "axe" }),
  leaves: block({ id: "leaves", name: "Oak Leaves", color: "#3f7f3a", hardness: 0.28, preferredTool: "shears", drop: "sapling", transparent: true, dropChance: 0.18, solid: false, bonusDrops: [{ item: "apple", chance: 0.05 }, { item: "wheat_seeds", chance: 0.06 }] }),
  apple_leaves: block({ id: "apple_leaves", name: "Apple-Bearing Oak Leaves", color: "#39783a", hardness: 0.3, preferredTool: "shears", drop: "apple", transparent: true, dropChance: 0.72, solid: false, bonusDrops: [{ item: "sapling", chance: 0.22 }, { item: "apple", chance: 0.38 }] }),
  spruce_leaves: block({ id: "spruce_leaves", name: "Spruce Leaves", color: "#285e44", hardness: 0.3, preferredTool: "shears", drop: "spruce_sapling", transparent: true, dropChance: 0.16, solid: false, bonusDrops: [{ item: "wheat_seeds", chance: 0.04 }] }),
  jungle_leaves: block({ id: "jungle_leaves", name: "Jungle Leaves", color: "#2f8b36", hardness: 0.3, preferredTool: "shears", drop: "jungle_sapling", transparent: true, dropChance: 0.15, solid: false, bonusDrops: [{ item: "wheat_seeds", chance: 0.05 }] }),
  vine: block({ id: "vine", name: "Jungle Vine", color: "#2f7f35", hardness: 0.08, preferredTool: "shears", drop: "vine", placeable: true, transparent: true, solid: false }),
  coal_ore: block({ id: "coal_ore", name: "Coal Ore", color: "#41464b", hardness: 2.4, preferredTool: "pickaxe", requiredTier: 1, drop: "coal", placeable: false, bonusDrops: [{ item: "arcane_dust", chance: 0.12 }] }),
  copper_ore: block({ id: "copper_ore", name: "Copper Ore", color: "#a76543", hardness: 2.7, preferredTool: "pickaxe", requiredTier: 1, drop: "raw_copper", placeable: false, bonusDrops: [{ item: "arcane_dust", chance: 0.18 }] }),
  iron_ore: block({ id: "iron_ore", name: "Iron Ore", color: "#9b755e", hardness: 3, preferredTool: "pickaxe", requiredTier: 2, drop: "raw_iron", placeable: false }),
  gold_ore: block({ id: "gold_ore", name: "Gold Ore", color: "#c7a83c", hardness: 3.2, preferredTool: "pickaxe", requiredTier: 3, drop: "raw_gold", placeable: false }),
  redstone_ore: block({ id: "redstone_ore", name: "Redstone Ore", color: "#8f3030", hardness: 3.4, preferredTool: "pickaxe", requiredTier: 3, drop: "redstone", placeable: false, bonusDrops: [{ item: "arcane_dust", chance: 0.55 }, { item: "primal_crystal", chance: 0.08 }] }),
  emerald_ore: block({ id: "emerald_ore", name: "Emerald Ore", color: "#2fba69", hardness: 3.8, preferredTool: "pickaxe", requiredTier: 3, drop: "emerald", placeable: false, bonusDrops: [{ item: "primal_crystal", chance: 0.2 }] }),
  diamond_ore: block({ id: "diamond_ore", name: "Diamond Ore", color: "#36c7c5", hardness: 4.2, preferredTool: "pickaxe", requiredTier: 3, drop: "diamond", placeable: false, bonusDrops: [{ item: "primal_crystal", chance: 0.3 }] }),
  crafting_table: block({ id: "crafting_table", name: "Crafting Table", color: "#8a552c", hardness: 1.8, preferredTool: "axe", station: "crafting_table" }),
  furnace: block({ id: "furnace", name: "Furnace", color: "#555b60", hardness: 3.1, preferredTool: "pickaxe", requiredTier: 1, station: "furnace" }),
  glass: block({ id: "glass", name: "Glass", color: "#b8e5ee", hardness: 0.35, drop: null, transparent: true }),
  water: block({ id: "water", name: "Water", color: "#3e8fd1", hardness: Infinity, drop: null, placeable: false, transparent: true, solid: false }),
  lava: block({ id: "lava", name: "Lava", color: "#f25a1f", hardness: Infinity, drop: null, placeable: false, transparent: true, solid: false, light: true }),
  basalt: block({ id: "basalt", name: "Volcanic Basalt", color: "#35343b", hardness: 3.6, preferredTool: "pickaxe", requiredTier: 2, drop: "basalt" }),
  black_sand: block({ id: "black_sand", name: "Black Sand", color: "#403b3b", hardness: 0.65, preferredTool: "shovel", drop: "black_sand" }),
  volcanic_ash: block({ id: "volcanic_ash", name: "Volcanic Ash", color: "#57515a", hardness: 0.7, preferredTool: "shovel", drop: "volcanic_ash" }),
  obsidian: block({ id: "obsidian", name: "Obsidian", color: "#241b35", hardness: 7.5, preferredTool: "pickaxe", requiredTier: 4, drop: "obsidian" }),
  seagrass: block({ id: "seagrass", name: "Seagrass", color: "#2f9f69", hardness: 0.12, preferredTool: "shears", drop: "seagrass", transparent: true, solid: false }),
  kelp: block({ id: "kelp", name: "Kelp", color: "#25794e", hardness: 0.18, preferredTool: "shears", drop: "kelp", transparent: true, solid: false }),
  farmland: block({ id: "farmland", name: "Farmland", color: "#604326", hardness: 0.6, preferredTool: "shovel", drop: "dirt" }),
  meadow_grass_0: block({ id: "meadow_grass_0", name: "Grass Sprout", color: "#4f9634", hardness: 0.04, drop: "grass_seeds", placeable: false, transparent: true, solid: false, plantType: "meadow_grass", growthStage: 0, growthMs: 8500, seedItem: "grass_seeds" }),
  meadow_grass_1: block({ id: "meadow_grass_1", name: "Growing Grass", color: "#5eaa3a", hardness: 0.05, drop: "grass_seeds", placeable: false, transparent: true, solid: false, plantType: "meadow_grass", growthStage: 1, growthMs: 10500, seedItem: "grass_seeds" }),
  meadow_grass_2: block({ id: "meadow_grass_2", name: "Mature Meadow Grass", color: "#6db640", hardness: 0.06, drop: "grass_clippings", placeable: false, transparent: true, solid: false, plantType: "meadow_grass", growthStage: 2, seedItem: "grass_seeds", harvestDrop: "grass_clippings", bonusDrops: [{ item: "grass_seeds", chance: 1 }, { item: "wheat_seeds", chance: 0.22 }] }),
  yellow_flower_0: block({ id: "yellow_flower_0", name: "Flower Sprout", color: "#62a83a", hardness: 0.04, drop: "flower_seeds", placeable: false, transparent: true, solid: false, plantType: "yellow_flower", growthStage: 0, growthMs: 12000, seedItem: "flower_seeds" }),
  yellow_flower_1: block({ id: "yellow_flower_1", name: "Flower Bud", color: "#93b63f", hardness: 0.05, drop: "flower_seeds", placeable: false, transparent: true, solid: false, plantType: "yellow_flower", growthStage: 1, growthMs: 15000, seedItem: "flower_seeds" }),
  yellow_flower_2: block({ id: "yellow_flower_2", name: "Sun Meadow Flower", color: "#efc84a", hardness: 0.05, drop: "yellow_flower", placeable: false, transparent: true, solid: false, plantType: "yellow_flower", growthStage: 2, seedItem: "flower_seeds", harvestDrop: "yellow_flower", bonusDrops: [{ item: "flower_seeds", chance: 1 }, { item: "flower_seeds", chance: 0.35 }] }),
  tall_grass: block({ id: "tall_grass", name: "Legacy Tall Grass", color: "#69ad3d", hardness: 0.06, drop: "grass_clippings", placeable: false, transparent: true, solid: false, plantType: "meadow_grass", growthStage: 2, seedItem: "grass_seeds", bonusDrops: [{ item: "grass_seeds", chance: 1 }, { item: "wheat_seeds", chance: 0.22 }] }),
  wildflower: block({ id: "wildflower", name: "Legacy Meadow Flower", color: "#efc84a", hardness: 0.05, drop: "yellow_flower", placeable: false, transparent: true, solid: false, plantType: "yellow_flower", growthStage: 2, seedItem: "flower_seeds", bonusDrops: [{ item: "flower_seeds", chance: 1 }] }),
  reeds: block({ id: "reeds", name: "Reeds", color: "#7eaa52", hardness: 0.08, drop: "reeds", placeable: false, transparent: true, solid: false }),
  wheat_crop_0: block({ id: "wheat_crop_0", name: "Sprouting Wheat", color: "#78a842", hardness: 0.08, drop: "wheat_seeds", placeable: false, transparent: true, solid: false, plantType: "wheat", growthStage: 0, growthMs: 12000, seedItem: "wheat_seeds" }),
  wheat_crop_1: block({ id: "wheat_crop_1", name: "Young Wheat", color: "#89b84a", hardness: 0.08, drop: "wheat_seeds", placeable: false, transparent: true, solid: false, plantType: "wheat", growthStage: 1, growthMs: 12000, seedItem: "wheat_seeds" }),
  wheat_crop_2: block({ id: "wheat_crop_2", name: "Growing Wheat", color: "#b5b84f", hardness: 0.08, drop: "wheat_seeds", placeable: false, transparent: true, solid: false, plantType: "wheat", growthStage: 2, growthMs: 12000, seedItem: "wheat_seeds" }),
  wheat_crop_3: block({ id: "wheat_crop_3", name: "Mature Wheat", color: "#d9b54a", hardness: 0.08, drop: "wheat", placeable: false, transparent: true, solid: false, plantType: "wheat", growthStage: 3, seedItem: "wheat_seeds", harvestDrop: "wheat", bonusDrops: [{ item: "wheat_seeds", chance: 1 }] }),
  guard_colony_box: block({ id: "guard_colony_box", name: "Guard Post Box", color: "#9e443d", hardness: 1.7, preferredTool: "axe", station: "colony_box" }),
  miner_colony_box: block({ id: "miner_colony_box", name: "Miner Hut Box", color: "#676f77", hardness: 1.7, preferredTool: "axe", station: "colony_box" }),
  farm_colony_box: block({ id: "farm_colony_box", name: "Farm House Box", color: "#6f943f", hardness: 1.7, preferredTool: "axe", station: "colony_box" }),
  animal_colony_box: block({ id: "animal_colony_box", name: "Animal Keeper Box", color: "#9a6b48", hardness: 1.7, preferredTool: "axe", station: "colony_box" }),
  fishing_colony_box: block({ id: "fishing_colony_box", name: "Fishing Hut Box", color: "#3f729e", hardness: 1.7, preferredTool: "axe", station: "colony_box" }),
  builder_colony_box: block({ id: "builder_colony_box", name: "Builder Lodge Box", color: "#a86d3c", hardness: 1.8, preferredTool: "axe", station: "colony_box" }),
  oak_window: block({ id: "oak_window", name: "Oak Framed Window", color: "#8fc8d4", hardness: 0.75, preferredTool: "axe", transparent: true }),
  // Doors use one inventory item but persist their facing/open state as hidden
  // block variants. The lower logical voxel owns a two-block-tall rendered door.
  oak_door: block({ id: "oak_door", name: "Oak Frontier Door", color: "#8f5b32", hardness: 1.25, preferredTool: "axe", drop: "oak_door" }),
  oak_door_ew: block({ id: "oak_door_ew", name: "Oak Frontier Door", color: "#8f5b32", hardness: 1.25, preferredTool: "axe", drop: "oak_door", placeable: false }),
  oak_door_open: block({ id: "oak_door_open", name: "Open Oak Frontier Door", color: "#8f5b32", hardness: 1.25, preferredTool: "axe", drop: "oak_door", placeable: false, solid: false }),
  oak_door_ew_open: block({ id: "oak_door_ew_open", name: "Open Oak Frontier Door", color: "#8f5b32", hardness: 1.25, preferredTool: "axe", drop: "oak_door", placeable: false, solid: false }),
  oak_stairs: block({ id: "oak_stairs", name: "Oak Stairs", color: "#b78348", hardness: 1.35, preferredTool: "axe" }),
  stone_stairs: block({ id: "stone_stairs", name: "Stone Stairs", color: "#72787c", hardness: 2.1, preferredTool: "pickaxe", requiredTier: 1 }),
  ladder: block({ id: "ladder", name: "Oak Ladder", color: "#a8753e", hardness: 0.45, preferredTool: "axe", transparent: true, solid: false }),
  oak_fence: block({ id: "oak_fence", name: "Oak Fence", color: "#9d6a38", hardness: 1.2, preferredTool: "axe" }),
  fence_post: block({ id: "fence_post", name: "Oak Fence Post", color: "#8e5c31", hardness: 1.25, preferredTool: "axe" }),
  oak_fence_gate: block({ id: "oak_fence_gate", name: "Oak Fence Gate", color: "#a06b38", hardness: 1.25, preferredTool: "axe", station: "fence_gate" }),
  oak_fence_gate_open: block({ id: "oak_fence_gate_open", name: "Open Oak Fence Gate", color: "#a06b38", hardness: 1.25, preferredTool: "axe", station: "fence_gate", solid: false }),
  hay_bale: block({ id: "hay_bale", name: "Hay Bale", color: "#c4a83d", hardness: 0.65, preferredTool: "hoe" }),
  oak_table: block({ id: "oak_table", name: "Oak Table", color: "#a66f3d", hardness: 1.1, preferredTool: "axe" }),
  oak_chair: block({ id: "oak_chair", name: "Oak Chair", color: "#9a6336", hardness: 0.9, preferredTool: "axe", solid: false }),
  bookshelf: block({ id: "bookshelf", name: "Frontier Bookshelf", color: "#82522f", hardness: 1.35, preferredTool: "axe" }),
  flower_pot: block({ id: "flower_pot", name: "Clay Flower Pot", color: "#a6573f", hardness: 0.55, preferredTool: "pickaxe", solid: false }),
  woven_rug: block({ id: "woven_rug", name: "Woven Hearth Rug", color: "#8f3d46", hardness: 0.12, preferredTool: "shears", solid: false }),
  wall_lantern: block({ id: "wall_lantern", name: "Wall Lantern", color: "#e5a84f", hardness: 0.45, preferredTool: "pickaxe", solid: false, light: true }),
  arcane_table: block({ id: "arcane_table", name: "Arcane Worktable", color: "#5b3c78", hardness: 2.0, preferredTool: "axe", station: "arcane_table", light: true }),
  wardstone: block({ id: "wardstone", name: "Runic Wardstone", color: "#8f79c5", hardness: 2.6, preferredTool: "pickaxe", requiredTier: 1, light: true }),
  arcane_lantern: block({ id: "arcane_lantern", name: "Arcane Lantern", color: "#75d8ef", hardness: 0.35, preferredTool: "pickaxe", solid: false, light: true }),
  ancient_brick: block({ id: "ancient_brick", name: "Ancient Fortress Brick", color: "#665f5b", hardness: 3.2, preferredTool: "pickaxe", requiredTier: 2 }),
  carved_rune_brick: block({ id: "carved_rune_brick", name: "Carved Rune Brick", color: "#6e6280", hardness: 3.4, preferredTool: "pickaxe", requiredTier: 2, light: true }),
  treasure_chest: block({ id: "treasure_chest", name: "Ruins Treasure Chest", color: "#9a642d", hardness: 1.7, preferredTool: "axe", station: "treasure_chest" }),
  storage_chest: block({ id: "storage_chest", name: "Frontier Storage Chest", color: "#a56b32", hardness: 1.65, preferredTool: "axe", station: "storage_chest" }),
  enchantment_table: block({ id: "enchantment_table", name: "Enchantment Table", color: "#3f245e", hardness: 2.8, preferredTool: "pickaxe", requiredTier: 1, station: "enchantment_table", light: true }),
  paleontology_lab: block({ id: "paleontology_lab", name: "Paleontology Lab", color: "#8a775f", hardness: 2.2, preferredTool: "pickaxe", requiredTier: 1, station: "paleontology_lab" }),
  fossil_block: block({ id: "fossil_block", name: "Fossil-Bearing Stone", color: "#8f8671", hardness: 3.0, preferredTool: "pickaxe", requiredTier: 2, drop: "fossil_fragment", placeable: false, bonusDrops: [{ item: "ancient_bone", chance: 0.65 }, { item: "fossil_fragment", chance: 0.42 }] }),
  village_bell: block({ id: "village_bell", name: "Village Bell", color: "#d7aa43", hardness: 2.0, preferredTool: "pickaxe", station: "village_dialogue", light: true }),
  frontier_bed: block({ id: "frontier_bed", name: "Frontier Resident Bed", color: "#8c3f4d", hardness: 0.8, preferredTool: "axe", station: "housing_bed", solid: false }),
  boss_altar: block({ id: "boss_altar", name: "Convergence Altar", color: "#49325f", hardness: 4.2, preferredTool: "pickaxe", requiredTier: 3, station: "boss_altar", light: true }),
  titan_trophy: block({ id: "titan_trophy", name: "Granite Titan Trophy", color: "#77736a", hardness: 2.4, preferredTool: "pickaxe", light: true }),
  ember_trophy: block({ id: "ember_trophy", name: "Ember Wyrm Trophy", color: "#b84d34", hardness: 2.2, preferredTool: "pickaxe", light: true }),
  void_trophy: block({ id: "void_trophy", name: "Void Lich Trophy", color: "#6b4c91", hardness: 2.4, preferredTool: "pickaxe", light: true }),
  mycelium: block({ id: "mycelium", name: "Deep Mycelium", color: "#6d4f73", hardness: 0.7, preferredTool: "shovel", drop: "dirt" }),
  brown_mushroom: block({ id: "brown_mushroom", name: "Brown Cave Mushroom", color: "#9b6b4a", hardness: 0.05, drop: "brown_mushroom", transparent: true, solid: false }),
  red_mushroom: block({ id: "red_mushroom", name: "Red Cave Mushroom", color: "#c94b4b", hardness: 0.05, drop: "red_mushroom", transparent: true, solid: false }),
  mushroom_stem: block({ id: "mushroom_stem", name: "Giant Mushroom Stem", color: "#d7c6a8", hardness: 0.65, preferredTool: "axe" }),
  red_mushroom_cap: block({ id: "red_mushroom_cap", name: "Giant Red Mushroom Cap", color: "#b83238", hardness: 0.45, preferredTool: "axe", drop: "red_mushroom" }),
  brown_mushroom_cap: block({ id: "brown_mushroom_cap", name: "Giant Brown Mushroom Cap", color: "#856147", hardness: 0.45, preferredTool: "axe", drop: "brown_mushroom" }),
  cobweb: block({ id: "cobweb", name: "Ancient Cobweb", color: "#dedede", hardness: 0.15, preferredTool: "sword", drop: "string", transparent: true, solid: false }),
  mossy_cobblestone: block({ id: "mossy_cobblestone", name: "Mossy Cobblestone", color: "#59634f", hardness: 2.1, preferredTool: "pickaxe", requiredTier: 1 }),
  cracked_bone_brick: block({ id: "cracked_bone_brick", name: "Cracked Bone Brick", color: "#b9ad91", hardness: 2.7, preferredTool: "pickaxe", requiredTier: 2, bonusDrops: [{ item: "bone", chance: 0.22 }] }),
  monster_spawner: block({ id: "monster_spawner", name: "Cursed Monster Spawner", color: "#493a58", hardness: 4.5, preferredTool: "pickaxe", requiredTier: 3, drop: "enchanted_core", placeable: false, light: true }),
  torch: block({
    id: "torch",
    name: "Torch",
    color: "#ffc84b",
    hardness: 0.05,
    drop: "torch",
    solid: false,
    light: true,
  }),
};

const tool = (name, icon, toolType, tier, speed, durability, attackDamage, color) => ({
  name,
  icon,
  category: "tool",
  maxStack: 1,
  color,
  toolType,
  tier,
  speed,
  durability,
  attackDamage,
});

const material = (name, icon, color, extra = {}) => ({
  name,
  icon,
  category: "material",
  maxStack: 64,
  color,
  ...extra,
});

const armorItem = (name, slot, defense, durability, color, materialId) => ({
  name,
  icon: "◇",
  category: "armor",
  maxStack: 1,
  color,
  armorSlot: slot,
  defense,
  durability,
  materialId,
});

export const ITEM_TYPES = {
  ...Object.fromEntries(
    Object.values(BLOCK_TYPES).map((definition) => [
      definition.id,
      {
        name: definition.name,
        icon: definition.id === "torch" ? "†" : "■",
        category: "block",
        maxStack: 64,
        color: definition.color,
        placeable: definition.placeable,
      },
    ])
  ),
  sapling: material("Oak Sapling", "♣", "#5aa447"),
  spruce_sapling: material("Spruce Sapling", "♣", "#39715a"),
  jungle_sapling: material("Jungle Sapling", "♣", "#3f9843"),
  grass_seeds: material("Grass Seeds", "·", "#6cad3f", { category: "seed", plantType: "meadow_grass" }),
  flower_seeds: material("Flower Seeds", "·", "#d5ae39", { category: "seed", plantType: "yellow_flower" }),
  grass_clippings: material("Grass Clippings", "≋", "#5da63a"),
  yellow_flower: material("Sun Meadow Flower", "✿", "#efc84a"),
  sticks: material("Sticks", "╱", "#9d6c3d"),
  coal: material("Coal", "●", "#262a2e", { fuel: 8 }),
  charcoal: material("Charcoal", "●", "#3b3430", { fuel: 8 }),
  raw_copper: material("Raw Copper", "◆", "#be7148"),
  copper_ingot: material("Copper Ingot", "▰", "#da865a"),
  raw_iron: material("Raw Iron", "◆", "#bd8c68"),
  iron_ingot: material("Iron Ingot", "▰", "#d4d8da"),
  raw_gold: material("Raw Gold", "◆", "#d6b43e"),
  gold_ingot: material("Gold Ingot", "▰", "#f3d34d"),
  redstone: material("Redstone", "✦", "#d13a3a"),
  emerald: material("Emerald", "◆", "#38d97b"),
  diamond: material("Diamond", "◆", "#49dedc"),
  wool: material("Wool", "▣", "#eeeeee"),
  leather: material("Leather", "◒", "#8a4f2a"),
  feather: material("Feather", "⌁", "#f1efe6"),
  egg: material("Egg", "●", "#eee5c8", { category: "throwable", maxStack: 16, throwable: "egg" }),
  wheat_seeds: material("Wheat Seeds", "·", "#9da54d", { category: "seed" }),
  wildflower: material("Wildflower", "✿", "#d7a1dc"),
  reeds: material("Reeds", "≀", "#7eaa52"),
  bone: material("Bone", "╱", "#eee7cf"),
  string: material("String", "≈", "#e8e0d4"),
  spider_eye: material("Spider Eye", "◉", "#a53030"),
  arrow_bundle: material("Arrow Bundle", "➶", "#d1d5d8"),
  bow_fragment: material("Bow Fragment", ")", "#8d6543"),
  iron_nugget: material("Iron Nugget", "•", "#c7cdd1"),
  copper_nugget: material("Copper Nugget", "•", "#d27f55"),
  gold_nugget: material("Gold Nugget", "•", "#edca45"),
  ancient_coin: material("Ancient Coin", "◌", "#e2be59"),
  treasure_map_fragment: material("Treasure Map Fragment", "⌘", "#d3c7a1"),
  slime_ball: material("Slime Ball", "●", "#63c751"),
  arcane_dust: material("Arcane Dust", "✦", "#9b7be8", { category: "arcane" }),
  primal_crystal: material("Primal Crystal", "◆", "#74d9ef", { category: "arcane", maxStack: 32 }),
  golem_core: material("Golem Core", "◈", "#c58f58", { category: "arcane", maxStack: 16 }),
  enchantment_shard: material("Enchantment Shard", "✧", "#ba8cff", { category: "arcane", maxStack: 32 }),
  fossil_fragment: material("Fossil Fragment", "⌁", "#b7a886", { category: "archaeology" }),
  ancient_bone: material("Ancient Bone", "╱", "#e8ddbd", { category: "archaeology" }),
  dinosaur_dna: material("Stabilized Dinosaur DNA", "⌬", "#75d5a5", { category: "archaeology", maxStack: 16 }),
  dinosaur_egg: material("Spliced Dinosaur Egg", "●", "#8db46f", { category: "archaeology", maxStack: 8 }),
  dragon_scale: material("Dragon Scale", "◆", "#c36754", { category: "mythic", maxStack: 32 }),
  serpent_scale: material("Sea Serpent Scale", "◆", "#4aa6a3", { category: "mythic", maxStack: 32 }),
  hydra_fang: material("Hydra Fang", "▲", "#98b85c", { category: "mythic", maxStack: 32 }),
  titan_core: material("Titan Core", "◈", "#9b9688", { category: "boss_summon", maxStack: 8 }),
  ember_crown: material("Ember Crown", "♛", "#ed6b3a", { category: "boss_summon", maxStack: 8 }),
  void_reliquary: material("Void Reliquary", "◆", "#9c72d8", { category: "boss_summon", maxStack: 8 }),
  titan_heart: material("Titan Heartstone", "●", "#b5aa91", { category: "boss_loot", maxStack: 16 }),
  wyrmfire_scale: material("Wyrmfire Scale", "◆", "#f47d42", { category: "boss_loot", maxStack: 32 }),
  void_essence: material("Condensed Void Essence", "✦", "#b68cff", { category: "boss_loot", maxStack: 32 }),
  apple: material("Apple", "●", "#d83b36", { category: "food", food: 4, heal: 1, tameFood: ["horse"] }),
  golden_apple: material("Golden Apple", "●", "#f2cf49", { category: "food", food: 10, heal: 8, mana: 12, maxStack: 16, tameFood: ["horse"] }),
  bowl: material("Wooden Bowl", "◡", "#a97542", { maxStack: 64 }),
  mushroom_soup: material("Mushroom Soup", "◡", "#c98a55", { category: "food", food: 7, heal: 3, returnsItem: "bowl", maxStack: 16 }),
  enchanted_core: material("Enchanted Mob Core", "✦", "#c17cff", { category: "arcane", maxStack: 32 }),
  wheat: material("Wheat", "≋", "#d9b54a", { tameFood: ["horse"] }),
  raw_fish: material("Raw Fish", "◖", "#75a9c7", { category: "food", food: 2 }),
  cooked_fish: material("Cooked Fish", "◖", "#b88755", { category: "food", food: 6 }),
  boat: material("Oak Boat", "▱", "#9b693b", { category: "vehicle", maxStack: 16, placeableVehicle: true }),
  bucket: material("Empty Bucket", "∪", "#aeb7bc", { maxStack: 16 }),
  water_bucket: material("Water Bucket", "∪", "#4ca6e8", { maxStack: 1, category: "utility", liquidSource: "water" }),
  lava_bucket: material("Lava Bucket", "∪", "#f06b26", { maxStack: 1, category: "utility", liquidSource: "lava" }),
  raw_beef: material("Raw Beef", "◖", "#a83939", { category: "food", food: 3 }),
  raw_mutton: material("Raw Mutton", "◖", "#b94c4c", { category: "food", food: 2 }),
  raw_porkchop: material("Raw Porkchop", "◖", "#db7777", { category: "food", food: 3 }),
  raw_chicken: material("Raw Chicken", "◖", "#e8b2a0", { category: "food", food: 2 }),
  cooked_beef: material("Cooked Beef", "◖", "#70402a", { category: "food", food: 8 }),
  cooked_mutton: material("Cooked Mutton", "◖", "#86513b", { category: "food", food: 6 }),
  cooked_porkchop: material("Cooked Porkchop", "◖", "#9d5e4b", { category: "food", food: 7 }),
  cooked_chicken: material("Cooked Chicken", "◖", "#a86d4c", { category: "food", food: 6 }),
  rotten_flesh: material("Rotten Flesh", "◖", "#6d7b38", { category: "food", food: 1 }),

  wooden_wand: { ...tool("Wooden Wand", "╱", "wand", 1, 1, 120, 2, "#9b7047"), wandTier: 1, arcaneFocus: true },
  copper_wand: { ...tool("Copper-Capped Wand", "╱", "wand", 2, 1, 210, 3, "#d4865c"), wandTier: 2, arcaneFocus: true },
  ironbound_wand: { ...tool("Ironbound Runic Wand", "╱", "wand", 3, 1, 380, 4, "#a8cbd2"), wandTier: 3, arcaneFocus: true },
  fishing_rod: tool("Fishing Rod", "⌁", "fishing_rod", 1, 1, 96, 1, "#8b673f"),
  leather_pickaxe: tool("Leather-Bound Pickaxe", "⛏", "pickaxe", 1, 1.8, 44, 2, "#8a4f2a"),
  leather_axe: tool("Leather-Bound Axe", "🪓", "axe", 1, 2.05, 44, 3, "#8a4f2a"),
  leather_shovel: tool("Leather-Bound Shovel", "♠", "shovel", 1, 2.25, 44, 2, "#8a4f2a"),
  leather_sword: tool("Leather-Bound Sword", "†", "sword", 1, 1, 44, 3, "#8a4f2a"),
  leather_hoe: tool("Leather-Bound Hoe", "⌝", "hoe", 1, 1.6, 44, 1, "#8a4f2a"),
  wooden_hoe: tool("Wooden Hoe", "⌝", "hoe", 1, 1.8, 59, 1, "#9f7046"),
  stone_hoe: tool("Stone Hoe", "⌝", "hoe", 2, 3.3, 131, 2, "#777d82"),
  iron_hoe: tool("Iron Hoe", "⌝", "hoe", 3, 5.4, 250, 3, "#d0d5d8"),
  diamond_hoe: tool("Diamond Hoe", "⌝", "hoe", 4, 7.2, 1561, 4, "#49dedc"),

  wooden_pickaxe: tool("Wooden Pickaxe", "⛏", "pickaxe", 1, 2.2, 59, 2, "#9f7046"),
  stone_pickaxe: tool("Stone Pickaxe", "⛏", "pickaxe", 2, 4.6, 131, 3, "#777d82"),
  iron_pickaxe: tool("Iron Pickaxe", "⛏", "pickaxe", 3, 7.5, 250, 4, "#d0d5d8"),
  golden_pickaxe: tool("Golden Pickaxe", "⛏", "pickaxe", 3, 11, 80, 3, "#f3d34d"),
  diamond_pickaxe: tool("Diamond Pickaxe", "⛏", "pickaxe", 4, 9.5, 1561, 5, "#49dedc"),

  wooden_axe: tool("Wooden Axe", "🪓", "axe", 1, 2.5, 59, 4, "#9f7046"),
  stone_axe: tool("Stone Axe", "🪓", "axe", 2, 4.9, 131, 5, "#777d82"),
  iron_axe: tool("Iron Axe", "🪓", "axe", 3, 7.8, 250, 6, "#d0d5d8"),
  diamond_axe: tool("Diamond Axe", "🪓", "axe", 4, 9.8, 1561, 7, "#49dedc"),

  wooden_shovel: tool("Wooden Shovel", "♠", "shovel", 1, 2.8, 59, 2, "#9f7046"),
  stone_shovel: tool("Stone Shovel", "♠", "shovel", 2, 5.2, 131, 3, "#777d82"),
  iron_shovel: tool("Iron Shovel", "♠", "shovel", 3, 8.2, 250, 4, "#d0d5d8"),
  diamond_shovel: tool("Diamond Shovel", "♠", "shovel", 4, 10.2, 1561, 5, "#49dedc"),

  wooden_sword: tool("Wooden Sword", "†", "sword", 1, 1, 59, 4, "#9f7046"),
  stone_sword: tool("Stone Sword", "†", "sword", 2, 1, 131, 6, "#777d82"),
  iron_sword: tool("Iron Sword", "†", "sword", 3, 1, 250, 7, "#d0d5d8"),
  golden_sword: tool("Golden Sword", "†", "sword", 3, 1, 80, 6, "#f3d34d"),
  diamond_sword: tool("Diamond Sword", "†", "sword", 4, 1, 1561, 9, "#49dedc"),

  wooden_spear: { ...tool("Wooden Spear", "➶", "spear", 1, 1.05, 82, 5, "#9f7046"), weaponClass: "spear", reach: 1.35 },
  iron_spear: { ...tool("Iron Spear", "➶", "spear", 3, 1.1, 310, 8, "#cfd7db"), weaponClass: "spear", reach: 1.55 },
  iron_katana: { ...tool("Iron Katana", "╱", "katana", 3, 1.18, 285, 8, "#d6dde0"), weaponClass: "katana", comboSpeed: 1.2 },
  iron_greatsword: { ...tool("Iron Greatsword", "†", "greatsword", 3, 0.82, 420, 11, "#bfc8ce"), weaponClass: "greatsword", heavy: true },
  iron_halberd: { ...tool("Iron Halberd", "⚒", "halberd", 3, 0.92, 390, 10, "#cbd2d6"), weaponClass: "halberd", reach: 1.7 },
  raider_katana: { ...tool("Enchanted Raider Katana", "╱", "katana", 4, 1.3, 520, 12, "#b98cff"), weaponClass: "katana", preEnchanted: { sharpness: 2, durability: 1 } },
  runed_greatsword: { ...tool("Runed Greatsword", "†", "greatsword", 4, 0.88, 680, 15, "#7dd6ef"), weaponClass: "greatsword", heavy: true, preEnchanted: { sharpness: 3 } },
  guardian_halberd: { ...tool("Guardian Halberd", "⚒", "halberd", 4, 1.0, 640, 14, "#e0bf61"), weaponClass: "halberd", reach: 1.9, preEnchanted: { reach: 2, durability: 2 } },
  iron_warhammer: { ...tool("Iron Warhammer", "◆", "warhammer", 3, 0.74, 460, 13, "#aeb8bf"), weaponClass: "warhammer", heavy: true, stagger: 0.25 },
  iron_scythe: { ...tool("Iron War Scythe", "☾", "scythe", 3, 1.04, 365, 9, "#c7d0d5"), weaponClass: "scythe", reach: 1.68, sweeping: true },
  storm_warhammer: { ...tool("Stormforged Warhammer", "◆", "warhammer", 4, 0.82, 760, 17, "#70d6ef"), weaponClass: "warhammer", heavy: true, stagger: 0.42, preEnchanted: { sharpness: 2, sweeping: 2, durability: 2 } },
  dragon_scythe: { ...tool("Dragonbone Scythe", "☾", "scythe", 4, 1.12, 690, 15, "#d7a1ff"), weaponClass: "scythe", reach: 2.0, sweeping: true, preEnchanted: { sharpness: 2, reach: 2, vampiric: 1 } },
  titan_maul: { ...tool("Titanbreaker Maul", "◆", "warhammer", 5, 0.78, 980, 22, "#d0c4a8"), weaponClass: "warhammer", heavy: true, stagger: 0.62, preEnchanted: { sharpness: 3, sweeping: 2, durability: 3 } },
  ember_lance: { ...tool("Wyrmfire Lance", "➶", "spear", 5, 1.22, 860, 19, "#ff7d43"), weaponClass: "spear", reach: 2.35, preEnchanted: { sharpness: 3, reach: 3, durability: 2 } },
  void_reaper: { ...tool("Void Reaper", "☾", "scythe", 5, 1.18, 900, 20, "#b68cff"), weaponClass: "scythe", reach: 2.2, sweeping: true, preEnchanted: { sharpness: 3, vampiric: 2, durability: 2 } },

  leather_helmet: armorItem("Leather Cap", "helmet", 1, 70, "#8a5c38", "leather"),
  leather_chestplate: armorItem("Leather Tunic", "chestplate", 2, 105, "#8a5c38", "leather"),
  leather_leggings: armorItem("Leather Trousers", "leggings", 2, 95, "#8a5c38", "leather"),
  leather_boots: armorItem("Leather Boots", "boots", 1, 80, "#8a5c38", "leather"),

  copper_helmet: armorItem("Copper Helmet", "helmet", 2, 120, "#c77b50", "copper"),
  copper_chestplate: armorItem("Copper Chestplate", "chestplate", 4, 180, "#c77b50", "copper"),
  copper_leggings: armorItem("Copper Leggings", "leggings", 3, 165, "#c77b50", "copper"),
  copper_boots: armorItem("Copper Boots", "boots", 1, 135, "#c77b50", "copper"),

  iron_helmet: armorItem("Iron Helmet", "helmet", 3, 165, "#d4d8da", "iron"),
  iron_chestplate: armorItem("Iron Chestplate", "chestplate", 6, 240, "#d4d8da", "iron"),
  iron_leggings: armorItem("Iron Leggings", "leggings", 5, 225, "#d4d8da", "iron"),
  iron_boots: armorItem("Iron Boots", "boots", 2, 195, "#d4d8da", "iron"),

  gold_helmet: armorItem("Gold Helmet", "helmet", 2, 110, "#f3d34d", "gold"),
  gold_chestplate: armorItem("Gold Chestplate", "chestplate", 5, 160, "#f3d34d", "gold"),
  gold_leggings: armorItem("Gold Leggings", "leggings", 3, 145, "#f3d34d", "gold"),
  gold_boots: armorItem("Gold Boots", "boots", 1, 125, "#f3d34d", "gold"),

  diamond_helmet: armorItem("Diamond Helmet", "helmet", 4, 365, "#49dedc", "diamond"),
  diamond_chestplate: armorItem("Diamond Chestplate", "chestplate", 8, 525, "#49dedc", "diamond"),
  diamond_leggings: armorItem("Diamond Leggings", "leggings", 6, 495, "#49dedc", "diamond"),
  diamond_boots: armorItem("Diamond Boots", "boots", 3, 430, "#49dedc", "diamond"),
};

export const DEFAULT_HOTBAR = [null, null, null, null, null, null, null, null, null];
export const INITIAL_INVENTORY = {};

const toolRecipe = (id, name, station, headItem, headCount, sticks, description) => ({
  id,
  name,
  station,
  inputs: { [headItem]: headCount, sticks },
  outputs: { [id]: 1 },
  description,
});

const armorRecipe = (id, name, input, amount, pattern, description) => ({
  id,
  name,
  station: "crafting_table",
  inputs: { [input]: amount },
  outputs: { [id]: 1 },
  pattern,
  description,
});

export const PLANT_GROWTH = {
  wheat: { seedItem: "wheat_seeds", stages: ["wheat_crop_0", "wheat_crop_1", "wheat_crop_2", "wheat_crop_3"], stageMs: 12000, requiresFarmland: true },
  meadow_grass: { seedItem: "grass_seeds", stages: ["meadow_grass_0", "meadow_grass_1", "meadow_grass_2"], stageMs: 9500, requiresFarmland: false },
  yellow_flower: { seedItem: "flower_seeds", stages: ["yellow_flower_0", "yellow_flower_1", "yellow_flower_2"], stageMs: 14000, requiresFarmland: false },
};

export const getPlantGrowth = (plantType) => PLANT_GROWTH[plantType] || null;

export const getPlantStageDuration = (plantType, stage = 0) => {
  const growth = getPlantGrowth(plantType);
  if (!growth) return 0;
  const safeStage = Math.max(0, Math.min(growth.stages.length - 1, Number(stage) || 0));
  const stageBlock = BLOCK_TYPES[growth.stages[safeStage]];
  return Math.max(1000, Number(stageBlock?.growthMs) || Number(growth.stageMs) || 1000);
};

export const getPlantTotalGrowthMs = (plantType) => {
  const growth = getPlantGrowth(plantType);
  if (!growth) return 0;
  return growth.stages.slice(0, -1).reduce((total, _blockType, stage) => total + getPlantStageDuration(plantType, stage), 0);
};

export const RECIPES = [
  { id: "planks", name: "Oak Planks", station: "inventory", inputs: { wood: 1 }, outputs: { planks: 4 }, description: "Turn an oak log into four planks." },
  { id: "spruce_planks", name: "Spruce Planks", station: "inventory", inputs: { spruce_wood: 1 }, outputs: { planks: 4 }, description: "Turn a spruce log into four universal building planks." },
  { id: "jungle_planks", name: "Jungle Planks", station: "inventory", inputs: { jungle_wood: 1 }, outputs: { planks: 4 }, description: "Turn a jungle log into four universal building planks." },
  { id: "sticks", name: "Sticks", station: "inventory", inputs: { planks: 2 }, outputs: { sticks: 4 }, description: "Basic handles for tools, weapons, and torches." },
  { id: "crafting_table", name: "Crafting Table", station: "inventory", inputs: { planks: 4 }, outputs: { crafting_table: 1 }, description: "Unlocks full tool and workstation recipes." },
  { id: "torch_coal", name: "Coal Torches", station: "inventory", inputs: { coal: 1, sticks: 1 }, outputs: { torch: 4 }, description: "Placeable light sources made with coal." },
  { id: "torch_charcoal", name: "Charcoal Torches", station: "inventory", inputs: { charcoal: 1, sticks: 1 }, outputs: { torch: 4 }, description: "Placeable light sources made with charcoal." },
  { id: "furnace", name: "Furnace", station: "crafting_table", inputs: { cobblestone: 8 }, outputs: { furnace: 1 }, description: "Smelts ore, makes charcoal, glass, and cooked food." },
  { id: "boat", name: "Oak Boat", station: "crafting_table", inputs: { planks: 5 }, outputs: { boat: 1 }, description: "Place on water, right click to board, and ride across waves." },
  { id: "oak_window", name: "Oak Framed Windows", station: "crafting_table", inputs: { planks: 2, glass: 4 }, outputs: { oak_window: 4 }, description: "Clear framed windows for detailed house walls." },
  { id: "oak_door", name: "Oak Frontier Door", station: "crafting_table", inputs: { planks: 6, iron_nugget: 1 }, outputs: { oak_door: 2 }, description: "A sturdy decorative door block for houses and workshops." },
  { id: "oak_stairs", name: "Oak Stairs", station: "crafting_table", inputs: { planks: 6 }, outputs: { oak_stairs: 4 }, description: "Stepped oak blocks for roofs, porches, and smooth vertical paths." },
  { id: "stone_stairs", name: "Stone Stairs", station: "crafting_table", inputs: { cobblestone: 6 }, outputs: { stone_stairs: 4 }, description: "Durable stone steps for keeps, mines, and kingdoms." },
  { id: "ladder", name: "Oak Ladders", station: "crafting_table", inputs: { sticks: 7 }, outputs: { ladder: 3 }, description: "Climb vertical shafts, towers, treehouses, and settlement walls." },
  { id: "oak_fence", name: "Oak Fences", station: "crafting_table", inputs: { planks: 4, sticks: 2 }, outputs: { oak_fence: 3 }, description: "Narrow connected barriers for farms, roads, and defenses." },
  { id: "fence_post", name: "Oak Fence Posts", station: "crafting_table", inputs: { planks: 2, sticks: 2 }, outputs: { fence_post: 2 }, description: "Strong posts used for corners, lamps, and patrol boundaries." },
  { id: "oak_fence_gate", name: "Oak Fence Gate", station: "crafting_table", inputs: { planks: 2, sticks: 4 }, outputs: { oak_fence_gate: 1 }, description: "An interactive gate that opens and closes inside fence lines." },
  { id: "hay_bale", name: "Hay Bale", station: "crafting_table", inputs: { wheat: 9 }, outputs: { hay_bale: 1 }, description: "Compact animal feed that heals, calms, and supports ranchers." },
  { id: "iron_nuggets", name: "Iron Nuggets", station: "crafting_table", inputs: { iron_ingot: 1 }, outputs: { iron_nugget: 9 }, description: "Break one iron ingot into nine crafting nuggets." },
  { id: "copper_nuggets", name: "Copper Nuggets", station: "crafting_table", inputs: { copper_ingot: 1 }, outputs: { copper_nugget: 9 }, description: "Break one copper ingot into nine crafting nuggets." },
  { id: "gold_nuggets", name: "Gold Nuggets", station: "crafting_table", inputs: { gold_ingot: 1 }, outputs: { gold_nugget: 9 }, description: "Break one gold ingot into nine crafting nuggets." },
  { id: "iron_ingot_from_nuggets", name: "Iron Ingot from Nuggets", station: "crafting_table", inputs: { iron_nugget: 9 }, outputs: { iron_ingot: 1 }, description: "Compress nine iron nuggets back into an ingot." },
  { id: "copper_ingot_from_nuggets", name: "Copper Ingot from Nuggets", station: "crafting_table", inputs: { copper_nugget: 9 }, outputs: { copper_ingot: 1 }, description: "Compress nine copper nuggets back into an ingot." },
  { id: "gold_ingot_from_nuggets", name: "Gold Ingot from Nuggets", station: "crafting_table", inputs: { gold_nugget: 9 }, outputs: { gold_ingot: 1 }, description: "Compress nine gold nuggets back into an ingot." },
  { id: "oak_table", name: "Oak Table", station: "crafting_table", inputs: { planks: 5, sticks: 2 }, outputs: { oak_table: 1 }, description: "A compact table with a detailed top and four legs." },
  { id: "oak_chair", name: "Oak Chairs", station: "crafting_table", inputs: { planks: 3, sticks: 4 }, outputs: { oak_chair: 2 }, description: "Placeable chairs for cabins, taverns, and colony homes." },
  { id: "bookshelf", name: "Frontier Bookshelf", station: "crafting_table", inputs: { planks: 6, leather: 2, treasure_map_fragment: 1 }, outputs: { bookshelf: 1 }, description: "A satisfying storage and study decoration." },
  { id: "flower_pot", name: "Clay Flower Pots", station: "crafting_table", inputs: { dirt: 2, raw_copper: 1 }, outputs: { flower_pot: 2 }, description: "Small decorative pots for tables and window ledges." },
  { id: "woven_rug", name: "Woven Hearth Rug", station: "crafting_table", inputs: { wool: 4, string: 2 }, outputs: { woven_rug: 2 }, description: "A low decorative rug that can replace grass or snow cover." },
  { id: "wall_lantern", name: "Wall Lantern", station: "crafting_table", inputs: { iron_nugget: 4, glass: 1, torch: 1 }, outputs: { wall_lantern: 2 }, description: "Warm architectural lighting for interiors and paths." },
  { id: "frontier_bed", name: "Frontier Resident Bed", station: "crafting_table", inputs: { planks: 4, wool: 3, leather: 1 }, outputs: { frontier_bed: 1 }, description: "Place inside a completed room and assign it to recruit a persistent NPC resident." },
  { id: "boss_altar", name: "Convergence Altar", station: "crafting_table", inputs: { ancient_brick: 8, carved_rune_brick: 4, diamond: 2, primal_crystal: 2 }, outputs: { boss_altar: 1 }, description: "A ritual station used with crafted catalysts to summon advanced world bosses." },
  { id: "titan_core", name: "Titan Core", station: "arcane_table", inputs: { cobblestone: 24, iron_ingot: 6, golem_core: 1, primal_crystal: 1 }, outputs: { titan_core: 1 }, description: "Boss catalyst for the Granite Titan." },
  { id: "ember_crown", name: "Ember Crown", station: "arcane_table", inputs: { dragon_scale: 4, gold_ingot: 6, redstone: 8, primal_crystal: 1 }, outputs: { ember_crown: 1 }, description: "Boss catalyst for the Ember Wyrm." },
  { id: "void_reliquary", name: "Void Reliquary", station: "arcane_table", inputs: { enchantment_shard: 8, ancient_bone: 6, diamond: 2, arcane_dust: 12 }, outputs: { void_reliquary: 1 }, description: "Boss catalyst for the Void Lich." },
  { id: "wooden_wand", name: "Wooden Wand", station: "crafting_table", inputs: { sticks: 2, glass: 1, arcane_dust: 1 }, outputs: { wooden_wand: 1 }, description: "A starter focus for basic spellcasting." },
  { id: "copper_wand", name: "Copper-Capped Wand", station: "arcane_table", inputs: { wooden_wand: 1, copper_ingot: 3, arcane_dust: 3 }, outputs: { copper_wand: 1 }, description: "A more efficient wand that reduces mana costs." },
  { id: "ironbound_wand", name: "Ironbound Runic Wand", station: "arcane_table", inputs: { copper_wand: 1, iron_ingot: 3, primal_crystal: 1 }, outputs: { ironbound_wand: 1 }, description: "A durable advanced focus with the best mana efficiency." },
  { id: "arcane_table", name: "Arcane Worktable", station: "crafting_table", inputs: { planks: 4, glass: 2, copper_ingot: 2, arcane_dust: 2 }, outputs: { arcane_table: 1 }, description: "Place and open it to unlock spell, ward, and construct research." },
  { id: "golem_core", name: "Golem Core", station: "arcane_table", inputs: { iron_ingot: 2, redstone: 2, arcane_dust: 3 }, outputs: { golem_core: 1 }, description: "Consumed when animating an arcane golem construct." },
  { id: "enchantment_table", name: "Enchantment Table", station: "crafting_table", inputs: { ancient_brick: 4, diamond: 1, bookshelf: 1, arcane_dust: 4 }, outputs: { enchantment_table: 1 }, description: "Channels experience and arcane shards into tools, weapons, and armor." },
  { id: "paleontology_lab", name: "Paleontology Lab", station: "crafting_table", inputs: { planks: 4, glass: 3, iron_ingot: 3, primal_crystal: 1 }, outputs: { paleontology_lab: 1 }, description: "Analyzes fossils, stabilizes DNA, and splices dinosaur eggs." },
  { id: "wooden_spear", name: "Wooden Spear", station: "crafting_table", inputs: { sticks: 3, planks: 1 }, outputs: { wooden_spear: 1 }, description: "A quick thrusting weapon with safer reach." },
  { id: "iron_spear", name: "Iron Spear", station: "crafting_table", inputs: { sticks: 3, iron_ingot: 2 }, outputs: { iron_spear: 1 }, description: "A long iron spear with a focused thrust animation." },
  { id: "iron_katana", name: "Iron Katana", station: "crafting_table", inputs: { iron_ingot: 3, sticks: 1, leather: 1 }, outputs: { iron_katana: 1 }, description: "A fast curved blade with a drawing slash animation." },
  { id: "iron_greatsword", name: "Iron Greatsword", station: "crafting_table", inputs: { iron_ingot: 5, sticks: 2, leather: 1 }, outputs: { iron_greatsword: 1 }, description: "A heavy two-handed blade with a committed overhead swing." },
  { id: "iron_halberd", name: "Iron Halberd", station: "crafting_table", inputs: { iron_ingot: 4, sticks: 3 }, outputs: { iron_halberd: 1 }, description: "A sweeping polearm with strong reach and crowd control." },
  { id: "iron_warhammer", name: "Iron Warhammer", station: "crafting_table", inputs: { iron_ingot: 5, sticks: 2, leather: 1 }, outputs: { iron_warhammer: 1 }, description: "A crushing two-handed weapon with a weighty overhead impact animation." },
  { id: "iron_scythe", name: "Iron War Scythe", station: "crafting_table", inputs: { iron_ingot: 4, sticks: 3, leather: 1 }, outputs: { iron_scythe: 1 }, description: "A long sweeping blade with a wide reaping animation and extended reach." },
  { id: "storage_chest", name: "Frontier Storage Chest", station: "crafting_table", inputs: { planks: 8, iron_nugget: 1 }, outputs: { storage_chest: 1 }, description: "A persistent 27-slot chest for player storage. Breaking it releases everything inside." },
  { id: "bucket", name: "Empty Bucket", station: "crafting_table", inputs: { iron_ingot: 3 }, outputs: { bucket: 1 }, pattern: ["I I", " I ", "   "], description: "Collect and place water or lava sources." },
  { id: "fishing_rod", name: "Fishing Rod", station: "crafting_table", inputs: { sticks: 3, wool: 2 }, outputs: { fishing_rod: 1 }, pattern: ["  S", " SW", "S W"], description: "Cast into water. Reel in when the bobber dives." },
  { id: "guard_colony_box", name: "Guard Post Box", station: "crafting_table", inputs: { planks: 8, iron_ingot: 2, wool: 1 }, outputs: { guard_colony_box: 1 }, description: "Place to establish a guard post and recruit a defender." },
  { id: "miner_colony_box", name: "Miner Hut Box", station: "crafting_table", inputs: { planks: 8, stone_pickaxe: 1, torch: 2 }, outputs: { miner_colony_box: 1 }, description: "Place to recruit a miner who gathers nearby stone and ore." },
  { id: "farm_colony_box", name: "Farm House Box", station: "crafting_table", inputs: { planks: 8, wheat_seeds: 8, dirt: 4 }, outputs: { farm_colony_box: 1 }, description: "Place to recruit a farmer who plants, grows, and harvests wheat." },
  { id: "animal_colony_box", name: "Animal Keeper Box", station: "crafting_table", inputs: { planks: 8, wheat: 4 }, outputs: { animal_colony_box: 1 }, description: "Place to recruit a keeper who gathers and breeds passive animals." },
  { id: "fishing_colony_box", name: "Fishing Hut Box", station: "crafting_table", inputs: { planks: 8, fishing_rod: 1, boat: 1 }, outputs: { fishing_colony_box: 1 }, description: "Place near water to recruit a fisher who supplies the colony." },
  { id: "builder_colony_box", name: "Builder Lodge Box", station: "crafting_table", inputs: { planks: 16, cobblestone: 12, iron_ingot: 2, torch: 2 }, outputs: { builder_colony_box: 1 }, description: "Recruit a builder who constructs a furnished house one block at a time in the loaded world." },
  { id: "bowl", name: "Wooden Bowls", station: "inventory", inputs: { planks: 3 }, outputs: { bowl: 4 }, description: "Reusable bowls for soups and cooked meals." },
  { id: "mushroom_soup", name: "Mushroom Soup", station: "inventory", inputs: { bowl: 1, red_mushroom: 1, brown_mushroom: 1 }, outputs: { mushroom_soup: 1 }, description: "A warm underground mushroom soup. Eating it returns the bowl." },
  { id: "golden_apple", name: "Golden Apple", station: "crafting_table", inputs: { apple: 1, gold_ingot: 8 }, outputs: { golden_apple: 1 }, description: "A rare restorative apple that replenishes hunger, health, and mana." },
  { id: "leather_pickaxe", name: "Leather-Bound Pickaxe", station: "crafting_table", inputs: { leather: 2, sticks: 2, planks: 1 }, outputs: { leather_pickaxe: 1 }, description: "A lightweight starter pick with a reinforced leather grip." },
  { id: "leather_axe", name: "Leather-Bound Axe", station: "crafting_table", inputs: { leather: 2, sticks: 2, planks: 1 }, outputs: { leather_axe: 1 }, description: "A light woodcutting tool made from hide and timber." },
  { id: "leather_shovel", name: "Leather-Bound Shovel", station: "crafting_table", inputs: { leather: 1, sticks: 2, planks: 1 }, outputs: { leather_shovel: 1 }, description: "A flexible starter digging tool." },
  { id: "leather_sword", name: "Leather-Bound Sword", station: "crafting_table", inputs: { leather: 2, sticks: 1, planks: 1 }, outputs: { leather_sword: 1 }, description: "A basic padded weapon for early defense." },
  { id: "leather_hoe", name: "Leather-Bound Hoe", station: "crafting_table", inputs: { leather: 2, sticks: 2 }, outputs: { leather_hoe: 1 }, description: "Tills soil for crop planting." },

  toolRecipe("wooden_pickaxe", "Wooden Pickaxe", "crafting_table", "planks", 3, 2, "Mines stone, coal, and copper."),
  toolRecipe("stone_pickaxe", "Stone Pickaxe", "crafting_table", "cobblestone", 3, 2, "Mines iron and works faster on stone."),
  toolRecipe("iron_pickaxe", "Iron Pickaxe", "crafting_table", "iron_ingot", 3, 2, "Mines gold, redstone, emerald, and diamond."),
  toolRecipe("golden_pickaxe", "Golden Pickaxe", "crafting_table", "gold_ingot", 3, 2, "Very fast, but less durable."),
  toolRecipe("diamond_pickaxe", "Diamond Pickaxe", "crafting_table", "diamond", 3, 2, "Fastest durable mining tool."),

  toolRecipe("wooden_axe", "Wooden Axe", "crafting_table", "planks", 3, 2, "Cuts logs and planks faster."),
  toolRecipe("stone_axe", "Stone Axe", "crafting_table", "cobblestone", 3, 2, "Stronger woodcutting tool."),
  toolRecipe("iron_axe", "Iron Axe", "crafting_table", "iron_ingot", 3, 2, "Fast metal axe."),
  toolRecipe("diamond_axe", "Diamond Axe", "crafting_table", "diamond", 3, 2, "Powerful long-lasting axe."),

  toolRecipe("wooden_shovel", "Wooden Shovel", "crafting_table", "planks", 1, 2, "Digs soil, snow, and sand faster."),
  toolRecipe("stone_shovel", "Stone Shovel", "crafting_table", "cobblestone", 1, 2, "Faster soft-block digging."),
  toolRecipe("iron_shovel", "Iron Shovel", "crafting_table", "iron_ingot", 1, 2, "Fast metal shovel."),
  toolRecipe("diamond_shovel", "Diamond Shovel", "crafting_table", "diamond", 1, 2, "Fastest durable shovel."),

  toolRecipe("wooden_hoe", "Wooden Hoe", "crafting_table", "planks", 2, 2, "Tills grass and dirt into farmland."),
  toolRecipe("stone_hoe", "Stone Hoe", "crafting_table", "cobblestone", 2, 2, "A durable farming tool."),
  toolRecipe("iron_hoe", "Iron Hoe", "crafting_table", "iron_ingot", 2, 2, "An efficient farming tool."),
  toolRecipe("diamond_hoe", "Diamond Hoe", "crafting_table", "diamond", 2, 2, "A long-lasting farming tool."),

  toolRecipe("wooden_sword", "Wooden Sword", "crafting_table", "planks", 2, 1, "Basic melee weapon."),
  toolRecipe("stone_sword", "Stone Sword", "crafting_table", "cobblestone", 2, 1, "Strong early-game weapon."),
  toolRecipe("iron_sword", "Iron Sword", "crafting_table", "iron_ingot", 2, 1, "Reliable metal weapon."),
  toolRecipe("golden_sword", "Golden Sword", "crafting_table", "gold_ingot", 2, 1, "Fast-looking but fragile weapon."),
  toolRecipe("diamond_sword", "Diamond Sword", "crafting_table", "diamond", 2, 1, "Highest melee damage."),

  armorRecipe("leather_helmet", "Leather Cap", "leather", 5, ["LLL", "L L", "   "], "Light protection that does not slow movement."),
  armorRecipe("leather_chestplate", "Leather Tunic", "leather", 8, ["L L", "LLL", "LLL"], "Early-game body protection."),
  armorRecipe("leather_leggings", "Leather Trousers", "leather", 7, ["LLL", "L L", "L L"], "Flexible leg protection."),
  armorRecipe("leather_boots", "Leather Boots", "leather", 4, ["   ", "L L", "L L"], "Soft boots for exploration."),

  armorRecipe("copper_helmet", "Copper Helmet", "copper_ingot", 5, ["CCC", "C C", "   "], "Basic ore helmet."),
  armorRecipe("copper_chestplate", "Copper Chestplate", "copper_ingot", 8, ["C C", "CCC", "CCC"], "Basic ore chest protection."),
  armorRecipe("copper_leggings", "Copper Leggings", "copper_ingot", 7, ["CCC", "C C", "C C"], "Basic ore leg protection."),
  armorRecipe("copper_boots", "Copper Boots", "copper_ingot", 4, ["   ", "C C", "C C"], "Basic ore boots."),
  armorRecipe("iron_helmet", "Iron Helmet", "iron_ingot", 5, ["III", "I I", "   "], "Reliable iron head protection."),
  armorRecipe("iron_chestplate", "Iron Chestplate", "iron_ingot", 8, ["I I", "III", "III"], "Reliable iron torso protection."),
  armorRecipe("iron_leggings", "Iron Leggings", "iron_ingot", 7, ["III", "I I", "I I"], "Reliable iron leg protection."),
  armorRecipe("iron_boots", "Iron Boots", "iron_ingot", 4, ["   ", "I I", "I I"], "Reliable iron boots."),
  armorRecipe("gold_helmet", "Gold Helmet", "gold_ingot", 5, ["GGG", "G G", "   "], "Light but fragile gold helmet."),
  armorRecipe("gold_chestplate", "Gold Chestplate", "gold_ingot", 8, ["G G", "GGG", "GGG"], "Light but fragile gold chestplate."),
  armorRecipe("gold_leggings", "Gold Leggings", "gold_ingot", 7, ["GGG", "G G", "G G"], "Light but fragile gold leggings."),
  armorRecipe("gold_boots", "Gold Boots", "gold_ingot", 4, ["   ", "G G", "G G"], "Light but fragile gold boots."),
  armorRecipe("diamond_helmet", "Diamond Helmet", "diamond", 5, ["DDD", "D D", "   "], "High-tier diamond helmet."),
  armorRecipe("diamond_chestplate", "Diamond Chestplate", "diamond", 8, ["D D", "DDD", "DDD"], "High-tier diamond chest protection."),
  armorRecipe("diamond_leggings", "Diamond Leggings", "diamond", 7, ["DDD", "D D", "D D"], "High-tier diamond leg protection."),
  armorRecipe("diamond_boots", "Diamond Boots", "diamond", 4, ["   ", "D D", "D D"], "High-tier diamond boots."),
];

export const SMELTING_RECIPES = [
  { id: "charcoal", name: "Make Charcoal", input: "wood", output: "charcoal", seconds: 5, description: "Smelt an oak log into charcoal." },
  { id: "charcoal_spruce", name: "Make Spruce Charcoal", input: "spruce_wood", output: "charcoal", seconds: 5, description: "Smelt a spruce log into charcoal." },
  { id: "charcoal_jungle", name: "Make Jungle Charcoal", input: "jungle_wood", output: "charcoal", seconds: 5, description: "Smelt a jungle log into charcoal." },
  { id: "copper_ingot", name: "Smelt Copper", input: "raw_copper", output: "copper_ingot", seconds: 6, description: "Refine raw copper into an ingot." },
  { id: "iron_ingot", name: "Smelt Iron", input: "raw_iron", output: "iron_ingot", seconds: 7, description: "Refine raw iron into an ingot." },
  { id: "gold_ingot", name: "Smelt Gold", input: "raw_gold", output: "gold_ingot", seconds: 8, description: "Refine raw gold into an ingot." },
  { id: "glass", name: "Smelt Glass", input: "sand", output: "glass", seconds: 5, description: "Melt sand into glass." },
  { id: "cooked_beef", name: "Cook Beef", input: "raw_beef", output: "cooked_beef", seconds: 5, description: "Cook beef for better hunger recovery." },
  { id: "cooked_mutton", name: "Cook Mutton", input: "raw_mutton", output: "cooked_mutton", seconds: 5, description: "Cook mutton for better hunger recovery." },
  { id: "cooked_porkchop", name: "Cook Porkchop", input: "raw_porkchop", output: "cooked_porkchop", seconds: 5, description: "Cook pork for better hunger recovery." },
  { id: "cooked_chicken", name: "Cook Chicken", input: "raw_chicken", output: "cooked_chicken", seconds: 5, description: "Cook chicken for better hunger recovery." },
  { id: "cooked_fish", name: "Cook Fish", input: "raw_fish", output: "cooked_fish", seconds: 5, description: "Cook fish caught from ocean creatures." },
];

export const FUEL_ITEMS = ["coal", "charcoal", "wood", "spruce_wood", "jungle_wood", "planks", "spruce_planks", "jungle_planks"];

export function getItemDefinition(itemId) {
  return ITEM_TYPES[itemId] || {
    name: String(itemId || "Unknown").replaceAll("_", " "),
    icon: "?",
    category: "material",
    maxStack: 64,
    color: "#ffffff",
  };
}

export function getMiningProfile(blockType, itemId) {
  const blockDefinition = BLOCK_TYPES[blockType];
  if (!blockDefinition || !Number.isFinite(blockDefinition.hardness)) {
    return { seconds: Infinity, canHarvest: false, correctTool: false, speed: 0 };
  }

  const item = ITEM_TYPES[itemId];
  const isTool = item?.category === "tool";
  const correctTool = Boolean(blockDefinition.preferredTool && item?.toolType === blockDefinition.preferredTool);
  const tier = isTool ? item.tier || 0 : 0;
  const canHarvest = blockDefinition.requiredTier <= tier || blockDefinition.requiredTier === 0;

  let speed = 1;
  if (correctTool) speed = Math.max(1, item.speed || 1);
  else if (blockDefinition.preferredTool) speed = 0.42;

  if (item?.toolType === "sword" && blockType.includes("leaves")) speed = 3.2;
  if (correctTool && !canHarvest) speed *= 0.35;

  const seconds = Math.max(0.09, (blockDefinition.hardness * 1.35) / speed);
  return { seconds, canHarvest, correctTool, speed, tier };
}

export function getAttackDamage(itemId) {
  return Math.max(1, ITEM_TYPES[itemId]?.attackDamage || 1);
}

export function getFuelPower(itemId) {
  if (itemId === "coal" || itemId === "charcoal") return 8;
  if (["wood", "spruce_wood", "jungle_wood"].includes(itemId)) return 2;
  if (["planks", "spruce_planks", "jungle_planks"].includes(itemId)) return 1;
  return 0;
}
