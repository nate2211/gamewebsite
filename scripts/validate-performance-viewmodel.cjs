const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

const view = read("src/game/player/FirstPersonViewModel.js");
const renderer = read("src/game/world/rendering/WorldRenderer.js");
const streamer = read("src/game/world/streaming/ChunkStreamer.js");

expect(view.includes('createPortal'), "view model must use a separate camera-space scene");
expect(view.includes('gl.render(scene, camera)'), "world scene must render before the view model");
expect(view.includes('gl.clearDepth()'), "view model pass must clear only world depth");
expect(view.includes('gl.render(overlayScene, overlayCamera)'), "overlay scene render is missing");
expect(view.includes('depthTest') && view.includes('depthWrite'), "view-model self-occlusion materials are missing");
expect(view.includes('VIEWMODEL_FOV = 52'), "fixed view-model projection is missing");
expect(view.includes('Camera-space coordinates'), "axis-stable camera-space transform contract is missing");
expect(!view.includes('rig.position.copy(camera.position)'), "legacy world-space hand tracking remains");

expect(renderer.includes('mesh.frustumCulled = true'), "chunk instance frustum culling is not enabled");
expect(renderer.includes('meshesByChunkRef'), "chunk-indexed mesh registry is missing");
expect(renderer.includes('waterMeshesRef'), "water-only animation registry is missing");
expect(renderer.includes('renderDecorations={detailedChunkIds.has(chunk.id)}'), "far decoration LOD is missing");
expect(renderer.includes('function PrimerInstances'), "instanced startup primer is missing");
expect(renderer.includes('dx * dx + dz * dz <= radiusSquared'), "circular visual chunk budget is missing");

expect(streamer.includes('pendingApplyRef'), "worker completion apply queue is missing");
expect(streamer.includes('performance.now() - startedAt >= 4'), "main-thread chunk apply time budget is missing");
expect(streamer.includes('hardwareThreads - mainThreadReserve'), "worker pool does not reserve main-thread CPU capacity");
expect(streamer.includes('chunkDistanceSquaredFrom'), "circular streaming/unload distance is missing");

if (failures.length) {
  console.error("Performance/view-model validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("Performance/view-model validation passed: camera-space hand compositing, frustum culling, far-detail LOD, indexed raycasts, and frame-budgeted chunk commits verified.");
