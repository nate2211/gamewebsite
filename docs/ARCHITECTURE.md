# Architecture

The app separates React interface state from real-time world state.

- Redux stores durable gameplay state: inventory, equipment, progression, metrics, quests, hotbar, player state, mobs, permanent edits, furnaces, and save revisions.
- `worldRuntime` owns generated chunks and block indexes outside Redux so streaming terrain does not create large Immer copies.
- A Web Worker generates deterministic chunks. The chunk containing the saved player loads while paused; outer streaming begins after Resume.
- React Three Fiber renders independent memoized chunk instances, capped creature models, particles, liquid surfaces, shoreline waves, lights, and the camera-space first-person model.
- Dexie stores compact world records. Generated terrain is recreated from the seed; only permanent edits and gameplay state are saved.
