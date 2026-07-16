# Performance guide

The default Balanced profile is intended for desktop browsers.

Production safeguards include worker chunk generation, direct startup fallback, center-chunk visibility gates, exposed-face block lists, instanced meshes, independent chunk revisions, a moving pinned collision ring, fixed-step mob and colony AI, distance culling, bounded overlays, capped particles and local lights, throttled raycasts, compact saves, and edit indexes per chunk.

Menu safeguards include an always-available inventory shell, idle preloading, lazy secondary tabs, a deferred 3D item preview, no opening transition, and paused gameplay simulation. Pressing `E` should display the base inventory before expensive panels begin work.

Recommended adjustments for slower systems:

1. Select the Performance graphics profile.
2. Set chunk render distance to 2.
3. Reduce particle density to 50%.
4. Reduce creature density to 50–75%.
5. Set water quality to Low or disable shoreline waves.
6. Disable mob names, health bars, and health numbers.
7. Leave the inventory on the item grid before closing it, so reopening does not immediately request a 3D-heavy tab.
