import { BLOCK_TYPES } from "../../config/blockTypes";

// Save compatibility for pre-blockstyle terrain experiments. Unknown/debug
// materials are removed so deterministic generated terrain is restored instead
// of preserving magenta/purple placeholder blocks in player worlds.
const LEGACY_BLOCK_ALIASES = Object.freeze({
  tallgrass: "meadow_grass_2",
  tall_grass_block: "meadow_grass_2",
  grass_plant: "meadow_grass_2",
  meadow_grass: "meadow_grass_2",
  wild_flower: "yellow_flower_2",
  flower: "yellow_flower_2",
  yellow_flower: "yellow_flower_2",
  wheat_crop: "wheat_crop_3",
  snow_cap: "snow_layer",
  grass_cap: "grass",
  grass_top: "grass",
  purple_grass: "grass",
  purple_dirt: "dirt",
  purple_block: "dirt",
  magenta_block: "dirt",
  debug_block: "dirt",
  missing_texture: "dirt",
  placeholder: "dirt",
});

export function normalizeBlockType(type) {
  if (typeof type !== "string" || !type) return null;
  const normalized = LEGACY_BLOCK_ALIASES[type] || type;
  return BLOCK_TYPES[normalized] ? normalized : null;
}

export function sanitizeBlockEdits(blockEdits = {}) {
  const sanitized = {};
  Object.entries(blockEdits || {}).forEach(([key, edit]) => {
    if (edit == null) {
      sanitized[key] = null;
      return;
    }
    const type = normalizeBlockType(edit.type);
    // Unknown placed/debug blocks are intentionally omitted. Omitting the edit
    // restores the deterministic generated block at the same coordinate.
    if (!type) return;
    sanitized[key] = { ...edit, type };
  });
  return sanitized;
}

export function sanitizeCropRecords(crops = []) {
  return (Array.isArray(crops) ? crops : []).filter((crop) => {
    if (!crop || !Array.isArray(crop.position) || crop.position.length !== 3) return false;
    return ["wheat", "meadow_grass", "yellow_flower"].includes(crop.type);
  }).map((crop) => ({ ...crop, position: [...crop.position] }));
}
