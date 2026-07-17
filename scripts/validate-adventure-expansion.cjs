const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const requireText = (file, values) => {
  const text = read(file);
  values.forEach((value) => {
    if (!text.includes(value)) throw new Error(`${file} is missing ${value}`);
  });
};

requireText("src/game/config/adventure.js", ["ENCHANTMENTS", "VILLAGE_QUESTS", "getTreasureLoot", "fortified_ruin", "raider_camp", "ruined_tower", "bone_temple", "war_forge", "village", "fossil_dig"]);
requireText("src/game/config/blockTypes.js", ["enchantment_table", "paleontology_lab", "fossil_block", "dinosaur_egg", "wooden_spear", "iron_katana", "iron_greatsword", "iron_halberd", "iron_warhammer", "iron_scythe"]);
requireText("src/game/config/mobTypes.js", ["elite_zombie", "warlord_skeleton", "villager_scholar", "raptor", "triceratops", "tyrannosaur", "sea_serpent", "hydra", "sky_dragon"]);
requireText("src/game/world/generation/worldGenerator.js", ["addFortifiedRuin", "addRaiderCamp", "addRuinedTower", "addBoneTemple", "addWarForge", "addVillage", "addFossilDig", "treasure_chest"]);
requireText("src/features/world/worldSlice.js", ["lootTreasureChest", "enchantItem", "analyzeFossils", "spliceDinosaurEgg", "reviveDinosaur", "acceptVillageQuest", "claimVillageQuest", "eliteEnemiesDefeated"]);
requireText("src/components/inventory/dialog/InventoryDialog.js", ["EnchantmentPanel", "PaleontologyPanel", "TreasureChestPanel", "VillageDialoguePanel"]);
requireText("src/game/player/FirstPersonViewModel.js", ["WeaponModel", "attack_spear", "attack_katana", "attack_greatsword", "attack_halberd", "attack_warhammer", "attack_scythe"]);
const renderer = read("src/game/world/rendering/WorldRenderer.js");
if (renderer.includes("BREAK_RING_GEOMETRY") || renderer.includes("impact-ring")) throw new Error("Legacy circular mining rings are still present");
if (!renderer.includes("getCrackTexture")) throw new Error("Block-face crack stages are missing");
console.log("Adventure expansion validation passed.");
