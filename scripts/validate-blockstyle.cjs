const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];
const assetDirs = ["src/assets/ui-voxel", "public/assets/ui-voxel"];
for (const dir of assetDirs) {
  const full = path.join(root, dir);
  const files = fs.existsSync(full) ? fs.readdirSync(full).filter((file) => file.endsWith(".jpg")) : [];
  if (files.length !== 40) failures.push(`${dir} should contain exactly 40 replacement voxel textures`);
  const bytes = files.reduce((sum, file) => sum + fs.statSync(path.join(full, file)).size, 0);
  if (bytes < 4400000) failures.push(`${dir} is unexpectedly small: ${bytes}`);
}
const css = read("src/index.css");
for (const needle of ["Blockstyle 4.0", "ui-voxel/inventory-stone-grid.jpg", "--voxel-xp", "text-transform: uppercase"]) {
  if (!css.includes(needle)) failures.push(`index.css missing ${needle}`);
}
const hand = read("src/game/player/FirstPersonViewModel.js");
for (const needle of ["function PixelBlockArm", "SKIN_BASE", "VIEWMODEL_LAYER = 31", "gl.clearDepth()"])
  if (!hand.includes(needle)) failures.push(`FirstPersonViewModel missing ${needle}`);
const sky = read("src/game/world/rendering/VoxelSky.js");
for (const needle of ["STAR_LAYOUT", "SunPixels", "MoonPixels", "CLOUD_BLOCKS"])
  if (!sky.includes(needle)) failures.push(`VoxelSky missing ${needle}`);
if (!fs.existsSync(path.join(root, "build/index.html"))) failures.push("Production build is missing");
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log("Blockstyle validation passed: replacement voxel assets, pixel UI, block sky, protected arm/tool, and production build are present.");
