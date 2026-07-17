const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const requireText = (file, tokens) => {
  const value = read(file);
  tokens.forEach((token) => { if (!value.includes(token)) throw new Error(`${file} missing ${token}`); });
};
requireText("src/game/config/adventure.js", [
  "LANDMARK_CELL_SIZE = 128", "LANDMARK_MIN_DISTANCE = 96", "gravewatch_crypt", "bandit_watchpost",
  "STRUCTURE_TREASURE_PROFILES", "villager_blacksmith", "villager_healer", "villager_cartographer", "villager_merchant"
]);
requireText("src/game/world/generation/worldGenerator.js", [
  "buildRareLandmarkRegistry(generator, 720)", "addGravewatchCrypt", "addBanditWatchpost", "structureTreasureTier",
  "Smith Ansel", "Sister Elara", "Pathfinder Toma", "Merchant Veya", "TERRAIN_GENERATOR_VERSION = 22"
]);
requireText("src/game/config/mobTypes.js", [
  "villager_blacksmith", "villager_healer", "villager_cartographer", "villager_merchant", "interactionPrompt: \"Talk\""
]);
requireText("src/data/db.js", ["version: 24"]);
const adventure = read("src/game/config/adventure.js");
const chances = [...adventure.matchAll(/type: \"[^\"]+\", chance: ([0-9.]+)/g)].map((m) => Number(m[1]));
const total = chances.reduce((a,b)=>a+b,0);
if (!(total > 0 && total <= 0.06)) throw new Error(`Combined landmark chance must remain rare; got ${total}`);
const requiredProfiles = ["fortified_ruin","raider_camp","ruined_tower","bone_temple","war_forge","fossil_dig","gravewatch_crypt","bandit_watchpost"];
for (const type of requiredProfiles) {
  const token = `${type}: Object.freeze({ minimum:`;
  if (!adventure.includes(token)) throw new Error(`Missing treasure profile for ${type}`);
}
console.log(`Rare Realms contracts validated; combined landmark chance ${total.toFixed(3)}.`);
