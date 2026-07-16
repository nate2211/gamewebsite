import Dexie from "dexie";

class VoxelGameDatabase extends Dexie {
  constructor() {
    super("VoxelFrontierDB");
    this.version(1).stores({
      worlds: "&id, name, updatedAt",
    });
  }
}

export const db = new VoxelGameDatabase();

export function serializeWorld(world) {
  return {
    id: world.id,
    name: world.name,
    seed: world.seed,
    blocks: world.blocks,
    inventory: world.inventory,
    toolDurability: world.toolDurability,
    hotbar: world.hotbar,
    selectedIndex: world.selectedIndex,
    player: world.player,
    spawn: world.spawn,
    health: world.health,
    hunger: world.hunger,
    deaths: world.deaths,
    worldTime: world.worldTime,
    mobs: world.mobs,
    revision: world.revision,
    updatedAt: Date.now(),
    version: 2,
  };
}
