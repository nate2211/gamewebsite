export const ARCANE_RESEARCH = [
  {
    id: "spark_bolt",
    name: "Spark Bolt",
    branch: "Evocation",
    tier: 1,
    cost: 0,
    manaCost: 7,
    icon: "✦",
    color: "#7ddcff",
    requires: [],
    description: "Launch a focused arcane spark at a creature for reliable ranged damage.",
  },
  {
    id: "mending_light",
    name: "Mending Light",
    branch: "Vitality",
    tier: 1,
    cost: 2,
    manaCost: 12,
    icon: "✚",
    color: "#7ee6a8",
    requires: ["spark_bolt"],
    description: "Convert mana into a short restorative pulse that heals the caster.",
  },
  {
    id: "warding_stone",
    name: "Warding Stone",
    branch: "Artifice",
    tier: 1,
    cost: 2,
    manaCost: 10,
    icon: "⬡",
    color: "#b49cff",
    requires: ["spark_bolt"],
    description: "Shape a temporary solid ward at the targeted build position.",
  },
  {
    id: "arcane_lantern",
    name: "Arcane Lantern",
    branch: "Artifice",
    tier: 2,
    cost: 3,
    manaCost: 8,
    icon: "◈",
    color: "#ffd57d",
    requires: ["warding_stone"],
    description: "Conjure a luminous arcane lantern block for safe exploration and homes.",
  },
  {
    id: "golemancy",
    name: "Golemancy",
    branch: "Constructs",
    tier: 2,
    cost: 4,
    manaCost: 24,
    icon: "▣",
    color: "#d3b48b",
    requires: ["warding_stone"],
    description: "Animate a loyal clay-and-copper frontier golem that protects nearby allies.",
  },
  {
    id: "chain_spark",
    name: "Chain Spark",
    branch: "Evocation",
    tier: 2,
    cost: 4,
    manaCost: 15,
    icon: "ϟ",
    color: "#66b7ff",
    requires: ["spark_bolt"],
    description: "Strengthen Spark Bolt and let the discharge jump to a second nearby hostile.",
  },
  {
    id: "verdant_touch",
    name: "Verdant Touch",
    branch: "Vitality",
    tier: 2,
    cost: 3,
    manaCost: 11,
    icon: "❈",
    color: "#74d66c",
    requires: ["mending_light"],
    description: "Accelerate nearby crop growth and scatter restorative green motes.",
  },
  {
    id: "runic_sentinel",
    name: "Runic Sentinel",
    branch: "Constructs",
    tier: 3,
    cost: 6,
    manaCost: 34,
    icon: "♜",
    color: "#9cecff",
    requires: ["golemancy", "chain_spark"],
    description: "Unlock tougher sentinels with improved health, damage, and detection range.",
  },
];

export const ARCANE_RESEARCH_BY_ID = Object.fromEntries(ARCANE_RESEARCH.map((entry) => [entry.id, entry]));

export const DEFAULT_ARCANA = Object.freeze({
  knowledge: 0,
  researchPoints: 2,
  mana: 40,
  maxMana: 40,
  unlocked: ["spark_bolt"],
  selectedSpell: "spark_bolt",
  casts: 0,
  constructsBuilt: 0,
  lastCastAt: 0,
});

export function cloneArcana(source = DEFAULT_ARCANA) {
  const unlocked = Array.isArray(source?.unlocked) ? source.unlocked.filter((id) => ARCANE_RESEARCH_BY_ID[id]) : [];
  if (!unlocked.includes("spark_bolt")) unlocked.unshift("spark_bolt");
  const maxMana = Math.max(20, Number(source?.maxMana) || DEFAULT_ARCANA.maxMana);
  return {
    knowledge: Math.max(0, Number(source?.knowledge) || 0),
    researchPoints: Math.max(0, Number(source?.researchPoints) || 0),
    mana: Math.max(0, Math.min(maxMana, Number.isFinite(source?.mana) ? Number(source.mana) : maxMana)),
    maxMana,
    unlocked,
    selectedSpell: unlocked.includes(source?.selectedSpell) ? source.selectedSpell : unlocked[0],
    casts: Math.max(0, Number(source?.casts) || 0),
    constructsBuilt: Math.max(0, Number(source?.constructsBuilt) || 0),
    lastCastAt: Math.max(0, Number(source?.lastCastAt) || 0),
  };
}

export function canUnlockResearch(arcana, researchId) {
  const node = ARCANE_RESEARCH_BY_ID[researchId];
  if (!node || arcana.unlocked.includes(researchId)) return false;
  if ((arcana.researchPoints || 0) < node.cost) return false;
  return node.requires.every((id) => arcana.unlocked.includes(id));
}

export function getWandManaMultiplier(wandTier = 1) {
  if (wandTier >= 3) return 0.72;
  if (wandTier >= 2) return 0.86;
  return 1;
}
