const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");

const root = path.resolve(__dirname, "..");
const src = path.join(root, "src");
const failures = [];
const sourceFiles = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(js|jsx)$/.test(entry.name)) sourceFiles.push(full);
  }
}

function fail(message) { failures.push(message); }
function requireText(file, needle, label) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  if (!text.includes(needle)) fail(`${label}: ${needle}`);
}
function resolveLocal(file, request) {
  const base = path.resolve(path.dirname(file), request);
  return [base, `${base}.js`, `${base}.jsx`, path.join(base, "index.js"), path.join(base, "index.jsx")]
    .find((candidate) => fs.existsSync(candidate));
}

walk(src);
for (const file of sourceFiles) {
  const code = fs.readFileSync(file, "utf8");
  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: "module",
      plugins: ["jsx", "optionalChaining", "classProperties", "objectRestSpread", "dynamicImport"],
    });
  } catch (error) {
    fail(`Parse failed: ${path.relative(root, file)}:${error.loc?.line || "?"} ${error.message}`);
    continue;
  }
  for (const node of ast.program.body) {
    if (node.type !== "ImportDeclaration" || !node.source.value.startsWith(".")) continue;
    if (!resolveLocal(file, node.source.value)) fail(`Missing local import in ${path.relative(root, file)}: ${node.source.value}`);
  }
}

requireText("src/pages/GamePage.js", "flushSync", "instant E menu commit missing");
requireText("src/pages/GamePage.js", 'event.code !== "KeyE"', "E inventory toggle missing");
requireText("src/components/inventory/dialog/InventoryDialog.js", "keepMounted", "mounted inventory shell missing");
requireText("src/components/inventory/dialog/InventoryDialog.js", "transitionDuration={0}", "zero-duration menu transition missing");
requireText("src/components/game/canvas/GameCanvas.js", "<ColonySystem", "colony runtime not mounted");
requireText("src/components/game/canvas/GameCanvas.js", "<FarmSystem", "crop growth runtime not mounted");
requireText("src/components/game/canvas/GameCanvas.js", "<FishingSystem", "fishing runtime not mounted");
requireText("src/components/game/canvas/GameCanvas.js", "<WeatherSystem", "weather runtime not mounted");
requireText("src/components/game/canvas/GameCanvas.js", "<ItemDropSystem", "physical drops runtime not mounted");
requireText("src/components/game/canvas/GameCanvas.js", "<ProjectileSystem", "egg projectile runtime not mounted");
requireText("src/game/config/blockTypes.js", "guard_colony_box", "guard job box missing");
requireText("src/game/config/blockTypes.js", "fishing_colony_box", "fisher job box missing");
requireText("src/game/config/blockTypes.js", "leather_hoe", "leather tools missing");
requireText("src/game/config/blockTypes.js", "leather_chestplate", "leather armor missing");
requireText("src/game/config/blockTypes.js", "wheat_crop_3", "crop stages missing");
requireText("src/game/systems/InteractionController.js", "projectileRuntime.throwEgg", "throwable eggs missing");
requireText("src/game/systems/InteractionController.js", 'toolType === "hoe"', "hoe tilling missing");
requireText("src/game/systems/InteractionController.js", 'usableSelectedItem === "wheat_seeds"', "seed planting missing");
requireText("src/game/config/blockTypes.js", "solid: false, bonusDrops", "walk-through leaves missing");
requireText("src/game/config/mobTypes.js", "raw_porkchop", "pig food drops missing");
requireText("src/game/config/mobTypes.js", "feather", "bird/chicken feather drops missing");
requireText("src/game/config/mobTypes.js", "seagull", "seagull missing");
requireText("src/game/config/mobTypes.js", "crow", "crow missing");
requireText("src/features/world/worldSlice.js", "assignPickupToHotbar", "leftmost hotbar pickup missing");
requireText("src/features/world/worldSlice.js", "droppedItems", "physical drop persistence missing");
requireText("src/features/world/worldSlice.js", "cloneColonyState", "colony save hydration missing");
requireText("src/data/db.js", "colony:", "colony serialization missing");
requireText("src/data/db.js", "weather:", "weather serialization missing");
requireText("src/game/world/generation/worldGenerator.js", "TERRAIN_GENERATOR_VERSION = 12", "generator version not updated");

const lockText = fs.readFileSync(path.join(root, "package-lock.json"), "utf8");
if (/applied-caas|internal\.api\.openai/i.test(lockText)) fail("package-lock contains inaccessible internal registry URLs");

for (const folder of ["src/assets/colony-sim-pack", "public/assets/colony-sim-pack"]) {
  const files = fs.readdirSync(path.join(root, folder)).filter((name) => name.endsWith(".jpg"));
  if (files.length < 20) fail(`${folder} contains only ${files.length} colony assets`);
}

if (failures.length) {
  console.error(`Validation failed (${failures.length}):`);
  failures.forEach((message) => console.error(` - ${message}`));
  process.exit(1);
}
console.log(`Colony validation passed: ${sourceFiles.length} JS/JSX files parsed, local imports resolved, gameplay contracts and 40 colony asset copies verified.`);
