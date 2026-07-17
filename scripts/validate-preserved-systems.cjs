const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

const texture = read("src/game/world/rendering/voxelTextures.js");
const renderer = read("src/game/world/rendering/WorldRenderer.js");
const liquidRuntime = read("src/game/liquids/liquidRuntime.js");
const liquidSystem = read("src/game/liquids/LiquidSystem.js");
const interaction = read("src/game/systems/InteractionController.js");
const player = read("src/game/player/PlayerController.js");
const gameCanvas = read("src/components/game/canvas/GameCanvas.js");
const worldSlice = read("src/features/world/worldSlice.js");
const adventure = read("src/game/config/adventure.js");
const arcana = read("src/game/config/arcana.js");

expect(texture.includes("STRAIGHT_CRACK_SEGMENTS"), "straight crack segment network missing");
expect(texture.includes("strokeStraightCracks"), "straight crack renderer missing");
expect(!texture.includes("drawCrackBranch"), "legacy squiggly crack branches remain");
const crackSection = texture.slice(texture.indexOf("const STRAIGHT_CRACK_SEGMENTS"), texture.indexOf("export function getCrackTexture") + 2600);
expect(!crackSection.includes("bezierCurveTo") && !crackSection.includes("quadraticCurveTo") && !crackSection.includes("ctx.arc("), "curved or circular crack drawing remains");
expect(renderer.includes("getCrackTexture(stage)"), "staged block-face crack textures missing");
expect(!renderer.includes("BREAK_RING_GEOMETRY") && !renderer.includes("impact-ring"), "circular block-break overlay returned");
expect(renderer.includes("impactPulse") && renderer.includes("group.rotation.set(0, 0, 0)"), "solid non-wobbly mining response missing");

expect(liquidRuntime.includes("WATER_MICRO_LEVELS = 16"), "16-level flowing water missing");
expect(liquidRuntime.includes("MAX_SOURCE_DISTANCE = 12"), "water spread distance missing");
expect(liquidRuntime.includes("Gravity always wins"), "gravity-first water flow missing");
expect(liquidSystem.includes("liquidVolumes") && liquidSystem.includes("liquidSurfaces"), "flowing-water rendering missing");
expect(interaction.includes("liquidRuntime.flowIntoOpenedCell"), "mining-to-water-flow update missing");
expect(player.includes("liquidRuntime.containsPoint"), "player water collision/swimming integration missing");
expect(gameCanvas.includes("<LiquidSystem") && gameCanvas.includes("<ShoreWaveSystem"), "water and shore systems are not mounted");

expect(worldSlice.includes("findLeftmostAvailableHotbarSlot") && worldSlice.includes("assignPickupToHotbar"), "Quick Access inventory behavior missing");
expect(adventure.includes("LANDMARK") || adventure.includes("structure"), "adventure structures missing");
expect(adventure.includes("enchant"), "enchantment content missing");
expect(arcana.includes("wand") && arcana.includes("golem"), "arcane progression missing");
expect(gameCanvas.includes("<ColonySystem") && gameCanvas.includes("<FarmSystem"), "colony or farming systems missing");
expect(gameCanvas.includes("<MobSystem") && gameCanvas.includes("<WeatherSystem"), "mobs or weather systems missing");
expect(gameCanvas.includes("<RemotePlayersLayer"), "multiplayer remote-player layer missing");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Preserved-systems validation passed: water flow, prior gameplay, and straight block-face cracks are intact.");
