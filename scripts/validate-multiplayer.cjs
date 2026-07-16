const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");

const root = path.resolve(__dirname, "..");
const failures = [];
const required = [
  "src/game/multiplayer/MultiplayerSession.js",
  "src/game/multiplayer/inviteCodec.js",
  "src/game/multiplayer/protocol.js",
  "src/game/multiplayer/rtcUtils.js",
  "src/components/multiplayer/MultiplayerDialog.js",
  "src/components/multiplayer/RemotePlayersLayer.js",
  "src/pages/JoinWorldPage.js",
  "src/pages/MultiplayerAnswerPage.js",
  "src/game/characters/StylizedPlayerModel.js",
  "assets-source/enterprise-character-pack/manifest.json",
  "build/index.html",
];
for (const relative of required) {
  if (!fs.existsSync(path.join(root, relative))) failures.push(`Missing ${relative}`);
}

for (const relative of required.filter((name) => name.endsWith(".js"))) {
  const code = fs.readFileSync(path.join(root, relative), "utf8");
  try {
    parser.parse(code, { sourceType: "module", plugins: ["jsx", "optionalChaining", "classProperties"] });
  } catch (error) {
    failures.push(`${relative} does not parse: ${error.message}`);
  }
}

function requireText(relative, text, label) {
  const code = fs.readFileSync(path.join(root, relative), "utf8");
  if (!code.includes(text)) failures.push(`${label}: ${text}`);
}

requireText("src/game/multiplayer/MultiplayerSession.js", "createDataChannel", "Host data channels missing");
requireText("src/game/multiplayer/MultiplayerSession.js", "WORLD_BOOTSTRAP", "World bootstrap missing");
requireText("src/game/multiplayer/MultiplayerSession.js", "BroadcastChannel", "Return-link bridge missing");
requireText("src/data/db.js", "multiplayerPlayers", "Multiplayer save persistence missing");
requireText("src/features/world/worldSlice.js", "applyMultiplayerWorldState", "Shared world reducer missing");
requireText("src/game/core/worldRuntime.js", "applyBlockEdits", "Runtime edit reconciliation missing");
requireText("src/components/game/canvas/GameCanvas.js", "RemotePlayersLayer", "Remote avatar rendering missing");
requireText("src/game/player/FirstPersonViewModel.js", "multiplayerSession.setLocalAnimation", "Action animation replication missing");
requireText("src/game/entities/MobSystem.js", "updateSensoryMemory", "Sensory-memory AI missing");
requireText("src/game/entities/MobSystem.js", "chooseContextualActivity", "Contextual activity planning missing");
requireText("src/game/entities/MobSystem.js", "steerAroundTerrain", "Terrain-aware steering missing");

const manifest = JSON.parse(fs.readFileSync(path.join(root, "assets-source/enterprise-character-pack/manifest.json"), "utf8"));
const modelCount = Object.keys(manifest.models || {}).length;
const mapCount = Object.keys(manifest.maps || {}).length * 3;
if (modelCount < 7) failures.push(`Expected at least 7 original glTF models, found ${modelCount}`);
if (mapCount < 21) failures.push(`Expected at least 21 2K source maps, found ${mapCount}`);
for (const model of Object.values(manifest.models || {})) {
  const gltf = JSON.parse(fs.readFileSync(path.join(root, "assets-source/enterprise-character-pack", model), "utf8"));
  const clips = (gltf.animations || []).map((clip) => clip.name);
  for (const needed of ["idle", "walk", "run", "attack", "mine", "build", "hurt", "death"]) {
    if (!clips.includes(needed)) failures.push(`${model} is missing ${needed} animation`);
  }
}

if (failures.length) {
  console.error(`Multiplayer validation failed (${failures.length}):`);
  failures.forEach((failure) => console.error(` - ${failure}`));
  process.exit(1);
}
console.log(`Multiplayer validation passed: frontend-only signaling, persistent player states, remote avatars, smarter AI, ${modelCount} animated glTF models, and ${mapCount} 2K maps.`);
