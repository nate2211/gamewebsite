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
import { blockKey, parseBlockKey } from "../../game/utils/worldUtils";
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
import { ARCANE_RESEARCH_BY_ID, canUnlockResearch, cloneArcana, getWandManaMultiplier } from "../../game/config/arcana";
import { DINOSAUR_TYPES, ENCHANTMENTS, VILLAGE_QUESTS, enchantmentApplies, getTreasureLoot, seededUnit } from "../../game/config/adventure";
import {
  DEFAULT_PROGRESSION,
  STAT_KEYS,
  experienceForLevel,
  getMaxHealth,
  getStrengthDamageMultiplier,
  getCraftingSpeedMultiplier,
} from "../../game/config/progression";
import { DEFAULT_HOUSING_STATE, HOUSING_RESIDENT_NAMES, HOUSING_ROLES, cloneHousingState } from "../../game/config/housing";
import { BOSS_SUMMONS, DEFAULT_BOSS_STATE, cloneBossState } from "../../game/config/bosses";
import { createBuilderHousePlan } from "../../game/config/deepwild";
import { FACTION_QUESTS, cloneFactionState } from "../../game/config/factions";

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
    arcana: cloneArcana(),
    enchantments: {},
    openedTreasureChests: [],
    villageQuests: { accepted: [], claimed: [] },
    factions: cloneFactionState(),
    archaeology: { analyzed: 0, dnaCreated: 0, eggsSpliced: 0, dinosaursRevived: 0 },
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
    seated: null,
    furnaces: {},
    storageChests: {},
    colony: cloneColonyState(COLONY_DEFAULT_STATE),
    housing: cloneHousingState(DEFAULT_HOUSING_STATE),
    bosses: cloneBossState(DEFAULT_BOSS_STATE),
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

function getEnchantmentLevel(state, itemId, enchantmentId) {
  const stored = Number(state.enchantments?.[itemId]?.[enchantmentId] || 0);
  const builtIn = Number(ITEM_TYPES[itemId]?.preEnchanted?.[enchantmentId] || 0);
  return Math.max(stored, builtIn);
}

function damageEquipmentWithEnchant(state, itemId, amount = 1) {
  const tempered = getEnchantmentLevel(state, itemId, "durability");
  const preserveChance = Math.min(0.72, tempered * 0.18);
  if (Math.random() < preserveChance) return;
  damageTool(state, itemId, amount);
}

function villageQuestProgress(state, quest) {
  return Math.min(quest.target, Number(state.metrics?.[quest.metric] || 0));
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
  if (defeated.housingBedKey) {
    const bed = state.housing?.beds?.[defeated.housingBedKey];
    if (bed) {
      bed.status = "dead";
      bed.respawnAt = now + 120000;
      bed.residentId = null;
      bed.deathCount = (bed.deathCount || 0) + 1;
    }
  }
  if (MOB_TYPES[defeated.type]?.boss) {
    if (!state.bosses.defeated.includes(defeated.type)) state.bosses.defeated.push(defeated.type);
    if (state.bosses.activeBossId === defeated.id) {
      state.bosses.activeBossId = null;
      state.bosses.activeBossType = null;
    }
    state.mobs.forEach((candidate) => {
      if (candidate.bossOwnerId !== defeated.id || candidate.dyingUntil) return;
      candidate.health = 0;
      candidate.dyingAt = now;
      candidate.dyingUntil = now + 900;
    });
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


function pushWorldDrop(state, item, amount, position, options = {}) {
  if (!ITEM_TYPES[item] || amount <= 0) return;
  const now = Date.now();
  state.droppedItems.push({
    id: options.id || `world-drop-${item}-${now}-${Math.floor(Math.random() * 1e9)}`,
    item, amount: Math.max(1, Math.floor(amount)),
    x: Number(position?.[0]) || 0, y: (Number(position?.[1]) || 0) + 0.32, z: Number(position?.[2]) || 0,
    vx: Number(options.vx) || (Math.random() - 0.5) * 1.4,
    vy: Number(options.vy) || 2.2 + Math.random() * 1.1,
    vz: Number(options.vz) || (Math.random() - 0.5) * 1.4,
    createdAt: now, pickupDelayUntil: now + (options.pickupDelay || 450),
  });
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
      state.arcana = cloneArcana(record.arcana);
      state.enchantments = record.enchantments && typeof record.enchantments === "object" ? { ...record.enchantments } : {};
      state.openedTreasureChests = Array.isArray(record.openedTreasureChests) ? [...record.openedTreasureChests] : [];
      state.villageQuests = {
        accepted: Array.isArray(record.villageQuests?.accepted) ? [...record.villageQuests.accepted] : [],
        claimed: Array.isArray(record.villageQuests?.claimed) ? [...record.villageQuests.claimed] : [],
      };
      state.factions = cloneFactionState(record.factions);
      state.archaeology = { analyzed: 0, dnaCreated: 0, eggsSpliced: 0, dinosaursRevived: 0, ...(record.archaeology || {}) };
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
      state.seated = record.seated || null;
      state.furnaces = { ...(record.furnaces || {}) };
      state.storageChests = { ...(record.storageChests || {}) };
      state.colony = cloneColonyState(record.colony || COLONY_DEFAULT_STATE);
      state.housing = cloneHousingState(record.housing || DEFAULT_HOUSING_STATE);
      state.bosses = cloneBossState(record.bosses || DEFAULT_BOSS_STATE);
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
      if (itemId && (!ITEM_TYPES[itemId] || (state.inventory[itemId] || 0) <= 0)) return;
      state.hotbar[index] = itemId || null;
      state.selectedIndex = index;
      state.revision += 1;
    },
    swapHotbarItems: (state, action) => {
      const fromIndex = Number(action.payload?.fromIndex);
      const toIndex = Number(action.payload?.toIndex);
      if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex)) return;
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= state.hotbar.length || toIndex >= state.hotbar.length || fromIndex === toIndex) return;
      [state.hotbar[fromIndex], state.hotbar[toIndex]] = [state.hotbar[toIndex], state.hotbar[fromIndex]];
      state.selectedIndex = toIndex;
      state.revision += 1;
    },
    clearHotbarSlot: (state, action) => {
      const index = Number(action.payload?.index ?? action.payload);
      if (!Number.isInteger(index) || index < 0 || index >= state.hotbar.length) return;
      state.hotbar[index] = null;
      state.revision += 1;
    },
    clearReplaceableBlock: (state, action) => {
      const key = action.payload?.key || action.payload;
      if (!key) return;
      state.blockEdits[key] = null;
      state.crops = state.crops.filter((crop) => crop.key !== key);
      state.colony.crops = state.colony.crops.filter((crop) => crop.key !== key);
      state.revision += 1;
    },
    unlockArcaneResearch: (state, action) => {
      const researchId = action.payload?.researchId || action.payload;
      const node = ARCANE_RESEARCH_BY_ID[researchId];
      if (!node || !canUnlockResearch(state.arcana, researchId)) return;
      state.arcana.researchPoints -= node.cost;
      state.arcana.unlocked.push(researchId);
      state.arcana.selectedSpell = researchId;
      state.arcana.maxMana = Math.max(state.arcana.maxMana, 40 + node.tier * 6);
      state.arcana.mana = state.arcana.maxMana;
      state.message = `${node.name} research unlocked`;
      state.revision += 1;
    },
    selectArcaneSpell: (state, action) => {
      const researchId = action.payload?.researchId || action.payload;
      if (!state.arcana.unlocked.includes(researchId)) return;
      state.arcana.selectedSpell = researchId;
      state.message = `${ARCANE_RESEARCH_BY_ID[researchId]?.name || "Spell"} readied`;
      state.revision += 1;
    },
    cycleArcaneSpell: (state, action) => {
      const unlocked = state.arcana.unlocked.filter((id) => ARCANE_RESEARCH_BY_ID[id]);
      if (!unlocked.length) return;
      const direction = Number(action.payload) < 0 ? -1 : 1;
      const current = Math.max(0, unlocked.indexOf(state.arcana.selectedSpell));
      state.arcana.selectedSpell = unlocked[(current + direction + unlocked.length) % unlocked.length];
      state.message = `${ARCANE_RESEARCH_BY_ID[state.arcana.selectedSpell]?.name || "Spell"} readied`;
    },
    regenerateArcana: (state, action) => {
      const amount = Math.max(0, Number(action.payload?.amount ?? action.payload) || 0);
      state.arcana.mana = Math.min(state.arcana.maxMana, state.arcana.mana + amount);
    },
    castArcaneSpell: (state, action) => {
      const payload = action.payload || {};
      const spellId = payload.spellId || state.arcana.selectedSpell;
      const node = ARCANE_RESEARCH_BY_ID[spellId];
      if (!node || !state.arcana.unlocked.includes(spellId)) {
        state.message = "Research this spell at an Arcane Worktable first";
        return;
      }
      const wandId = payload.wandId;
      const wand = ITEM_TYPES[wandId];
      if (!wand?.arcaneFocus || (state.inventory[wandId] || 0) <= 0) {
        state.message = "Equip a wand to channel arcana";
        return;
      }
      const now = Number(payload.now) || Date.now();
      if (now - state.arcana.lastCastAt < 180) return;
      const manaCost = Math.max(1, Math.ceil(node.manaCost * getWandManaMultiplier(wand.wandTier || 1)));
      if (state.arcana.mana < manaCost) {
        state.message = `Not enough mana · ${manaCost} required`;
        return;
      }
      if (["golemancy", "runic_sentinel"].includes(spellId) && (state.inventory.golem_core || 0) <= 0) {
        state.message = "A Golem Core is required";
        return;
      }
      state.arcana.mana -= manaCost;
      state.arcana.lastCastAt = now;
      state.arcana.casts += 1;
      state.arcana.knowledge += Math.max(1, node.tier);
      if (state.arcana.casts % 12 === 0) state.arcana.researchPoints += 1;

      if (["spark_bolt", "chain_spark"].includes(spellId) && payload.mobId) {
        const primaryIndex = state.mobs.findIndex((mob) => mob.id === payload.mobId && !mob.dyingUntil);
        if (primaryIndex >= 0) {
          const primary = state.mobs[primaryIndex];
          const damage = (spellId === "chain_spark" ? 8 : 6) + (wand.wandTier || 1) * 2;
          primary.health -= damage;
          primary.hurtUntil = now + 420;
          if (primary.health <= 0 && beginMobDeath(state, primaryIndex, "player")) {
            state.metrics.mobsDefeated += 1;
            if (MOB_TYPES[primary.type]?.hostile) state.metrics.hostilesDefeated += 1;
          }
          if (spellId === "chain_spark") {
            const secondaryIndex = state.mobs.findIndex((mob, index) => index !== primaryIndex && !mob.dyingUntil && MOB_TYPES[mob.type]?.hostile && Math.hypot(mob.x - primary.x, mob.y - primary.y, mob.z - primary.z) <= 5);
            if (secondaryIndex >= 0) {
              state.mobs[secondaryIndex].health -= Math.ceil(damage * 0.68);
              state.mobs[secondaryIndex].hurtUntil = now + 420;
              if (state.mobs[secondaryIndex].health <= 0) beginMobDeath(state, secondaryIndex, "player");
            }
          }
        }
      } else if (spellId === "mending_light") {
        state.health = Math.min(getMaxHealth(state.progression), state.health + 6 + (wand.wandTier || 1) * 2);
      } else if (spellId === "verdant_touch") {
        const target = payload.targetPosition || [state.player.x, state.player.y, state.player.z];
        state.crops.forEach((crop) => {
          if (Math.hypot(crop.position?.[0] - target[0], crop.position?.[1] - target[1], crop.position?.[2] - target[2]) <= 6) crop.nextGrowthAt = now;
        });
      } else if (["warding_stone", "arcane_lantern"].includes(spellId) && Array.isArray(payload.placePosition)) {
        const type = spellId === "warding_stone" ? "wardstone" : "arcane_lantern";
        state.blockEdits[blockKey(...payload.placePosition)] = { type };
      } else if (["golemancy", "runic_sentinel"].includes(spellId)) {
        state.inventory.golem_core -= 1;
        const target = payload.targetPosition || [state.player.x + 2, state.player.y, state.player.z + 2];
        const golem = createMob(`arcane-golem-${now}-${Math.floor(Math.random() * 1e6)}`, "arcane_golem", Number(target[0]) || 0, Number(target[1]) || 0, Number(target[2]) || 0);
        golem.tamed = true;
        golem.arcaneConstruct = true;
        golem.customName = spellId === "runic_sentinel" ? "Runic Sentinel" : "Frontier Golem";
        if (spellId === "runic_sentinel") {
          golem.health = 58;
          golem.maxHealth = 58;
          golem.guardianTier = 3;
        }
        state.mobs.push(golem);
        state.arcana.constructsBuilt += 1;
      }
      state.message = `${node.name} cast · ${manaCost} mana`;
      state.revision += 1;
    },
    breakBlock: (state, action) => {
      const { key, blockType, toolId } = action.payload || {};
      const definition = BLOCK_TYPES[blockType];
      if (!key || !definition || !Number.isFinite(definition.hardness)) return;

      const usableTool = (state.inventory[toolId] || 0) > 0 ? toolId : null;
      const profile = getMiningProfile(blockType, usableTool);
      state.blockEdits[key] = null;
      if (blockType === "furnace") {
        const station = state.furnaces[key];
        Object.entries(station?.outputInventory || {}).forEach(([item, amount]) => pushWorldDrop(state, item, amount, parseBlockKey(key)));
        if (station?.input) pushWorldDrop(state, station.input, 1, parseBlockKey(key));
        delete state.furnaces[key];
      }
      if (blockType === "storage_chest") {
        const chest = state.storageChests[key];
        Object.entries(chest?.items || {}).forEach(([item, amount]) => pushWorldDrop(state, item, amount, parseBlockKey(key)));
        delete state.storageChests[key];
      }
      if (state.seated?.key === key) state.seated = null;
      if (blockType === "frontier_bed" && state.housing.beds[key]) {
        const residentId = state.housing.beds[key].residentId;
        if (residentId) state.mobs = state.mobs.filter((mob) => mob.id !== residentId);
        delete state.housing.beds[key];
      }
      if (blockType === "boss_altar" && state.bosses.activeBossId) {
        state.message = "The active boss remains in the world even though its altar was broken";
      }
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
      if (blockType === "fossil_block") state.metrics.fossilsRecovered = (state.metrics.fossilsRecovered || 0) + 1;

      const dropPosition = parseBlockKey(key);
      if (profile.canHarvest && definition.drop) {
        if (!definition.dropChance || Math.random() <= definition.dropChance) {
          let amount = 1;
          const enchantFortune = getEnchantmentLevel(state, usableTool, "fortune");
          if ((blockType.endsWith("_ore") || blockType === "fossil_block") && ((hasPerk(state.progression, "fortune") && Math.random() < 0.15) || (enchantFortune > 0 && Math.random() < enchantFortune * 0.16))) {
            amount += 1;
            state.message = `Fortune released an extra ${getItemDefinition(definition.drop).name}`;
          }
          pushWorldDrop(state, definition.drop, amount, dropPosition);
        }
        (definition.bonusDrops || []).forEach((bonus) => {
          if (Math.random() <= (bonus.chance ?? 1)) pushWorldDrop(state, bonus.item, bonus.amount || 1, dropPosition);
        });
      } else if (!profile.canHarvest) {
        state.message = `A stronger ${definition.preferredTool || "tool"} is required for the drop`;
      }

      if (usableTool && ITEM_TYPES[usableTool]?.category === "tool") damageTool(state, usableTool, 1);
      if (blockType.endsWith("_ore")) {
        state.arcana.knowledge += Math.max(1, definition.requiredTier || 1);
        if (Math.random() < 0.14 + (definition.requiredTier || 0) * 0.04) state.arcana.researchPoints += 1;
      } else if ((definition.hardness || 0) >= 2.5 && Math.random() < 0.035) {
        state.arcana.knowledge += 1;
      }
      const oreBonus = blockType.endsWith("_ore") ? Math.max(2, definition.requiredTier * 2 + 1) : 0;
      const oreSenseMultiplier = blockType.endsWith("_ore") && hasPerk(state.progression, "ore_sense") ? 1.2 : 1;
      addExperienceToState(state, (Math.max(1, Math.ceil(definition.hardness || 0)) + oreBonus) * oreSenseMultiplier, `Mined ${definition.name}`);
      state.revision += 1;
    },
    placeBlock: (state, action) => {
      const { position, type, itemType = type } = action.payload || {};
      const definition = BLOCK_TYPES[type];
      const sourceDefinition = BLOCK_TYPES[itemType];
      // Hidden block-state variants (door facing/open state) are placed using
      // their craftable source item while persisting the actual rendered type.
      if (!Array.isArray(position) || !definition || !sourceDefinition?.placeable || (state.inventory[itemType] || 0) <= 0) return;
      const key = blockKey(position[0], position[1], position[2]);
      state.blockEdits[key] = { type };
      state.inventory[itemType] -= 1;
      if (type === "storage_chest" && !state.storageChests[key]) {
        state.storageChests[key] = { key, items: {}, slots: 27, createdAt: Date.now() };
      }
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
          orderMode: colonyJob === "guard" ? "patrol" : "work",
          threatMode: colonyJob === "guard" ? "defend" : "balanced",
          maintenancePolicy: "auto",
          workPriority: 1,
          health: COLONY_STATION_MAX_HEALTH,
          maxHealth: COLONY_STATION_MAX_HEALTH,
          workerState: "working",
          respawnAt: 0,
          deathCount: 0,
          buildPlan: colonyJob === "builder" ? createBuilderHousePlan(position) : [],
          buildIndex: 0,
          buildStartedAt: colonyJob === "builder" ? Date.now() : 0,
          houseCompleted: false,
        });
        if (colonyJob === "farmer") state.colony.storage.wheat_seeds = (state.colony.storage.wheat_seeds || 0) + 4;
        state.message = `${workerName} joined as the colony ${colonyJob}`;
      }
      state.revision += 1;
    },
    lootTreasureChest: (state, action) => {
      const chestKey = String(action.payload?.key || action.payload || "");
      if (!chestKey || state.openedTreasureChests.includes(chestKey)) {
        state.message = "This treasure chest has already been opened";
        return;
      }
      const loot = getTreasureLoot(state.seed, chestKey);
      Object.entries(loot).forEach(([item, amount]) => {
        addInventoryItem(state, item, amount);
        if (ITEM_TYPES[item]?.category === "tool") state.toolDurability[item] = ITEM_TYPES[item].durability;
      });
      state.openedTreasureChests.push(chestKey);
      state.metrics.treasureChestsOpened = (state.metrics.treasureChestsOpened || 0) + 1;
      addExperienceToState(state, 35, "Fortress treasure recovered");
      state.message = `Treasure recovered · ${Object.keys(loot).length} item types`;
      state.revision += 1;
    },
    enchantItem: (state, action) => {
      const { itemId, enchantmentId } = action.payload || {};
      const definition = ITEM_TYPES[itemId];
      const enchantment = ENCHANTMENTS[enchantmentId];
      if (!definition || !enchantment || (state.inventory[itemId] || 0) <= 0 || !enchantmentApplies(definition, enchantment)) return;
      const current = getEnchantmentLevel(state, itemId, enchantmentId);
      if (current >= enchantment.maxLevel) {
        state.message = `${enchantment.name} is already at maximum level`;
        return;
      }
      const shardCost = Math.max(1, Math.ceil(enchantment.cost / 3) + current);
      const dustCost = enchantment.cost + current * 2;
      if ((state.inventory.enchantment_shard || 0) < shardCost || (state.inventory.arcane_dust || 0) < dustCost) {
        state.message = `Requires ${shardCost} enchantment shard and ${dustCost} arcane dust`;
        return;
      }
      state.inventory.enchantment_shard -= shardCost;
      state.inventory.arcane_dust -= dustCost;
      state.enchantments[itemId] = { ...(state.enchantments[itemId] || {}), [enchantmentId]: current + 1 };
      state.message = `${definition.name} gained ${enchantment.name} ${current + 1}`;
      addExperienceToState(state, 18 + (current + 1) * 8, "Enchantment completed");
      state.revision += 1;
    },
    analyzeFossils: (state) => {
      if ((state.inventory.fossil_fragment || 0) < 3 || (state.inventory.ancient_bone || 0) < 1) {
        state.message = "Analysis requires 3 fossil fragments and 1 ancient bone";
        return;
      }
      state.inventory.fossil_fragment -= 3;
      state.inventory.ancient_bone -= 1;
      addInventoryItem(state, "dinosaur_dna", 1);
      state.archaeology.analyzed += 1;
      state.archaeology.dnaCreated += 1;
      addExperienceToState(state, 28, "Fossil genome analyzed");
      state.message = "Viable dinosaur DNA extracted";
      state.revision += 1;
    },
    spliceDinosaurEgg: (state) => {
      if ((state.inventory.dinosaur_dna || 0) < 1 || (state.inventory.egg || 0) < 1 || (state.inventory.slime_ball || 0) < 1) {
        state.message = "Gene splicing requires dinosaur DNA, an egg, and a slime stabilizer";
        return;
      }
      state.inventory.dinosaur_dna -= 1;
      state.inventory.egg -= 1;
      state.inventory.slime_ball -= 1;
      addInventoryItem(state, "dinosaur_egg", 1);
      state.archaeology.eggsSpliced += 1;
      addExperienceToState(state, 42, "Dinosaur egg gene-spliced");
      state.message = "A gene-spliced dinosaur egg is ready";
      state.revision += 1;
    },
    reviveDinosaur: (state, action) => {
      if ((state.inventory.dinosaur_egg || 0) < 1) {
        state.message = "A gene-spliced dinosaur egg is required";
        return;
      }
      const now = Date.now();
      const roll = seededUnit(state.seed, now, state.archaeology.dinosaursRevived);
      const requested = action.payload?.species;
      const species = DINOSAUR_TYPES.includes(requested) ? requested : DINOSAUR_TYPES[Math.min(DINOSAUR_TYPES.length - 1, Math.floor(roll * DINOSAUR_TYPES.length))];
      const position = action.payload?.position || [state.player.x + 2.5, state.player.y, state.player.z + 2.5];
      state.inventory.dinosaur_egg -= 1;
      const dinosaur = createMob(`revived-${species}-${now}-${Math.floor(roll * 1e6)}`, species, Number(position[0]) || 0, Number(position[1]) || 0, Number(position[2]) || 0);
      dinosaur.revived = true;
      dinosaur.tamed = species !== "tyrannosaur";
      dinosaur.customName = species === "raptor" ? "Echo" : species === "triceratops" ? "Cera" : "Rex-Prime";
      dinosaur.babyUntil = now + 180000;
      state.mobs.push(dinosaur);
      state.archaeology.dinosaursRevived += 1;
      state.metrics.dinosaursRevived = (state.metrics.dinosaursRevived || 0) + 1;
      addExperienceToState(state, 110, `Revived ${MOB_TYPES[species]?.name || species}`);
      state.message = `${dinosaur.customName} emerged from the incubation field`;
      state.revision += 1;
    },
    acceptVillageQuest: (state, action) => {
      const questId = action.payload?.questId || action.payload;
      const quest = VILLAGE_QUESTS.find((entry) => entry.id === questId);
      if (!quest || state.villageQuests.claimed.includes(questId) || state.villageQuests.accepted.includes(questId)) return;
      state.villageQuests.accepted.push(questId);
      state.message = `Quest accepted · ${quest.name}`;
      state.revision += 1;
    },
    claimVillageQuest: (state, action) => {
      const questId = action.payload?.questId || action.payload;
      const quest = VILLAGE_QUESTS.find((entry) => entry.id === questId);
      if (!quest || !state.villageQuests.accepted.includes(questId) || state.villageQuests.claimed.includes(questId)) return;
      if (villageQuestProgress(state, quest) < quest.target) {
        state.message = `${quest.name} is not complete yet`;
        return;
      }
      Object.entries(quest.rewards || {}).forEach(([item, amount]) => addInventoryItem(state, item, amount));
      state.villageQuests.claimed.push(questId);
      state.villageQuests.accepted = state.villageQuests.accepted.filter((id) => id !== questId);
      state.metrics.villageQuestsCompleted = (state.metrics.villageQuestsCompleted || 0) + 1;
      addExperienceToState(state, quest.rewardXp, `Village quest complete: ${quest.name}`);
      state.revision += 1;
    },
    discoverFaction: (state, action) => {
      const factionId = action.payload?.factionId || action.payload;
      if (!factionId || state.factions.discovered.includes(factionId)) return;
      state.factions.discovered.push(factionId);
      state.message = `Discovered a new faction settlement · ${factionId}`;
      state.revision += 1;
    },
    adjustFactionReputation: (state, action) => {
      const { factionId, amount = 0, reason = "" } = action.payload || {};
      if (!factionId || !Object.prototype.hasOwnProperty.call(state.factions.reputation, factionId)) return;
      state.factions.reputation[factionId] = Math.max(-100, Math.min(150, (state.factions.reputation[factionId] || 0) + Number(amount || 0)));
      state.message = `${amount >= 0 ? "+" : ""}${amount} ${factionId} reputation${reason ? ` · ${reason}` : ""}`;
      state.revision += 1;
    },
    acceptFactionQuest: (state, action) => {
      const questId = action.payload?.questId || action.payload;
      const quest = FACTION_QUESTS.find((entry) => entry.id === questId);
      if (!quest || state.factions.accepted.includes(questId) || state.factions.claimed.includes(questId)) return;
      state.factions.accepted.push(questId);
      if (!state.factions.discovered.includes(quest.factionId)) state.factions.discovered.push(quest.factionId);
      state.message = `Faction quest accepted · ${quest.name}`;
      state.revision += 1;
    },
    claimFactionQuest: (state, action) => {
      const questId = action.payload?.questId || action.payload;
      const quest = FACTION_QUESTS.find((entry) => entry.id === questId);
      if (!quest || !state.factions.accepted.includes(questId) || state.factions.claimed.includes(questId)) return;
      const progress = Number(state.metrics?.[quest.metric]) || 0;
      if (progress < quest.target) { state.message = `${quest.name} is not complete yet`; return; }
      Object.entries(quest.rewards || {}).forEach(([item, amount]) => addInventoryItem(state, item, amount));
      state.factions.accepted = state.factions.accepted.filter((id) => id !== questId);
      state.factions.claimed.push(questId);
      state.factions.reputation[quest.factionId] = Math.min(150, (state.factions.reputation[quest.factionId] || 0) + (quest.reputation || 0));
      addExperienceToState(state, quest.rewardXp || 0, `Faction contract complete: ${quest.name}`);
      state.message = `${quest.name} complete · +${quest.reputation || 0} reputation`;
      state.revision += 1;
    },
    toggleFenceGate: (state, action) => {
      const { key, position, type } = action.payload || {};
      const blockPosition = Array.isArray(position) ? position : key ? parseBlockKey(key) : null;
      if (!blockPosition || !["oak_fence_gate", "oak_fence_gate_open"].includes(type)) return;
      state.blockEdits[blockKey(...blockPosition)] = { type };
      state.message = type === "oak_fence_gate_open" ? "Fence gate opened" : "Fence gate closed";
      state.revision += 1;
    },
    toggleDoor: (state, action) => {
      const { key, position, type } = action.payload || {};
      const blockPosition = Array.isArray(position) ? position : key ? parseBlockKey(key) : null;
      const doorTypes = ["oak_door", "oak_door_ew", "oak_door_open", "oak_door_ew_open"];
      if (!blockPosition || !doorTypes.includes(type)) return;
      state.blockEdits[blockKey(...blockPosition)] = { type };
      state.message = type.endsWith("_open") ? "Oak door opened" : "Oak door closed";
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

      const hayFeed = Boolean(
        mobDefinition.passive && itemId === "hay_bale" && (state.inventory.hay_bale || 0) > 0
      );
      if (hayFeed) {
        state.inventory.hay_bale -= 1;
        mob.health = Math.min(mob.maxHealth || mobDefinition.maxHealth || 10, (mob.health || 0) + 8);
        mob.fedUntil = Date.now() + 120000;
        mob.heartUntil = Date.now() + 1800;
        mob.tameProgress = Math.min(3, (mob.tameProgress || 0) + (mobDefinition.tameable ? 1 : 0));
        state.metrics.animalsFed = (state.metrics.animalsFed || 0) + 1;
        state.message = `${mob.customName || mobDefinition.name} ate the hay and recovered health`;
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
      if (recipe.station === "arcane_table" || Object.keys(recipe.outputs).some((item) => ITEM_TYPES[item]?.category === "arcane" || ITEM_TYPES[item]?.arcaneFocus)) {
        state.arcana.knowledge += 3;
        if (state.arcana.knowledge % 15 < 3) state.arcana.researchPoints += 1;
      }
      addExperienceToState(state, recipe.station === "arcane_table" ? 9 : recipe.station === "crafting_table" ? 6 : 2, `Crafted ${recipe.name}`);
      state.revision += 1;
    },
    assignHousingBed: (state, action) => {
      const { key, role, room } = action.payload || {};
      const roleDefinition = HOUSING_ROLES[role];
      if (!key || !roleDefinition || !room?.valid || !Array.isArray(room.position)) {
        state.message = room?.reason || "Finish the room before assigning this bed";
        return;
      }
      const existing = state.housing.beds[key];
      let resident = existing?.residentId ? state.mobs.find((mob) => mob.id === existing.residentId) : null;
      if (!resident) {
        const index = state.housing.residentsRecruited % HOUSING_RESIDENT_NAMES.length;
        const residentName = HOUSING_RESIDENT_NAMES[index];
        const [x, y, z] = room.position;
        resident = createMob(`resident-${Date.now()}-${Math.floor(Math.random() * 1e7)}`, "colonist", x + 1.1, y + 0.2, z + 0.5);
        resident.customName = residentName;
        resident.tamed = true;
        resident.housingBedKey = key;
        resident.homePosition = [x + 0.5, y + 0.2, z + 0.5];
        resident.homeX = x + 0.5;
        resident.homeY = y + 0.2;
        resident.homeZ = z + 0.5;
        resident.homeRadius = 10;
        state.mobs.push(resident);
        state.housing.residentsRecruited += 1;
      }
      resident.job = role;
      resident.housingBedKey = key;
      resident.homePosition = [room.position[0] + 0.5, room.position[1] + 0.2, room.position[2] + 0.5];
      resident.homeX = resident.homePosition[0];
      resident.homeY = resident.homePosition[1];
      resident.homeZ = resident.homePosition[2];
      resident.homeRadius = role === "guard" ? 16 : 10;
      state.housing.beds[key] = {
        key,
        position: [...room.position],
        room: { ...room, bounds: room.bounds ? { ...room.bounds } : null },
        role,
        residentId: resident.id,
        residentName: resident.customName,
        active: true,
        lastWorkedAt: Number(existing?.lastWorkedAt) || Date.now(),
      };
      state.message = `${resident.customName} moved in as the ${roleDefinition.name}`;
      state.revision += 1;
    },
    releaseHousingBed: (state, action) => {
      const key = action.payload?.key || action.payload;
      const bed = state.housing.beds[key];
      if (!bed) return;
      if (bed.residentId) state.mobs = state.mobs.filter((mob) => mob.id !== bed.residentId);
      delete state.housing.beds[key];
      state.message = `${bed.residentName || "Resident"} left the settlement`;
      state.revision += 1;
    },
    runHousingWorkCycle: (state, action) => {
      const now = Number(action.payload?.now ?? action.payload ?? Date.now());
      let completed = 0;
      Object.values(state.housing.beds || {}).forEach((bed) => {
        if (!bed?.active) return;
        const role = HOUSING_ROLES[bed.role];
        let resident = bed.residentId ? state.mobs.find((mob) => mob.id === bed.residentId && !mob.dyingUntil) : null;
        if (!resident && bed.respawnAt && now >= bed.respawnAt && role) {
          const [x, y, z] = bed.position || [0, 0, 0];
          resident = createMob(`resident-${Date.now()}-${Math.floor(Math.random() * 1e7)}`, "colonist", x + 1.1, y + 0.2, z + 0.5);
          resident.customName = bed.residentName || HOUSING_RESIDENT_NAMES[state.housing.residentsRecruited % HOUSING_RESIDENT_NAMES.length];
          resident.tamed = true;
          resident.job = bed.role;
          resident.housingBedKey = bed.key;
          resident.homeX = x + 0.5; resident.homeY = y + 0.2; resident.homeZ = z + 0.5;
          resident.homeRadius = bed.role === "guard" ? 16 : 10;
          state.mobs.push(resident);
          bed.residentId = resident.id;
          bed.respawnAt = 0;
          bed.status = "working";
        }
        if (!resident || !role || now - Number(bed.lastWorkedAt || 0) < role.cycleMs) return;
        bed.lastWorkedAt = now;
        role.outputs.forEach((drop) => {
          if (Math.random() > drop.chance) return;
          const amount = drop.min + Math.floor(Math.random() * (Math.max(0, drop.max - drop.min) + 1));
          state.housing.storage[drop.item] = Math.min(999, Number(state.housing.storage[drop.item] || 0) + amount);
        });
        resident.actionState = bed.role === "guard" ? "guard" : bed.role === "farmer" ? "farm" : bed.role === "miner" ? "mine" : "work";
        resident.actionUntil = now + 1250;
        completed += 1;
      });
      if (completed > 0) {
        state.housing.workCycles += completed;
        state.message = `${completed} household work ${completed === 1 ? "cycle" : "cycles"} completed`;
        state.revision += 1;
      }
    },
    collectHousingStorage: (state) => {
      let collected = 0;
      Object.entries(state.housing.storage || {}).forEach(([item, amount]) => {
        const result = addInventoryItem(state, item, Number(amount) || 0);
        state.housing.storage[item] = Math.max(0, Number(amount) - result.added);
        collected += result.added;
      });
      if (collected > 0) {
        state.message = `Collected ${collected} items from household storage`;
        state.revision += 1;
      }
    },
    summonBoss: (state, action) => {
      const { bossType, altarKey, position } = action.payload || {};
      const summon = BOSS_SUMMONS[bossType];
      if (!summon || !altarKey || !Array.isArray(position)) return;
      const active = state.bosses.activeBossId && state.mobs.find((mob) => mob.id === state.bosses.activeBossId && !mob.dyingUntil);
      if (active) {
        state.message = `${MOB_TYPES[active.type]?.name || "A boss"} is already active`;
        return;
      }
      if ((state.inventory[summon.itemId] || 0) <= 0) {
        state.message = `${ITEM_TYPES[summon.itemId]?.name || summon.itemId} is required`;
        return;
      }
      state.inventory[summon.itemId] -= 1;
      const [ox, oy, oz] = summon.spawnOffset;
      const id = `boss-${bossType}-${Date.now()}-${Math.floor(Math.random() * 1e7)}`;
      const boss = createMob(id, bossType, Number(position[0]) + ox, Number(position[1]) + oy, Number(position[2]) + oz);
      boss.summonedAt = Date.now();
      boss.altarKey = altarKey;
      boss.homeX = boss.x;
      boss.homeY = boss.y;
      boss.homeZ = boss.z;
      boss.homeRadius = 34;
      state.mobs.push(boss);
      state.bosses.activeBossId = id;
      state.bosses.activeBossType = bossType;
      state.bosses.summoned += 1;
      state.message = `${summon.name} has awakened`;
      state.revision += 1;
    },
    recordBossAbility: (state, action) => {
      const { bossId, ability, now = Date.now() } = action.payload || {};
      if (!bossId || bossId !== state.bosses.activeBossId) return;
      state.bosses.lastAbility = { bossId, ability: String(ability || "Boss ability"), at: Number(now) || Date.now() };
      state.message = `${MOB_TYPES[state.bosses.activeBossType]?.name || "Boss"} used ${ability}`;
    },
    spawnBossMinions: (state, action) => {
      const { bossId, types = [] } = action.payload || {};
      const boss = state.mobs.find((mob) => mob.id === bossId && !mob.dyingUntil);
      if (!boss || !MOB_TYPES[boss.type]?.boss) return;
      const existing = state.mobs.filter((mob) => mob.bossOwnerId === bossId && !mob.dyingUntil).length;
      types.slice(0, Math.max(0, 5 - existing)).forEach((type, index) => {
        if (!MOB_TYPES[type]) return;
        const angle = (index / Math.max(1, types.length)) * Math.PI * 2 + Math.random();
        const minion = createMob(`boss-minion-${bossId}-${Date.now()}-${index}`, type, boss.x + Math.cos(angle) * 3.2, boss.y, boss.z + Math.sin(angle) * 3.2);
        minion.bossOwnerId = bossId;
        minion.homeX = boss.x;
        minion.homeY = boss.y;
        minion.homeZ = boss.z;
        minion.homeRadius = 22;
        state.mobs.push(minion);
      });
      state.revision += 1;
    },
    startFurnaceJob: (state, action) => {
      const { furnaceKey, recipeId, fuelId, now = Date.now() } = action.payload || {};
      const recipe = SMELTING_RECIPES.find((item) => item.id === recipeId);
      if (!recipe || !furnaceKey) return;
      const station = state.furnaces[furnaceKey] || { outputInventory: {} };
      if (station.recipeId) { state.message = "This furnace is already smelting"; return; }
      if ((state.inventory[recipe.input] || 0) < 1) return;
      if ((state.inventory[fuelId] || 0) < 1 || getFuelPower(fuelId) <= 0) return;
      const stored = Number(station.outputInventory?.[recipe.output] || 0);
      if (stored >= 64) { state.message = "Take the furnace output before smelting more"; return; }
      state.inventory[recipe.input] -= 1;
      state.inventory[fuelId] -= 1;
      state.furnaces[furnaceKey] = {
        ...station, recipeId, input: recipe.input, output: recipe.output, fuelId, startedAt: Number(now),
        durationMs: (recipe.seconds * 1000) / getCraftingSpeedMultiplier(state.progression) / (hasPerk(state.progression, "efficient_smelting") ? 1.12 : 1),
        outputInventory: { ...(station.outputInventory || {}) },
      };
      state.message = `Started ${recipe.name}`; state.revision += 1;
    },
    completeFurnaceJobs: (state, action) => {
      const now = Number(action.payload?.now ?? action.payload ?? Date.now());
      let completed = 0;
      Object.entries(state.furnaces).forEach(([key, station]) => {
        if (!station.recipeId || now - station.startedAt < station.durationMs) return;
        const amount = 1 + (hasPerk(state.progression, "master_smelter") && Math.random() < 0.12 ? 1 : 0);
        const outputInventory = { ...(station.outputInventory || {}) };
        outputInventory[station.output] = Math.min(64, Number(outputInventory[station.output] || 0) + amount);
        state.furnaces[key] = { outputInventory, lastCompletedAt: now };
        completed += 1;
      });
      if (completed > 0) { state.metrics.smeltsCompleted += completed; addExperienceToState(state, completed * 3, completed === 1 ? "Smelting ready to collect" : `${completed} furnace outputs ready`); state.revision += 1; }
    },
    collectFurnaceOutput: (state, action) => {
      const { furnaceKey, itemId, amount = Infinity } = action.payload || {};
      const station = state.furnaces[furnaceKey];
      const stored = Number(station?.outputInventory?.[itemId] || 0);
      if (!station || !stored) return;
      const result = addInventoryItem(state, itemId, Math.min(stored, Number(amount) || stored));
      if (result.added <= 0) return;
      station.outputInventory[itemId] -= result.added;
      if (station.outputInventory[itemId] <= 0) delete station.outputInventory[itemId];
      state.message = `Collected ${result.added} ${getItemDefinition(itemId).name}`; state.revision += 1;
    },
    sitOnChair: (state, action) => {
      const { key, position, yaw = 0 } = action.payload || {};
      if (!key || !Array.isArray(position)) return;
      state.seated = { key, position: [...position], yaw: Number(yaw) || 0 };
      state.message = "Seated · move, jump, crouch, or sprint to stand"; state.revision += 1;
    },
    standUp: (state) => { if (state.seated) { state.seated = null; state.message = "Stood up"; state.revision += 1; } },
    dropInventoryItem: (state, action) => {
      const { itemId, amount = 1, position, velocity = {} } = action.payload || {};
      const available = Number(state.inventory[itemId] || 0);
      const count = Math.min(available, Math.max(1, Math.floor(amount)));
      if (!ITEM_TYPES[itemId] || count <= 0) return;
      state.inventory[itemId] -= count;
      pushWorldDrop(state, itemId, count, position || [state.player.x, state.player.y, state.player.z], { vx: velocity.x, vy: velocity.y, vz: velocity.z, pickupDelay: 850 });
      state.message = `Dropped ${count} ${getItemDefinition(itemId).name}`; state.revision += 1;
    },
    consumeItem: (state, action) => {
      const itemId = action.payload;
      const item = ITEM_TYPES[itemId];
      const maxHealth = getMaxHealth(state.progression);
      const canRestoreHunger = state.hunger < 20;
      const canRestoreHealth = Number(item?.heal || 0) > 0 && state.health < maxHealth;
      const canRestoreMana = Number(item?.mana || 0) > 0 && state.arcana?.mana < state.arcana?.maxMana;
      if (!item?.food || (state.inventory[itemId] || 0) <= 0 || (!canRestoreHunger && !canRestoreHealth && !canRestoreMana)) return;
      state.inventory[itemId] -= 1;
      state.hunger = Math.min(20, state.hunger + item.food);
      if (item.heal) state.health = Math.min(maxHealth, state.health + Number(item.heal || 0));
      if (item.mana && state.arcana) state.arcana.mana = Math.min(state.arcana.maxMana, state.arcana.mana + Number(item.mana || 0));
      if (item.returnsItem) addInventoryItem(state, item.returnsItem, 1, { autoHotbar: false });
      state.message = item.returnsItem ? `Ate ${item.name} · ${getItemDefinition(item.returnsItem).name} returned` : `Ate ${item.name}`;
      state.revision += 1;
    },
    damageMob: (state, action) => {
      const { mobId, itemId } = action.payload || {};
      const index = state.mobs.findIndex((mob) => mob.id === mobId);
      if (index < 0 || state.mobs[index].dyingUntil) return;
      const usableItem = (state.inventory[itemId] || 0) > 0 ? itemId : null;
      const powerBonus = hasPerk(state.progression, "power_strike") ? 1.1 : 1;
      const critical = hasPerk(state.progression, "critical_training") && Math.random() < 0.12;
      const sharpness = getEnchantmentLevel(state, usableItem, "sharpness");
      const vampiric = getEnchantmentLevel(state, usableItem, "vampiric");
      const damage = (getAttackDamage(usableItem) + sharpness * 1.45) * getStrengthDamageMultiplier(state.progression) * powerBonus * (critical ? 1.75 : 1);
      const defeatedType = state.mobs[index].type;
      state.mobs[index].health -= damage;
      state.mobs[index].hurtUntil = Date.now() + 320;
      if (vampiric > 0) state.health = Math.min(getMaxHealth(state.progression), state.health + Math.max(0.25, damage * vampiric * 0.035));
      if (usableItem && ITEM_TYPES[usableItem]?.category === "tool") damageEquipmentWithEnchant(state, usableItem, 1);
      if (state.mobs[index]?.health <= 0) {
        const definition = MOB_TYPES[defeatedType];
        if (beginMobDeath(state, index, "player")) {
          if (definition?.factionId && state.factions?.reputation) {
            const penalty = definition.guardian ? 12 : 6;
            state.factions.reputation[definition.factionId] = Math.max(-100, (state.factions.reputation[definition.factionId] || 0) - penalty);
            state.message = `Attacking ${definition.name} damaged your ${definition.factionId} reputation`;
          }
          state.metrics.mobsDefeated += 1;
          if (definition?.hostile) {
            state.metrics.hostilesDefeated += 1;
            if (definition.elite) state.metrics.eliteEnemiesDefeated = (state.metrics.eliteEnemiesDefeated || 0) + 1;
            state.arcana.knowledge += 2;
            if (Math.random() < 0.12) state.arcana.researchPoints += 1;
          }
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
      const protectionLevel = ARMOR_SLOTS.reduce((sum, slot) => sum + getEnchantmentLevel(state, state.armor[slot], "protection"), 0);
      damage *= Math.max(0.55, 1 - protectionLevel * 0.035);
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
        const tempered = getEnchantmentLevel(state, itemId, "durability");
        const enchantDurabilityMultiplier = Math.max(0.35, 1 - tempered * 0.18);
        const next = current - Math.max(1, Math.ceil(rawDamage * 0.35 * (setBonus?.durabilityMultiplier || 1) * enchantDurabilityMultiplier));
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
    transferToStorageChest: (state, action) => {
      const { key, itemId, amount = 1 } = action.payload || {};
      const chest = state.storageChests[key];
      const definition = ITEM_TYPES[itemId];
      if (!chest || !definition || (state.inventory[itemId] || 0) <= 0) return;
      const items = chest.items || (chest.items = {});
      const uniqueSlots = Object.keys(items).filter((id) => Number(items[id]) > 0).length;
      if (!items[itemId] && uniqueSlots >= (chest.slots || 27)) { state.message = "Storage chest is full"; return; }
      const maxStack = definition.maxStack || 64;
      const moved = Math.min(Math.max(1, Math.floor(amount)), state.inventory[itemId] || 0, maxStack - (items[itemId] || 0));
      if (moved <= 0) return;
      state.inventory[itemId] -= moved;
      items[itemId] = (items[itemId] || 0) + moved;
      if (state.inventory[itemId] <= 0) state.hotbar = state.hotbar.map((entry) => entry === itemId ? null : entry);
      state.message = `Stored ${moved} ${definition.name}`;
      state.revision += 1;
    },
    transferFromStorageChest: (state, action) => {
      const { key, itemId, amount = 1 } = action.payload || {};
      const chest = state.storageChests[key];
      const definition = ITEM_TYPES[itemId];
      const stored = Number(chest?.items?.[itemId] || 0);
      if (!chest || !definition || stored <= 0) return;
      const capacity = (definition.maxStack || 64) - (state.inventory[itemId] || 0);
      const moved = Math.min(Math.max(1, Math.floor(amount)), stored, capacity);
      if (moved <= 0) { state.message = "Inventory stack is full"; return; }
      addInventoryItem(state, itemId, moved);
      chest.items[itemId] = stored - moved;
      if (chest.items[itemId] <= 0) delete chest.items[itemId];
      state.message = `Took ${moved} ${definition.name}`;
      state.revision += 1;
    },
    emptyLavaBucket: (state, action) => {
      const { position, solidified = false } = action.payload || {};
      if ((state.inventory.lava_bucket || 0) <= 0 || !Array.isArray(position)) return;
      state.inventory.lava_bucket -= 1;
      addInventoryItem(state, "bucket", 1, { autoHotbar: false });
      state.hotbar = state.hotbar.map((item) => item === "lava_bucket" ? "bucket" : item);
      state.blockEdits[blockKey(...position)] = { type: solidified ? "obsidian" : "lava" };
      state.message = solidified ? "Lava cooled into obsidian" : "Lava source placed";
      state.revision += 1;
    },
    fillLavaBucket: (state, action) => {
      const { key } = action.payload || {};
      if ((state.inventory.bucket || 0) <= 0 || (state.inventory.lava_bucket || 0) >= 1) return;
      state.inventory.bucket -= 1;
      addInventoryItem(state, "lava_bucket", 1, { autoHotbar: false });
      state.hotbar = state.hotbar.map((item) => item === "bucket" ? "lava_bucket" : item);
      if (key) state.blockEdits[key] = null;
      state.message = "Filled lava bucket";
      state.revision += 1;
    },
    solidifyLava: (state, action) => {
      const positions = Array.isArray(action.payload?.positions) ? action.payload.positions : [];
      positions.forEach((position) => {
        if (Array.isArray(position)) state.blockEdits[blockKey(...position)] = { type: "obsidian" };
      });
      if (positions.length) {
        state.message = positions.length === 1 ? "Lava cooled into obsidian" : `${positions.length} lava blocks cooled into obsidian`;
        state.revision += 1;
      }
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
    advanceColonyConstruction: (state, action) => {
      const { stationId, position, type, planIndex = 0, completed = false } = action.payload || {};
      const station = state.colony.stations.find((candidate) => candidate.id === stationId && candidate.job === "builder");
      if (!station || station.destroyed || !Array.isArray(position) || !BLOCK_TYPES[type]) return;
      const key = blockKey(...position);
      state.blockEdits[key] = { type };
      station.buildIndex = Math.max(Number(station.buildIndex || 0), Number(planIndex || 0) + 1);
      station.progress = station.buildPlan?.length ? Math.min(1, station.buildIndex / station.buildPlan.length) : 1;
      station.status = completed ? "House complete" : `Building ${String(action.payload?.phase || "house").replaceAll("_", " ")}`;
      state.colony.totals.constructionBlocksPlaced = Number(state.colony.totals.constructionBlocksPlaced || 0) + 1;
      if (type === "storage_chest" && !state.storageChests[key]) state.storageChests[key] = { key, items: {}, slots: 27, createdAt: Date.now(), builtByColony: stationId };
      if (completed && !station.houseCompleted) {
        station.houseCompleted = true;
        station.completedAt = Date.now();
        state.colony.totals.housesBuilt = Number(state.colony.totals.housesBuilt || 0) + 1;
        state.message = `${station.workerName} completed a furnished colony house`;
      }
      state.revision += 1;
    },
    addColonyResources: (state, action) => {
      const { stationId, items = {}, totals = {}, blockEdits = {}, message = "" } = action.payload || {};
      Object.entries(blockEdits).forEach(([key, value]) => { state.blockEdits[key] = value; });
      Object.entries(items).forEach(([item, amount]) => {
        state.colony.storage[item] = Math.max(0, (state.colony.storage[item] || 0) + (Number(amount) || 0));
      });
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
    updateColonyStationOrders: (state, action) => {
      const { stationId, orderMode, threatMode, maintenancePolicy, workPriority } = action.payload || {};
      const station = state.colony.stations.find((candidate) => candidate.id === stationId);
      if (!station) return;
      if (orderMode) station.orderMode = String(orderMode);
      if (["balanced", "defend", "flee"].includes(threatMode)) station.threatMode = threatMode;
      if (["auto", "manual", "off"].includes(maintenancePolicy)) station.maintenancePolicy = maintenancePolicy;
      if (Number.isFinite(workPriority)) station.workPriority = Math.max(1, Math.min(3, Number(workPriority)));
      station.status = `Orders updated · ${station.orderMode}`;
      state.message = `${station.workerName} received new colony orders`;
      state.revision += 1;
    },
    maintainColonyStation: (state, action) => {
      const stationId = action.payload?.stationId || action.payload;
      const station = state.colony.stations.find((candidate) => candidate.id === stationId);
      if (!station || station.destroyed || station.health >= station.maxHealth) return;
      const plankCost = hasPerk(state.progression, "arcane_engineer") ? 1 : 2;
      const stoneCost = hasPerk(state.progression, "arcane_engineer") ? 1 : 2;
      if ((state.colony.storage.planks || 0) < plankCost || (state.colony.storage.cobblestone || 0) < stoneCost) {
        state.message = `Maintenance needs ${plankCost} planks and ${stoneCost} cobblestone in colony storage`;
        return;
      }
      state.colony.storage.planks -= plankCost;
      state.colony.storage.cobblestone -= stoneCost;
      station.health = Math.min(station.maxHealth, station.health + 24);
      station.status = "Station repaired and reinforced";
      state.message = `${station.workerName}'s station was repaired`;
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
      if (shared.storageChests && typeof shared.storageChests === "object") state.storageChests = shared.storageChests;
      if (shared.colony && typeof shared.colony === "object") state.colony = cloneColonyState(shared.colony);
      if (shared.housing && typeof shared.housing === "object") state.housing = cloneHousingState(shared.housing);
      if (shared.bosses && typeof shared.bosses === "object") state.bosses = cloneBossState(shared.bosses);
      if (Array.isArray(shared.crops)) state.crops = sanitizeCropRecords(shared.crops);
      if (Array.isArray(shared.droppedItems)) state.droppedItems = shared.droppedItems;
      if (shared.weather && typeof shared.weather === "object") state.weather = { ...state.weather, ...shared.weather };
      if (shared.enchantments && typeof shared.enchantments === "object") state.enchantments = shared.enchantments;
      if (Array.isArray(shared.openedTreasureChests)) state.openedTreasureChests = shared.openedTreasureChests;
      if (shared.villageQuests && typeof shared.villageQuests === "object") state.villageQuests = shared.villageQuests;
      if (shared.factions && typeof shared.factions === "object") state.factions = cloneFactionState(shared.factions);
      if (shared.archaeology && typeof shared.archaeology === "object") state.archaeology = { ...state.archaeology, ...shared.archaeology };
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
  swapHotbarItems,
  clearHotbarSlot,
  clearReplaceableBlock,
  unlockArcaneResearch,
  selectArcaneSpell,
  cycleArcaneSpell,
  regenerateArcana,
  castArcaneSpell,
  breakBlock,
  placeBlock,
  lootTreasureChest,
  enchantItem,
  analyzeFossils,
  spliceDinosaurEgg,
  reviveDinosaur,
  acceptVillageQuest,
  claimVillageQuest,
  discoverFaction,
  adjustFactionReputation,
  acceptFactionQuest,
  claimFactionQuest,
  toggleFenceGate,
  toggleDoor,
  placeBoat,
  interactMob,
  dismount,
  addAmbientMobs,
  removeMobsById,
  craftRecipe,
  startFurnaceJob,
  completeFurnaceJobs,
  collectFurnaceOutput,
  transferToStorageChest,
  transferFromStorageChest,
  sitOnChair,
  standUp,
  assignHousingBed,
  releaseHousingBed,
  runHousingWorkCycle,
  collectHousingStorage,
  summonBoss,
  recordBossAbility,
  spawnBossMinions,
  dropInventoryItem,
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
  emptyLavaBucket,
  fillLavaBucket,
  solidifyLava,
  tillSoil,
  plantCrop,
  applyCropGrowth,
  applyColonyFrame,
  advanceColonyConstruction,
  damageColonyStation,
  respawnColonyWorker,
  addColonyResources,
  collectColonyStorage,
  toggleColonyStation,
  updateColonyStationOrders,
  maintainColonyStation,
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
