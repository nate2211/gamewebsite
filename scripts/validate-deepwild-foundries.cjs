const fs = require("fs");
const vm = require("vm");
const path = require("path");

function text(file) { return fs.readFileSync(file, "utf8"); }
const blocks = text("src/game/config/blockTypes.js");
const interaction = text("src/game/systems/InteractionController.js");
const slice = text("src/features/world/worldSlice.js");
const generator = text("src/game/world/generation/worldGenerator.js");
const deepwild = text("src/game/config/deepwild.js");
const mobs = text("src/game/config/mobTypes.js");
const mobSystem = text("src/game/entities/MobSystem.js");
const colony = text("src/game/colonies/ColonySystem.js");
const inventoryDialog = text("src/components/inventory/dialog/InventoryDialog.js");
const recipeBook = text("src/components/crafting/recipe-book/RecipeBookPanel.js");
const furnace = text("src/components/crafting/furnace/FurnacePanel.js");
const storage = text("src/components/storage/StorageChestPanel.js");
const renderer = text("src/game/world/rendering/WorldRenderer.js");
const textures = text("src/game/world/rendering/voxelTextures.js");
const icons = text("src/components/items/icons/ItemIcon.js");
const db = text("src/data/db.js");

const checks = [
  ["craftable persistent storage chests", blocks.includes('id: "storage_chest"') && blocks.includes('station: "crafting_table"') && slice.includes('storageChests: {}') && storage.includes('Frontier Storage Chest')],
  ["water and lava bucket states", blocks.includes('water_bucket: material') && blocks.includes('lava_bucket: material') && interaction.includes('liquidRuntime.addSource') && interaction.includes('fillWaterBucket') && interaction.includes('fillLavaBucket')],
  ["water lava cooling creates obsidian", interaction.includes('touchingWater') && interaction.includes('adjacentLavaPositions') && interaction.includes('solidifyLava') && slice.includes('solidified ? "obsidian" : "lava"')],
  ["recipe search stays in the game UI", inventoryDialog.includes('data-recipe-search') && inventoryDialog.includes('recipeSearchShortcut') && inventoryDialog.includes('event.preventDefault()') && recipeBook.includes('Search recipes, ingredients, or outputs') && furnace.includes('Search smelting recipes')],
  ["browser popup recipe search is not used", !recipeBook.includes('window.open') && !recipeBook.includes('window.prompt') && !furnace.includes('window.open') && !inventoryDialog.includes('window.prompt')],
  ["deep cave carving and hidden site registry", generator.includes('caveThreshold = biome === "mountains" ? 0.55 : 0.61') && generator.includes('addUndergroundFeatures') && deepwild.includes('UNDERGROUND_CELL_SIZE = 72')],
  ["all requested underground site types", ["spider_lair","zombie_mound","skeleton_catacomb","mushroom_forest","forgotten_vault"].every((id) => deepwild.includes(`${id}:`))],
  ["underground sites include defenders spawners and treasure", generator.includes('monster_spawner') && generator.includes('profile.treasure') && generator.includes('site.profile.defenders') && generator.includes('guardsTreasure = true')],
  ["mushrooms bowls soup and furnace cooking", ["brown_mushroom","red_mushroom","bowl","mushroom_soup","cooked_beef","cooked_mutton","cooked_porkchop","cooked_chicken","cooked_fish"].every((id) => blocks.includes(id)) && slice.includes('item.returnsItem')],
  ["apple trees and golden apples", blocks.includes('apple_leaves: block') && blocks.includes('golden_apple: material') && generator.includes('appleBearing ? "apple_leaves"')],
  ["realtime colony house construction", deepwild.includes('createBuilderHousePlan') && colony.includes('advanceColonyConstruction') && colony.includes('Construction blocked at') && slice.includes('housesBuilt')],
  ["enhanced cave mob variants", ["plague_zombie","rune_skeleton","venom_spider","spore_slime"].every((id) => mobs.includes(`${id}: {`)) && mobs.includes('enhanced: true') && mobSystem.includes('definition.specialAttack')],
  ["enhanced mobs drop special loot", mobs.includes('enchanted_core') && mobs.includes('enchantment_shard') && blocks.includes('enchanted_core: material')],
  ["new deepwild voxel geometry and textures", renderer.includes('monster_spawner: mergedBoxes') && renderer.includes('MUSHROOM_GEOMETRY') && renderer.includes('COBWEB_GEOMETRY') && textures.includes('type === "monster_spawner"') && textures.includes('caveMushroom') && icons.includes('mushroom_soup')],
  ["save and terrain versions updated", db.includes('version: 24') && generator.includes('TERRAIN_GENERATOR_VERSION = 22')],
];

// Execute the standalone deterministic deepwild config to verify that the
// registry and builder plans work rather than only checking labels.
let runtimeSource = deepwild.replace(/export\s+/g, "");
runtimeSource += "\nmodule.exports={getUndergroundSites,createBuilderHousePlan,UNDERGROUND_SITE_TYPES};";
const context = { module: { exports: {} }, exports: {}, Math, Number, String, Object, Array, Set, Map };
vm.runInNewContext(runtimeSource, context, { filename: path.join(process.cwd(), "src/game/config/deepwild.js") });
const { getUndergroundSites, createBuilderHousePlan, UNDERGROUND_SITE_TYPES } = context.module.exports;
const sitesA = getUndergroundSites("deepwild-validator-seed", 720);
const sitesB = getUndergroundSites("deepwild-validator-seed", 720);
checks.push(["underground registry is deterministic", JSON.stringify(sitesA) === JSON.stringify(sitesB)]);
checks.push(["mushroom forest and catacomb guaranteed in exploration radius", sitesA.some((site) => site.type === "mushroom_forest") && sitesA.some((site) => site.type === "skeleton_catacomb")]);
checks.push(["underground sites stay separated", sitesA.every((site, index) => sitesA.slice(index + 1).every((other) => Math.hypot(site.x - other.x, site.z - other.z) >= 42))]);
checks.push(["every site profile defines defenders and treasure", Object.values(UNDERGROUND_SITE_TYPES).every((profile) => Array.isArray(profile.defenders) && profile.defenders.length > 0 && profile.treasure >= 1)]);
const plan = createBuilderHousePlan([10, 12, 20]);
checks.push(["builder creates a complete staged furnished house", plan.length >= 120 && ["foundation","walls","roof","furnishing"].every((phase) => plan.some((step) => step.phase === phase)) && plan.some((step) => step.type === "frontier_bed") && plan.some((step) => step.type === "storage_chest")]);

const failed = checks.filter(([, ok]) => !ok);
checks.forEach(([name, ok]) => console.log(`${ok ? "PASS" : "FAIL"} ${name}`));
if (failed.length) {
  console.error(`Deepwild validation failed: ${failed.map(([name]) => name).join(", ")}`);
  process.exit(1);
}
console.log(`Deepwild validation passed with ${sitesA.length} deterministic underground sites and ${plan.length} builder-plan blocks.`);
