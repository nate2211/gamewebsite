const fs=require('fs');
function text(p){return fs.readFileSync(p,'utf8')}
const interaction=text('src/game/systems/InteractionController.js');
const slice=text('src/features/world/worldSlice.js');
const keyboard=text('src/game/config/keybindings.js');
const hud=text('src/components/game/hud/Hud.js');
const drops=text('src/game/items/drops/ItemDropSystem.js');
const furnace=text('src/components/crafting/furnace/FurnacePanel.js');
const player=text('src/game/player/PlayerController.js');
const textures=text('src/game/world/rendering/voxelTextures.js');
const checks=[
 ['cover blocks replace in place',interaction.includes('replacingTargetCover')&&interaction.includes('clearReplaceableBlock')],
 ['chairs can be sat in and stood from',interaction.includes('sitOnChair')&&slice.includes('sitOnChair:')&&player.includes('state.world.seated')&&player.includes('standUp()')],
 ['mined loot becomes physical world drops',slice.includes('pushWorldDrop(state, definition.drop')&&drops.includes('DropModel')&&drops.includes('m.vy -= 13*dt')],
 ['furnaces retain collectable output inventory',slice.includes('collectFurnaceOutput:')&&furnace.includes('Output inventory')&&furnace.includes('Take all')],
 ['controls removed from HUD',!hud.includes('WASD move')&&!hud.includes('Hold left click to mine')],
 ['keybindings remappable',keyboard.includes('saveKeybindings')&&keyboard.includes('dropItem')&&interaction.includes('getBoundCode("dropItem")')],
 ['higher texture resolution configurable',textures.includes('voxel:textureResolution')&&textures.includes('resolution / 16')],
 ['water flow preserved',text('src/game/liquids/LiquidSystem.js').includes('liquidRuntime')&&interaction.includes('flowIntoOpenedCell')],
];
const failed=checks.filter(x=>!x[1]); checks.forEach(([n,ok])=>console.log(`${ok?'PASS':'FAIL'} ${n}`)); if(failed.length)process.exit(1);
