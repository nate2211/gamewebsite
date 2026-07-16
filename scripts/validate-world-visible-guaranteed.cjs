const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const worldRendererPath = path.join(root, 'src/game/world/rendering/WorldRenderer.js');
const gameCanvasPath = path.join(root, 'src/components/game/canvas/GameCanvas.js');
const playerPath = path.join(root, 'src/game/player/PlayerController.js');
const lockPath = path.join(root, 'package-lock.json');
const failures = [];

function expectText(file, values) {
  const text = fs.readFileSync(file, 'utf8');
  for (const value of values) {
    if (!text.includes(value)) failures.push(`${path.relative(root, file)} is missing ${JSON.stringify(value)}`);
  }
  return text;
}

const renderer = expectText(worldRendererPath, [
  'SURFACE_SHELL_GEOMETRY',
  'function TerrainSurfaceShell',
  'fullVoxelShell: true',
  'hasTerrainBelowCamera',
  'groundRayConfirmed: true',
  'stableFrames < 10',
]);
if (renderer.includes('GROUND_CAP_GEOMETRY') || renderer.includes('function GroundSurfaceSafetyLayer')) {
  failures.push('The obsolete thin ground-cap fallback is still present.');
}

expectText(gameCanvasPath, [
  'function PausedWorldFrameKeeper',
  'window.setInterval(refresh, 160)',
  '<PausedWorldFrameKeeper active={!simulationEnabled && terrainReady} />',
]);
expectText(playerPath, [
  'const INITIAL_CAMERA_PITCH = -0.72',
  'hasEnteredGameplayRef',
  'keep the camera anchored at the',
]);

const lock = fs.readFileSync(lockPath, 'utf8');
if (lock.includes('internal.api.openai.org') || lock.includes('applied-caas-gateway')) {
  failures.push('package-lock.json still contains an inaccessible internal registry URL.');
}

const sourceRoot = path.join(root, 'src');
const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(js|jsx)$/.test(entry.name)) files.push(full);
  }
})(sourceRoot);

for (const file of files) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (error) {
    failures.push(`Syntax check failed: ${path.relative(root, file)}\n${String(error.stderr || error.message)}`);
  }

  const text = fs.readFileSync(file, 'utf8');
  const importPattern = /(?:from\s+|import\s*)["'](\.{1,2}\/[^"']+)["']/g;
  let match;
  while ((match = importPattern.exec(text))) {
    const base = path.resolve(path.dirname(file), match[1]);
    const candidates = [base, `${base}.js`, `${base}.jsx`, path.join(base, 'index.js'), path.join(base, 'index.jsx')];
    if (!candidates.some((candidate) => fs.existsSync(candidate))) {
      failures.push(`Unresolved local import ${match[1]} in ${path.relative(root, file)}`);
    }
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`World visibility validation passed across ${files.length} source modules.`);
