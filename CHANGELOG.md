# Changelog

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
