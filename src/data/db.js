import Dexie from "dexie";
import { sanitizeBlockEdits, sanitizeCropRecords } from "../game/world/loading/terrainMigration";

class VoxelGameDatabase extends Dexie {
  constructor() {
    super("VoxelFrontierDB");
    this.version(1).stores({ worlds: "&id, name, updatedAt" });
    this.version(2).stores({
      worlds: "&id, name, updatedAt",
      worldBootstraps: "&worldId, seed, updatedAt",
    });
    this.version(3).stores({
      worlds: "&id, name, updatedAt",
      worldBootstraps: "&worldId, seed, updatedAt",
      multiplayerProfiles: "&id, name, updatedAt",
    });
  }
}

export const db = new VoxelGameDatabase();

export function serializeWorld(world) {
  return {
    id: world.id,
    name: world.name,
    seed: world.seed,
    // Generated chunks are deterministic and are rebuilt on load. Persisting only edits
    // keeps autosaves small and avoids structured-clone frame spikes.
    blocks: {},
    biomes: {},
    loadedChunks: {},
    blockEdits: sanitizeBlockEdits(world.blockEdits),
    inventory: world.inventory,
    toolDurability: world.toolDurability,
    armor: world.armor,
    armorDurability: world.armorDurability,
    progression: world.progression,
    metrics: world.metrics,
    claimedQuests: world.claimedQuests,
    hotbar: world.hotbar,
    selectedIndex: world.selectedIndex,
    player: world.player,
    spawn: world.spawn,
    health: world.health,
    hunger: world.hunger,
    deaths: world.deaths,
    worldTime: world.worldTime,
    mobs: world.mobs,
    mount: world.mount,
    furnaces: world.furnaces,
    colony: world.colony,
    crops: sanitizeCropRecords(world.crops),
    droppedItems: world.droppedItems,
    fishing: world.fishing,
    weather: world.weather,
    liquids: world.liquids || [],
    multiplayerPlayers: world.multiplayerPlayers || {},
    multiplayerRotation: world.multiplayerRotation || { yaw: 0, pitch: 0 },
    multiplayerAnimation: world.multiplayerAnimation || "idle",
    revision: world.revision,
    updatedAt: Date.now(),
    version: 15,
  };
}
