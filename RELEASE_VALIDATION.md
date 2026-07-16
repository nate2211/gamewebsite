# Voxel Frontier 10.0.0 release validation

Release date: 2026-07-15

## Completed checks

- `npm run validate`: passed all colony, colony-defense, grass/farming, and enterprise-terrain contracts.
- `npm run validate:legacy`: passed all project, viewport, cinematic, blockstyle, voxel-render, loading, create-world, persistence, smooth-render, rendering-issue, and world-visibility regressions.
- `CI=true GENERATE_SOURCEMAP=false npm run build`: compiled successfully and produced the deployable `build/` directory.
- Package lock uses the public npm registry and contains no internal registry artifact URLs.
- Final source archive intentionally excludes `node_modules`; install reproducibly with `npm ci`.
- Source-master terrain atlases remain outside `src/` and `public/`, so they are not loaded by the browser runtime.

## Principal release contracts

- Inventory icons are generated through a bounded idle-time queue and cached.
- Inventory slots are memoized with stable activation handlers and CSS paint/layout containment.
- Grass block top faces are authoritative and static; duplicate permanent cap geometry is removed.
- Startup terrain fallback geometry unmounts after primary terrain stabilizes.
- Legacy purple/debug/missing-texture block edits are normalized or discarded during world migration.
- Grass, flowers, wheat, and vines use voxel geometry.
- Seed planting, persisted crop stages, timed growth, mature harvesting, and seed drops are active.
- Terrain/save compatibility version is 14; package release version is 10.0.0.
