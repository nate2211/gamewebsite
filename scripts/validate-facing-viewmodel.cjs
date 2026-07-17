const fs = require("fs");
const assert = require("assert");

const mobs = fs.readFileSync("src/game/entities/MobSystem.js", "utf8");
const hand = fs.readFileSync("src/game/player/FirstPersonViewModel.js", "utf8");
const hud = fs.readFileSync("src/components/game/hud/Hud.js", "utf8");
const world = fs.readFileSync("src/features/world/worldSlice.js", "utf8");

assert(mobs.includes("const MODEL_FORWARD_YAW = Math.PI"), "mob model forward-axis correction constant is missing");
assert(mobs.includes("current.direction + MODEL_FORWARD_YAW"), "mob visual root is not corrected to face travel direction");
assert(hand.includes("const baseX = portrait ? 0.27 : ultrawide ? 0.55 : 0.44"), "first-person arm was not repositioned for a believable third-person match");
assert(hand.includes("const baseY = portrait ? -0.39 : -0.34"), "first-person arm is not raised to the matched pose");
assert(hand.includes("const activeKind = animation.current.active ? animation.current.kind : \"idle\""), "weapon-specific first-person animation selection is missing");
assert(hand.includes("model.rotation.set(-0.31 - swing * (activeKind === \"attack_spear\""), "weapon-specific first-person arm pose is missing");
assert(hand.includes(`const SLEEVE_BASE = "#3f7d56";`), "first-person arm no longer matches third-person sleeve styling");
assert(hud.includes("playerDamageFlashUntil"), "player damage HUD feedback is missing");
assert(world.includes("playerDamageAmount"), "player damage event state is missing");
assert(mobs.includes("function findNearbyOceanTarget(seed, x, z)"), "aquatic land-recovery helper is missing");
assert(mobs.includes(`if (definition.aquatic && !definition.amphibious && profile.biome !== "ocean")`), "aquatic spawn guard is missing");
assert(mobs.includes(`const quadruped = QUADRUPEDS.has(mob.type) || mob.type === "turtle" || mob.type === "chicken";`), "expanded all-mob animation state is missing");
assert(mobs.includes("headRef.current.rotation.y = Math.sin(clock.elapsedTime * 4.8 + current.phase) * 0.2;"), "fish head/swim animation is missing");
assert(mobs.includes("group.position.y += current.moving ? Math.sin(clock.elapsedTime * 10 + current.phase) * 0.08 : Math.sin(clock.elapsedTime * 2.2 + current.phase) * 0.03;"), "bird flight bob animation is missing");

console.log("Believable third-person-matched arm pose, aquatic spawn safety, player damage feedback, and expanded all-mob animations validated.");
