# Engine Streaming and Anti-Void Safety

## Release 11

Voxel Frontier now separates **playable collision state** from **visible mesh state**. The first 3×3 spawn area is still verified before the initial Resume button is enabled, but that readiness gate is one-way. Once the world is playable, a late, rebuilding, or temporarily unmounted chunk mesh cannot pause movement, disable gravity, or force pointer lock to exit.

## Render distance and streaming

The Settings page now exposes an Engine and World Streaming section with:

- 2–16 chunk render distance
- 2–12 chunk simulation distance
- 1–8 chunk-generation workers
- 0–3 chunk predictive preload ring
- 1–6 chunk unload hysteresis margin
- automatic or manual camera far plane
- camera field of view
- pause-independent chunk streaming
- unloaded-boundary walking and anti-void safety

Chunk generation uses a browser Worker pool rather than a single serial worker. Chunks are queued nearest-first, generated in parallel, retained through an unload margin, and pinned in a moving 3×3 safety ring around the player.

## Walking before a mesh appears

Collision and rendering are intentionally decoupled:

1. If chunk data is loaded but its mesh is still mounting, collision comes from the real voxel runtime.
2. If the next chunk has not finished generating, the player controller samples the deterministic terrain generator for that column.
3. The sampled terrain height acts as temporary invisible solid support until the real chunk arrives.
4. The player remains controllable and the browser continues streaming the visible mesh in the background.

The temporary support is deterministic for the world seed, so it converges to the same broad terrain surface used by generation rather than creating arbitrary flat platforms.

## Absolute anti-void recovery

With **Enable predictive streaming-boundary safety floor** turned on, the controller also contains a final recovery guard. If malformed save data, a worker failure, or removed runtime terrain ever places the player below the valid world floor, the controller restores the player to the highest loaded solid column or the deterministic surface profile instead of applying an endless fall/death loop.

## Performance guidance

A 16-chunk radius can represent more than one thousand chunk positions when the preload ring is included. Use adaptive resolution and 4–8 generation workers on modern desktop systems. Lower worker count, render distance, and simulation distance together on memory-constrained browsers.
