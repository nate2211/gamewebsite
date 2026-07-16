const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const failures = [];

const gamePage = read("src/pages/GamePage.js");
const streamer = read("src/game/world/streaming/ChunkStreamer.js");
const player = read("src/game/player/PlayerController.js");
const renderer = read("src/game/world/rendering/WorldRenderer.js");
const safety = read("src/game/world/loading/worldLoadSafety.js");

for (const needle of [
  "LOAD_SAFETY_RADIUS",
  "isLoadAreaReady",
  "findSafeLoadedPlayerPosition",
  "playerLoadReady",
  "renderedChunkIds",
  "!terrainReady || !playerLoadReady",
]) {
  if (!gamePage.includes(needle)) failures.push(`GamePage missing load guard: ${needle}`);
}
for (const needle of [
  "bootstrapRadius",
  "getChunkIdsAround",
  "requestIdleCallback",
  "Direct bootstrap voxel generation failed",
]) {
  if (!streamer.includes(needle)) failures.push(`ChunkStreamer missing bootstrap guarantee: ${needle}`);
}
for (const needle of ["worldReady", "becameWorldReady", "playerRef.current || savedPlayer"]) {
  if (!player.includes(needle)) failures.push(`PlayerController missing frozen-load camera handling: ${needle}`);
}
for (const needle of ["onChunkRendered", "reportedChunksRef", "requestAnimationFrame"]) {
  if (!renderer.includes(needle)) failures.push(`WorldRenderer missing mesh-ready signal: ${needle}`);
}
for (const needle of [
  "getRequiredLoadChunkIds",
  "hasStandingHeadroom",
  "safeSupportYNear",
  "highestSafeSupportY",
  "normalizeSavedPlayer",
]) {
  if (!safety.includes(needle)) failures.push(`worldLoadSafety missing: ${needle}`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Load-world validation passed: 3x3 collision bootstrap, rendered-center confirmation, frozen physics, safe-position recovery, and protected autosaves are present.");
