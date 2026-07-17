const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const renderer = read('src/game/world/rendering/WorldRenderer.js');
const blocks = read('src/game/config/blockTypes.js');
const textures = read('src/game/world/rendering/voxelTextures.js');
const interaction = read('src/game/systems/InteractionController.js');
const slice = read('src/features/world/worldSlice.js');
const housing = read('src/game/housing/housingRuntime.js');

const failures = [];
const requireText = (text, terms, label) => {
  const missing = terms.filter((term) => !text.includes(term));
  if (missing.length) failures.push(`${label}: ${missing.join(', ')}`);
  else console.log(`PASS ${label}`);
};

requireText(renderer, [
  'storage_chest: mergedBoxes',
  'treasure_chest: mergedBoxes',
  'oak_door: mergedBoxes',
  'oak_door_ew: mergedBoxes',
  'oak_door_open: mergedBoxes',
  'oak_door_ew_open: mergedBoxes',
  'if (customGeometry) return blockMaterials[4] || blockMaterials[0]',
  ': CUBE_GEOMETRY',
], 'custom geometry and universal cube fallback');

requireText(blocks, [
  'oak_door_ew:',
  'oak_door_open:',
  'oak_door_ew_open:',
  'storage_chest:',
  'treasure_chest:',
  'drop: "oak_door"',
], 'door states and chest definitions');

requireText(interaction, [
  'doorTransitions',
  'toggleDoor',
  'placedBlockType = Math.abs',
  'itemType: usableSelectedItem',
  'position[1] + 1',
], 'Minecraft-style door placement and interaction');

requireText(slice, [
  'toggleDoor: (state, action)',
  'itemType = type',
  'state.inventory[itemType] -= 1',
], 'persistent door state and source-item consumption');

requireText(textures, [
  '"storage_chest"',
  'type.startsWith("oak_door")',
], 'door and chest textures');

requireText(housing, [
  'oak_door_ew_open',
  'isDoorBoundary',
  '!isDoorBoundary',
], 'open doors remain housing boundaries');

// Every block definition has a renderer path: plants use their custom voxel
// geometry, custom shapes use DECOR_GEOMETRIES, and all remaining blocks use
// the cube fallback. Verify no custom key points at an undefined block type.
const blockIds = new Set([...blocks.matchAll(/^\s{2}([a-z0-9_]+): block\(/gm)].map((match) => match[1]));
const decorBody = renderer.match(/const DECOR_GEOMETRIES = Object\.freeze\(\{([\s\S]*?)\n\}\);/m)?.[1] || '';
const decorIds = [...decorBody.matchAll(/^\s{2}([a-z0-9_]+): mergedBoxes/gm)].map((match) => match[1]);
const unknownDecor = decorIds.filter((id) => !blockIds.has(id));
if (unknownDecor.length) failures.push(`custom geometry without block definition: ${unknownDecor.join(', ')}`);
else console.log(`PASS ${decorIds.length} custom geometries map to registered blocks`);

const requiredVisible = ['oak_door', 'oak_door_ew', 'oak_door_open', 'oak_door_ew_open', 'storage_chest', 'treasure_chest'];
const missingVisible = requiredVisible.filter((id) => !decorIds.includes(id));
if (missingVisible.length) failures.push(`critical visible custom blocks missing geometry: ${missingVisible.join(', ')}`);
else console.log('PASS doors and both chest types have world geometry');

if (renderer.includes('if (customGeometry) return blockMaterials;')) {
  failures.push('custom merged geometry still receives an incompatible material array');
} else {
  console.log('PASS merged custom geometry uses one compatible material');
}

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL ${failure}`));
  process.exit(1);
}
console.log(`World block rendering validation passed for ${blockIds.size} registered block types.`);
