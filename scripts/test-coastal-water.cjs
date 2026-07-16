const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');

function loadCoastalFlood() {
  const filename = path.join(root, 'src/game/liquids/coastalFlood.js');
  let source = fs.readFileSync(filename, 'utf8')
    .replace(/export function buildConnectedCoastalFloodMask/, 'function buildConnectedCoastalFloodMask');
  source += '\nmodule.exports={buildConnectedCoastalFloodMask};';
  const context = { module: { exports: {} }, exports: {}, Map, Set, Object, Array, Number, Math };
  vm.runInNewContext(source, context, { filename });
  return context.module.exports.buildConnectedCoastalFloodMask;
}

function loadLiquidRuntime(blocks) {
  const filename = path.join(root, 'src/game/liquids/liquidRuntime.js');
  let source = fs.readFileSync(filename, 'utf8')
    .replace(/import[^;]+;\n/g, '')
    .replace(/export const /g, 'const ');
  source = `const blockKey=(x,y,z)=>\`${'${x},${y},${z}'}\`; const worldRuntime={getBlockTypeAt:(x,y,z)=>blocks.get(blockKey(x,y,z))||null};\n${source}\nmodule.exports={liquidRuntime};`;
  const context = { module: { exports: {} }, exports: {}, blocks, console, Math, Map, Set, Object, Array, Number };
  vm.runInNewContext(source, context, { filename });
  return context.module.exports.liquidRuntime;
}

const buildMask = loadCoastalFlood();
const profiles = new Map();
for (let x = -4; x <= 8; x += 1) {
  for (let z = -3; z <= 3; z += 1) {
    let height = 8;
    let biome = 'beach';
    if (x <= 0) { height = 4; biome = 'ocean'; }
    if (x >= 1 && x <= 5 && Math.abs(z) <= 1) height = 6;
    if (x === 3 && z === 0) height = 5;
    profiles.set(`${x},${z}`, { biome, height });
  }
}
const result = buildMask({
  minX: 0,
  maxX: 6,
  minZ: -2,
  maxZ: 2,
  margin: 4,
  seaLevel: 8,
  profileAt: (x, z) => profiles.get(`${x},${z}`) || { biome: 'beach', height: 8 },
});
if (!result.flooded.has('3,0')) throw new Error('Connected beach depression did not flood.');
if (result.flooded.has('6,0')) throw new Error('Sea water crossed a sea-level terrain barrier.');

const blocks = new Map();
for (let x = -14; x <= 14; x += 1) {
  for (let z = -14; z <= 14; z += 1) blocks.set(`${x},0,${z}`, 'stone');
}
const liquidRuntime = loadLiquidRuntime(blocks);
liquidRuntime.reset();
if (!liquidRuntime.addSource([0, 5, 0], false)) throw new Error('Could not add elevated water source.');
for (let index = 0; index < 56; index += 1) liquidRuntime.step(false, 10000);
for (let y = 1; y <= 4; y += 1) {
  const cell = liquidRuntime.getCellAt(2, y, 0);
  if (!cell) throw new Error(`Basin column is missing water at y=${y}.`);
  if (y < 5 && cell.height !== 1) throw new Error(`Pressurized basin water was not full height at y=${y}.`);
}
const top = liquidRuntime.getCellAt(2, 5, 0);
if (!top || top.height >= 1 || top.height <= 0) throw new Error('Basin surface did not retain a micro-block flow height.');
console.log(`Coastal flood and pressure-fill tests passed with ${liquidRuntime.cells.size} dynamic water cells.`);
