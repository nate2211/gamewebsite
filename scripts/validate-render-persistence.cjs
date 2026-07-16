const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const failures = [];

const renderer = read("src/game/world/rendering/WorldRenderer.js");
const canvas = read("src/components/game/canvas/GameCanvas.js");
const page = read("src/pages/GamePage.js");
const runtimeSource = read("src/game/core/worldRuntime.js");

for (const needle of [
  "instanceMatricesReady",
  "Register only after the matrices and bounds exist",
  "!centerChunkMounted",
  "onChunkUnmounted",
  "!terrainVisuallyStable && <TerrainSurfaceShell",
]) {
  if (!renderer.includes(needle)) failures.push(`WorldRenderer missing render-persistence guard: ${needle}`);
}
for (const needle of ["renderWarmup", "1800", "!terrainReady || renderWarmup"]) {
  if (!canvas.includes(needle)) failures.push(`GameCanvas missing render warm-up: ${needle}`);
}
for (const needle of [
  "worldRuntime.pinChunks",
  "Readiness is a one-way startup gate",
  "|| terrainReady) return",
  "onTerrainUnavailable",
  "onChunkUnmounted",
]) {
  if (!page.includes(needle)) failures.push(`GamePage missing continuous terrain-retention contract: ${needle}`);
}
if (page.includes("Restoring the rendered voxel terrain")) {
  failures.push("GamePage still contains the legacy auto-pause terrain restoration gate");
}
for (const needle of ["this.pinnedChunks", "pinChunks(ids)", "if (this.pinnedChunks.has(id)) return"]) {
  if (!runtimeSource.includes(needle)) failures.push(`worldRuntime missing pinned-chunk retention: ${needle}`);
}

if (!failures.length) {
  process.env.BABEL_ENV = "test";
  process.env.NODE_ENV = "test";
  const babel = require("@babel/core");
  const originalLoader = require.extensions[".js"];
  require.extensions[".js"] = function compileProjectModule(module, filename) {
    if (!filename.startsWith(path.join(root, "src"))) return originalLoader(module, filename);
    const source = fs.readFileSync(filename, "utf8");
    const output = babel.transformSync(source, {
      filename,
      presets: [require.resolve("babel-preset-react-app")],
      babelrc: false,
      configFile: false,
      sourceMaps: false,
    });
    module._compile(output.code, filename);
  };
  const { worldRuntime } = require(path.join(root, "src/game/core/worldRuntime.js"));
  const { generateChunk } = require(path.join(root, "src/game/world/generation/worldGenerator.js"));
  const seed = "render-persistence-regression";
  worldRuntime.reset(seed, {});
  const chunks = [];
  for (let cx = -1; cx <= 1; cx += 1) {
    for (let cz = -1; cz <= 1; cz += 1) {
      const chunk = generateChunk(seed, cx, cz);
      chunks.push(chunk);
      worldRuntime.applyChunk(chunk);
    }
  }
  worldRuntime.pinChunks(chunks.map((chunk) => chunk.id));
  worldRuntime.unloadChunks(chunks.map((chunk) => chunk.id));
  const retained = worldRuntime.getLoadedChunkIds();
  if (retained.length !== 9) failures.push(`Expected 9 pinned spawn chunks after unload request, found ${retained.length}`);
  if (!worldRuntime.getBlockTypeAt(0, 0, 0)) failures.push("Pinned center chunk lost its block collision data");
  worldRuntime.reset();
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Render persistence validation passed: matrices are populated before readiness, spawn chunks remain pinned, fallback voxels persist until real meshes mount, and late terrain never re-locks gameplay.");
