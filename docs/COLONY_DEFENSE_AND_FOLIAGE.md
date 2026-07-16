# Colony Defense and Foliage Systems

## Pass-through vegetation

The following blocks use `solid: false`, remain selectable by the interaction ray, and do not block the player collision capsule:

- oak, spruce, and jungle leaves
- hanging vines
- tall grass and wildflowers
- snow layers
- full snow blocks, per this build's traversal rules

Jungle trees generate deterministic hanging vines. Jungle cliff columns can also trail vines down exposed drops. Snow biomes generate thin two-sixteenth-height snow layers over some snow-covered columns.

## Colony threat priorities

Hostile mobs choose targets in this order:

1. a nearby player
2. an active colony guard
3. an exposed colony worker
4. another friendly or tamed defender
5. a colony job station

Guards patrol and intercept hostiles. Farmers, ranchers, and fishers flee toward their station when threatened. Miners defend themselves if no guard is close enough; otherwise they fall back toward the defended settlement.

## Worker death and respawn

A defeated colonist enters the normal visible mob death animation, is removed from active AI, and assigns a respawn time to the associated station. The delay is randomized between 300 and 600 seconds and is stored with the world save.

The colony panel displays:

- worker role and name
- current AI state
- active task
- station health
- worker death count
- minute-and-second respawn countdown

When the timer completes, a new colonist instance spawns beside the assigned station with the same name and job, then resumes work.

## Station attacks

Stations have 60 health. Hostile mobs can path to and attack a station when no higher-priority target is available. A destroyed station stops production and cannot respawn its worker. Breaking and replacing the job box establishes a new station.
