export const MULTIPLAYER_PROTOCOL_VERSION = 5;

export const MESSAGE = Object.freeze({
  HELLO: "HELLO",
  WORLD_BOOTSTRAP: "WORLD_BOOTSTRAP",
  SHARED_WORLD_STATE: "SHARED_WORLD_STATE",
  PLAYER_STATE: "PLAYER_STATE",
  PLAYER_DIRECTORY: "PLAYER_DIRECTORY",
  CHAT: "CHAT",
  PING: "PING",
  PONG: "PONG",
  HOST_NOTICE: "HOST_NOTICE",
});

const SHARED_KEYS = [
  "blockEdits",
  "mobs",
  "furnaces",
  "storageChests",
  "colony",
  "housing",
  "bosses",
  "crops",
  "droppedItems",
  "weather",
  "enchantments",
  "openedTreasureChests",
  "villageQuests",
  "factions",
  "archaeology",
  "worldTime",
  "revision",
];

const PLAYER_KEYS = [
  "inventory",
  "toolDurability",
  "armor",
  "armorDurability",
  "progression",
  "arcana",
  "enchantments",
  "villageQuests",
  "factions",
  "archaeology",
  "metrics",
  "claimedQuests",
  "hotbar",
  "selectedIndex",
  "health",
  "hunger",
  "deaths",
  "mount",
];

function cloneJson(value, fallback) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_) {
    return fallback;
  }
}

export function selectSharedWorldState(world) {
  const selected = {};
  SHARED_KEYS.forEach((key) => { selected[key] = cloneJson(world?.[key], key === "blockEdits" ? {} : null); });
  return selected;
}

export function selectPlayerSaveState(world, playerPosition, profile) {
  const selected = {
    playerId: profile.id,
    displayName: profile.name,
    palette: profile.palette,
    player: cloneJson(playerPosition || world?.player || { x: 0, y: 12, z: 0 }, { x: 0, y: 12, z: 0 }),
    rotation: cloneJson(world?.multiplayerRotation || { yaw: 0, pitch: 0 }, { yaw: 0, pitch: 0 }),
    animation: world?.multiplayerAnimation || "idle",
    updatedAt: Date.now(),
  };
  PLAYER_KEYS.forEach((key) => { selected[key] = cloneJson(world?.[key], null); });
  return selected;
}

export function makeEnvelope(type, payload = {}) {
  return {
    protocol: MULTIPLAYER_PROTOCOL_VERSION,
    type,
    sentAt: Date.now(),
    payload,
  };
}

export function parseEnvelope(raw) {
  try {
    const value = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!value || value.protocol !== MULTIPLAYER_PROTOCOL_VERSION || !value.type) return null;
    return value;
  } catch (_) {
    return null;
  }
}
