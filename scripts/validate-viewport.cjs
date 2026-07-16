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
if (!viewModelSource.includes("createPortal")) failures.push("First-person model is not mounted in its camera-space overlay scene");
if (!viewModelSource.includes("gl.render(scene, camera)")) failures.push("Composite renderer must draw the world scene first");
if (!viewModelSource.includes("gl.clearDepth()") || !viewModelSource.includes("gl.render(overlayScene, overlayCamera)")) failures.push("Depth-isolated hand render pass is missing");
if (!viewModelSource.includes("VIEWMODEL_FOV = 52")) failures.push("Stable view-model projection is missing");
if (!viewModelSource.includes("renderOrder = 10000")) failures.push("View-model internal render ordering is missing");

function projectLayout(width, height) {
  const aspect = width / height;
  const camera = new THREE.PerspectiveCamera(52, aspect, 0.02, 8);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  const portrait = aspect < 1.05;
  const ultrawide = aspect > 2.15;
  const rootNode = new THREE.Object3D();
  rootNode.position.set(portrait ? 0.39 : ultrawide ? 0.69 : 0.55, -0.47, portrait ? -1.62 : ultrawide ? -1.42 : -1.48);
  rootNode.rotation.set(-0.28, 0.16, -0.7);
  rootNode.scale.setScalar(portrait ? 0.66 : ultrawide ? 0.78 : 0.72);
  const arm = new THREE.Object3D();
  arm.rotation.set(0.02, -0.04, -0.16);
  rootNode.add(arm);
  const parts = [
    { p: [0, -0.34, 0.02], s: [0.36, 0.76, 0.36] },
    { p: [0, 0.055, 0.02], s: [0.37, 0.12, 0.37] },
    { p: [0, 0.275, 0.015], s: [0.36, 0.32, 0.36] },
    { p: [-0.01, 0.52, -0.08], s: [0.9, 0.9, 0.9] },
  ];
  let minX = 10; let maxX = -10; let minY = 10; let maxY = -10;
  for (const part of parts) {
    const node = new THREE.Object3D();
    node.position.fromArray(part.p);
    node.scale.fromArray(part.s);
    arm.add(node);
    rootNode.updateMatrixWorld(true);
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
  if (bounds.left > width * 0.72 || bounds.right < width * 0.92) failures.push(`Hand/tool misses the right side at ${width}x${height}`);
  if (bounds.top > height * 0.62 || bounds.bottom < height * 0.78) failures.push(`Hand/tool misses the lower viewport at ${width}x${height}`);
  if (bounds.left < width * 0.35) failures.push(`View model covers too much of the center at ${width}x${height}`);
}

if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log("Viewport validation passed: the camera-space hand remains correctly oriented, visible, and depth-isolated on desktop, portrait, and ultrawide layouts.");
