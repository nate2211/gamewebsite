const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const required = [
  ["src/game/world/rendering/VoxelSky.js", ["CLOUD_LAYOUT", "planeGeometry args={[10, 10]}", "planeGeometry args={[8, 8]}"]],
  ["src/game/player/FirstPersonViewModel.js", ["createPortal", "gl.clearDepth()", "function PixelBlockArm", "renderOrder = 10000", "HeldItem itemId={usableItem}"]],
  ["src/game/world/rendering/voxelTextures.js", ["texture.generateMipmaps = false", "const faceShade = [0.84, 0.73, 1, 0.57, 0.91, 0.78]"]],
  ["src/index.css", ["--voxel-font", "Voxel pixel interface pass", "image-rendering: pixelated"]],
  ["src/theme.js", ["Cascadia Mono", "borderRadius: 0"]],
];
for (const [file, needles] of required) {
  const content = read(file);
  for (const needle of needles) {
    if (!content.includes(needle)) throw new Error(`${file} is missing ${needle}`);
  }
}
if (!fs.existsSync(path.join(root, "build", "index.html"))) throw new Error("Production build missing");
console.log("Pixel-world validation passed: voxel sky, crisp face shading, block UI typography, and protected first-person arm/tool rendering are present.");
