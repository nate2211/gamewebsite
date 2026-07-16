# Grass and Farming Architecture

## Terrain grass

The terrain block remains `grass`: a complete solid voxel with dirt on the bottom, dirt-and-grass pixels on the sides, and a green top. `GrassCapInstances` adds a thin static, instanced top plane to exposed grass blocks. This cap is purely visual; collision, mining, saving, and raycasting continue to use the underlying grass voxel.

## Ground plants

Ground foliage is not part of the terrain cube. It occupies the block above the surface and is non-solid. `WorldRenderer` renders plants with one BufferGeometry containing two crossed planes. The material is double-sided, alpha-tested, nearest-neighbor filtered, and transparent outside the pixel blades.

Generated ground plants are mature:

- `meadow_grass_2`
- `yellow_flower_2`

Legacy `tall_grass` and `wildflower` block IDs remain readable for older edits, but their appearance and drops map to the new natural palette. New terrain generation no longer creates them.

## Plant growth definitions

`PLANT_GROWTH` defines each species:

- seed item
- ordered block-stage IDs
- milliseconds per stage
- whether farmland is required

The generalized `plantCrop` reducer creates a saved crop record. `FarmSystem` checks `nextGrowthAt` once per second, changes the runtime block, and updates the serialized stage. The system does not run per-frame.

## Harvest behavior

Mining a plant uses normal block-breaking logic. The block definition controls its primary and bonus drops. If the block belonged to a saved crop record, the record is removed during harvest.

## Inventory performance

The closed inventory is not mounted, so Redux changes cannot rerender it during gameplay. When opened, the 2D item grid is immediate. 3D previews require an explicit click and heavy screens remain lazy imports. Generated item icons are warmed during idle browser time and cached as data URIs.
