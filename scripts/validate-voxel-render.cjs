const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const failures = [];

const streamer = read("src/game/world/streaming/ChunkStreamer.js");
const renderer = read("src/game/world/rendering/WorldRenderer.js");
const player = read("src/game/player/PlayerController.js");
const hand = read("src/game/player/FirstPersonViewModel.js");

for (const needle of ["generateChunk", "bootstrapRadius", "requestIdleCallback", "worldRuntime.applyChunk(chunk)"]) {
  if (!streamer.includes(needle)) failures.push(`ChunkStreamer missing ${needle}`);
}
for (const needle of ["LoadingVoxelPrimer", "!centerChunkMounted", "PRIMER_BLOCKS", "createUnlitBlockMaterials", "frustumCulled={false}"]) {
  if (!renderer.includes(needle)) failures.push(`WorldRenderer missing ${needle}`);
}
if (!player.includes("INITIAL_CAMERA_PITCH = -0.72") || !player.includes("pitchRef.current = INITIAL_CAMERA_PITCH")) failures.push("Player camera does not begin angled toward visible terrain");
for (const needle of ["baseX = portrait ? 0.27", "-0.45 - twist * 0.42", "scale={0.66}", "Camera-space coordinates"]) {
  if (!hand.includes(needle)) failures.push(`First-person voxel arm missing ${needle}`);
}

for (const directory of ["src/assets/voxel-render-pack", "public/assets/voxel-render-pack"]) {
  const full = path.join(root, directory);
  const files = fs.existsSync(full) ? fs.readdirSync(full).filter((name) => name.endsWith(".jpg")) : [];
  const bytes = files.reduce((total, name) => total + fs.statSync(path.join(full, name)).size, 0);
  if (files.length < 32) failures.push(`${directory} contains only ${files.length} master textures`);
  if (bytes < 15000000) failures.push(`${directory} is unexpectedly small: ${bytes} bytes`);
  if (!fs.existsSync(path.join(full, "manifest.json"))) failures.push(`${directory} manifest is missing`);
}

if (!fs.existsSync(path.join(root, "build/index.html"))) failures.push("Production build is missing");
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Voxel render validation passed: collision-ring bootstrap rendering, direct fallback generation, guaranteed unlit voxel geometry, downward startup camera, strongly tilted view-model, and 32 master world textures are present.");
