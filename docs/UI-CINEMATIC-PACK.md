# Cinematic UI Content Pack

The files in `public/assets/ui-cinematic/` are the raw 768×768 originals used by the version 3 interface. They are mirrored into `src/assets/ui-cinematic/` so Create React App can fingerprint them during production builds.

The interface assigns different surfaces to different screens:

- inventory: item vault and starfield
- crafting: parchment
- furnace: forged iron
- armor: armor hall
- attributes: blue rune stone
- perks: constellation stone and animated stars
- journal: weathered map
- codex: dragon scale
- performance: frost glass
- backups: gold filigree

The textures are intentionally standalone so they can be replaced by a future content-pack loader without rewriting React components.
