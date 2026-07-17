export const FACTION_VERSION = 1;

export const FACTIONS = Object.freeze({
  sunspire: Object.freeze({
    id: "sunspire",
    name: "Sunspire Concord",
    settlementType: "sunspire_kingdom",
    color: "#d9a43b",
    accent: "#8e2f2a",
    description: "A wealthy road-building kingdom whose disciplined patrols protect farms, caravans, and ancient solar shrines.",
  }),
  ironroot: Object.freeze({
    id: "ironroot",
    name: "Ironroot Dominion",
    settlementType: "ironroot_hold",
    color: "#60756a",
    accent: "#8c6f3f",
    description: "A fortified mountain realm of miners and smiths that values strength, industry, and defensible borders.",
  }),
  tideborn: Object.freeze({
    id: "tideborn",
    name: "Tideborn League",
    settlementType: "tideborn_enclave",
    color: "#3a8f9d",
    accent: "#d7c078",
    description: "An island and coastal alliance of navigators, healers, fishers, and wardens who guard sea routes.",
  }),
});

export const FACTION_SETTLEMENT_TYPES = Object.freeze(Object.fromEntries(
  Object.values(FACTIONS).map((faction) => [faction.settlementType, faction.id])
));

export const FACTION_RELATIONS = Object.freeze({
  sunspire: Object.freeze({ sunspire: "allied", ironroot: "hostile", tideborn: "neutral" }),
  ironroot: Object.freeze({ sunspire: "hostile", ironroot: "allied", tideborn: "hostile" }),
  tideborn: Object.freeze({ sunspire: "neutral", ironroot: "hostile", tideborn: "allied" }),
});

export const FACTION_QUESTS = Object.freeze([
  { id: "sunspire_roadwardens", factionId: "sunspire", name: "Roadwarden's Oath", giver: "Marshal Aurelia", description: "Defeat 6 hostile creatures threatening Sunspire patrol roads.", metric: "hostilesDefeated", target: 6, rewardXp: 240, reputation: 14, rewards: { gold_nugget: 12, emerald: 2, golden_apple: 1 } },
  { id: "sunspire_rebuild", factionId: "sunspire", name: "Raise the South Wall", giver: "Architect Cael", description: "Mine or place 48 blocks for the kingdom's frontier works.", metric: "blocksMined", target: 48, rewardXp: 210, reputation: 12, rewards: { planks: 24, oak_fence: 12, torch: 8 } },
  { id: "ironroot_deep_ore", factionId: "ironroot", name: "Ore for the Deep Forge", giver: "Thane Brunna", description: "Mine 64 blocks beneath the frontier for Ironroot's foundries.", metric: "blocksMined", target: 64, rewardXp: 280, reputation: 15, rewards: { iron_ingot: 7, iron_nugget: 18, enchantment_shard: 2 } },
  { id: "ironroot_warband", factionId: "ironroot", name: "Break the Warband", giver: "Captain Hroth", description: "Defeat 5 enhanced enemies near fortified landmarks.", metric: "eliteEnemiesDefeated", target: 5, rewardXp: 330, reputation: 16, rewards: { iron_warhammer: 1, diamond: 1 } },
  { id: "tideborn_serpent", factionId: "tideborn", name: "Scales Beneath the Swell", giver: "Warden Neris", description: "Defeat 3 powerful creatures threatening Tideborn waters.", metric: "hostilesDefeated", target: 3, rewardXp: 300, reputation: 16, rewards: { cooked_fish: 10, serpent_scale: 2, primal_crystal: 1 } },
  { id: "tideborn_provisions", factionId: "tideborn", name: "Harbor Provisions", giver: "Quartermaster Ilyra", description: "Harvest or gather 20 useful colony resources.", metric: "blocksMined", target: 20, rewardXp: 170, reputation: 10, rewards: { hay_bale: 4, bucket: 1, emerald: 2 } },
]);

export const FACTION_DIALOGUE = Object.freeze({
  sunspire: Object.freeze(["The Concord remembers who keeps its roads safe.", "Earn our trust and our gates, merchants, and contracts will open to you.", "Ironroot patrols have crossed the old border again."]),
  ironroot: Object.freeze(["Iron lasts because it is tested.", "Work beside us and your name will be carved into the hold ledger.", "We do not surrender tunnels, roads, or settlements to rival banners."]),
  tideborn: Object.freeze(["The tide carries every deed back to shore.", "Help our villages and our navigators will treat you as one of the fleet.", "Our patrols guard the sea lanes from monsters and hostile banners."]),
});

export const DEFAULT_FACTION_STATE = Object.freeze({
  reputation: Object.freeze({ sunspire: 0, ironroot: 0, tideborn: 0 }),
  accepted: Object.freeze([]),
  claimed: Object.freeze([]),
  discovered: Object.freeze([]),
});

export function cloneFactionState(source = DEFAULT_FACTION_STATE) {
  return {
    reputation: { sunspire: 0, ironroot: 0, tideborn: 0, ...(source.reputation || {}) },
    accepted: Array.isArray(source.accepted) ? [...source.accepted] : [],
    claimed: Array.isArray(source.claimed) ? [...source.claimed] : [],
    discovered: Array.isArray(source.discovered) ? [...source.discovered] : [],
  };
}

export function areFactionsHostile(left, right) {
  if (!left || !right || left === right) return false;
  return FACTION_RELATIONS[left]?.[right] === "hostile";
}

export function getFactionStanding(reputation = 0) {
  const value = Number(reputation) || 0;
  if (value <= -50) return { id: "enemy", label: "Enemy", color: "error" };
  if (value < 0) return { id: "wary", label: "Wary", color: "warning" };
  if (value < 25) return { id: "neutral", label: "Neutral", color: "default" };
  if (value < 60) return { id: "trusted", label: "Trusted", color: "info" };
  if (value < 100) return { id: "honored", label: "Honored", color: "success" };
  return { id: "champion", label: "Champion", color: "success" };
}
