const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const requireText = (file, values) => {
  const text = read(file);
  values.forEach((value) => {
    if (!text.includes(value)) throw new Error(`${file} is missing ${value}`);
  });
};

(async () => {
  requireText("src/game/player/movementUtils.js", ["findSupportedOneBlockAutoStep", "supportProbeDepth", "stepHeight"]);
  requireText("src/game/player/PlayerController.js", ["AUTO_STEP_MAX_HEIGHT", "AUTO_STEP_HOP_VELOCITY", "autoStepIntent", "voxel:auto-step"]);
  requireText("src/game/config/adventure.js", ["ADVENTURE_VERSION = 4", "bone_temple", "war_forge", "vampiric", "village_bone_temple", "village_war_forge"]);
  requireText("src/game/world/generation/worldGenerator.js", ["TERRAIN_GENERATOR_VERSION = 22", "addBoneTemple", "addWarForge", "bone_temple", "war_forge"]);
  requireText("src/game/config/blockTypes.js", ["iron_warhammer", "iron_scythe", "storm_warhammer", "dragon_scythe"]);
  requireText("src/game/player/FirstPersonViewModel.js", ["attack_warhammer", "attack_scythe", "const impact = Math.exp", "kind: \"step\""]);
  requireText("src/game/systems/InteractionController.js", ["weaponClass === \"warhammer\"", "weaponClass === \"scythe\""]);
  requireText("src/game/entities/MobSystem.js", ["selectedWeaponReach", "raycaster.far = HIT_RADIUS + selectedWeaponReach"]);
  requireText("src/features/world/worldSlice.js", ["const vampiric", "damage * vampiric * 0.035"]);
  requireText("src/data/db.js", ["version: 24"]);

  const movementSource = read("src/game/player/movementUtils.js");
  const movementModule = await import(`data:text/javascript;base64,${Buffer.from(movementSource).toString("base64")}`);
  const autoStep = movementModule.findSupportedOneBlockAutoStep;
  if (typeof autoStep !== "function") throw new Error("auto-step helper is not executable");

  const base = { x: 0, y: 0, z: 0 };
  const candidate = { x: 1, y: 0, z: 0 };
  const oneBlock = autoStep({
    position: base,
    candidate,
    collidesAt: (point) => point.x > 0.5 && point.y < 0.96,
  });
  if (!oneBlock || oneBlock.stepHeight < 0.9 || oneBlock.stepHeight > 1.08) {
    throw new Error("one-block ledge was not stepped onto safely");
  }

  const twoBlock = autoStep({
    position: base,
    candidate,
    collidesAt: (point) => point.x > 0.5 && point.y < 1.95,
  });
  if (twoBlock !== null) throw new Error("auto-step incorrectly climbed a two-block wall");

  const unsupported = autoStep({
    position: base,
    candidate,
    collidesAt: (point) => point.x > 0.5 && point.y >= 0 && point.y < 0.2,
  });
  if (unsupported !== null) throw new Error("auto-step crossed an unsupported ledge");

  console.log("Ascendant traversal and content expansion validation passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
