export const MOB_TYPES = {
  sheep: {
    name: "Sheep",
    passive: true,
    maxHealth: 8,
    speed: 0.72,
    bodyColor: "#eeeeee",
    headColor: "#c7b8a6",
    scale: [0.95, 0.85, 1.15],
    loot: [
      { item: "wool", min: 1, max: 2, chance: 1 },
      { item: "raw_mutton", min: 1, max: 2, chance: 1 },
    ],
  },
  cow: {
    name: "Cow",
    passive: true,
    maxHealth: 10,
    speed: 0.62,
    bodyColor: "#6d432b",
    headColor: "#4d3021",
    scale: [1.1, 1, 1.35],
    loot: [
      { item: "raw_beef", min: 1, max: 3, chance: 1 },
      { item: "leather", min: 0, max: 2, chance: 0.75 },
    ],
  },
  pig: {
    name: "Pig",
    passive: true,
    maxHealth: 10,
    speed: 0.68,
    bodyColor: "#d98989",
    headColor: "#e5a0a0",
    scale: [1, 0.82, 1.2],
    loot: [{ item: "raw_porkchop", min: 1, max: 3, chance: 1 }],
  },
  zombie: {
    name: "Zombie",
    passive: false,
    hostile: true,
    maxHealth: 12,
    speed: 1.05,
    attackDamage: 2,
    attackRange: 1.35,
    bodyColor: "#345d83",
    headColor: "#5f8f55",
    scale: [0.72, 1.65, 0.52],
    loot: [{ item: "rotten_flesh", min: 0, max: 2, chance: 0.85 }],
  },
  slime: {
    name: "Slime",
    passive: false,
    hostile: true,
    maxHealth: 8,
    speed: 0.82,
    attackDamage: 1,
    attackRange: 1.15,
    bodyColor: "#63c751",
    headColor: "#63c751",
    scale: [0.95, 0.95, 0.95],
    loot: [{ item: "slime_ball", min: 0, max: 2, chance: 0.75 }],
  },
};

export function createMob(id, type, x, y, z, random = Math.random) {
  const definition = MOB_TYPES[type];
  return {
    id,
    type,
    x,
    y,
    z,
    health: definition.maxHealth,
    maxHealth: definition.maxHealth,
    direction: random() * Math.PI * 2,
    wanderTimer: 1 + random() * 4,
  };
}

export function rollMobLoot(type, random = Math.random) {
  const definition = MOB_TYPES[type];
  if (!definition) return {};

  return definition.loot.reduce((result, drop) => {
    if (random() > drop.chance) return result;
    const amount =
      drop.min + Math.floor(random() * (Math.max(drop.max - drop.min, 0) + 1));
    if (amount > 0) result[drop.item] = (result[drop.item] || 0) + amount;
    return result;
  }, {});
}
