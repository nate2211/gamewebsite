const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];
const expect = (value, message) => { if (!value) failures.push(message); };

const generator = read("src/game/world/generation/worldGenerator.js");
const eruption = read("src/game/ocean/VolcanoEruptionSystem.js");
const swell = read("src/game/ocean/OceanSwellSystem.js");
const canvas = read("src/components/game/canvas/GameCanvas.js");
const gamePage = read("src/pages/GamePage.js");
const keyboard = read("src/game/player/useKeyboard.js");
const interaction = read("src/game/systems/InteractionController.js");
const inventory = read("src/components/inventory/dialog/InventoryDialog.js");
const workbench = read("src/components/crafting/recipe-book/RecipeBookPanel.js");
const furnace = read("src/components/crafting/furnace/FurnacePanel.js");
const blocks = read("src/game/config/blockTypes.js");
const textures = read("src/game/world/rendering/voxelTextures.js");

expect(generator.includes('"tropical_island"') && generator.includes('"volcanic_island"') && generator.includes('"land_volcano"'), "island and land-volcano biomes missing");
expect(generator.includes("ISLAND_CELL_SIZE = 176") && generator.includes("LAND_VOLCANO_CELL_SIZE = 384"), "rare volcano cell spacing missing");
expect(generator.includes("if (rarity > 0.11) return null") && generator.includes("if (coordinateRandom(generator.seedHash, cellX, cellZ, 9311) > 0.045) return null"), "rare spawn gates missing");
expect(generator.includes("ISLAND_MIN_SPAWN_DISTANCE = 112") && generator.includes("LAND_VOLCANO_MIN_SPAWN_DISTANCE = 190"), "safe spawn exclusion missing");
expect(generator.includes("getVolcanoSites") && generator.includes("getLandVolcanoSites") && generator.includes("getVolcanicIslandSites"), "combined volcano registry missing");
expect(generator.includes("addVolcanoSurfaceFeatures") && generator.includes('setBlock(blocks, ...bounds, x, groundY + 1, z, "lava")'), "persistent crater and lava-channel generation missing");
expect(blocks.includes('basalt: block') && blocks.includes('black_sand: block') && blocks.includes('volcanic_ash: block'), "volcanic blocks missing");
expect(textures.includes('type === "basalt"') && textures.includes('type === "black_sand" || type === "volcanic_ash"'), "volcanic textures missing");

expect(eruption.includes("getVolcanoSites") && eruption.includes("WAVE_COUNT = 3") && eruption.includes("LAVA_BOMB_GEOMETRY"), "land/ocean eruption renderer missing");
expect(eruption.includes("particleRuntime.emitBlockParticles") && eruption.includes("volcanic-eruption"), "eruption particles missing");
expect(swell.includes("rolling-ocean-swell-system") && swell.includes("waveAt") && swell.includes("whitecaps"), "rolling ocean swell and whitecaps missing");
expect(swell.includes("worldRuntime.getBlockTypeAt(x, SEA_LEVEL, z) === \"water\""), "ocean swell is not restricted to loaded water surfaces");
expect(canvas.includes("<OceanSwellSystem") && canvas.includes("<VolcanoEruptionSystem"), "ocean and eruption systems are not mounted");

for (const [name, source] of [["inventory", inventory], ["workbench", workbench], ["furnace", furnace]]) {
  expect(source.includes('data-recipe-search'), `${name} recipe search marker missing`);
  expect(source.includes('autoComplete: "off"') && source.includes("event.stopPropagation()"), `${name} recipe typing isolation missing`);
}
expect(gamePage.includes("isTypingTarget(event.target)") && keyboard.includes('tag === "input"') && interaction.includes('tag === "input"'), "gameplay keyboard handlers still intercept recipe typing");
expect(gamePage.includes('document.body.style.cursor = "default"') && gamePage.includes("document.exitPointerLock()") && gamePage.includes('event.code !== "Escape"'), "Escape cursor release missing");
expect(generator.includes("TERRAIN_GENERATOR_VERSION = 22"), "terrain generator version was not advanced");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Volcanic Archipelago validation passed: rare land/ocean volcanoes, island biomes, eruption waves, ocean swells, stable recipe typing, and Escape cursor release are present.");
