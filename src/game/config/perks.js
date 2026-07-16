export const PERK_DEFINITIONS = [
  { id: "power_strike", stat: "strength", threshold: 5, name: "Power Strike", description: "Melee hits deal 10% more damage." },
  { id: "critical_training", stat: "strength", threshold: 10, name: "Critical Training", description: "Melee attacks gain a 12% critical-hit chance." },
  { id: "light_step", stat: "agility", threshold: 5, name: "Light Step", description: "Sprinting drains 20% less hunger." },
  { id: "evasive", stat: "agility", threshold: 10, name: "Evasive", description: "Gain an 8% chance to avoid incoming damage." },
  { id: "efficient_smelting", stat: "intelligence", threshold: 5, name: "Efficient Smelting", description: "Furnace jobs finish 12% faster." },
  { id: "master_smelter", stat: "intelligence", threshold: 10, name: "Master Smelter", description: "Smelting has a 12% chance to create a bonus output." },
  { id: "thick_skin", stat: "vitality", threshold: 5, name: "Thick Skin", description: "Incoming damage is reduced by an additional 5%." },
  { id: "second_wind", stat: "vitality", threshold: 10, name: "Second Wind", description: "Regeneration begins at 16 hunger instead of 18." },
  { id: "ore_sense", stat: "mining", threshold: 5, name: "Ore Sense", description: "Ore blocks grant 20% more experience." },
  { id: "fortune", stat: "mining", threshold: 10, name: "Fortune", description: "Harvested ores have a 15% chance to drop one extra item." },
];

export function hasPerk(progression, perkId) {
  const perk = PERK_DEFINITIONS.find((entry) => entry.id === perkId);
  if (!perk) return false;
  return Math.max(1, progression?.stats?.[perk.stat] || 1) >= perk.threshold;
}

export function getUnlockedPerks(progression) {
  return PERK_DEFINITIONS.filter((perk) => hasPerk(progression, perk.id));
}
