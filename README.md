# Voxel Frontier Grass and Farming

## Version 11 engine streaming and anti-void upgrade

Version 11 increases configurable render distance to 16 chunks and adds a full Engine and World Streaming section to Settings. Chunk generation now uses a configurable browser Worker pool, predictive preload rings, unload hysteresis, automatic camera range, and pause-independent streaming.

World readiness is now a one-way startup gate. Once the initial collision-safe spawn is verified, late chunk meshes never auto-pause the game or force pointer lock to exit. Real voxel collision remains active when meshes are late, and deterministic terrain-height support lets the player walk across an unloaded boundary without falling through the world. An absolute anti-void recovery guard restores the player to loaded or predicted ground if runtime terrain is ever missing.

Run `npm run validate`, `npm run validate:legacy`, and `npm run build` to verify the release. See [docs/ENGINE_STREAMING_AND_SAFETY.md](docs/ENGINE_STREAMING_AND_SAFETY.md).

## Version 10 enterprise terrain/farming upgrade

This package now uses one authoritative voxel terrain surface: grass is the top face of the grass block, while its side remains dirt-with-grass. The startup fallback shell unmounts as soon as real chunks stabilize, preventing duplicate geometry, purple placeholder artifacts, and z-fighting. Legacy saved edits are normalized during load and serialization.

Inventory opening is optimized with memoized slots, paint/layout containment, and an idle-time generated-icon queue. Grass, flowers, wheat, and vines are physical voxel meshes. Seeds are inventory items, crops persist in the save, each stage has a real timer, and mature plants produce harvest/seed drops.

Run `npm run validate` for the current gameplay and enterprise contracts, then `npm run build` for the production package.


Version 9 keeps the complete colony-defense survival game and focuses on three visible problems: inventory-opening hitches, grass surfaces that did not read clearly as grass, and flat colored plant slabs. The project now uses a low-latency inventory shell, static pixel grass caps, crossed plant geometry, seed items, saved growth timers, and harvestable growth-stage blocks.

The editable Create React App source and optimized production `build/` directory are included. `node_modules` is intentionally excluded.

## Version 9 changes

### Faster inventory

- `E` mounts only the visible inventory screen; no hidden full menu remains subscribed to game state.
- The opening shell is a lightweight fixed overlay rather than a Material UI modal/portal.
- Backdrop blur, animated menu textures, and costly first-frame effects are disabled.
- Inventory item icons are pre-generated during browser idle time.
- Item icons no longer make missing-image requests or cause dozens of 404/error state updates.
- The second Three.js item-preview Canvas is opt-in. Click **3D preview** only when needed.
- Heavy armor, perks, quests, colony, backup, and performance screens remain code-split.
- Inventory slots are memoized, and the game simulation remains paused while the menu is open.
- `E` closes the inventory; `Escape` also closes it without opening another overlay first.

### Grass rendering

- Grass blocks keep a dirt bottom and dirt side texture with a pixel grass fringe.
- Every exposed grass or frozen-grass voxel receives a separate static top cap.
- Grass caps use nearest-neighbor pixel textures and do not animate or billboard toward the camera.
- Terrain generation places ground foliage only above actual grass blocks.
- Generator version 13 invalidates older cached spawn chunks so the updated terrain appears in existing worlds while player edits stay preserved.
- Legacy purple wildflower coloring has been removed.

### Real plant blocks

Ground plants are now walk-through world blocks rendered with two crossed pixel planes instead of thick colored slabs.

- Meadow grass: sprout, growing, and mature stages
- Sun meadow flowers: sprout, bud, and mature stages
- Wheat: four growth stages
- Reeds, vines, seagrass, and kelp remain physical selectable plants
- Mature generated plants can be harvested for seeds and materials
- Planted crops and foliage persist in world saves

### Seeds and growth timers

- Grass Seeds plant meadow grass on grass, dirt, frozen grass, or farmland.
- Flower Seeds plant sun meadow flowers on grass, dirt, frozen grass, or farmland.
- Wheat Seeds still require farmland.
- Every planted plant stores its type, position, stage, planted time, and next-growth timestamp.
- Rain accelerates growth.
- Snow slows growth.
- Breaking a planted plant removes its saved growth record.
- Mature meadow grass yields clippings plus grass seeds and can occasionally yield wheat seeds.
- Mature flowers yield a flower plus flower seeds.
- Mature wheat yields wheat and seeds.

## Preserved systems

- Endless deterministic terrain and worker-generated chunks
- Visible-world startup and center-chunk safety gates
- Coastal flooding and 16-level flowing water
- Mining, textured particles, tools, armor, stats, perks, and quests
- Crafting tables, furnaces, smelting, boats, fishing, and weather
- Passive mobs, enemies, birds, ocean creatures, taming, mounts, and drops
- Colony guards, miners, farmers, ranchers, and fishers
- Attackable colony stations and colonist 5–10 minute respawns
- Compact IndexedDB saves and exported world backups

## Controls

```text
W A S D        Move
Mouse          Look
Space          Jump
Shift          Sprint
Left click     Mine, attack, harvest, or reel fishing line
Right click    Place/use blocks, till soil, plant selected seeds, cast rod
E              Open or close inventory
Escape         Close inventory or pause
1–9            Select hotbar slot
Mouse wheel    Change hotbar slot
```

## Install on Windows

Extract the ZIP completely before opening it in WebStorm.

```powershell
cd "C:\Users\natem\WebstormProjects\gamewebsite"

Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
cmd /c rmdir /s /q node_modules

npm config set registry "https://registry.npmjs.org/"
npm cache verify
npm ci --legacy-peer-deps --registry=https://registry.npmjs.org/ --no-audit --no-fund --progress=false
npm start
```

The dependency lockfile uses the public npm registry. Deprecation messages from Create React App dependencies are warnings and do not stop installation.

## Validate and build

```powershell
npm run validate
npm run build
```

The delivered release passed the full optimized `react-scripts build`, CRA/ESLint compilation, all colony validators, and the new grass/farming validator.

## Asset references

`assets-source/grass-farming-pack/` and `public/assets/grass-farming-pack/` contain original pixel references for:

- clean grass top
- dirt-and-grass side
- grass growth stages
- flower growth stages
- seed items
- farming growth chart
- natural terrain palette
- static grass cap

Runtime terrain textures remain lightweight procedural 16×16 nearest-neighbor textures for performance.

## Save format

World record version 13 stores the existing survival and colony state plus generalized plant records. Each planted record includes `type`, `stage`, `position`, `plantedAt`, and `nextGrowthAt`. Old wheat-only records safely default to the wheat growth definition.

See [docs/GRASS_AND_FARMING.md](docs/GRASS_AND_FARMING.md), [docs/COLONY_DEFENSE_AND_FOLIAGE.md](docs/COLONY_DEFENSE_AND_FOLIAGE.md), and [docs/PERFORMANCE.md](docs/PERFORMANCE.md).

## Version 12: browser-hosted multiplayer

Open a saved world, pause, and select **Multiplayer lobby**. Create one fresh join link per guest. The guest opens the link, sends the generated return link back, and remains on the join page until the direct WebRTC connection completes. The host browser saves guest position, inventory, armor, progression, health, hunger, and appearance inside the world record.

This edition does not require a Cloudflare Worker or custom signaling backend. Public STUN is optional and can be disabled with LAN-only mode. TURN relay service is not included, so restrictive networks may require LAN play or an independently configured relay.

See `docs/MULTIPLAYER_FRONTEND_ONLY.md`, `docs/AI_ANIMATION_AND_ART_DIRECTION.md`, and `build-release.sh`.
