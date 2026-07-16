const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const view = read('src/game/player/FirstPersonViewModel.js');
const renderer = read('src/game/world/rendering/WorldRenderer.js');
const player = read('src/game/player/PlayerController.js');
const css = read('src/index.css');
const canvas = read('src/components/game/canvas/GameCanvas.js');
const failures = [];
if (/gl\.render\(scene, camera\)/.test(view)) failures.push('first-person view model still takes over the WebGL render loop');
if (/useFrame\([\s\S]*?,\s*100\s*\)/.test(view)) failures.push('positive-priority manual render callback remains');
if (!view.includes('object.layers.set(0)')) failures.push('view model is not in the normal world render layer');
if (!renderer.includes('terrainVisuallyStable')) failures.push('stable terrain gate is missing');
if (!renderer.includes('remainingFrames = 8')) failures.push('multi-frame terrain verification is missing');
if (!renderer.includes('new THREE.BoxGeometry(1.006, 0.34, 1.006)')) failures.push('thick unlit safety surface is missing');
if (!renderer.includes('!terrainVisuallyStable && <LoadingVoxelPrimer')) failures.push('primer can disappear after a one-frame mesh flash');
if (!player.includes('INITIAL_CAMERA_PITCH = -0.62')) failures.push('camera is not aimed sufficiently downward');
if (!canvas.includes('1800')) failures.push('render warm-up is too short');
if (!css.includes('background: rgba(0, 0, 0, 0.06) !important')) failures.push('pause backdrop still conceals the world');
if (failures.length) {
  console.error(failures.map((x) => `- ${x}`).join('\n'));
  process.exit(1);
}
console.log('Terrain persistence renderer validation passed.');
