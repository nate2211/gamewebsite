# Water physics

## Generated sea water

Generated water is based on connectivity, not only on biome labels. Ocean columns seed a flood fill across neighboring terrain columns whose ground is below `SEA_LEVEL`. Raised terrain at sea level or higher blocks the flood. This fills connected beaches, coves, channels, and low shoreline pits while leaving separated inland terrain dry.

The flood search uses a fixed margin around each generated chunk. The result is deterministic for the world seed and is generated inside the chunk worker.

## Dynamic water

Source water is 15/16 block high. Supported top flow loses one sixteenth of height for each horizontal block traveled until it reaches a 1/16 edge. Unsupported water falls first, up to 32 blocks, and spreads up to 12 blocks from its source.

Water remembers the source surface (`headY`). When it falls into lower terrain, lower cells become pressurized full-height water and fill upward toward that source surface. The exposed top layer can still be thin, producing a stepped flow edge without leaving deep basins nearly empty.

Breaking a solid block next to static or dynamic water calls `flowIntoOpenedCell`, allowing player-dug channels to flood immediately.

Simulation work is budgeted per tick to limit frame spikes. Persistent player water sources are saved; generated flow is rebuilt after terrain loads.
