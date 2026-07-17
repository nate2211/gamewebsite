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
  parser.parse(fs.readFileSync(file, 'utf8'), {
    sourceType: 'module',
    plugins: ['jsx'],
  });
}

const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const arcana = read('src/game/config/arcana.js');
const blocks = read('src/game/config/blockTypes.js');
const research = read('src/components/arcana/ArcaneResearchPanel.js');
const slice = read('src/features/world/worldSlice.js');
const interaction = read('src/game/systems/InteractionController.js');
const inventory = read('src/components/inventory/tabs/InventoryTab.js');
const slot = read('src/components/inventory/slots/InventorySlot.js');
const renderer = read('src/game/world/rendering/WorldRenderer.js');
const viewModel = read('src/game/player/FirstPersonViewModel.js');
const multiplayer = read('src/game/multiplayer/MultiplayerSession.js');
const inviteCodec = read('src/game/multiplayer/inviteCodec.js');
const index = read('src/index.js');
const canvas = read('src/components/game/canvas/GameCanvas.js');

const checks = [
  [arcana.includes('spark_bolt') && arcana.includes('golemancy') && arcana.includes('runic_sentinel'), 'original spell, golemancy, and construct research'],
  [arcana.includes('DEFAULT_ARCANA') && arcana.includes('canUnlockResearch'), 'persistent arcane progression and prerequisite rules'],
  [blocks.includes('wooden_wand') && blocks.includes('copper_wand') && blocks.includes('ironbound_wand'), 'three-tier wand progression'],
  [blocks.includes('arcane_table') && blocks.includes('golem_core') && blocks.includes('wardstone'), 'arcane worktable, golem core, and world constructs'],
  [research.includes('Arcane Worktable') && research.includes('unlockArcaneResearch') && research.includes('selectArcaneSpell'), 'interactive arcane research UI'],
  [slice.includes('castArcaneSpell') && slice.includes('regenerateArcana') && slice.includes('arcane_golem'), 'mana, casting, and persistent summoned golems'],
  [interaction.includes('REPLACEABLE_COVER') && interaction.includes('clearReplaceableBlock'), 'building through grass, plants, and snow cover'],
  [inventory.includes('swapHotbarItems') && inventory.includes('clearHotbarSlot'), 'inventory-integrated draggable quick access'],
  [slot.includes('application/x-voxel-frontier-item') && slot.includes('draggable'), 'typed drag-and-drop inventory payloads'],
  [renderer.includes('oak_window') && renderer.includes('oak_door') && renderer.includes('oak_table') && renderer.includes('oak_chair'), 'custom buildable house décor geometry'],
  [renderer.includes('getCrackTexture(stage)') && renderer.includes('crackGroupRef') && renderer.includes('shardRefs') && !renderer.includes('BREAK_RING_GEOMETRY'), 'block-face crack stages and voxel debris without circular overlays'],
  [viewModel.includes('ArcaneWand') && viewModel.includes('cast') && viewModel.includes('const baseY = portrait ? -0.39 : -0.34'), 'satisfying first-person wand and lower-right hand animation'],
  [canvas.includes('<ArcaneSystem') && canvas.includes('<ArcaneEffects'), 'runtime mana and spell visual systems'],
  [index.includes('HashRouter') && inviteCodec.includes('split("#")[0]'), 'static-host-safe join links'],
  [multiplayer.includes('BroadcastChannel') && multiplayer.includes('storage'), 'automatic same-browser answer handoff with storage fallback'],
];

for (const [ok, label] of checks) {
  if (!ok) throw new Error(`Missing ${label}`);
}

console.log(`Arcane expansion validation passed: ${files.length} JS/JSX modules parsed and ${checks.length} feature contracts verified.`);
