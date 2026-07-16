# Frontend-only multiplayer architecture

Voxel Frontier 12 uses WebRTC data channels. The browser that opens a saved world becomes the temporary authoritative host. It generates a unique invite slot for each guest, keeps the world in IndexedDB, and persists each guest by the guest browser's stable player ID.

## Join-link flow

1. The host loads a saved world and opens **Multiplayer lobby** from the pause menu.
2. **Create fresh join link** creates a dedicated RTCPeerConnection and embeds the completed ICE offer in the URL fragment.
3. The guest opens the link, creates an answer locally, and receives a return link.
4. The host opens the return link. A same-origin `BroadcastChannel` forwards the answer to the already-running host tab. A paste field remains available as a fallback.
5. The host sends the deterministic seed, shared edits, entities, colony state, time/weather, and the guest's restored player record.

No Cloudflare Worker, matchmaking API, database API, or custom signaling endpoint is used. Optional public STUN only assists NAT traversal; LAN-only mode disables it. Networks that require TURN cannot connect without a relay.

## Persistence

The host save contains `multiplayerPlayers`, keyed by browser player ID. Each record contains the last approved position, inventory, armor, progression, health, hunger, hotbar, mount, visual palette, and update time. Returning guests therefore resume at their prior location with their prior state.

## Channels

- `vf-world-events`: ordered and reliable; world bootstrap, edits, entities, chat, and directories.
- `vf-player-motion`: unordered with zero retransmits; frequent player position and animation state.

The implementation supports up to eight total players per browser host. A fresh invite link is generated for each connection slot.
