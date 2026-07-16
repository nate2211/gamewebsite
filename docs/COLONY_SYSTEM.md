# Colony System Architecture

## Station lifecycle

A colony begins when the player crafts and places one of the five colony work boxes. The placement reducer records a persistent station, creates a named colonist mob, links the worker to the station, and stores the station’s position, job, status, progress, managed animals, and enabled state.

Stations are serialized separately from deterministic terrain, so unloading a chunk does not delete the colony.

## Fixed-tick simulation

`ColonySystem` runs decisions every 0.5 seconds. This avoids performing path search, ore search, crop search, animal grouping, and hostile targeting on every rendered frame.

Each station keeps small non-Redux runtime values for temporary targets and cooldowns. Only meaningful worker positions, station statuses, production, combat, or block changes are dispatched.

## Jobs

### Guard

- Searches for hostile mobs within the guard radius.
- Chases the nearest hostile.
- Attacks on a bounded cooldown.
- Patrols around the station when the settlement is safe.

### Miner

- Searches loaded runtime blocks for prioritized ore and stone.
- Walks to the target and mines on a timed action.
- Removes the runtime block and records a persistent block edit.
- Deposits the resulting item into colony storage.

### Farmer

- Uses a bounded seven-by-seven plot around the station.
- Locates valid grass, dirt, frozen grass, or existing farmland.
- Tills the ground, places a stage-zero crop, and records both edits.
- Harvests stage-three wheat and replants it.
- Deposits wheat and seeds into colony storage.

### Animal Keeper

- Finds passive animals within the colony work radius.
- Assigns nearby animals to the station up to a fixed limit.
- Marks managed animals as tamed and displays heart feedback.
- Keeps animals grouped through existing intelligent herd AI.
- Uses colony wheat to breed animals on a long cooldown.

### Fisher

- Requires nearby loaded water.
- Walks toward the shoreline.
- Completes a bounded fishing cycle.
- Deposits raw fish into colony storage.

## Player fishing

The player fishing system is independent of colony fishing. A view-direction search finds visible static or dynamic water. A bobber is rendered at the water surface and enters a random bite window. Left click during the visible dip catches the fish; early or late input fails.

## Farming runtime

Crop records contain a stable ID, block key, position, stage, planting time, and next-growth time. `FarmSystem` checks growth once per second. It updates only crops whose timer has elapsed and successfully replaces their runtime block.

Rain shortens the next growth interval without increasing the frame-by-frame simulation cost.

## Persistence

Save version 12 includes:

- `colony.stations`
- `colony.storage`
- `colony.totals`
- crop records
- physical dropped items
- fishing state
- weather state

Permanent terrain effects, including mined ore, tilled farmland, planted crops, and placed work boxes, remain in the existing per-chunk block-edit index.
