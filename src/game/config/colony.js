export const COLONY_ORDER_MODES = Object.freeze({
  guard: ["patrol", "hold", "escort"],
  miner: ["work", "stockpile", "defend"],
  farmer: ["work", "harvest", "defend"],
  rancher: ["work", "feed", "defend"],
  fisher: ["work", "stockpile", "defend"],
  builder: ["work", "maintain", "defend"],
});
export const COLONY_THREAT_MODES = Object.freeze(["balanced", "defend", "flee"]);
export const COLONY_MAINTENANCE_POLICIES = Object.freeze(["auto", "manual", "off"]);

export const COLONY_JOB_TYPES = {
  guard: { label: "Guard", color: "#9e443d", description: "Patrols the settlement and attacks hostile mobs." },
  miner: { label: "Miner", color: "#747b82", description: "Searches nearby loaded terrain for stone and ore." },
  farmer: { label: "Farmer", color: "#6f943f", description: "Tills soil, plants seeds, grows crops, and harvests wheat." },
  rancher: { label: "Animal Keeper", color: "#9a6b48", description: "Groups, feeds, and breeds passive animals." },
  fisher: { label: "Fisher", color: "#3f729e", description: "Works near water and delivers fish to colony storage." },
  builder: { label: "Builder", color: "#a86d3c", description: "Builds a furnished frontier house in real time, one supported block at a time." },
};

export const COLONY_BOX_TO_JOB = {
  guard_colony_box: "guard",
  miner_colony_box: "miner",
  farm_colony_box: "farmer",
  animal_colony_box: "rancher",
  fishing_colony_box: "fisher",
  builder_colony_box: "builder",
};

export const COLONY_WORKER_NAMES = [
  "Alden", "Briar", "Cora", "Dellan", "Elsie", "Fen", "Greta", "Hollis",
  "Iris", "Joren", "Kaia", "Linden", "Mara", "Nolan", "Orla", "Perrin",
];

export const COLONY_DEFAULT_STATE = {
  stations: [],
  storage: {},
  crops: [],
  totals: {
    blocksMined: 0,
    cropsHarvested: 0,
    animalsManaged: 0,
    fishCaught: 0,
    hostilesStopped: 0,
    housesBuilt: 0,
    constructionBlocksPlaced: 0,
  },
};

export const COLONY_TICK_SECONDS = 0.5;
export const COLONY_RESPAWN_MIN_MS = 5 * 60 * 1000;
export const COLONY_RESPAWN_MAX_MS = 10 * 60 * 1000;
export const COLONY_STATION_MAX_HEALTH = 60;
export const COLONY_WORK_RADIUS = 18;
export const COLONY_GUARD_RADIUS = 20;
export const COLONY_MAX_MANAGED_ANIMALS = 8;
export const FARM_PLOT_OFFSETS = Array.from({ length: 49 }, (_, index) => {
  const x = (index % 7) - 3;
  const z = Math.floor(index / 7) - 3;
  return [x, z];
}).filter(([x, z]) => Math.abs(x) > 1 || Math.abs(z) > 1);

export function cloneColonyState(source = COLONY_DEFAULT_STATE) {
  return {
    stations: Array.isArray(source.stations) ? source.stations.map((station) => ({ ...station, position: [...station.position], buildPlan: Array.isArray(station.buildPlan) ? station.buildPlan.map((step) => ({ ...step, position: [...step.position] })) : [], managedAnimalIds: [...(station.managedAnimalIds || [])], orderMode: station.orderMode || (station.job === "guard" ? "patrol" : "work"), threatMode: station.threatMode || (station.job === "guard" ? "defend" : "balanced"), maintenancePolicy: station.maintenancePolicy || "auto", workPriority: Number.isFinite(station.workPriority) ? station.workPriority : 1, health: Number.isFinite(station.health) ? station.health : 60, maxHealth: Number.isFinite(station.maxHealth) ? station.maxHealth : 60, workerState: station.workerState || (station.respawnAt ? "respawning" : "working"), respawnAt: Number(station.respawnAt) || 0, deathCount: Number(station.deathCount) || 0 })) : [],
    storage: { ...(source.storage || {}) },
    crops: Array.isArray(source.crops) ? source.crops.map((crop) => ({ ...crop, position: [...crop.position] })) : [],
    totals: { ...COLONY_DEFAULT_STATE.totals, ...(source.totals || {}) },
  };
}
