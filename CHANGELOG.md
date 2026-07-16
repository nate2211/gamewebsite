# Changelog

## 11.0.0 — Extended rendering, engine settings, and continuous traversal

- Increased the configurable chunk render distance to 16 and added an Ultra graphics profile.
- Added a dedicated Engine and World Streaming settings section with camera FOV/far plane, simulation distance, worker count, preload radius, unload margin, adaptive resolution, pause streaming, and anti-void controls.
- Replaced serial chunk generation with a configurable 1–8 browser Worker pool.
- Added nearest-first predictive preload and chunk unload hysteresis.
- Kept chunk streaming active while pause and inventory overlays are open when enabled.
- Converted terrain readiness into a one-way startup gate so late chunk meshes never auto-pause gameplay or exit pointer lock.
- Added deterministic collision support for unloaded chunk boundaries so the player can keep walking while the mesh catches up.
- Added an absolute anti-void recovery path using loaded solid columns or deterministic terrain profiles.
- Applied simulation distance to mob rendering and processing range.
- Added a dedicated engine-streaming validation suite and rebuilt the production bundle.

## 10.0.0 — Enterprise terrain, inventory, and farming

- Replaced synchronous first-open inventory icon generation with a bounded idle-time queue and cached placeholders.
- Added stable memoized inventory slot activation handlers plus layout/paint containment for the inventory shell.
- Removed the duplicate permanent grass-cap layer; grass cube top faces are now the authoritative static surface.
- Limited the terrain safety shell to startup only, eliminating duplicate surfaces and ground color/z-fighting artifacts.
- Added save/load terrain normalization that converts known legacy purple/debug blocks and discards unknown placeholder edits.
- Rebuilt grass, flowers, wheat, and vines as physical voxel geometry rather than crossed flat cards.
- Added dedicated seed categories, persisted crop records, harvesting drops, and per-stage growth durations.
- Bumped terrain/save compatibility to generation 14 and added enterprise validation coverage.

## 9.0.0 — Grass, Plants, and Fast Inventory

- Replaced the always-mounted Material UI inventory dialog with a lightweight fixed overlay.
- Removed first-frame backdrop filters, animated texture layers, and transition work from inventory opening.
- Made the 3D item inspection Canvas opt-in instead of automatically mounting after every `E` press.
- Added background item-icon prewarming and removed missing public-icon requests.
- Memoized inventory slots and conditionally mounted the entire inventory tree only while open.
- Added static instanced grass-top caps to exposed grass and frozen-grass blocks.
- Retained dirt bottoms and dirt-with-grass-fringe side textures.
- Replaced generated tall-grass and purple wildflower slabs with crossed meadow-grass and yellow-flower plant blocks.
- Added Grass Seeds, Flower Seeds, Grass Clippings, and Sun Meadow Flower items.
- Added three-stage meadow-grass growth and three-stage flower growth.
- Generalized crop records and the farm timer to support multiple plant species.
- Added seed planting on valid terrain and retained farmland-only wheat planting.
- Added rain acceleration and snow slowdown to plant growth.
- Made mature generated and player-grown plants harvestable for seeds and materials.
- Bumped deterministic terrain generation to version 13 so stale purple plant caches regenerate.
- Bumped serialized world records to version 13.
- Added eight original grass/farming reference textures in editable and public copies.
- Added `validate-grass-farming.cjs` and updated the colony validator for the new inventory architecture.
- Completed a clean optimized CRA production build without source maps.

## 12.0.0 — Frontend Multiplayer Enterprise Edition

- Added browser-hosted WebRTC lobbies with one invite slot per guest and no custom backend requirement.
- Added join and return links, same-origin BroadcastChannel answer forwarding, manual fallback, lobby status, and chat.
- Added host-persisted guest save states including position, inventory, armor, progression, health, hunger, mount, and appearance.
- Added remote player rendering with a detailed original block-sculpted RPG rig and replicated action animation states.
- Rebuilt first-person hand placement and geometry for standard, portrait, and ultrawide viewports.
- Added sensory-memory AI, social/survival drives, contextual activity planning, terrain-aware steering, attack motion, grazing, resting, and varied gait urgency.
- Added seven animated glTF 2.0 source models and twenty-one original 2K diffuse/normal/ORM source maps.
- Added reproducible release, split-part, checksum, and archive-assembly scripts.
