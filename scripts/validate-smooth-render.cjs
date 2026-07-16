const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

const renderer = read('src/game/world/rendering/WorldRenderer.js');
const page = read('src/pages/GamePage.js');
const streamer = read('src/game/world/streaming/ChunkStreamer.js');
const dialog = read('src/components/inventory/dialog/InventoryDialog.js');
const runtime = read('src/game/core/worldRuntime.js');

expect(renderer.includes('!terrainVisuallyStable && <LoadingVoxelPrimer'), 'Fallback voxel ground must remain until the center terrain is stable across multiple rendered frames.');
expect(renderer.includes('scheduleMeshRegistryUpdate'), 'Terrain mesh registrations must be batched.');
expect(renderer.includes('interactionEnabled'), 'Paused menus must disable world raycasting and animation work.');
expect(page.includes('store.subscribe'), 'Autosave must observe revisions without rerendering the game page.');
expect(page.includes('runtimeSubscribe'), 'GamePage must stop subscribing to outer chunk streaming after terrain is ready.');
expect(dialog.includes('lazy(() => import'), 'Heavy menu panels must be code-split.');
expect(dialog.includes('<Suspense'), 'Menu code splitting needs a responsive fallback.');
expect(streamer.includes('setPinnedChunks(getChunkIdsAround(player.x, player.z, 1))'), 'The moving collision ring must replace permanently pinned spawn chunks.');
expect(runtime.includes('setPinnedChunks(ids)'), 'Runtime needs replaceable pinned chunks.');
expect(streamer.includes('Array.from({ length: concurrency }') && streamer.includes('queueRef.current.length ? 18 : 70'), 'Chunk generation must use a bounded worker pool with paced queue pumping.');
expect(streamer.includes('chunkUnloadMargin') && streamer.includes('unloadRadius'), 'Chunk streaming must retain an unload hysteresis ring.');
expect(streamer.includes('getChunkIdsAround(player.x, player.z, generationRadius)'), 'Chunk generation must preserve nearest-first desired ordering.');

if (failures.length) {
  console.error('Smooth-render validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Smooth-render validation passed.');
