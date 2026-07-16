export const QUESTS = [
  { id: "first_steps", name: "First Steps", description: "Mine 12 blocks.", metric: "blocksMined", target: 12, rewardXp: 35 },
  { id: "stone_age", name: "Stone Age", description: "Mine 8 stone or ore blocks.", metric: "hardBlocksMined", target: 8, rewardXp: 50 },
  { id: "workbench", name: "Workbench Apprentice", description: "Craft 6 items.", metric: "itemsCrafted", target: 6, rewardXp: 55 },
  { id: "smelter", name: "Hot Metal", description: "Complete 5 furnace jobs.", metric: "smeltsCompleted", target: 5, rewardXp: 70 },
  { id: "hunter", name: "Defender", description: "Defeat 5 hostile creatures.", metric: "hostilesDefeated", target: 5, rewardXp: 90 },
  { id: "armored", name: "Suit Up", description: "Equip all four armor slots at once.", metric: "armorSlotsEquipped", target: 4, rewardXp: 100 },
  { id: "level_five", name: "Growing Stronger", description: "Reach character level 5.", metric: "level", target: 5, rewardXp: 120 },
  { id: "master_miner", name: "Deep Delver", description: "Mine 40 ore blocks.", metric: "oresMined", target: 40, rewardXp: 180 },
];

export const DEFAULT_METRICS = Object.freeze({
  blocksMined: 0,
  hardBlocksMined: 0,
  oresMined: 0,
  itemsCrafted: 0,
  smeltsCompleted: 0,
  mobsDefeated: 0,
  hostilesDefeated: 0,
});

export function getQuestProgress(quest, world) {
  if (quest.metric === "level") return world?.progression?.level || 1;
  if (quest.metric === "armorSlotsEquipped") {
    return Object.values(world?.armor || {}).filter(Boolean).length;
  }
  return Math.max(0, world?.metrics?.[quest.metric] || 0);
}
