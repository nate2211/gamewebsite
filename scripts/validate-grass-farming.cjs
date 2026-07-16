const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

const root = path.resolve(__dirname, '..');
const files = [];
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full);
    else if (/\.(js|jsx)$/.test(name)) files.push(full);
  }
}
walk(path.join(root, 'src'));
for (const file of files) {
  parser.parse(fs.readFileSync(file, 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
}
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const dialog = read('src/components/inventory/dialog/InventoryDialog.js');
const gamePage = read('src/pages/GamePage.js');
const inventory = read('src/components/inventory/tabs/InventoryTab.js');
const itemIcon = read('src/components/items/icons/ItemIcon.js');
const blocks = read('src/game/config/blockTypes.js');
const generator = read('src/game/world/generation/worldGenerator.js');
const renderer = read('src/game/world/rendering/WorldRenderer.js');
const textures = read('src/game/world/rendering/voxelTextures.js');
const farm = read('src/game/farming/FarmSystem.js');
const interaction = read('src/game/systems/InteractionController.js');

const checks = [
  [!dialog.includes('<Dialog') && !dialog.includes('keepMounted'), 'custom non-MUI inventory overlay'],
  [gamePage.includes('{openStation && ('), 'inventory only mounts while open'],
  [inventory.includes('Click for 3D preview') && !inventory.includes('requestIdleCallback(mountPreview'), 'opt-in 3D item preview'],
  [itemIcon.includes('preloadItemIcons') && !itemIcon.includes('/assets/items/'), 'prewarmed generated item icons without 404 requests'],
  [blocks.includes('PLANT_GROWTH') && blocks.includes('grass_seeds') && blocks.includes('flower_seeds'), 'seed and growth definitions'],
  [blocks.includes('meadow_grass_0') && blocks.includes('meadow_grass_2') && blocks.includes('yellow_flower_2'), 'physical plant growth blocks'],
  [generator.includes('TERRAIN_GENERATOR_VERSION = 13') && generator.includes('groundType === "grass"'), 'regenerated static grass-top terrain'],
  [!generator.includes('blocks[plantKey] = { type: "wildflower" }') && !generator.includes('blocks[plantKey] = { type: "tall_grass" }'), 'legacy purple/flat plants removed from generation'],
  [renderer.includes('createCrossPlantGeometry') && renderer.includes('GrassCapInstances'), 'crossed plant geometry and static grass cap'],
  [textures.includes('yellow_flower_2') && textures.includes('#f2cf43'), 'transparent yellow flower texture instead of purple slab'],
  [farm.includes('getPlantGrowth') && farm.includes('growth.stages[nextStage]'), 'generic saved plant growth timer'],
  [interaction.includes('selectedPlantType') && interaction.includes('plantGrowth.stages[0]'), 'seed planting interaction'],
];
for (const [ok, label] of checks) if (!ok) throw new Error(`Missing ${label}`);
console.log(`Grass/farming validation passed: ${files.length} JS/JSX modules parsed and ${checks.length} feature contracts verified.`);
