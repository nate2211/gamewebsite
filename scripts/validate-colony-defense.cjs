const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const root = path.resolve(__dirname, '..');
const src = path.join(root, 'src');
const files = [];
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full);
    else if (/\.(js|jsx)$/.test(name)) files.push(full);
  }
}
walk(src);
for (const file of files) {
  parser.parse(fs.readFileSync(file, 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
}
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const blocks = read('src/game/config/blockTypes.js');
const generator = read('src/game/world/generation/worldGenerator.js');
const colony = read('src/game/colonies/ColonySystem.js');
const mobs = read('src/game/entities/MobSystem.js');
const slice = read('src/features/world/worldSlice.js');
const panel = read('src/components/colonies/panel/ColonyPanel.js');
const required = [
  [blocks.includes('vine: block') && blocks.includes('snow_layer: block'), 'vine and snow-layer blocks'],
  [blocks.includes('solid: false'), 'pass-through block definitions'],
  [generator.includes('Jungle trees carry deterministic hanging vines'), 'tree vine generation'],
  [generator.includes('Jungle cliff faces can also trail vines'), 'cliff vine generation'],
  [slice.includes('COLONY_RESPAWN_MIN_MS') && slice.includes('respawnColonyWorker'), 'colonist respawn reducer'],
  [mobs.includes('damageColonyStation') && mobs.includes('targetKind = "station"'), 'hostile station targeting'],
  [colony.includes('workerState: "fleeing"') && colony.includes('workerState: "defending"'), 'worker flee/defend states'],
  [panel.includes('Respawning') && panel.includes('Station health'), 'colony status UI'],
];
for (const [ok, label] of required) if (!ok) throw new Error(`Missing ${label}`);
console.log(`Colony-defense validation passed: ${files.length} JS/JSX modules parsed and all feature contracts found.`);
