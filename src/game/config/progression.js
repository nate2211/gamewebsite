export const STAT_KEYS = ["strength", "agility", "intelligence", "vitality", "mining"];

export const STAT_LABELS = {
  strength: "Strength",
  agility: "Agility",
  intelligence: "Intelligence",
  vitality: "Vitality",
  mining: "Mining",
};

export const DEFAULT_PROGRESSION = Object.freeze({
  level: 1,
  experience: 0,
  unspentPoints: 0,
  stats: Object.freeze({
    strength: 1,
    agility: 1,
    intelligence: 1,
    vitality: 1,
    mining: 1,
  }),
});

export function experienceForLevel(level) {
  const safeLevel = Math.max(1, Number(level) || 1);
  return Math.floor(45 + safeLevel * safeLevel * 20);
}

export function getMaxHealth(progression) {
  return 20 + Math.max(0, (progression?.stats?.vitality || 1) - 1) * 2;
}

export function getStrengthDamageMultiplier(progression) {
  return 1 + Math.max(0, (progression?.stats?.strength || 1) - 1) * 0.075;
}

export function getMiningSpeedMultiplier(progression) {
  const mining = Math.max(1, progression?.stats?.mining || 1);
  const agility = Math.max(1, progression?.stats?.agility || 1);
  return 1 + (mining - 1) * 0.09 + (agility - 1) * 0.025;
}

export function getJumpVelocity(progression) {
  const agility = Math.max(1, progression?.stats?.agility || 1);
  // 10.4 clears roughly 1.7 blocks with the game's gravity. Agility adds a
  // modest bonus without allowing uncontrolled flight-like jumps.
  return Math.min(12.4, 10.4 + (agility - 1) * 0.16);
}

export function getCraftingSpeedMultiplier(progression) {
  const intelligence = Math.max(1, progression?.stats?.intelligence || 1);
  return 1 + (intelligence - 1) * 0.06;
}
