export const ARMOR_SLOTS = ["helmet", "chestplate", "leggings", "boots"];

export const EMPTY_ARMOR = Object.freeze({
  helmet: null,
  chestplate: null,
  leggings: null,
  boots: null,
});

export function getArmorDefense(armor, itemTypes) {
  return ARMOR_SLOTS.reduce((sum, slot) => {
    const itemId = armor?.[slot];
    return sum + Math.max(0, itemTypes[itemId]?.defense || 0);
  }, 0);
}

export function reduceDamageWithArmor(rawDamage, defense) {
  const damage = Math.max(0, Number(rawDamage) || 0);
  const armorPoints = Math.max(0, Number(defense) || 0);
  const reduction = Math.min(0.72, armorPoints * 0.035);
  return damage * (1 - reduction);
}
