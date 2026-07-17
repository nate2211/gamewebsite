export const BOSS_SUMMONS = Object.freeze({
  stone_titan: {
    id: "stone_titan",
    name: "Granite Titan",
    itemId: "titan_core",
    description: "A towering earth boss that uses ground slams and stone shockwaves.",
    spawnOffset: [9, 2, 7],
    abilityCooldownMs: 5600,
  },
  ember_wyrm: {
    id: "ember_wyrm",
    name: "Ember Wyrm",
    itemId: "ember_crown",
    description: "A flying fire boss that dives, scorches the arena, and calls burning minions.",
    spawnOffset: [11, 8, 6],
    abilityCooldownMs: 4700,
  },
  void_lich: {
    id: "void_lich",
    name: "Void Lich",
    itemId: "void_reliquary",
    description: "An arcane boss that drains health, teleports, and summons undead guardians.",
    spawnOffset: [8, 2, -9],
    abilityCooldownMs: 6200,
  },
});

export const DEFAULT_BOSS_STATE = Object.freeze({
  activeBossId: null,
  activeBossType: null,
  summoned: 0,
  defeated: [],
  lastAbility: null,
});

export function cloneBossState(source = DEFAULT_BOSS_STATE) {
  return {
    activeBossId: source?.activeBossId || null,
    activeBossType: source?.activeBossType || null,
    summoned: Math.max(0, Number(source?.summoned) || 0),
    defeated: Array.isArray(source?.defeated) ? [...source.defeated] : [],
    lastAbility: source?.lastAbility ? { ...source.lastAbility } : null,
  };
}
