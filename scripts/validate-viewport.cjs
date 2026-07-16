const fs = require("fs");
const path = require("path");
const THREE = require("three");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const failures = [];
const entry = read("src/index.js");
const css = read("src/index.css");
const canvasSource = read("src/components/game/canvas/GameCanvas.js");
const viewModelSource = read("src/game/player/FirstPersonViewModel.js");

if (!entry.includes('import "./index.css";')) failures.push("src/index.js must import ./index.css");
if (!css.includes(".game-root") || !css.includes("position: fixed") || !css.includes("inset: 0")) failures.push("Fullscreen root sizing rules are missing");
if (!canvasSource.includes("<ViewportController />")) failures.push("GameCanvas must mount ViewportController");
if (!viewModelSource.includes("VIEWMODEL_LAYER = 31")) failures.push("First-person layer 31 is missing");
if (!viewModelSource.includes("camera.getWorldPosition") || !viewModelSource.includes("camera.getWorldQuaternion")) failures.push("View-model is not synchronized to the player-eye camera");
if (!viewModelSource.includes("camera.layers.set(0)") || !viewModelSource.includes("camera.layers.set(VIEWMODEL_LAYER)") || !viewModelSource.includes("gl.clearDepth()")) failures.push("Two-pass world/view-model rendering is missing");
if (viewModelSource.includes("createPortal") || viewModelSource.includes("viewScene")) failures.push("Legacy portal/secondary-scene hand path remains");

function projectLayout(width, height) {
  const aspect = width / height;
  const camera = new THREE.PerspectiveCamera(72, aspect, 0.05, 100);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  const portrait = aspect < 1.05;
  const ultrawide = aspect > 2.15;
  const root = new THREE.Object3D();
  root.position.set(portrait ? 0.34 : ultrawide ? 0.58 : 0.5, portrait ? -0.43 : -0.4, portrait ? -0.76 : -0.72);
  root.rotation.set(-0.13, -0.17, -0.38);
  root.scale.setScalar(portrait ? 0.46 : ultrawide ? 0.56 : 0.53);
  const arm = new THREE.Object3D();
  arm.rotation.set(0.03, -0.02, -0.08);
  root.add(arm);
  const parts = [
    { p: [0.07, -0.43, 0.16], s: [0.34, 0.58, 0.32], r: [0.04, 0.04, -0.16] },
    { p: [0.02, -0.16, 0.1], s: [0.35, 0.14, 0.33], r: [0.04, 0.04, -0.16] },
    { p: [-0.015, 0.095, 0.015], s: [0.31, 0.31, 0.3], r: [0.02, 0.03, -0.12] },
    { p: [-0.035, 0.31, -0.035], s: [0.36, 0.25, 0.4], r: [0.04, 0, -0.12] },
    { p: [-0.03, 0.55, -0.12], s: [0.82, 0.82, 0.82], r: [0, 0, 0] },
  ];
  let minX = 10; let maxX = -10; let minY = 10; let maxY = -10;
  for (const part of parts) {
    const node = new THREE.Object3D();
    node.position.fromArray(part.p); node.scale.fromArray(part.s); node.rotation.fromArray(part.r);
    arm.add(node); root.updateMatrixWorld(true);
    for (const x of [-0.5, 0.5]) for (const y of [-0.5, 0.5]) for (const z of [-0.5, 0.5]) {
      const projected = new THREE.Vector3(x, y, z).applyMatrix4(node.matrixWorld).project(camera);
      minX = Math.min(minX, projected.x); maxX = Math.max(maxX, projected.x);
      minY = Math.min(minY, projected.y); maxY = Math.max(maxY, projected.y);
    }
    arm.remove(node);
  }
  return {
    left: ((minX + 1) / 2) * width,
    right: ((maxX + 1) / 2) * width,
    top: ((1 - maxY) / 2) * height,
    bottom: ((1 - minY) / 2) * height,
  };
}

for (const [width, height] of [[1365, 768], [1920, 1080], [768, 1024], [3440, 1440]]) {
  const bounds = projectLayout(width, height);
  if (bounds.left > width * 0.9 || bounds.right < width * 0.58) failures.push(`Hand/tool misses the right-side viewport at ${width}x${height}`);
  if (bounds.top > height * 0.84 || bounds.bottom < height * 0.56) failures.push(`Hand/tool misses the lower viewport at ${width}x${height}`);
  if (bounds.left < width * 0.42) failures.push(`View model covers too much of the center at ${width}x${height}`);
}

if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log("Viewport validation passed: full-screen CSS and camera-mounted layer rendering keep the animated hand/tool visible in desktop, portrait, and ultrawide layouts.");
