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
  grass: block({ id: "grass", name: "Grass Block", color: "#67a93b", hardness: 0.65, preferredTool: "shovel", drop: "dirt", bonusDrops: [{ item: "wheat", chance: 0.08 }] }),
  frozen_grass: block({ id: "frozen_grass", name: "Frozen Grass", color: "#8fb7a5", hardness: 0.8, preferredTool: "shovel", drop: "dirt" }),
  snow: block({ id: "snow", name: "Snow Block", color: "#edf7ff", hardness: 0.35, preferredTool: "shovel" }),
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
  leaves: block({ id: "leaves", name: "Oak Leaves", color: "#3f7f3a", hardness: 0.28, preferredTool: "shears", drop: "sapling", transparent: true, dropChance: 0.18, bonusDrops: [{ item: "apple", chance: 0.05 }] }),
  spruce_leaves: block({ id: "spruce_leaves", name: "Spruce Leaves", color: "#285e44", hardness: 0.3, preferredTool: "shears", drop: "spruce_sapling", transparent: true, dropChance: 0.16 }),
  jungle_leaves: block({ id: "jungle_leaves", name: "Jungle Leaves", color: "#2f8b36", hardness: 0.3, preferredTool: "shears", drop: "jungle_sapling", transparent: true, dropChance: 0.15 }),
  coal_ore: block({ id: "coal_ore", name: "Coal Ore", color: "#41464b", hardness: 2.4, preferredTool: "pickaxe", requiredTier: 1, drop: "coal", placeable: false }),
  copper_ore: block({ id: "copper_ore", name: "Copper Ore", color: "#a76543", hardness: 2.7, preferredTool: "pickaxe", requiredTier: 1, drop: "raw_copper", placeable: false }),
  iron_ore: block({ id: "iron_ore", name: "Iron Ore", color: "#9b755e", hardness: 3, preferredTool: "pickaxe", requiredTier: 2, drop: "raw_iron", placeable: false }),
  gold_ore: block({ id: "gold_ore", name: "Gold Ore", color: "#c7a83c", hardness: 3.2, preferredTool: "pickaxe", requiredTier: 3, drop: "raw_gold", placeable: false }),
  redstone_ore: block({ id: "redstone_ore", name: "Redstone Ore", color: "#8f3030", hardness: 3.4, preferredTool: "pickaxe", requiredTier: 3, drop: "redstone", placeable: false }),
  emerald_ore: block({ id: "emerald_ore", name: "Emerald Ore", color: "#2fba69", hardness: 3.8, preferredTool: "pickaxe", requiredTier: 3, drop: "emerald", placeable: false }),
  diamond_ore: block({ id: "diamond_ore", name: "Diamond Ore", color: "#36c7c5", hardness: 4.2, preferredTool: "pickaxe", requiredTier: 3, drop: "diamond", placeable: false }),
  crafting_table: block({ id: "crafting_table", name: "Crafting Table", color: "#8a552c", hardness: 1.8, preferredTool: "axe", station: "crafting_table" }),
  furnace: block({ id: "furnace", name: "Furnace", color: "#555b60", hardness: 3.1, preferredTool: "pickaxe", requiredTier: 1, station: "furnace" }),
  glass: block({ id: "glass", name: "Glass", color: "#b8e5ee", hardness: 0.35, drop: null, transparent: true }),
  water: block({ id: "water", name: "Water", color: "#3e8fd1", hardness: Infinity, drop: null, placeable: false, transparent: true, solid: false }),
  seagrass: block({ id: "seagrass", name: "Seagrass", color: "#2f9f69", hardness: 0.12, preferredTool: "shears", drop: "seagrass", transparent: true, solid: false }),
  kelp: block({ id: "kelp", name: "Kelp", color: "#25794e", hardness: 0.18, preferredTool: "shears", drop: "kelp", transparent: true, solid: false }),
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
  bone: material("Bone", "╱", "#eee7cf"),
  slime_ball: material("Slime Ball", "●", "#63c751"),
  apple: material("Apple", "●", "#d83b36", { category: "food", food: 4, tameFood: ["horse"] }),
  wheat: material("Wheat", "≋", "#d9b54a", { tameFood: ["horse"] }),
  raw_fish: material("Raw Fish", "◖", "#75a9c7", { category: "food", food: 2 }),
  cooked_fish: material("Cooked Fish", "◖", "#b88755", { category: "food", food: 6 }),
  boat: material("Oak Boat", "▱", "#9b693b", { category: "vehicle", maxStack: 16, placeableVehicle: true }),
  raw_beef: material("Raw Beef", "◖", "#a83939", { category: "food", food: 3 }),
  raw_mutton: material("Raw Mutton", "◖", "#b94c4c", { category: "food", food: 2 }),
  raw_porkchop: material("Raw Porkchop", "◖", "#db7777", { category: "food", food: 3 }),
  raw_chicken: material("Raw Chicken", "◖", "#e8b2a0", { category: "food", food: 2 }),
  cooked_beef: material("Cooked Beef", "◖", "#70402a", { category: "food", food: 8 }),
  cooked_mutton: material("Cooked Mutton", "◖", "#86513b", { category: "food", food: 6 }),
  cooked_porkchop: material("Cooked Porkchop", "◖", "#9d5e4b", { category: "food", food: 7 }),
  cooked_chicken: material("Cooked Chicken", "◖", "#a86d4c", { category: "food", food: 6 }),
  rotten_flesh: material("Rotten Flesh", "◖", "#6d7b38", { category: "food", food: 1 }),

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

  toolRecipe("wooden_sword", "Wooden Sword", "crafting_table", "planks", 2, 1, "Basic melee weapon."),
  toolRecipe("stone_sword", "Stone Sword", "crafting_table", "cobblestone", 2, 1, "Strong early-game weapon."),
  toolRecipe("iron_sword", "Iron Sword", "crafting_table", "iron_ingot", 2, 1, "Reliable metal weapon."),
  toolRecipe("golden_sword", "Golden Sword", "crafting_table", "gold_ingot", 2, 1, "Fast-looking but fragile weapon."),
  toolRecipe("diamond_sword", "Diamond Sword", "crafting_table", "diamond", 2, 1, "Highest melee damage."),
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
