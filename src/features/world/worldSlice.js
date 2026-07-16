import { createSlice } from "@reduxjs/toolkit";
import {
  BLOCK_TYPES,
  DEFAULT_HOTBAR,
  INITIAL_INVENTORY,
  ITEM_TYPES,
  RECIPES,
  getAttackDamage,
  getItemDefinition,
  getMiningProfile,
} from "../../game/blockTypes";
import { rollMobLoot } from "../../game/mobTypes";
import { blockKey } from "../../game/worldUtils";

const DEFAULT_PLAYER = { x: 0, y: 12, z: 0 };

const initialState = {
  id: null,
  name: "",
  seed: "",
  blocks: {},
  inventory: { ...INITIAL_INVENTORY },
  toolDurability: {},
  hotbar: [...DEFAULT_HOTBAR],
  selectedIndex: 0,
  player: { ...DEFAULT_PLAYER },
  spawn: { ...DEFAULT_PLAYER },
  health: 20,
  hunger: 20,
  deaths: 0,
  worldTime: 5500,
  mobs: [],
  loaded: false,
  revision: 0,
  message: "",
};

function stationAllowsRecipe(station, recipeStation) {
  if (station === "crafting_table") {
    return recipeStation === "inventory" || recipeStation === "crafting_table";
  }
  return station === recipeStation;
}

function hasRecipeInputs(inventory, recipe) {
  return Object.entries(recipe.inputs).every(
    ([item, amount]) => (inventory[item] || 0) >= amount
  );
}

function hasRecipeOutputSpace(inventory, recipe) {
  return Object.entries(recipe.outputs).every(([item, amount]) => {
    const definition = getItemDefinition(item);
    return (inventory[item] || 0) + amount <= (definition.maxStack || 64);
  });
}

function addInventoryItem(state, item, amount) {
  if (!item || amount <= 0) return;
  const definition = getItemDefinition(item);
  state.inventory[item] = Math.min(
    (state.inventory[item] || 0) + amount,
    definition.maxStack || 64
  );
}

function damageTool(state, toolId, amount = 1) {
  const definition = ITEM_TYPES[toolId];
  if (!definition || definition.category !== "tool") return;
  if ((state.inventory[toolId] || 0) <= 0) return;

  const current = state.toolDurability[toolId] ?? definition.durability;
  const next = current - amount;
  if (next <= 0) {
    state.inventory[toolId] = 0;
    delete state.toolDurability[toolId];
    state.hotbar = state.hotbar.map((item) => (item === toolId ? null : item));
    state.message = `${definition.name} broke`;
  } else {
    state.toolDurability[toolId] = next;
  }
}

function migrateBlocks(blocks = {}) {
  return Object.fromEntries(
    Object.entries(blocks).map(([key, block]) => [
      key,
      {
        ...block,
        type: block.type === "coal" ? "coal_ore" : block.type,
      },
    ])
  );
}

const worldSlice = createSlice({
  name: "world",
  initialState,
  reducers: {
    loadWorld: (state, action) => {
      const record = action.payload;
      state.id = record.id;
      state.name = record.name;
      state.seed = record.seed;
      state.blocks = migrateBlocks(record.blocks || {});
      state.inventory = { ...INITIAL_INVENTORY, ...(record.inventory || {}) };
      state.toolDurability = { ...(record.toolDurability || {}) };
      state.hotbar = Array.isArray(record.hotbar)
        ? DEFAULT_HOTBAR.map((fallback, index) =>
            record.hotbar[index] === undefined ? fallback : record.hotbar[index]
          )
        : [...DEFAULT_HOTBAR];
      state.selectedIndex = Number(record.selectedIndex) || 0;
      state.player = record.player || { ...DEFAULT_PLAYER };
      state.spawn = record.spawn || record.player || { ...DEFAULT_PLAYER };
      state.health = Number.isFinite(record.health) ? record.health : 20;
      state.hunger = Number.isFinite(record.hunger) ? record.hunger : 20;
      state.deaths = Number(record.deaths) || 0;
      state.worldTime = Number(record.worldTime) || 5500;
      state.mobs = Array.isArray(record.mobs) ? record.mobs : [];
      state.loaded = true;
      state.revision = record.revision || 0;
      state.message = "";
    },
    clearWorld: () => initialState,
    setSelectedIndex: (state, action) => {
      const count = state.hotbar.length || 9;
      state.selectedIndex = ((Number(action.payload) % count) + count) % count;
    },
    cycleSelected: (state, action) => {
      const count = state.hotbar.length || 9;
      state.selectedIndex =
        (state.selectedIndex + Number(action.payload) + count) % count;
    },
    assignHotbarItem: (state, action) => {
      const { index = state.selectedIndex, itemId } = action.payload || {};
      if (index < 0 || index >= state.hotbar.length) return;
      if (itemId && !ITEM_TYPES[itemId]) return;
      state.hotbar[index] = itemId || null;
      state.selectedIndex = index;
      state.revision += 1;
    },
    breakBlock: (state, action) => {
      const { key, toolId } = action.payload || {};
      const block = state.blocks[key];
      if (!block) return;

      const definition = BLOCK_TYPES[block.type];
      if (!definition || !Number.isFinite(definition.hardness)) return;

      const usableTool = (state.inventory[toolId] || 0) > 0 ? toolId : null;
      const profile = getMiningProfile(block.type, usableTool);
      delete state.blocks[key];

      if (profile.canHarvest && definition.drop) {
        if (!definition.dropChance || Math.random() <= definition.dropChance) {
          addInventoryItem(state, definition.drop, 1);
        }
      } else if (!profile.canHarvest) {
        state.message = `A stronger ${definition.preferredTool || "tool"} is required for the drop`;
      }

      if (usableTool) damageTool(state, usableTool, 1);
      state.revision += 1;
    },
    placeBlock: (state, action) => {
      const { position, type } = action.payload || {};
      const definition = BLOCK_TYPES[type];
      if (!definition?.placeable) return;
      if ((state.inventory[type] || 0) <= 0) return;

      const key = blockKey(position[0], position[1], position[2]);
      if (state.blocks[key]) return;

      state.blocks[key] = { type };
      state.inventory[type] -= 1;
      state.revision += 1;
    },
    craftRecipe: (state, action) => {
      const payload =
        typeof action.payload === "string"
          ? { recipeId: action.payload, station: "inventory" }
          : action.payload || {};
      const recipe = RECIPES.find((item) => item.id === payload.recipeId);
      if (!recipe || !stationAllowsRecipe(payload.station, recipe.station)) return;
      if (!hasRecipeInputs(state.inventory, recipe)) return;
      if (!hasRecipeOutputSpace(state.inventory, recipe)) return;

      Object.entries(recipe.inputs).forEach(([item, amount]) => {
        state.inventory[item] = Math.max(0, (state.inventory[item] || 0) - amount);
      });
      Object.entries(recipe.outputs).forEach(([item, amount]) => {
        addInventoryItem(state, item, amount);
        const definition = ITEM_TYPES[item];
        if (definition?.category === "tool") {
          state.toolDurability[item] = definition.durability;
        }
      });
      state.message = `Crafted ${recipe.name}`;
      state.revision += 1;
    },
    consumeItem: (state, action) => {
      const itemId = action.payload;
      const item = ITEM_TYPES[itemId];
      if (!item?.food || (state.inventory[itemId] || 0) <= 0) return;
      if (state.hunger >= 20) return;
      state.inventory[itemId] -= 1;
      state.hunger = Math.min(20, state.hunger + item.food);
      state.message = `Ate ${item.name}`;
      state.revision += 1;
    },
    damageMob: (state, action) => {
      const { mobId, itemId } = action.payload || {};
      const index = state.mobs.findIndex((mob) => mob.id === mobId);
      if (index < 0) return;

      const damage = getAttackDamage(
        (state.inventory[itemId] || 0) > 0 ? itemId : null
      );
      state.mobs[index].health -= damage;
      if (itemId && ITEM_TYPES[itemId]?.category === "tool") {
        damageTool(state, itemId, 1);
      }

      if (state.mobs[index].health <= 0) {
        const defeated = state.mobs[index];
        const loot = rollMobLoot(defeated.type);
        Object.entries(loot).forEach(([item, amount]) => {
          addInventoryItem(state, item, amount);
        });
        state.mobs.splice(index, 1);
        state.message = `${defeated.type.replaceAll("_", " ")} defeated`;
      }
      state.revision += 1;
    },
    syncMobs: (state, action) => {
      const positions = action.payload || {};
      state.mobs.forEach((mob) => {
        const next = positions[mob.id];
        if (!next) return;
        mob.x = next.x;
        mob.y = next.y;
        mob.z = next.z;
        mob.direction = next.direction;
        mob.wanderTimer = next.wanderTimer;
      });
    },
    damagePlayer: (state, action) => {
      const damage = Math.max(0, Number(action.payload) || 0);
      if (damage <= 0) return;
      state.health = Math.max(0, state.health - damage);
      if (state.health <= 0) {
        state.deaths += 1;
        state.health = 20;
        state.hunger = 20;
        state.player = { ...state.spawn };
        state.message = "You were defeated and respawned";
      }
      state.revision += 1;
    },
    survivalTick: (state, action) => {
      const { sprinting = false } = action.payload || {};
      const drain = sprinting ? 0.11 : 0.025;
      state.hunger = Math.max(0, state.hunger - drain);
      if (state.hunger <= 0) {
        state.health = Math.max(1, state.health - 0.25);
      } else if (state.hunger >= 18 && state.health < 20) {
        state.health = Math.min(20, state.health + 0.18);
        state.hunger = Math.max(0, state.hunger - 0.08);
      }
    },
    setWorldTime: (state, action) => {
      state.worldTime = ((Number(action.payload) % 24000) + 24000) % 24000;
    },
    setPlayerPosition: (state, action) => {
      state.player = action.payload;
    },
    clearMessage: (state) => {
      state.message = "";
    },
  },
});

export const {
  loadWorld,
  clearWorld,
  setSelectedIndex,
  cycleSelected,
  assignHotbarItem,
  breakBlock,
  placeBlock,
  craftRecipe,
  consumeItem,
  damageMob,
  syncMobs,
  damagePlayer,
  survivalTick,
  setWorldTime,
  setPlayerPosition,
  clearMessage,
} = worldSlice.actions;

export default worldSlice.reducer;
