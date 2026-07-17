const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

const renderer = read('src/game/world/rendering/WorldRenderer.js');
const player = read('src/game/player/PlayerController.js');
const viewModel = read('src/game/player/FirstPersonViewModel.js');
const pause = read('src/components/game/overlays/PauseOverlay.js');
const css = read('src/index.css');

expect(renderer.includes('function TerrainSurfaceShell'), 'A startup terrain surface shell must exist.');
expect(renderer.includes('!terrainVisuallyStable && <TerrainSurfaceShell snapshot={snapshot} centerChunkId={centerChunkId} />'), 'The startup terrain shell must unmount after stable terrain appears.');
expect(renderer.includes('SURFACE_SHELL_GEOMETRY') && renderer.includes('<instancedMesh'), 'The startup surface shell must use instanced voxel geometry.');
expect(renderer.includes('(Number(player.y) || 12) - 0.52'), 'The loading primer must align with the actual block top under the player.');
expect(player.includes('const INITIAL_CAMERA_PITCH = -0.72'), 'The initial camera must frame visible ground instead of only sky.');
expect(player.includes('setFromQuaternion(camera.quaternion, "YXZ")'), 'Pointer-lock resume must preserve the framed camera angle.');
expect(viewModel.includes('model.scale.setScalar(portrait ? 0.44 : ultrawide ? 0.53 : 0.49)'), 'The camera-space first-person arm scale contract is missing.');
expect(viewModel.includes('gl.clearDepth()') && viewModel.includes('gl.render(overlayScene, overlayCamera)'), 'The hand must render after a depth-only clear so terrain cannot cover it.');
expect(pause.includes('backdropFilter: "none"'), 'The pause overlay must not blur terrain into a flat blue background.');
expect(css.includes('-webkit-backdrop-filter: none !important'), 'The CSS must disable pause blur across browsers.');

if (failures.length) {
  console.error('Rendering-issue validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Rendering-issue validation passed.');
