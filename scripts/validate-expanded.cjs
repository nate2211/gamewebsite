const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const failures = [];
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const required = [
  "src/components/items/inspection/ItemInspectionCanvas.js",
  "src/components/progression/constellation/PerkConstellationCanvas.js",
  "src/game/entities/death/MobDeathEffects.js",
  "src/game/player/FirstPersonViewModel.js",
  "build/index.html",
];
required.forEach((file) => { if (!fs.existsSync(path.join(root, file))) failures.push(`Missing ${file}`); });
const assetFolders = ["src/assets/ui-cinematic", "public/assets/ui-cinematic"];
for (const folder of assetFolders) {
  const full = path.join(root, folder);
  const jpgs = fs.existsSync(full) ? fs.readdirSync(full).filter((name) => name.endsWith(".jpg")) : [];
  if (jpgs.length < 16) failures.push(`${folder} should contain at least 16 original UI textures`);
  for (const name of jpgs) if (fs.statSync(path.join(full, name)).size < 150000) failures.push(`${folder}/${name} is unexpectedly small`);
}
const view = read("src/game/player/FirstPersonViewModel.js");
if (!view.includes("VIEWMODEL_LAYER = 31") || !view.includes("camera.getWorldPosition") || !view.includes("gl.clearDepth()")) failures.push("Guaranteed face-mounted first-person pass is missing");
const mobs = read("src/game/entities/MobSystem.js");
const effects = read("src/game/entities/death/MobDeathEffects.js");
const slice = read("src/features/world/worldSlice.js");
if (!mobs.includes("MobDeathEffects") || !effects.includes("instancedMesh") || !slice.includes("MOB_DEATH_ANIMATION_MS = 1750")) failures.push("Expanded delayed death animation system is missing");
const inventory = read("src/components/inventory/tabs/InventoryTab.js");
const perks = read("src/components/progression/perks/PerksPanel.js");
const dialog = read("src/components/inventory/dialog/InventoryDialog.js");
if (!inventory.includes("ItemInspectionCanvas") || !perks.includes("PerkConstellationCanvas") || !dialog.includes("tab-${tab}")) failures.push("Expanded dynamic RPG menu screens are missing");
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log("Expanded cinematic validation passed: camera-mounted hand/tool, layered death effects, 3D item inspection, constellation perks, tab textures, and production build are present.");
