const PROFILE_KEY = "voxel-frontier:multiplayer-profile:v2";
const PALETTES = [
  { shirt: "#3f7d56", trim: "#a8d5a2", trousers: "#3a4656", hair: "#38291f", skin: "#c98a63" },
  { shirt: "#355f8a", trim: "#9ec6e5", trousers: "#2d3542", hair: "#201b18", skin: "#b97852" },
  { shirt: "#8a4d3f", trim: "#e0a288", trousers: "#493b37", hair: "#5a3925", skin: "#e0aa82" },
  { shirt: "#76528f", trim: "#c5a7d8", trousers: "#373342", hair: "#2b201c", skin: "#8d5b43" },
];

function createProfile() {
  const id = crypto.randomUUID();
  const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
  return {
    id,
    name: `Explorer ${id.slice(0, 4).toUpperCase()}`,
    palette,
    createdAt: Date.now(),
  };
}

export function getBrowserPlayerProfile() {
  try {
    const stored = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
    if (stored?.id && stored?.name) return stored;
  } catch (_) {
    // Replace corrupt local profile below.
  }
  const created = createProfile();
  localStorage.setItem(PROFILE_KEY, JSON.stringify(created));
  return created;
}

export function updateBrowserPlayerProfile(patch) {
  const current = getBrowserPlayerProfile();
  const next = {
    ...current,
    ...(patch || {}),
    id: current.id,
    palette: { ...current.palette, ...(patch?.palette || {}) },
  };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  return next;
}
