import { createSlice } from "@reduxjs/toolkit";
import {
  BLOCK_TYPES,
  DEFAULT_HOTBAR,
  INITIAL_INVENTORY,
  ITEM_TYPES,
  RECIPES,
  SMELTING_RECIPES,
  getAttackDamage,
  getFuelPower,
  getItemDefinition,
  getMiningProfile,
  getPlantGrowth,
  getPlantStageDuration,
} from "../../game/config/blockTypes";
import { MOB_TYPES, createMob, rollMobLoot } from "../../game/config/mobTypes";
import { blockKey } from "../../game/utils/worldUtils";
import {
  COLONY_BOX_TO_JOB,
  COLONY_DEFAULT_STATE,
  COLONY_WORKER_NAMES,
  COLONY_RESPAWN_MIN_MS,
  COLONY_RESPAWN_MAX_MS,
  COLONY_STATION_MAX_HEALTH,
  cloneColonyState,
} from "../../game/config/colony";
import { WORLD_START_TIME } from "../../game/world/generation/worldGenerator";
import { sanitizeBlockEdits, sanitizeCropRecords } from "../../game/world/loading/terrainMigration";
import { ARMOR_SLOTS, EMPTY_ARMOR, getArmorDefense, reduceDamageWithArmor } from "../../game/config/armor";
import { getArmorSetBonus } from "../../game/config/armorSets";
import { hasPerk } from "../../game/config/perks";
import { DEFAULT_METRICS, QUESTS, getQuestProgress } from "../../game/config/quests";
import {
  DEFAULT_PROGRESSION,
  STAT_KEYS,
  experienceForLevel,
  getMaxHealth,
  getStrengthDamageMultiplier,
  getCraftingSpeedMultiplier,
} from "../../game/config/progression";

const DEFAULT_PLAYER = { x: 0, y: 12, z: 0 };

function cloneProgression(source = DEFAULT_PROGRESSION) {
  return {
    level: Math.max(1, Number(source.level) || 1),
    experience: Math.max(0, Number(source.experience) || 0),
    unspentPoints: Math.max(0, Number(source.unspentPoints) || 0),
    stats: {
      ...DEFAULT_PROGRESSION.stats,
      ...(source.stats || {}),
    },
  };
}

function addExperienceToState(state, amount, reason = "") {
  const setBonus = getArmorSetBonus(state.armor, ITEM_TYPES);
  let gained = Math.max(0, Math.floor((Number(amount) || 0) * (setBonus?.xpMultiplier || 1)));
  if (!gained) return;
  state.progression.experience += gained;
  let levels = 0;
  while (state.progression.experience >= experienceForLevel(state.progression.level)) {
    state.progression.experience -= experienceForLevel(state.progression.level);
    state.progression.level += 1;
    state.progression.unspentPoints += 2;
    levels += 1;
  }
  if (levels > 0) {
    state.levelUpEvent += 1;
    state.health = getMaxHealth(state.progression);
    state.message = `Level ${state.progression.level}! ${state.progression.unspentPoints} stat points available`;
  } else if (reason) {
    state.message = `+${gained} XP · ${reason}`;
  }
}

function createInitialState() {
  return {
    id: null,
    name: "",
    seed: "",
    blocks: {},
    biomes: {},
    loadedChunks: {},
    blockEdits: {},
    inventory: { ...INITIAL_INVENTORY },
    toolDurability: {},
    armor: { ...EMPTY_ARMOR },
    armorDurability: {},
    progression: cloneProgression(),
    metrics: { ...DEFAULT_METRICS },
    claimedQuests: [],
    levelUpEvent: 0,
    hotbar: [...DEFAULT_HOTBAR],
    selectedIndex: 0,
    player: { ...DEFAULT_PLAYER },
    spawn: { ...DEFAULT_PLAYER },
    health: 20,
    hunger: 20,
    deaths: 0,
    playerDamageAt: 0,
    playerDamageAmount: 0,
    playerDamageFlashUntil: 0,
    worldTime: WORLD_START_TIME,
    mobs: [],
    mount: null,
    furnaces: {},
    colony: cloneColonyState(COLONY_DEFAULT_STATE),
    crops: [],
    droppedItems: [],
    fishing: { active: false, bite: false, message: "", caught: 0 },
    weather: { type: "clear", intensity: 0, startedAt: 0, endsAt: 0 },
    multiplayerPlayers: {},
    multiplayerRotation: { yaw: 0, pitch: 0 },
    multiplayerAnimation: "idle",
    loaded: false,
    revision: 0,
    message: "",
  };
}

const initialState = createInitialState();

function stationAllowsRecipe(station, recipeStation) {
  if (station === "crafting_table") {
    return recipeStation === "inventory" || recipeStation === "crafting_table";
  }
  return station === recipeStation;
}

function hasRecipeInputs(inventory, recipe) {
  return Object.entries(recipe.inputs).every(([item, amount]) => (inventory[item] || 0) >= amount);
}

function hasRecipeOutputSpace(inventory, recipe) {
  return Object.entries(recipe.outputs).every(([item, amount]) => {
    const definition = getItemDefinition(item);
    return (inventory[item] || 0) + amount <= (definition.maxStack || 64);
  });
}

function findLeftmostAvailableHotbarSlot(state) {
  return state.hotbar.findIndex((slotItem) => !slotItem || (state.inventory[slotItem] || 0) <= 0);
}
function assignPickupToHotbar(state, item) {
  if (!Array.isArray(state.hotbar) || state.hotbar.includes(item)) return -1;
  const slotIndex = findLeftmostAvailableHotbarSlot(state);
  if (slotIndex < 0) return -1;
  state.hotbar[slotIndex] = item;
  return slotIndex;
}
function addInventoryItem(state, item, amount, options = {}) {
  if (!item || amount <= 0) return { added: 0, hotbarIndex: -1 };
  const definition = getItemDefinition(item);
  const previous = state.inventory[item] || 0;
  const next = Math.min(previous + amount, definition.maxStack || 64);
  const added = Math.max(0, next - previous);
  state.inventory[item] = next;
  const hotbarIndex = added > 0 && options.autoHotbar !== false ? assignPickupToHotbar(state, item) : -1;
  return { added, hotbarIndex };
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

const MOB_DEATH_ANIMATION_MS = 1750;

function beginMobDeath(state, index, defeatedBy = "player") {
  const defeated = state.mobs[index];
  if (!defeated || defeated.dyingUntil) return false;

  const now = Date.now();
  defeated.health = 0;
  defeated.hurtUntil = now + 420;
  defeated.dyingAt = now;
  defeated.dyingUntil = now + MOB_DEATH_ANIMATION_MS;
  defeated.deathCause = defeatedBy;
  defeated.deathSeed = Math.random();

  if (defeated.colonyStationId) {
    const station = state.colony.stations.find((candidate) => candidate.id === defeated.colonyStationId);
    if (station) {
      const delay = COLONY_RESPAWN_MIN_MS + Math.floor(Math.random() * (COLONY_RESPAWN_MAX_MS - COLONY_RESPAWN_MIN_MS + 1));
      station.workerState = "dead";
      station.status = `${station.workerName || "Colonist"} was defeated`;
      station.respawnAt = now + delay;
      station.deathCount = (station.deathCount || 0) + 1;
      station.progress = 0;
    }
  }

  // Award drops at the start of the animation so the world can save safely
  // even if the player closes the tab before the visual collapse finishes.
  if (defeatedBy !== "enemy") {
    const loot = rollMobLoot(defeated.type);
    Object.entries(loot).forEach(([item, amount], dropIndex) => {
      state.droppedItems.push({
        id: `mob-drop-${defeated.id}-${item}-${now}-${dropIndex}`,
        item,
        amount,
        x: Number(defeated.x) || 0,
        y: (Number(defeated.y) || 0) + 0.45,
        z: Number(defeated.z) || 0,
        createdAt: now,
        pickupDelayUntil: now + 500,
      });
    });
  }
  if (state.mount?.id === defeated.id) state.mount = null;
  const source = defeatedBy === "friend" ? "Your ally defeated" : "Defeated";
  state.message = `${source} ${defeated.type.replaceAll("_", " ")}`;
  return true;
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
      // Generated terrain is owned by worldRuntime, not Redux. This avoids
      // copying tens of thousands of block records through Immer.
      state.blocks = {};
      state.biomes = {};
      state.loadedChunks = {};
      state.blockEdits = sanitizeBlockEdits(record.blockEdits);
      state.inventory = { ...INITIAL_INVENTORY, ...(record.inventory || {}) };
      state.toolDurability = { ...(record.toolDurability || {}) };
      state.armor = { ...EMPTY_ARMOR, ...(record.armor || {}) };
      state.armorDurability = { ...(record.armorDurability || {}) };
      state.progression = cloneProgression(record.progression);
      state.metrics = { ...DEFAULT_METRICS, ...(record.metrics || {}) };
      state.claimedQuests = Array.isArray(record.claimedQuests) ? [...record.claimedQuests] : [];
      state.levelUpEvent = 0;
      state.hotbar = Array.isArray(record.hotbar)
        ? DEFAULT_HOTBAR.map((fallback, index) => (record.hotbar[index] === undefined ? fallback : record.hotbar[index]))
        : [...DEFAULT_HOTBAR];
      state.selectedIndex = Number(record.selectedIndex) || 0;
      state.player = record.player || { ...DEFAULT_PLAYER };
      state.spawn = record.spawn || record.player || { ...DEFAULT_PLAYER };
      state.health = Math.min(getMaxHealth(state.progression), Number.isFinite(record.health) ? record.health : getMaxHealth(state.progression));
      state.hunger = Number.isFinite(record.hunger) ? record.hunger : 20;
      state.deaths = Number(record.deaths) || 0;
      state.worldTime = Number.isFinite(record.worldTime) ? record.worldTime : WORLD_START_TIME;
      state.mobs = Array.isArray(record.mobs) ? record.mobs : [];
      state.mount = record.mount || null;
      state.furnaces = { ...(record.furnaces || {}) };
      state.colony = cloneColonyState(record.colony || COLONY_DEFAULT_STATE);
      state.crops = sanitizeCropRecords(record.crops);
      state.droppedItems = Array.isArray(record.droppedItems) ? record.droppedItems.map((drop) => ({ ...drop })) : [];
      state.fishing = { active: false, bite: false, message: "", caught: 0, ...(record.fishing || {}) };
      state.weather = { type: "clear", intensity: 0, startedAt: 0, endsAt: 0, ...(record.weather || {}) };
      state.multiplayerPlayers = { ...(record.multiplayerPlayers || {}) };
      state.multiplayerRotation = { yaw: 0, pitch: 0, ...(record.multiplayerRotation || {}) };
      state.multiplayerAnimation = record.multiplayerAnimation || "idle";
      state.loaded = true;
      state.revision = record.revision || 0;
      state.message = "";
    },
    applyGeneratedChunk: () => {
      // Compatibility no-op. Runtime chunks never enter Redux.
    },
    unloadGeneratedChunks: () => {
      // Compatibility no-op.
    },
    clearWorld: () => createInitialState(),
    setSelectedIndex: (state, action) => {
      const count = state.hotbar.length || 9;
      state.selectedIndex = ((Number(action.payload) % count) + count) % count;
    },
    cycleSelected: (state, action) => {
      const count = state.hotbar.length || 9;
      state.selectedIndex = (state.selectedIndex + Number(action.payload) + count) % count;
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
      const { key, blockType, toolId } = action.payload || {};
      const definition = BLOCK_TYPES[blockType];
      if (!key || !definition || !Number.isFinite(definition.hardness)) return;

      const usableTool = (state.inventory[toolId] || 0) > 0 ? toolId : null;
      const profile = getMiningProfile(blockType, usableTool);
      state.blockEdits[key] = null;
      if (blockType === "furnace") delete state.furnaces[key];
      if (COLONY_BOX_TO_JOB[blockType]) {
        const station = state.colony.stations.find((candidate) => candidate.key === key);
        if (station) {
          state.colony.stations = state.colony.stations.filter((candidate) => candidate.id !== station.id);
          state.colony.crops = state.colony.crops.filter((crop) => crop.stationId !== station.id);
          state.crops = state.crops.filter((crop) => crop.stationId !== station.id);
          state.mobs = state.mobs.filter((mob) => mob.colonyStationId !== station.id);
        }
      }
      if (definition.plantType || blockType.startsWith("wheat_crop_")) {
        state.crops = state.crops.filter((crop) => crop.key !== key);
        state.colony.crops = state.colony.crops.filter((crop) => crop.key !== key);
      }

      state.metrics.blocksMined += 1;
      if ((definition.hardness || 0) >= 1.5) state.metrics.hardBlocksMined += 1;
      if (blockType.endsWith("_ore")) state.metrics.oresMined += 1;

      if (profile.canHarvest && definition.drop) {
        if (!definition.dropChance || Math.random() <= definition.dropChance) {
          addInventoryItem(state, definition.drop, 1);
          if (blockType.endsWith("_ore") && hasPerk(state.progression, "fortune") && Math.random() < 0.15) {
            addInventoryItem(state, definition.drop, 1);
            state.message = `Fortune produced an extra ${getItemDefinition(definition.drop).name}`;
          }
        }
        (definition.bonusDrops || []).forEach((bonus) => {
          if (Math.random() <= (bonus.chance ?? 1)) addInventoryItem(state, bonus.item, bonus.amount || 1);
        });
      } else if (!profile.canHarvest) {
        state.message = `A stronger ${definition.preferredTool || "tool"} is required for the drop`;
      }

      if (usableTool && ITEM_TYPES[usableTool]?.category === "tool") damageTool(state, usableTool, 1);
      const oreBonus = blockType.endsWith("_ore") ? Math.max(2, definition.requiredTier * 2 + 1) : 0;
      const oreSenseMultiplier = blockType.endsWith("_ore") && hasPerk(state.progression, "ore_sense") ? 1.2 : 1;
      addExperienceToState(state, (Math.max(1, Math.ceil(definition.hardness || 0)) + oreBonus) * oreSenseMultiplier, `Mined ${definition.name}`);
      state.revision += 1;
    },
    placeBlock: (state, action) => {
      const { position, type } = action.payload || {};
      const definition = BLOCK_TYPES[type];
      if (!Array.isArray(position) || !definition?.placeable || (state.inventory[type] || 0) <= 0) return;
      const key = blockKey(position[0], position[1], position[2]);
      state.blockEdits[key] = { type };
      state.inventory[type] -= 1;
      const colonyJob = COLONY_BOX_TO_JOB[type];
      if (colonyJob) {
        const stationId = `colony-station-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
        const workerName = COLONY_WORKER_NAMES[state.colony.stations.length % COLONY_WORKER_NAMES.length];
        const worker = createMob(`colonist-${stationId}`, "colonist", position[0] + 1.2, position[1] + 0.55, position[2] + 0.5);
        worker.job = colonyJob;
        worker.colonyStationId = stationId;
        worker.customName = workerName;
        worker.tamed = true;
        state.mobs.push(worker);
        state.colony.stations.push({
          id: stationId,
          key,
          blockType: type,
          job: colonyJob,
          position: [...position],
          workerId: worker.id,
          workerName,
          enabled: true,
          status: "Getting settled",
          progress: 0,
          production: 0,
          level: 1,
          nextActionAt: 0,
          managedAnimalIds: [],
          health: COLONY_STATION_MAX_HEALTH,
          maxHealth: COLONY_STATION_MAX_HEALTH,
          workerState: "working",
          respawnAt: 0,
          deathCount: 0,
        });
        if (colonyJob === "farmer") state.colony.storage.wheat_seeds = (state.colony.storage.wheat_seeds || 0) + 4;
        state.message = `${workerName} joined as the colony ${colonyJob}`;
      }
      state.revision += 1;
    },
    placeBoat: (state, action) => {
      const { position } = action.payload || {};
      if (!Array.isArray(position) || (state.inventory.boat || 0) <= 0) return;
      const [x, y, z] = position.map(Number);
      if (![x, y, z].every(Number.isFinite)) return;
      const id = `boat-${Date.now()}-${Math.floor(Math.random() * 1e7)}`;
      state.inventory.boat -= 1;
      state.mobs.push({
        id,
        type: "boat",
        x,
        y,
        z,
        health: 12,
        maxHealth: 12,
        direction: 0,
        wanderTimer: 999,
        tamed: true,
        tameProgress: 3,
        customName: "",
      });
      state.message = "Boat placed. Right click it to board.";
      state.revision += 1;
    },
    interactMob: (state, action) => {
      const { mobId, itemId } = action.payload || {};
      const mob = state.mobs.find((candidate) => candidate.id === mobId);
      if (!mob) return;
      const definition = ITEM_TYPES[itemId];
      const mobDefinition = MOB_TYPES[mob.type];
      if (!mobDefinition) return;

      if (mobDefinition.vehicle) {
        state.mount = { id: mob.id, type: mob.type };
        state.message = "Boarded boat · press Shift to dismount";
        state.revision += 1;
        return;
      }

      const acceptedFood = Boolean(
        mobDefinition.tameable &&
        itemId &&
        (state.inventory[itemId] || 0) > 0 &&
        (mobDefinition.tameFoods || definition?.tameFood || []).includes(itemId)
      );
      if (acceptedFood && !mob.tamed) {
        state.inventory[itemId] -= 1;
        mob.tameProgress = Math.min(3, (mob.tameProgress || 0) + 1);
        mob.heartUntil = Date.now() + 1600;
        if (mob.tameProgress >= 3) {
          mob.tamed = true;
          const base = mob.type === "horse" ? "Frontier" : "Buddy";
          mob.customName = `${base} ${String(mob.id).slice(-3).toUpperCase()}`;
          state.message = `${mob.customName} is now tamed`;
        } else {
          state.message = `${mobDefinition.name} trusts you more (${mob.tameProgress}/3)`;
        }
        state.revision += 1;
        return;
      }

      if (mobDefinition.rideable) {
        if (!mob.tamed) {
          state.message = `Feed the ${mobDefinition.name.toLowerCase()} before riding`;
          return;
        }
        state.mount = { id: mob.id, type: mob.type };
        state.message = `Riding ${mob.customName || mobDefinition.name} · press Shift to dismount`;
        state.revision += 1;
      }
    },
    dismount: (state) => {
      if (!state.mount) return;
      state.mount = null;
      state.message = "Dismounted";
      state.revision += 1;
    },
    addAmbientMobs: (state, action) => {
      const incoming = Array.isArray(action.payload) ? action.payload : [action.payload];
      const existing = new Set(state.mobs.map((mob) => mob.id));
      incoming.filter(Boolean).forEach((mob) => {
        if (!existing.has(mob.id) && state.mobs.length < 90) {
          state.mobs.push(mob);
          existing.add(mob.id);
        }
      });
    },
    removeMobsById: (state, action) => {
      const ids = new Set(action.payload || []);
      if (!ids.size) return;
      state.mobs = state.mobs.filter((mob) => !ids.has(mob.id) || mob.tamed || state.mount?.id === mob.id);
    },
    craftRecipe: (state, action) => {
      const payload = typeof action.payload === "string" ? { recipeId: action.payload, station: "inventory" } : action.payload || {};
      const recipe = RECIPES.find((item) => item.id === payload.recipeId);
      if (!recipe || !stationAllowsRecipe(payload.station, recipe.station)) return;
      if (!hasRecipeInputs(state.inventory, recipe) || !hasRecipeOutputSpace(state.inventory, recipe)) return;

      Object.entries(recipe.inputs).forEach(([item, amount]) => {
        state.inventory[item] = Math.max(0, (state.inventory[item] || 0) - amount);
      });
      let craftedCount = 0;
      Object.entries(recipe.outputs).forEach(([item, amount]) => {
        craftedCount += amount;
        addInventoryItem(state, item, amount);
        const definition = ITEM_TYPES[item];
        if (definition?.category === "tool") state.toolDurability[item] = definition.durability;
        if (definition?.category === "armor") state.armorDurability[item] = definition.durability;
      });
      state.metrics.itemsCrafted += Math.max(1, craftedCount);
      addExperienceToState(state, recipe.station === "crafting_table" ? 6 : 2, `Crafted ${recipe.name}`);
      state.revision += 1;
    },
    startFurnaceJob: (state, action) => {
      const { furnaceKey, recipeId, fuelId, now = Date.now() } = action.payload || {};
      const recipe = SMELTING_RECIPES.find((item) => item.id === recipeId);
      if (!recipe || !furnaceKey) return;
      if (state.furnaces[furnaceKey]) {
        state.message = "This furnace is already smelting";
        return;
      }
      if ((state.inventory[recipe.input] || 0) < 1) return;
      if ((state.inventory[fuelId] || 0) < 1 || getFuelPower(fuelId) <= 0) return;
      const outputDefinition = getItemDefinition(recipe.output);
      if ((state.inventory[recipe.output] || 0) >= (outputDefinition.maxStack || 64)) return;

      state.inventory[recipe.input] -= 1;
      state.inventory[fuelId] -= 1;
      state.furnaces[furnaceKey] = {
        recipeId,
        input: recipe.input,
        output: recipe.output,
        fuelId,
        startedAt: Number(now),
        durationMs: (recipe.seconds * 1000) / getCraftingSpeedMultiplier(state.progression) / (hasPerk(state.progression, "efficient_smelting") ? 1.12 : 1),
      };
      state.message = `Started ${recipe.name}`;
      state.revision += 1;
    },
    completeFurnaceJobs: (state, action) => {
      const now = Number(action.payload?.now ?? action.payload ?? Date.now());
      let completed = 0;
      Object.entries(state.furnaces).forEach(([key, job]) => {
        if (now - job.startedAt < job.durationMs) return;
        const definition = getItemDefinition(job.output);
        if ((state.inventory[job.output] || 0) >= (definition.maxStack || 64)) return;
        addInventoryItem(state, job.output, 1);
        if (hasPerk(state.progression, "master_smelter") && Math.random() < 0.12) addInventoryItem(state, job.output, 1);
        delete state.furnaces[key];
        completed += 1;
      });
      if (completed > 0) {
        state.metrics.smeltsCompleted += completed;
        addExperienceToState(state, completed * 3, completed === 1 ? "Smelting complete" : `${completed} smelts complete`);
        state.revision += 1;
      }
    },
    consumeItem: (state, action) => {
      const itemId = action.payload;
      const item = ITEM_TYPES[itemId];
      if (!item?.food || (state.inventory[itemId] || 0) <= 0 || state.hunger >= 20) return;
      state.inventory[itemId] -= 1;
      state.hunger = Math.min(20, state.hunger + item.food);
      state.message = `Ate ${item.name}`;
      state.revision += 1;
    },
    damageMob: (state, action) => {
      const { mobId, itemId } = action.payload || {};
      const index = state.mobs.findIndex((mob) => mob.id === mobId);
      if (index < 0 || state.mobs[index].dyingUntil) return;
      const usableItem = (state.inventory[itemId] || 0) > 0 ? itemId : null;
      const powerBonus = hasPerk(state.progression, "power_strike") ? 1.1 : 1;
      const critical = hasPerk(state.progression, "critical_training") && Math.random() < 0.12;
      const damage = getAttackDamage(usableItem) * getStrengthDamageMultiplier(state.progression) * powerBonus * (critical ? 1.75 : 1);
      const defeatedType = state.mobs[index].type;
      state.mobs[index].health -= damage;
      state.mobs[index].hurtUntil = Date.now() + 320;
      if (usableItem && ITEM_TYPES[usableItem]?.category === "tool") damageTool(state, usableItem, 1);
      if (state.mobs[index]?.health <= 0) {
        const definition = MOB_TYPES[defeatedType];
        if (beginMobDeath(state, index, "player")) {
          state.metrics.mobsDefeated += 1;
          if (definition?.hostile) state.metrics.hostilesDefeated += 1;
          addExperienceToState(state, definition?.hostile ? 12 : definition?.friendly ? 8 : 5, `Defeated ${definition?.name || defeatedType}`);
        }
      }
      state.revision += 1;
    },
    mobCombatHit: (state, action) => {
      const { targetId, amount = 1, friendlyAttack = false } = action.payload || {};
      const index = state.mobs.findIndex((mob) => mob.id === targetId);
      if (index < 0 || state.mobs[index].dyingUntil) return;
      state.mobs[index].health -= Math.max(0, Number(amount) || 0);
      state.mobs[index].hurtUntil = Date.now() + 320;
      if (state.mobs[index]?.health <= 0) beginMobDeath(state, index, friendlyAttack ? "friend" : "enemy");
      state.revision += 1;
    },
    finalizeMobDeaths: (state, action) => {
      const now = Number(action.payload?.now ?? action.payload ?? Date.now());
      const before = state.mobs.length;
      state.mobs = state.mobs.filter((mob) => !mob.dyingUntil || mob.dyingUntil > now);
      if (state.mobs.length !== before) state.revision += 1;
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
    syncMountedMob: (state, action) => {
      const { id, x, y, z, direction } = action.payload || {};
      const mob = state.mobs.find((candidate) => candidate.id === id);
      if (!mob) return;
      mob.x = x;
      mob.y = y;
      mob.z = z;
      mob.direction = direction;
    },
    damagePlayer: (state, action) => {
      const payload = typeof action.payload === "object" && action.payload !== null
        ? action.payload
        : { amount: action.payload };
      const rawDamage = Math.max(0, Number(payload.amount) || 0);
      if (rawDamage <= 0) return;
      if (hasPerk(state.progression, "evasive") && Math.random() < 0.08) {
        state.message = "Evaded the attack";
        return;
      }
      const setBonus = getArmorSetBonus(state.armor, ITEM_TYPES);
      const defense = getArmorDefense(state.armor, ITEM_TYPES);
      let damage = reduceDamageWithArmor(rawDamage, defense);
      if (hasPerk(state.progression, "thick_skin")) damage *= 0.95;
      damage *= setBonus?.damageMultiplier || 1;
      const now = Date.now();
      state.health = Math.max(0, state.health - damage);
      state.playerDamageAt = now;
      state.playerDamageAmount = Math.max(1, Math.round(damage * 10) / 10);
      state.playerDamageFlashUntil = now + 650;
      ARMOR_SLOTS.forEach((slot) => {
        const itemId = state.armor[slot];
        if (!itemId) return;
        const definition = ITEM_TYPES[itemId];
        const current = state.armorDurability[itemId] ?? definition?.durability ?? 1;
        const next = current - Math.max(1, Math.ceil(rawDamage * 0.35 * (setBonus?.durabilityMultiplier || 1)));
        if (next <= 0) {
          state.armor[slot] = null;
          state.inventory[itemId] = 0;
          delete state.armorDurability[itemId];
          state.message = `${definition?.name || itemId} broke`;
        } else {
          state.armorDurability[itemId] = next;
        }
      });
      if (state.health <= 0) {
        state.deaths += 1;
        state.health = getMaxHealth(state.progression);
        state.hunger = 20;
        state.player = { ...state.spawn };
        state.worldTime = WORLD_START_TIME;
        state.mount = null;
        state.message = "You were defeated and respawned at dawn";
      }
      state.revision += 1;
    },
    survivalTick: (state, action) => {
      const { sprinting = false } = action.payload || {};
      const sprintMultiplier = hasPerk(state.progression, "light_step") ? 0.8 : 1;
      const drain = (sprinting ? 0.11 : 0.025) * (sprinting ? sprintMultiplier : 1);
      state.hunger = Math.max(0, state.hunger - drain);
      if (state.hunger <= 0) state.health = Math.max(1, state.health - 0.25);
      else if (state.hunger >= (hasPerk(state.progression, "second_wind") ? 16 : 18) && state.health < getMaxHealth(state.progression)) {
        state.health = Math.min(getMaxHealth(state.progression), state.health + 0.18);
        state.hunger = Math.max(0, state.hunger - 0.08);
      }
    },
    equipArmor: (state, action) => {
      const itemId = action.payload;
      const definition = ITEM_TYPES[itemId];
      const slot = definition?.armorSlot;
      if (!slot || (state.inventory[itemId] || 0) <= 0) return;
      const previous = state.armor[slot];
      if (previous === itemId) return;
      state.inventory[itemId] = Math.max(0, (state.inventory[itemId] || 0) - 1);
      state.armor[slot] = itemId;
      if (previous) addInventoryItem(state, previous, 1);
      state.armorDurability[itemId] = state.armorDurability[itemId] ?? definition.durability;
      state.message = `Equipped ${definition.name}`;
      state.revision += 1;
    },
    unequipArmor: (state, action) => {
      const slot = action.payload;
      if (!ARMOR_SLOTS.includes(slot) || !state.armor[slot]) return;
      const itemId = state.armor[slot];
      state.armor[slot] = null;
      addInventoryItem(state, itemId, 1);
      state.message = `Unequipped ${ITEM_TYPES[itemId]?.name || itemId}`;
      state.revision += 1;
    },
    allocateStat: (state, action) => {
      const stat = action.payload;
      if (!STAT_KEYS.includes(stat) || state.progression.unspentPoints <= 0) return;
      state.progression.stats[stat] = Math.min(50, (state.progression.stats[stat] || 1) + 1);
      state.progression.unspentPoints -= 1;
      state.health = Math.min(getMaxHealth(state.progression), state.health + (stat === "vitality" ? 2 : 0));
      state.message = `${stat[0].toUpperCase()}${stat.slice(1)} increased`;
      state.revision += 1;
    },
    claimQuestReward: (state, action) => {
      const questId = action.payload;
      const quest = QUESTS.find((entry) => entry.id === questId);
      if (!quest || state.claimedQuests.includes(questId)) return;
      if (getQuestProgress(quest, state) < quest.target) return;
      state.claimedQuests.push(questId);
      addExperienceToState(state, quest.rewardXp, `Quest complete: ${quest.name}`);
      state.revision += 1;
    },
    grantExperience: (state, action) => {
      const payload = typeof action.payload === "number" ? { amount: action.payload } : action.payload || {};
      addExperienceToState(state, payload.amount, payload.reason || "Experience gained");
      state.revision += 1;
    },
    emptyWaterBucket: (state) => {
      if ((state.inventory.water_bucket || 0) <= 0) return;
      state.inventory.water_bucket -= 1;
      addInventoryItem(state, "bucket", 1, { autoHotbar: false });
      state.hotbar = state.hotbar.map((item) => item === "water_bucket" ? "bucket" : item);
      state.message = "Water source placed";
      state.revision += 1;
    },
    fillWaterBucket: (state) => {
      if ((state.inventory.bucket || 0) <= 0 || (state.inventory.water_bucket || 0) >= 1) return;
      state.inventory.bucket -= 1;
      addInventoryItem(state, "water_bucket", 1, { autoHotbar: false });
      state.hotbar = state.hotbar.map((item) => item === "bucket" ? "water_bucket" : item);
      state.message = "Filled water bucket";
      state.revision += 1;
    },
    tillSoil: (state, action) => {
      const { key, position, toolId } = action.payload || {};
      if (!key || !Array.isArray(position) || ITEM_TYPES[toolId]?.toolType !== "hoe") return;
      state.blockEdits[key] = { type: "farmland" };
      damageTool(state, toolId, 1);
      addExperienceToState(state, 1, "Tilled soil");
      state.revision += 1;
    },
    plantCrop: (state, action) => {
      const { position, key, stationId = null, groundPosition = null, plantType = "wheat" } = action.payload || {};
      const growth = getPlantGrowth(plantType);
      if (!growth || !Array.isArray(position) || !key) return;
      if (!stationId && (state.inventory[growth.seedItem] || 0) <= 0) return;
      if (state.crops.some((crop) => crop.key === key)) return;
      if (!stationId) state.inventory[growth.seedItem] -= 1;
      const now = Date.now();
      const crop = {
        id: `crop-${plantType}-${key}`,
        key,
        position: [...position],
        type: plantType,
        stage: 0,
        plantedAt: now,
        nextGrowthAt: now + getPlantStageDuration(plantType, 0),
        stationId,
      };
      state.crops.push(crop);
      if (stationId) state.colony.crops.push({ ...crop, position: [...position] });
      state.blockEdits[key] = { type: growth.stages[0] };
      if (growth.requiresFarmland && Array.isArray(groundPosition)) state.blockEdits[blockKey(...groundPosition)] = { type: "farmland" };
      if (!stationId) state.message = `${getItemDefinition(growth.seedItem).name} planted`;
      state.revision += 1;
    },
    applyCropGrowth: (state, action) => {
      const updates = Array.isArray(action.payload) ? action.payload : [];
      updates.forEach((update) => {
        const crop = state.crops.find((candidate) => candidate.id === update.id);
        if (!crop) return;
        Object.assign(crop, update.patch || {});
        const colonyCrop = state.colony.crops.find((candidate) => candidate.id === update.id);
        if (colonyCrop) Object.assign(colonyCrop, update.patch || {});
        if (update.blockType) state.blockEdits[crop.key] = { type: update.blockType };
      });
      if (updates.length) state.revision += 1;
    },

    damageColonyStation: (state, action) => {
      const { stationId, amount = 1 } = action.payload || {};
      const station = state.colony.stations.find((candidate) => candidate.id === stationId);
      if (!station || station.destroyed) return;
      station.health = Math.max(0, (Number(station.health) || COLONY_STATION_MAX_HEALTH) - Math.max(0, Number(amount) || 0));
      station.status = `Station under attack · ${Math.ceil(station.health)}/${station.maxHealth || COLONY_STATION_MAX_HEALTH}`;
      if (station.health <= 0) {
        station.destroyed = true;
        station.enabled = false;
        station.workerState = "station destroyed";
        state.mobs = state.mobs.filter((mob) => mob.id !== station.workerId);
        station.workerId = null;
        station.respawnAt = 0;
        state.message = `${station.workerName || "A colonist"}'s ${station.job} station was destroyed`;
      }
      state.revision += 1;
    },
    respawnColonyWorker: (state, action) => {
      const { stationId, now = Date.now() } = action.payload || {};
      const station = state.colony.stations.find((candidate) => candidate.id === stationId);
      if (!station || station.destroyed || !station.respawnAt || station.respawnAt > now) return;
      const [x, y, z] = station.position;
      const worker = createMob(`colonist-${station.id}-respawn-${now}`, "colonist", x + 1.2, y + 0.55, z + 0.5);
      worker.job = station.job;
      worker.colonyStationId = station.id;
      worker.customName = station.workerName;
      worker.tamed = true;
      state.mobs.push(worker);
      station.workerId = worker.id;
      station.workerState = "working";
      station.respawnAt = 0;
      station.status = "Returned to work";
      station.progress = 0;
      state.message = `${station.workerName} respawned at the colony station`;
      state.revision += 1;
    },
    applyColonyFrame: (state, action) => {
      const { workers = {}, stations = {} } = action.payload || {};
      Object.entries(workers).forEach(([workerId, patch]) => {
        const worker = state.mobs.find((mob) => mob.id === workerId);
        if (worker) Object.assign(worker, patch);
      });
      Object.entries(stations).forEach(([stationId, patch]) => {
        const station = state.colony.stations.find((candidate) => candidate.id === stationId);
        if (station) Object.assign(station, patch);
      });
    },
    addColonyResources: (state, action) => {
      const { stationId, items = {}, totals = {}, blockEdits = {}, message = "" } = action.payload || {};
      Object.entries(blockEdits).forEach(([key, value]) => { state.blockEdits[key] = value; });
      Object.entries(items).forEach(([item, amount]) => { state.colony.storage[item] = (state.colony.storage[item] || 0) + Math.max(0, Number(amount) || 0); });
      Object.entries(totals).forEach(([key, amount]) => { state.colony.totals[key] = (state.colony.totals[key] || 0) + Math.max(0, Number(amount) || 0); });
      const station = state.colony.stations.find((candidate) => candidate.id === stationId);
      if (station) station.production = (station.production || 0) + Object.values(items).reduce((sum, amount) => sum + (Number(amount) || 0), 0);
      if (message) state.message = message;
      state.revision += 1;
    },
    collectColonyStorage: (state) => {
      const entries = Object.entries(state.colony.storage).filter(([, amount]) => amount > 0);
      if (!entries.length) return;
      entries.forEach(([item, amount]) => addInventoryItem(state, item, amount));
      state.colony.storage = {};
      state.message = `Collected ${entries.reduce((sum, [, amount]) => sum + amount, 0)} colony items`;
      state.revision += 1;
    },
    toggleColonyStation: (state, action) => {
      const station = state.colony.stations.find((candidate) => candidate.id === action.payload);
      if (!station) return;
      station.enabled = !station.enabled;
      station.status = station.enabled ? "Returning to work" : "Work paused";
      state.revision += 1;
    },
    assignColonyAnimals: (state, action) => {
      const { stationId, mobIds = [] } = action.payload || {};
      state.mobs.forEach((mob) => { if (mobIds.includes(mob.id)) { mob.colonyStationId = stationId; mob.tamed = true; mob.heartUntil = Date.now() + 1400; } });
      const station = state.colony.stations.find((candidate) => candidate.id === stationId);
      if (station) station.managedAnimalIds = [...new Set([...(station.managedAnimalIds || []), ...mobIds])].slice(0, 8);
      state.revision += 1;
    },
    breedColonyAnimal: (state, action) => {
      const { stationId, type, position } = action.payload || {};
      if (!MOB_TYPES[type]?.passive || !Array.isArray(position) || (state.colony.storage.wheat || 0) < 2) return;
      state.colony.storage.wheat -= 2;
      const child = createMob(`colony-${type}-${Date.now()}-${Math.floor(Math.random() * 10000)}`, type, position[0], position[1], position[2]);
      child.colonyStationId = stationId;
      child.babyUntil = Date.now() + 90000;
      state.mobs.push(child);
      state.colony.totals.animalsManaged += 1;
      state.message = `The animal keeper bred a ${MOB_TYPES[type].name}`;
      state.revision += 1;
    },
    spawnWorldDrop: (state, action) => {
      const drop = action.payload || {};
      if (!ITEM_TYPES[drop.item] || (Number(drop.amount) || 0) <= 0) return;
      state.droppedItems.push({ id: drop.id || `drop-${Date.now()}-${Math.floor(Math.random() * 1e9)}`, item: drop.item, amount: Math.max(1, Math.floor(drop.amount)), x: Number(drop.x) || 0, y: Number(drop.y) || 0, z: Number(drop.z) || 0, createdAt: Number(drop.createdAt) || Date.now(), pickupDelayUntil: Number(drop.pickupDelayUntil) || Date.now() + 350 });
      state.revision += 1;
    },
    collectWorldDrop: (state, action) => {
      const index = state.droppedItems.findIndex((drop) => drop.id === action.payload);
      if (index < 0) return;
      const drop = state.droppedItems[index];
      const result = addInventoryItem(state, drop.item, drop.amount);
      if (result.added <= 0) return;
      if (result.added >= drop.amount) state.droppedItems.splice(index, 1); else drop.amount -= result.added;
      state.message = `Picked up ${result.added} ${getItemDefinition(drop.item).name}`;
      state.revision += 1;
    },
    consumeThrowableItem: (state, action) => {
      const itemId = action.payload;
      if (!ITEM_TYPES[itemId]?.throwable || (state.inventory[itemId] || 0) <= 0) return;
      state.inventory[itemId] -= 1;
      state.revision += 1;
    },
    hatchChicken: (state, action) => {
      const { x = 0, y = 0, z = 0 } = action.payload || {};
      const chicken = createMob(`hatched-chicken-${Date.now()}-${Math.floor(Math.random() * 10000)}`, "chicken", x, y, z);
      chicken.babyUntil = Date.now() + 70000;
      state.mobs.push(chicken);
      state.message = "The thrown egg hatched a chick";
      state.revision += 1;
    },
    catchFish: (state, action) => {
      const { item = "raw_fish", amount = 1, rare = false } = action.payload || {};
      addInventoryItem(state, item, amount);
      damageTool(state, "fishing_rod", 1);
      state.fishing = { active: false, bite: false, message: rare ? "Rare catch!" : "Fish caught", caught: (state.fishing?.caught || 0) + amount };
      state.metrics.fishCaught = (state.metrics.fishCaught || 0) + amount;
      addExperienceToState(state, rare ? 8 : 3, rare ? "Rare fishing catch" : "Fishing");
      state.revision += 1;
    },
    setFishingState: (state, action) => { state.fishing = { ...state.fishing, ...(action.payload || {}) }; },
    setWeather: (state, action) => { state.weather = { ...state.weather, ...(action.payload || {}) }; },
    setWorldTime: (state, action) => {
      state.worldTime = ((Number(action.payload) % 24000) + 24000) % 24000;
    },
    setPlayerPosition: (state, action) => {
      state.player = action.payload;
    },
    setMultiplayerMotion: (state, action) => {
      const payload = action.payload || {};
      if (payload.rotation) state.multiplayerRotation = { ...state.multiplayerRotation, ...payload.rotation };
      if (payload.animation) state.multiplayerAnimation = String(payload.animation);
    },
    upsertMultiplayerPlayer: (state, action) => {
      const player = action.payload || {};
      const playerId = player.playerId || player.id;
      if (!playerId) return;
      state.multiplayerPlayers[playerId] = {
        ...(state.multiplayerPlayers[playerId] || {}),
        ...player,
        playerId,
        updatedAt: Number(player.updatedAt) || Date.now(),
      };
    },
    removeMultiplayerPlayer: (state, action) => {
      if (action.payload) delete state.multiplayerPlayers[action.payload];
    },
    applyMultiplayerWorldState: (state, action) => {
      const shared = action.payload || {};
      if (shared.blockEdits && typeof shared.blockEdits === "object") state.blockEdits = sanitizeBlockEdits(shared.blockEdits);
      if (Array.isArray(shared.mobs)) state.mobs = shared.mobs;
      if (shared.furnaces && typeof shared.furnaces === "object") state.furnaces = shared.furnaces;
      if (shared.colony && typeof shared.colony === "object") state.colony = cloneColonyState(shared.colony);
      if (Array.isArray(shared.crops)) state.crops = sanitizeCropRecords(shared.crops);
      if (Array.isArray(shared.droppedItems)) state.droppedItems = shared.droppedItems;
      if (shared.weather && typeof shared.weather === "object") state.weather = { ...state.weather, ...shared.weather };
      if (Number.isFinite(shared.worldTime)) state.worldTime = shared.worldTime;
      if (Number.isFinite(shared.revision)) state.revision = Math.max(state.revision, shared.revision);
    },
    clearMessage: (state) => {
      state.message = "";
    },
  },
});

export const {
  loadWorld,
  applyGeneratedChunk,
  unloadGeneratedChunks,
  clearWorld,
  setSelectedIndex,
  cycleSelected,
  assignHotbarItem,
  breakBlock,
  placeBlock,
  placeBoat,
  interactMob,
  dismount,
  addAmbientMobs,
  removeMobsById,
  craftRecipe,
  startFurnaceJob,
  completeFurnaceJobs,
  consumeItem,
  damageMob,
  mobCombatHit,
  finalizeMobDeaths,
  syncMobs,
  syncMountedMob,
  damagePlayer,
  survivalTick,
  equipArmor,
  unequipArmor,
  allocateStat,
  claimQuestReward,
  grantExperience,
  emptyWaterBucket,
  fillWaterBucket,
  tillSoil,
  plantCrop,
  applyCropGrowth,
  applyColonyFrame,
  damageColonyStation,
  respawnColonyWorker,
  addColonyResources,
  collectColonyStorage,
  toggleColonyStation,
  assignColonyAnimals,
  breedColonyAnimal,
  spawnWorldDrop,
  collectWorldDrop,
  consumeThrowableItem,
  hatchChicken,
  catchFish,
  setFishingState,
  setWeather,
  setWorldTime,
  setPlayerPosition,
  setMultiplayerMotion,
  upsertMultiplayerPlayer,
  removeMultiplayerPlayer,
  applyMultiplayerWorldState,
  clearMessage,
} = worldSlice.actions;

export default worldSlice.reducer;
