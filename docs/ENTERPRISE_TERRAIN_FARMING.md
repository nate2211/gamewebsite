# Enterprise terrain, inventory, and farming architecture

## Inventory performance

The inventory mounts only while open. Item slots are memoized and receive stable activation callbacks. Generated item icons are cached and produced in bounded idle-time batches, so opening the inventory does not synchronously rasterize every item. CSS containment isolates layout and paint work from the running Three.js canvas. The optional 3D inspection canvas remains opt-in.

## Authoritative grass surfaces

A grass block owns its top and side appearance. The top face is green and static; side faces use the dirt-with-grass texture. No second grass-cap mesh is drawn over loaded terrain. A small safety shell may appear only during initial chunk startup and is removed when terrain becomes visually stable.

## Legacy terrain migration

Generation/save format 14 normalizes known legacy names and purple/debug placeholders. Known aliases map to valid grass, dirt, or mature plant blocks. Unknown invalid placed edits are omitted, restoring deterministic generated terrain at that coordinate instead of preserving a missing-texture block.

## Physical crop lifecycle

Grass, flowers, wheat, and vines use voxel geometry and remain non-solid where appropriate. Planting consumes the matching seed, creates a persisted crop record, and writes a stage-zero block edit. `FarmSystem` advances that record through explicit block stages using per-stage durations, with weather multipliers. Breaking a mature plant uses standard block drops and bonus seed drops, and removes its crop record.

## Release validation

`npm run validate` parses the source and verifies colony, defense, grass/farming, migration, inventory performance, rendering, and staged growth contracts. `npm run build` creates the optimized CRA production output.
