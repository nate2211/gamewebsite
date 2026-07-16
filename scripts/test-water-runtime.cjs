const fs = require('fs');
const vm = require('vm');
const path = require('path');
const filename = path.join(__dirname, '..', 'src/game/liquids/liquidRuntime.js');
let source = fs.readFileSync(filename, 'utf8')
  .replace(/import[^;]+;\n/g, '')
  .replace(/export const /g, 'const ');
const blocks = new Map();
source = `const blockKey=(x,y,z)=>\`${'${x},${y},${z}'}\`; const worldRuntime={getBlockTypeAt:(x,y,z)=>blocks.get(blockKey(x,y,z))||null};\n${source}\nmodule.exports={liquidRuntime};`;
const context = { module: { exports: {} }, exports: {}, blocks, console, Math, Map, Set, Object, Array, Number };
vm.runInNewContext(source, context, { filename });
const { liquidRuntime } = context.module.exports;
for (let x = -20; x <= 20; x += 1) for (let z = -20; z <= 20; z += 1) blocks.set(`${x},0,${z}`, 'stone');
liquidRuntime.reset();
if (!liquidRuntime.addSource([0, 1, 0], false)) throw new Error('Could not add water source');
for (let index = 0; index < 20; index += 1) liquidRuntime.step(false, 10000);
const cells = Array.from(liquidRuntime.cells.values());
const edge = cells.find((cell) => cell.x === 12 && cell.y === 1 && cell.z === 3);
if (!edge || edge.height !== 1 / 16) throw new Error('Water did not reach a one-sixteenth edge');
if (cells.some((cell) => Math.max(Math.abs(cell.x), Math.abs(cell.z)) > 12)) throw new Error('Water exceeded horizontal limit');
console.log(`Water runtime test passed with ${cells.length} supported cells and a ${edge.height}-block edge.`);
