export const ARMOR_SET_BONUSES = {
  copper: { name: "Copper Prospector", description: "+10% mining XP and 8% less armor durability loss.", defenseBonus: 0, xpMultiplier: 1.1, durabilityMultiplier: 0.92 },
  iron: { name: "Iron Guard", description: "+2 armor defense while the full set is equipped.", defenseBonus: 2, xpMultiplier: 1, durabilityMultiplier: 1 },
  gold: { name: "Golden Scholar", description: "+18% experience from all sources.", defenseBonus: 0, xpMultiplier: 1.18, durabilityMultiplier: 1 },
  diamond: { name: "Diamond Bulwark", description: "+3 armor defense and 10% additional damage reduction.", defenseBonus: 3, xpMultiplier: 1, durabilityMultiplier: 0.85, damageMultiplier: 0.9 },
};

export function getEquippedArmorMaterial(armor, itemTypes) {
  const materials = Object.values(armor || {})
    .filter(Boolean)
    .map((itemId) => itemTypes[itemId]?.materialId)
    .filter(Boolean);
  if (materials.length !== 4) return null;
  return materials.every((value) => value === materials[0]) ? materials[0] : null;
}

export function getArmorSetBonus(armor, itemTypes) {
  const material = getEquippedArmorMaterial(armor, itemTypes);
  return material ? { material, ...ARMOR_SET_BONUSES[material] } : null;
}
