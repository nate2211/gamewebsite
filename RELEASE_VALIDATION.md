# Release validation — 12.0.0

Validated on July 16, 2026.

- `npm run build`: passed; optimized CRA production build generated.
- `npm run validate`: passed; colony, defense, farming, terrain, streaming, multiplayer, AI, model, and source-map contracts verified.
- `npm run validate:legacy`: passed; viewport, rendering, startup, persistence, and world-visibility regression checks verified.
- Animated source models: 7 valid glTF 2.0 files, each with idle, walk, run, attack, mine, build, hurt, and death clips.
- Source materials: 21 original 2048×2048 diffuse, normal, and ORM PNG maps.
- Multiplayer: host/join invite flow, same-origin answer bridge, manual fallback, guest persistence, lobby chat, remote avatars, and world reconciliation are present.
- Packaging policy: `node_modules`, `.git`, `.idea`, and prior release output are excluded. Source, lockfile, production build, documentation, tests, generated source assets, and packaging scripts are included.
