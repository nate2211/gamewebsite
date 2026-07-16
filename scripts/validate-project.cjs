const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const required = [
  "src/components/crafting/recipe-book/RecipeBookPanel.js",
  "src/components/progression/perks/PerksPanel.js",
  "src/components/quests/journal/QuestJournalPanel.js",
  "src/components/system/backups/WorldBackupPanel.js",
  "src/game/config/perks.js",
  "src/game/config/quests.js",
  "src/game/liquids/LiquidSystem.js",
  "src/game/particles/ParticleSystem.js",
  "src/game/entities/ai/behaviorEngine.js",
  "src/game/player/FirstPersonViewModel.js",
  "src/components/game/canvas/ViewportController.js",
  "src/components/character/model/ArmorMannequinCanvas.js",
  "src/components/inventory/dialog/InventoryDialog.js",
  "src/index.css",
  "public/assets/texture-atlas.png",
  "build/index.html",
];

const failures = [];
for (const relative of required) {
  if (!fs.existsSync(path.join(root, relative))) failures.push(`Missing ${relative}`);
}
const allowedCompatibilityFiles = {
  "src/components": new Set(["CraftingPanel.js", "GameCanvas.js", "Hud.js", "ItemIcon.js", "PauseOverlay.js"]),
  "src/game": new Set([
    "ChunkStreamer.js", "DayNightCycle.js", "FirstPersonViewModel.js", "InteractionController.js",
    "MobSystem.js", "PerformanceGovernor.js", "PlayerController.js", "WorldRenderer.js", "blockTypes.js",
    "chunk.worker.js", "chunkWorkerClient.js", "mobDisplaySettings.js", "mobTypes.js", "movementUtils.js",
    "performanceProfile.js", "useKeyboard.js", "voxelTextures.js", "worldGenerator.js", "worldRuntime.js", "worldUtils.js",
  ]),
};
for (const folder of ["src/components", "src/game"]) {
  const loose = fs.readdirSync(path.join(root, folder), { withFileTypes: true })
    .filter((entry) => entry.isFile() && !allowedCompatibilityFiles[folder].has(entry.name))
    .map((entry) => entry.name);
  if (loose.length) failures.push(`${folder} contains unexpected loose files: ${loose.join(", ")}`);
}
const itemCount = fs.readdirSync(path.join(root, "public/assets/items")).filter((name) => name.endsWith(".png")).length;
const blockCount = fs.readdirSync(path.join(root, "public/assets/blocks")).filter((name) => name.endsWith(".png")).length;
if (itemCount < 80) failures.push(`Expected at least 80 item icons, found ${itemCount}`);
if (blockCount < 40) failures.push(`Expected at least 40 block textures, found ${blockCount}`);
const firstPerson = fs.readFileSync(path.join(root, "src/game/player/FirstPersonViewModel.js"), "utf8");
const mobs = fs.readFileSync(path.join(root, "src/game/entities/MobSystem.js"), "utf8");
const slice = fs.readFileSync(path.join(root, "src/features/world/worldSlice.js"), "utf8");
const inventoryDialog = fs.readFileSync(path.join(root, "src/components/inventory/dialog/InventoryDialog.js"), "utf8");
if (!firstPerson.includes("function PixelBlockArm")
    || !firstPerson.includes("createPortal")
    || !firstPerson.includes("gl.render(scene, camera)")
    || !firstPerson.includes("gl.clearDepth()")
    || !firstPerson.includes("gl.render(overlayScene, overlayCamera)")
    || !firstPerson.includes("renderOrder = 10000")) {
  failures.push("Depth-isolated camera-space first-person view model is missing");
}
if (!mobs.includes("applyMobDeathPose") || !slice.includes("finalizeMobDeaths") || !slice.includes("dyingUntil")) {
  failures.push("Timed mob death animation pipeline is missing");
}
if (!inventoryDialog.includes("rpg-menu-shell") || !inventoryDialog.includes("fast-inventory-overlay") || !inventoryDialog.includes("if (!open) return null")) {
  failures.push("Unmounted full-viewport RPG inventory shell is missing");
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`Validation passed: ${itemCount} item icons, ${blockCount} block textures, voxel UI, 3D armory, death animations, depth-isolated camera-space view model, and production build present.`);
