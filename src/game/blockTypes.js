export const TOOL_TIERS = {
  hand: 0,
  wood: 1,
  stone: 2,
  iron: 3,
};

export const BLOCK_TYPES = {
  bedrock: {
    id: "bedrock",
    name: "Bedrock",
    color: "#25282b",
    hardness: Infinity,
    preferredTool: "pickaxe",
    requiredTier: Infinity,
    drop: null,
    placeable: false,
  },
  grass: {
    id: "grass",
    name: "Grass Block",
    color: "#67a93b",
    hardness: 0.65,
    preferredTool: "shovel",
    requiredTier: 0,
    drop: "dirt",
    placeable: true,
  },
  dirt: {
    id: "dirt",
    name: "Dirt",
    color: "#795334",
    hardness: 0.6,
    preferredTool: "shovel",
    requiredTier: 0,
    drop: "dirt",
    placeable: true,
  },
  stone: {
    id: "stone",
    name: "Stone",
    color: "#7b8084",
    hardness: 1.8,
    preferredTool: "pickaxe",
    requiredTier: 1,
    drop: "cobblestone",
    placeable: false,
  },
  cobblestone: {
    id: "cobblestone",
    name: "Cobblestone",
    color: "#696f74",
    hardness: 2,
    preferredTool: "pickaxe",
    requiredTier: 1,
    drop: "cobblestone",
    placeable: true,
  },
  sand: {
    id: "sand",
    name: "Sand",
    color: "#d9c27a",
    hardness: 0.5,
    preferredTool: "shovel",
    requiredTier: 0,
    drop: "sand",
    placeable: true,
  },
  wood: {
    id: "wood",
    name: "Oak Log",
    color: "#795129",
    hardness: 1.7,
    preferredTool: "axe",
    requiredTier: 0,
    drop: "wood",
    placeable: true,
  },
  planks: {
    id: "planks",
    name: "Oak Planks",
    color: "#b78348",
    hardness: 1.35,
    preferredTool: "axe",
    requiredTier: 0,
    drop: "planks",
    placeable: true,
  },
  leaves: {
    id: "leaves",
    name: "Leaves",
    color: "#3f7f3a",
    hardness: 0.3,
    preferredTool: "shears",
    requiredTier: 0,
    drop: "sapling",
    dropChance: 0.18,
    placeable: true,
    transparent: true,
  },
  coal_ore: {
    id: "coal_ore",
    name: "Coal Ore",
    color: "#41464b",
    hardness: 2.4,
    preferredTool: "pickaxe",
    requiredTier: 1,
    drop: "coal",
    placeable: false,
  },
  iron_ore: {
    id: "iron_ore",
    name: "Iron Ore",
    color: "#9b755e",
    hardness: 3,
    preferredTool: "pickaxe",
    requiredTier: 2,
    drop: "raw_iron",
    placeable: false,
  },
  diamond_ore: {
    id: "diamond_ore",
    name: "Diamond Ore",
    color: "#36c7c5",
    hardness: 4.2,
    preferredTool: "pickaxe",
    requiredTier: 3,
    drop: "diamond",
    placeable: false,
  },
  crafting_table: {
    id: "crafting_table",
    name: "Crafting Table",
    color: "#8a552c",
    hardness: 1.8,
    preferredTool: "axe",
    requiredTier: 0,
    drop: "crafting_table",
    placeable: true,
    station: "crafting_table",
  },
  furnace: {
    id: "furnace",
    name: "Furnace",
    color: "#555b60",
    hardness: 3.1,
    preferredTool: "pickaxe",
    requiredTier: 1,
    drop: "furnace",
    placeable: true,
    station: "furnace",
  },
  glass: {
    id: "glass",
    name: "Glass",
    color: "#b8e5ee",
    hardness: 0.35,
    preferredTool: null,
    requiredTier: 0,
    drop: null,
    placeable: true,
    transparent: true,
  },
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

export const ITEM_TYPES = {
  ...Object.fromEntries(
    Object.values(BLOCK_TYPES).map((block) => [
      block.id,
      {
        name: block.name,
        icon: "■",
        category: "block",
        maxStack: 64,
        color: block.color,
        placeable: block.placeable,
      },
    ])
  ),
  sapling: {
    name: "Oak Sapling",
    icon: "♣",
    category: "material",
    maxStack: 64,
    color: "#5aa447",
  },
  sticks: {
    name: "Sticks",
    icon: "╱",
    category: "material",
    maxStack: 64,
    color: "#9d6c3d",
  },
  coal: {
    name: "Coal",
    icon: "●",
    category: "material",
    maxStack: 64,
    color: "#262a2e",
  },
  raw_iron: {
    name: "Raw Iron",
    icon: "◆",
    category: "material",
    maxStack: 64,
    color: "#bd8c68",
  },
  iron_ingot: {
    name: "Iron Ingot",
    icon: "▰",
    category: "material",
    maxStack: 64,
    color: "#d4d8da",
  },
  diamond: {
    name: "Diamond",
    icon: "◆",
    category: "material",
    maxStack: 64,
    color: "#49dedc",
  },
  torch: {
    name: "Torch",
    icon: "†",
    category: "material",
    maxStack: 64,
    color: "#ffc84b",
  },
  wool: {
    name: "Wool",
    icon: "▣",
    category: "material",
    maxStack: 64,
    color: "#eeeeee",
  },
  leather: {
    name: "Leather",
    icon: "◒",
    category: "material",
    maxStack: 64,
    color: "#8a4f2a",
  },
  raw_beef: {
    name: "Raw Beef",
    icon: "◖",
    category: "food",
    maxStack: 64,
    food: 3,
    color: "#a83939",
  },
  raw_mutton: {
    name: "Raw Mutton",
    icon: "◖",
    category: "food",
    maxStack: 64,
    food: 2,
    color: "#b94c4c",
  },
  raw_porkchop: {
    name: "Raw Porkchop",
    icon: "◖",
    category: "food",
    maxStack: 64,
    food: 3,
    color: "#db7777",
  },
  cooked_beef: {
    name: "Cooked Beef",
    icon: "◖",
    category: "food",
    maxStack: 64,
    food: 8,
    color: "#70402a",
  },
  rotten_flesh: {
    name: "Rotten Flesh",
    icon: "◖",
    category: "food",
    maxStack: 64,
    food: 1,
    color: "#6d7b38",
  },
  slime_ball: {
    name: "Slime Ball",
    icon: "●",
    category: "material",
    maxStack: 64,
    color: "#63c751",
  },
  wooden_pickaxe: tool("Wooden Pickaxe", "⛏", "pickaxe", 1, 2.1, 59, 2, "#9f7046"),
  stone_pickaxe: tool("Stone Pickaxe", "⛏", "pickaxe", 2, 4.4, 131, 3, "#777d82"),
  iron_pickaxe: tool("Iron Pickaxe", "⛏", "pickaxe", 3, 7.2, 250, 4, "#d0d5d8"),
  wooden_axe: tool("Wooden Axe", "🪓", "axe", 1, 2.3, 59, 4, "#9f7046"),
  stone_axe: tool("Stone Axe", "🪓", "axe", 2, 4.6, 131, 5, "#777d82"),
  wooden_shovel: tool("Wooden Shovel", "♠", "shovel", 1, 2.6, 59, 2, "#9f7046"),
  stone_shovel: tool("Stone Shovel", "♠", "shovel", 2, 5, 131, 3, "#777d82"),
  wooden_sword: tool("Wooden Sword", "†", "sword", 1, 1, 59, 4, "#9f7046"),
  stone_sword: tool("Stone Sword", "†", "sword", 2, 1, 131, 6, "#777d82"),
  iron_sword: tool("Iron Sword", "†", "sword", 3, 1, 250, 7, "#d0d5d8"),
};

export const DEFAULT_HOTBAR = [
  "wooden_pickaxe",
  "wooden_axe",
  "wooden_sword",
  "dirt",
  "cobblestone",
  "planks",
  "crafting_table",
  "furnace",
  "torch",
];

export const RECIPES = [
  {
    id: "planks",
    name: "Oak Planks",
    station: "inventory",
    inputs: { wood: 1 },
    outputs: { planks: 4 },
    description: "Turn one oak log into four planks.",
  },
  {
    id: "sticks",
    name: "Sticks",
    station: "inventory",
    inputs: { planks: 2 },
    outputs: { sticks: 4 },
    description: "Basic handles for tools and weapons.",
  },
  {
    id: "crafting_table",
    name: "Crafting Table",
    station: "inventory",
    inputs: { planks: 4 },
    outputs: { crafting_table: 1 },
    description: "Unlocks the full three-by-three tool recipes.",
  },
  {
    id: "wooden_pickaxe",
    name: "Wooden Pickaxe",
    station: "crafting_table",
    inputs: { planks: 3, sticks: 2 },
    outputs: { wooden_pickaxe: 1 },
    description: "Mines stone and coal ore.",
  },
  {
    id: "wooden_axe",
    name: "Wooden Axe",
    station: "crafting_table",
    inputs: { planks: 3, sticks: 2 },
    outputs: { wooden_axe: 1 },
    description: "Cuts logs and planks faster.",
  },
  {
    id: "wooden_shovel",
    name: "Wooden Shovel",
    station: "crafting_table",
    inputs: { planks: 1, sticks: 2 },
    outputs: { wooden_shovel: 1 },
    description: "Digs dirt, grass, and sand faster.",
  },
  {
    id: "wooden_sword",
    name: "Wooden Sword",
    station: "crafting_table",
    inputs: { planks: 2, sticks: 1 },
    outputs: { wooden_sword: 1 },
    description: "A basic weapon against hostile mobs.",
  },
  {
    id: "stone_pickaxe",
    name: "Stone Pickaxe",
    station: "crafting_table",
    inputs: { cobblestone: 3, sticks: 2 },
    outputs: { stone_pickaxe: 1 },
    description: "Mines iron ore and breaks stone quickly.",
  },
  {
    id: "stone_axe",
    name: "Stone Axe",
    station: "crafting_table",
    inputs: { cobblestone: 3, sticks: 2 },
    outputs: { stone_axe: 1 },
    description: "A durable chopping tool and heavy weapon.",
  },
  {
    id: "stone_shovel",
    name: "Stone Shovel",
    station: "crafting_table",
    inputs: { cobblestone: 1, sticks: 2 },
    outputs: { stone_shovel: 1 },
    description: "Quickly clears soft terrain.",
  },
  {
    id: "stone_sword",
    name: "Stone Sword",
    station: "crafting_table",
    inputs: { cobblestone: 2, sticks: 1 },
    outputs: { stone_sword: 1 },
    description: "Deals strong damage to enemies.",
  },
  {
    id: "furnace",
    name: "Furnace",
    station: "crafting_table",
    inputs: { cobblestone: 8 },
    outputs: { furnace: 1 },
    description: "Smelts ore and cooks food.",
  },
  {
    id: "torch",
    name: "Torches",
    station: "crafting_table",
    inputs: { coal: 1, sticks: 1 },
    outputs: { torch: 4 },
    description: "Starter light items for future cave lighting.",
  },
  {
    id: "iron_ingot",
    name: "Smelt Iron",
    station: "furnace",
    inputs: { raw_iron: 1, coal: 1 },
    outputs: { iron_ingot: 1 },
    description: "Smelt raw iron into one iron ingot.",
  },
  {
    id: "glass",
    name: "Smelt Glass",
    station: "furnace",
    inputs: { sand: 1, coal: 1 },
    outputs: { glass: 1 },
    description: "Smelt sand into a clear building block.",
  },
  {
    id: "cooked_beef",
    name: "Cook Beef",
    station: "furnace",
    inputs: { raw_beef: 1, coal: 1 },
    outputs: { cooked_beef: 1 },
    description: "Cook food to restore more hunger.",
  },
  {
    id: "iron_pickaxe",
    name: "Iron Pickaxe",
    station: "crafting_table",
    inputs: { iron_ingot: 3, sticks: 2 },
    outputs: { iron_pickaxe: 1 },
    description: "Mines diamond ore and has high durability.",
  },
  {
    id: "iron_sword",
    name: "Iron Sword",
    station: "crafting_table",
    inputs: { iron_ingot: 2, sticks: 1 },
    outputs: { iron_sword: 1 },
    description: "A powerful weapon for night survival.",
  },
];

export const INITIAL_INVENTORY = Object.fromEntries(
  Object.keys(ITEM_TYPES).map((id) => [id, 0])
);

export function getItemDefinition(itemId) {
  return ITEM_TYPES[itemId] || {
    name: itemId.replaceAll("_", " "),
    icon: "?",
    category: "material",
    maxStack: 64,
    color: "#888888",
  };
}

export function getMiningProfile(blockType, itemId) {
  const block = BLOCK_TYPES[blockType];
  const item = ITEM_TYPES[itemId];

  if (!block || !Number.isFinite(block.hardness)) {
    return { seconds: Infinity, canHarvest: false, effective: false };
  }

  const matchingTool = Boolean(
    block.preferredTool && item?.toolType === block.preferredTool
  );
  const toolTier = item?.tier || 0;
  const canHarvest =
    block.requiredTier <= 0 ||
    (matchingTool && toolTier >= block.requiredTier);

  let speed = 1;
  if (matchingTool) speed = item.speed || 1;
  else if (block.preferredTool) speed = 0.55;

  const seconds = Math.max(0.16, (block.hardness * 1.45) / speed);
  return {
    seconds: canHarvest ? seconds : seconds * 1.7,
    canHarvest,
    effective: matchingTool,
  };
}

export function getAttackDamage(itemId) {
  return ITEM_TYPES[itemId]?.attackDamage || 1;
}
