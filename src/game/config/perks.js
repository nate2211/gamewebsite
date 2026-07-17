export const PERK_DEFINITIONS = [
  { id: "power_strike", stat: "strength", threshold: 5, name: "Power Strike", description: "Melee hits deal 10% more damage." },
  { id: "critical_training", stat: "strength", threshold: 10, name: "Critical Training", description: "Melee attacks gain a 12% critical-hit chance." },
  { id: "cleaving_mastery", stat: "strength", threshold: 15, name: "Cleaving Mastery", description: "Heavy weapons can damage a second nearby enemy." },
  { id: "titan_grip", stat: "strength", threshold: 20, name: "Titan Grip", description: "Greatswords, halberds, and warhammers recover 12% faster." },
  { id: "war_banner", stat: "strength", threshold: 30, name: "War Banner", description: "Nearby colony guards deal 18% more damage." },
  { id: "light_step", stat: "agility", threshold: 5, name: "Light Step", description: "Sprinting drains 20% less hunger." },
  { id: "evasive", stat: "agility", threshold: 10, name: "Evasive", description: "Gain an 8% chance to avoid incoming damage." },
  { id: "parkour", stat: "agility", threshold: 15, name: "Frontier Parkour", description: "Auto-step and ladder movement are faster and smoother." },
  { id: "quick_hands", stat: "agility", threshold: 20, name: "Quick Hands", description: "Spears, katanas, gates, and interactions recover faster." },
  { id: "pathfinder", stat: "agility", threshold: 30, name: "Pathfinder", description: "Move faster while exploring undiscovered landmarks and kingdoms." },
  { id: "efficient_smelting", stat: "intelligence", threshold: 5, name: "Efficient Smelting", description: "Furnace jobs finish 12% faster." },
  { id: "master_smelter", stat: "intelligence", threshold: 10, name: "Master Smelter", description: "Smelting has a 12% chance to create a bonus output." },
  { id: "recipe_scholar", stat: "intelligence", threshold: 15, name: "Recipe Scholar", description: "Crafting grants additional experience and knowledge." },
  { id: "arcane_engineer", stat: "intelligence", threshold: 20, name: "Arcane Engineer", description: "Constructs and colony stations require fewer maintenance resources." },
  { id: "master_artificer", stat: "intelligence", threshold: 30, name: "Master Artificer", description: "Enchantment and arcane crafting costs are reduced." },
  { id: "thick_skin", stat: "vitality", threshold: 5, name: "Thick Skin", description: "Incoming damage is reduced by an additional 5%." },
  { id: "second_wind", stat: "vitality", threshold: 10, name: "Second Wind", description: "Regeneration begins at 16 hunger instead of 18." },
  { id: "field_medic", stat: "vitality", threshold: 15, name: "Field Medic", description: "Food, hay feeding, and healing magic restore more health." },
  { id: "iron_constitution", stat: "vitality", threshold: 20, name: "Iron Constitution", description: "Maximum health and resistance to elite abilities improve." },
  { id: "guardian_aura", stat: "vitality", threshold: 30, name: "Guardian Aura", description: "Nearby colonists recover health and resist structure raids." },
  { id: "ore_sense", stat: "mining", threshold: 5, name: "Ore Sense", description: "Ore blocks grant 20% more experience." },
  { id: "fortune", stat: "mining", threshold: 10, name: "Fortune", description: "Harvested ores have a 15% chance to drop one extra item." },
  { id: "deep_delver", stat: "mining", threshold: 15, name: "Deep Delver", description: "Mine stone and underground structure blocks 15% faster." },
  { id: "gem_hunter", stat: "mining", threshold: 20, name: "Gem Hunter", description: "Rare ore, fossil, and crystal yields improve." },
  { id: "master_excavator", stat: "mining", threshold: 30, name: "Master Excavator", description: "Continuous mining retargets faster and damages adjacent weak stone." },
];

export function hasPerk(progression, perkId) {
  const perk = PERK_DEFINITIONS.find((entry) => entry.id === perkId);
  if (!perk) return false;
  return Math.max(1, progression?.stats?.[perk.stat] || 1) >= perk.threshold;
}

export function getUnlockedPerks(progression) {
  return PERK_DEFINITIONS.filter((perk) => hasPerk(progression, perk.id));
}
