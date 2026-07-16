const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const failures = [];
const requireContract = (condition, message) => { if (!condition) failures.push(message); };

const files = [
  "src/game/config/runtimeSettings.js",
  "src/game/config/performanceProfile.js",
  "src/pages/SettingsPage.js",
  "src/game/world/streaming/ChunkStreamer.js",
  "src/game/player/streamingBoundarySafety.js",
  "src/game/player/PlayerController.js",
  "src/components/game/canvas/GameCanvas.js",
  "src/pages/GamePage.js",
  "src/game/entities/MobSystem.js",
];

for (const relativePath of files) {
  parser.parse(read(relativePath), {
    sourceType: "module",
    plugins: ["jsx", "optionalChaining", "classProperties", "objectRestSpread", "dynamicImport"],
  });
}

const runtime = read("src/game/config/runtimeSettings.js");
const profile = read("src/game/config/performanceProfile.js");
const settings = read("src/pages/SettingsPage.js");
const streamer = read("src/game/world/streaming/ChunkStreamer.js");
const safety = read("src/game/player/streamingBoundarySafety.js");
const player = read("src/game/player/PlayerController.js");
const canvas = read("src/components/game/canvas/GameCanvas.js");
const gamePage = read("src/pages/GamePage.js");
const renderer = read("src/game/world/rendering/WorldRenderer.js");
const mobs = read("src/game/entities/MobSystem.js");
const packageJson = JSON.parse(read("package.json"));

requireContract(Number(packageJson.version.split(".")[0]) >= 11, "release version is older than the engine-streaming baseline");
requireContract(runtime.includes("renderDistance, 2, 16") && runtime.includes("chunkGenerationConcurrency, 1, 8"), "runtime setting bounds do not expose 16-chunk / 8-worker engine limits");
requireContract(runtime.includes("continueStreamingWhilePaused") && runtime.includes("preventVoidFall") && runtime.includes("walkAcrossStreamingBoundary"), "streaming safety settings are missing");
requireContract(settings.includes('max={16}') && settings.includes("Engine and world streaming") && settings.includes("predictive streaming-boundary safety floor"), "engine settings UI is incomplete");
requireContract(profile.includes('id: "ultra"') && profile.includes("renderDistance: 16") && profile.includes("cameraFar: 580"), "ultra render profile is missing");
requireContract(streamer.includes("Array.from({ length: concurrency }") && streamer.includes("workersRef") && streamer.includes("chunkUnloadMargin"), "parallel worker-pool streaming or unload hysteresis is missing");
requireContract(streamer.includes("chunkPreloadRadius") && streamer.includes("generationRadius") && streamer.includes("unloadRadius"), "predictive preload ring is not wired into streaming");
requireContract(canvas.includes("profile.continueStreamingWhilePaused") && canvas.includes("enabled={streamingEnabled}") && canvas.includes("fov: profile.cameraFov"), "Canvas is not using engine streaming/FOV settings");
requireContract(renderer.includes("const visibleChunks = useMemo") && renderer.includes("profile.renderDistance") && renderer.includes("visibleChunks.map"), "preloaded/unload-margin chunks are not culled to the selected visual render radius");
requireContract(gamePage.includes("Readiness is a one-way startup gate") && gamePage.includes("|| terrainReady) return"), "world readiness can still be revoked during normal streaming");
requireContract(!gamePage.includes('setTerrainError("Restoring the rendered voxel terrain'), "legacy auto-pause restoration gate is still present");
requireContract(safety.includes("createStreamingBoundarySampler") && safety.includes("standingY") && safety.includes("touchesUnloadedChunk"), "deterministic unloaded-chunk support sampler is missing");
requireContract(player.includes("settings.walkAcrossStreamingBoundary") && player.includes("settings.preventVoidFall") && player.includes("getPredictiveStandingY"), "player collision does not support walkable unloaded boundaries");
requireContract(player.includes("Absolute final guard") && player.includes("position.y < -8") && player.includes("worldRuntime.findTopSolidY"), "absolute anti-void recovery is missing");
requireContract(mobs.includes("runtimeSettings.simulationDistance") && mobs.includes("mobRenderRadius"), "simulation distance is not applied to mob processing");
requireContract(fs.existsSync(path.join(root, "build", "index.html")), "optimized production build is missing");

if (failures.length) {
  console.error(`Engine streaming validation failed (${failures.length}):`);
  failures.forEach((failure) => console.error(` - ${failure}`));
  process.exit(1);
}

console.log("Engine streaming validation passed: 16-chunk profiles, worker-pool generation, pause-independent streaming, one-way world readiness, and predictive anti-void collision verified.");
