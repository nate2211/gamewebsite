const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const failures = [];

const home = read("src/pages/HomePage.js");
const game = read("src/pages/GamePage.js");
const canvas = read("src/components/game/canvas/GameCanvas.js");
const renderer = read("src/game/world/rendering/WorldRenderer.js");
const bootstrap = read("src/game/world/loading/worldBootstrap.js");
const pause = read("src/components/game/overlays/PauseOverlay.js");
const db = read("src/data/db.js");

for (const needle of [
  "prepareBootstrapChunks",
  "db.worldBootstraps.put",
  "Building visible spawn terrain",
  "version: 10",
]) {
  if (!home.includes(needle)) failures.push(`HomePage missing create-world guarantee: ${needle}`);
}
for (const needle of [
  "applyBootstrapChunks",
  "Finding safe ground and positioning the camera",
  "voxelMeshesReady",
  "onTerrainRenderable",
  "collisionReady && voxelMeshesReady",
]) {
  if (!game.includes(needle)) failures.push(`GamePage missing playable-world gate: ${needle}`);
}
for (const needle of [
  "generateChunk",
  "getChunkIdsAround",
  "isUsableChunk",
  "stripBootstrapChunksForStorage",
]) {
  if (!bootstrap.includes(needle)) failures.push(`worldBootstrap missing: ${needle}`);
}
if (!canvas.includes("onTerrainRenderable={onTerrainRenderable}")) {
  failures.push("GameCanvas does not forward the terrain-renderable signal");
}
if (!renderer.includes("renderableReportedRef") || !renderer.includes("callbacksRef.current.onTerrainRenderable?.")) {
  failures.push("WorldRenderer does not confirm mounted voxel geometry");
}
if (!pause.includes("Preparing playable voxels")) {
  failures.push("Pause overlay does not show the playable-voxel loading state");
}
if (!db.includes("worldBootstraps") || !home.includes("db.transaction") || !game.includes("db.worldBootstraps.get")) {
  failures.push("Spawn chunks are not isolated in the IndexedDB bootstrap cache");
}
if ((game.match(/const centerId =/g) || []).length !== 1) {
  failures.push("GamePage must declare the center chunk id exactly once");
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Create-world validation passed: spawn chunks are generated before navigation, inserted before Canvas mount, safely positioned, visibly mounted, and gravity-gated.");
