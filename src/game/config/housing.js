export const HOUSING_ROLES = Object.freeze({
  miner: {
    id: "miner",
    name: "Delver",
    description: "Mines stone and occasionally returns with metal ore.",
    cycleMs: 11500,
    outputs: [
      { item: "cobblestone", min: 2, max: 5, chance: 1 },
      { item: "raw_iron", min: 1, max: 2, chance: 0.34 },
      { item: "raw_copper", min: 1, max: 2, chance: 0.42 },
    ],
  },
  farmer: {
    id: "farmer",
    name: "Homestead Farmer",
    description: "Tends nearby soil and stores wheat, seeds, and vegetables.",
    cycleMs: 10500,
    outputs: [
      { item: "wheat", min: 2, max: 5, chance: 1 },
      { item: "wheat_seeds", min: 1, max: 3, chance: 0.75 },
      { item: "apple", min: 1, max: 1, chance: 0.18 },
    ],
  },
  guard: {
    id: "guard",
    name: "House Guard",
    description: "Patrols the home and attacks hostile creatures near residents.",
    cycleMs: 13500,
    outputs: [
      { item: "arrow_bundle", min: 1, max: 2, chance: 0.48 },
      { item: "iron_nugget", min: 1, max: 2, chance: 0.24 },
    ],
  },
  builder: {
    id: "builder",
    name: "Builder",
    description: "Produces construction supplies and keeps the settlement stocked.",
    cycleMs: 12000,
    outputs: [
      { item: "planks", min: 2, max: 5, chance: 1 },
      { item: "glass", min: 1, max: 2, chance: 0.32 },
      { item: "torch", min: 1, max: 3, chance: 0.5 },
    ],
  },
  fisher: {
    id: "fisher",
    name: "Angler",
    description: "Fishes nearby water and stores food for the household.",
    cycleMs: 10800,
    outputs: [
      { item: "raw_fish", min: 2, max: 4, chance: 1 },
      { item: "serpent_scale", min: 1, max: 1, chance: 0.035 },
    ],
  },
  rancher: {
    id: "rancher",
    name: "Rancher",
    description: "Looks after passive animals and gathers wool, leather, and eggs.",
    cycleMs: 11800,
    outputs: [
      { item: "wool", min: 1, max: 3, chance: 0.78 },
      { item: "leather", min: 1, max: 2, chance: 0.52 },
      { item: "egg", min: 1, max: 2, chance: 0.44 },
    ],
  },
});

export const HOUSING_RESIDENT_NAMES = Object.freeze([
  "Alden", "Briar", "Cora", "Dain", "Elowen", "Finn", "Galen", "Hazel",
  "Iris", "Jory", "Kael", "Lena", "Mira", "Nolan", "Orin", "Pella",
  "Quill", "Rhea", "Soren", "Talia", "Ulric", "Vera", "Wren", "Yara",
]);

export const DEFAULT_HOUSING_STATE = Object.freeze({
  beds: {},
  storage: {},
  workCycles: 0,
  residentsRecruited: 0,
});

export function cloneHousingState(source = DEFAULT_HOUSING_STATE) {
  return {
    beds: Object.fromEntries(Object.entries(source?.beds || {}).map(([key, bed]) => [key, {
      ...bed,
      position: Array.isArray(bed?.position) ? [...bed.position] : [0, 0, 0],
      room: bed?.room ? { ...bed.room, bounds: bed.room.bounds ? { ...bed.room.bounds } : null } : null,
    }])),
    storage: { ...(source?.storage || {}) },
    workCycles: Math.max(0, Number(source?.workCycles) || 0),
    residentsRecruited: Math.max(0, Number(source?.residentsRecruited) || 0),
  };
}
