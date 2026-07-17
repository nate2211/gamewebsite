const fs = require('fs');
function text(path) { return fs.readFileSync(path, 'utf8'); }
const interaction = text('src/game/systems/InteractionController.js');
const slice = text('src/features/world/worldSlice.js');
const housingConfig = text('src/game/config/housing.js');
const housingRuntime = text('src/game/housing/housingRuntime.js');
const housingPanel = text('src/components/housing/HousingPanel.js');
const bossConfig = text('src/game/config/bosses.js');
const bossSystem = text('src/game/bosses/BossSystem.js');
const bossPanel = text('src/components/bosses/BossAltarPanel.js');
const blocks = text('src/game/config/blockTypes.js');
const mobs = text('src/game/config/mobTypes.js');
const mobSystem = text('src/game/entities/MobSystem.js');
const textures = text('src/game/world/rendering/voxelTextures.js');
const renderer = text('src/game/world/rendering/WorldRenderer.js');
const settings = text('src/pages/SettingsPage.js');
const protocol = text('src/game/multiplayer/protocol.js');
const db = text('src/data/db.js');
const checks = [
  ['hold mining retargets after each destroyed block', interaction.includes('Preserve the held state') && interaction.includes('retargetAt') && interaction.includes('lastBrokenKey')],
  ['room validator checks enclosure floor roof door and light', housingRuntime.includes('floorCoverage >= 0.75') && housingRuntime.includes('ceilingCoverage >= 0.68') && housingRuntime.includes('doorCount > 0') && housingRuntime.includes('lightCount > 0')],
  ['resident bed assignment recruits persistent colonists', slice.includes('assignHousingBed:') && slice.includes('resident.housingBedKey = key') && slice.includes('state.housing.beds[key]')],
  ['resident roles include mining farming fighting and settlement work', ['miner','farmer','guard','builder','fisher','rancher'].every((role) => housingConfig.includes(`${role}:`))],
  ['residents remain at their assigned homes', mobSystem.includes('!mob.housingBedKey') && mobSystem.includes('homeRadius')],
  ['housing work outputs and collection are implemented', slice.includes('runHousingWorkCycle:') && slice.includes('collectHousingStorage:') && housingPanel.includes('Household storage')],
  ['frontier bed is craftable and interactive', blocks.includes('frontier_bed: block') && blocks.includes('station: "housing_bed"') && blocks.includes('outputs: { frontier_bed: 1 }')],
  ['boss altar and three summon catalysts are craftable', blocks.includes('boss_altar: block') && ['titan_core','ember_crown','void_reliquary'].every((id) => blocks.includes(`${id}: material`))],
  ['three advanced bosses are defined', ['stone_titan','ember_wyrm','void_lich'].every((id) => bossConfig.includes(`${id}:`) && mobs.includes(`${id}: {`))],
  ['bosses have timed special powers and minions', bossSystem.includes('Granite Shockwave') && bossSystem.includes('Ember Torrent') && bossSystem.includes('Grave Convergence') && bossSystem.includes('spawnBossMinions')],
  ['bosses drop unique weapons and trophies', ['titan_maul','ember_lance','void_reaper','titan_trophy','ember_trophy','void_trophy'].every((id) => mobs.includes(`item: "${id}"`))],
  ['boss state persists and synchronizes', db.includes('bosses: world.bosses') && protocol.includes('"bosses"') && protocol.includes('"housing"')],
  ['boss HUD and altar UI exist', bossPanel.includes('Convergence Altar') && text('src/components/game/hud/Hud.js').includes('activeBoss')],
  ['texture resolution reaches 256 pixels', settings.includes('max={256}') && textures.includes('224,256') && textures.includes('resolution >= 256')],
  ['cinematic model detail is available', settings.includes('value="cinematic"') && mobSystem.includes('detailLevel = modelDetail === "cinematic"')],
  ['new bed altar and trophy voxel models are rendered', ['frontier_bed','boss_altar','titan_trophy','ember_trophy','void_trophy'].every((id) => renderer.includes(`${id}: mergedBoxes`))],
  ['save schema upgraded for new systems', db.includes('version: 24') && protocol.includes('MULTIPLAYER_PROTOCOL_VERSION = 5')],
];
const failed = checks.filter(([, ok]) => !ok);
checks.forEach(([name, ok]) => console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`));
if (failed.length) process.exit(1);
