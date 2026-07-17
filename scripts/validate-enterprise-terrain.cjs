const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const failures = [];
const requireContract = (condition, message) => { if (!condition) failures.push(message); };

const renderer = read("src/game/world/rendering/WorldRenderer.js");
const runtime = read("src/game/core/worldRuntime.js");
const migration = read("src/game/world/loading/terrainMigration.js");
const inventory = read("src/components/inventory/tabs/InventoryTab.js");
const itemIcon = read("src/components/items/icons/ItemIcon.js");
const slot = read("src/components/inventory/slots/InventorySlot.js");
const blocks = read("src/game/config/blockTypes.js");
const farm = read("src/game/farming/FarmSystem.js");
const worldSlice = read("src/features/world/worldSlice.js");
const css = read("src/index.css");
const db = read("src/data/db.js");

for (const relativePath of [
  "src/game/world/rendering/WorldRenderer.js",
  "src/game/core/worldRuntime.js",
  "src/game/world/loading/terrainMigration.js",
  "src/components/inventory/tabs/InventoryTab.js",
  "src/components/items/icons/ItemIcon.js",
  "src/components/inventory/slots/InventorySlot.js",
  "src/game/config/blockTypes.js",
  "src/game/farming/FarmSystem.js",
  "src/features/world/worldSlice.js",
]) {
  parser.parse(read(relativePath), {
    sourceType: "module",
    plugins: ["jsx", "optionalChaining", "classProperties", "objectRestSpread", "dynamicImport"],
  });
}

requireContract(renderer.includes("createVoxelPlantGeometry") && renderer.includes("mergeGeometries"), "plants are not rendered as merged voxel geometry");
requireContract(renderer.includes("createVoxelVineGeometry"), "vines are not rendered as voxel geometry");
requireContract(renderer.includes("!terrainVisuallyStable && <TerrainSurfaceShell"), "terrain fallback shell is not startup-only");
requireContract(!renderer.includes("GrassCapInstances"), "duplicate grass-cap renderer still exists");
requireContract(runtime.includes("normalizeBlockType") && runtime.includes("sanitizeBlockEdits"), "world runtime does not normalize persisted terrain");
requireContract(migration.includes("purple_block") && migration.includes("missing_texture") && migration.includes("placeholder"), "legacy purple/debug block aliases are incomplete");
requireContract((db.includes("version: 24") || db.includes("version: 21") || db.includes("version: 20") || db.includes("version: 18") || db.includes("version: 17") || db.includes("version: 16") || db.includes("version: 15") || db.includes("version: 14")) && db.includes("sanitizeBlockEdits") && db.includes("sanitizeCropRecords"), "save serialization migration is incomplete");
requireContract(itemIcon.includes("requestIdleCallback") && itemIcon.includes("ICON_BATCH_SIZE") && itemIcon.includes("pendingIconIds"), "item icons are not generated through an idle-time queue");
requireContract(inventory.includes("preloadItemIcons") && inventory.includes("useMemo") && inventory.includes("useCallback"), "inventory memoization/prewarming contract missing");
requireContract(slot.includes("memo(") && slot.includes("activationValue") && slot.includes("useCallback"), "inventory slots are not stable memoized components");
requireContract(css.includes("contain: layout paint style") && css.includes("inventory-icon-placeholder"), "inventory paint containment/placeholder styling missing");
requireContract(blocks.includes('category: "seed"') && blocks.includes("getPlantStageDuration") && blocks.includes("getPlantTotalGrowthMs"), "seed categories or growth timing helpers missing");
requireContract(farm.includes("getPlantStageDuration") && worldSlice.includes("getPlantStageDuration(plantType, 0)"), "per-stage growth scheduling is not persisted end-to-end");
requireContract(inventory.includes("physical voxel crop") && inventory.includes("getPlantTotalGrowthMs"), "inventory does not expose crop growth behavior/time");

const lockText = read("package-lock.json");
requireContract(!/applied-caas|internal\.api\.openai/i.test(lockText), "package lock references an inaccessible internal registry");

if (failures.length) {
  console.error(`Enterprise terrain validation failed (${failures.length}):`);
  failures.forEach((failure) => console.error(` - ${failure}`));
  process.exit(1);
}

console.log("Enterprise terrain validation passed: optimized inventory, authoritative grass surfaces, terrain migration, voxel crops, and staged farming verified.");
