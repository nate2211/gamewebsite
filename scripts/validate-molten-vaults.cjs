const fs=require('fs');
function read(p){return fs.readFileSync(p,'utf8')}
function need(p,terms){const s=read(p);for(const term of terms){if(!s.includes(term))throw new Error(`${p} missing ${term}`)}}
need('src/game/config/blockTypes.js',['storage_chest','lava_bucket','obsidian','Collect and place water or lava sources']);
need('src/features/world/worldSlice.js',['storageChests','transferToStorageChest','transferFromStorageChest','emptyLavaBucket','fillLavaBucket','solidifyLava']);
need('src/game/systems/InteractionController.js',['touchingWater','adjacentLavaPositions','fillLavaBucket']);
need('src/game/world/generation/worldGenerator.js',['TERRAIN_GENERATOR_VERSION = 22','lavaNoise','type = "lava"']);
need('src/components/storage/StorageChestPanel.js',['27-slot storage','Store All','Take All']);
need('src/data/db.js',['storageChests','version: 24']);
console.log('Molten Vaults storage, bucket, lava, and obsidian contracts passed.');
