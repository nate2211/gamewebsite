# Performance guide

The default Balanced profile is intended for desktop browsers.

Production safeguards include worker chunk generation, exposed-face block lists, instanced meshes, independent chunk revisions, fixed-step AI, distance culling, bounded mob overlays, capped particles and local lights, demand rendering while paused, throttled raycasts, compact saves, edit indexes per chunk, and configurable simulation density.

Recommended adjustments for slower systems:

1. Select the Performance graphics profile.
2. Set chunk render distance to 2.
3. Reduce particle density to 50%.
4. Reduce creature density to 50–75%.
5. Set water quality to Low or disable shoreline waves.
6. Disable mob names, health bars, and health numbers.
