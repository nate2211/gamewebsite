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
  requireText("src/game/config/adventure.js", [
    "LANDMARK_CELL_SIZE = 128",
    "LANDMARK_MIN_DISTANCE = 96",
    "LANDMARK_GENERATION_RULES",
    "STRUCTURE_SPAWN_PROFILES",
    "patrolRadius",
  ]);
  requireText("src/game/world/generation/worldGenerator.js", [
    "buildRareLandmarkRegistry",
    "findRareLandmarkAnchor",
    "getGenerator(seedText).landmarks",
    "guardsTreasure",
    "interactionPrompt = \"Talk\"",
    "homeRadius = spawnProfile.patrolRadius",
    "treasure_chest",
  ]);
  requireText("src/game/entities/MobSystem.js", [
    "targetKind = \"home\"",
    "return-home",
    "!definition.villager",
    "distanceHome > runtime.homeRadius",
  ]);
  requireText("src/game/config/mobTypes.js", [
    "interactionPrompt: \"Talk\"",
    "villager_scholar",
    "villager_guard",
    "villager_farmer",
  ]);

  const source = read("src/game/config/adventure.js");
  const module = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  const seeds = ["frontier", "rare-test-a", "rare-test-b", "rare-test-c", "rare-test-d"];
  let total = 0;
  for (const seed of seeds) {
    const landmarks = module.getLandmarkCells(seed, 720);
    total += landmarks.length;
    if (landmarks.length > 16) throw new Error(`${seed} generated too many landmarks (${landmarks.length})`);
    if (landmarks.some((entry) => Math.hypot(entry.x, entry.z) < 86)) throw new Error(`${seed} generated a landmark too close to spawn`);
    for (let a = 0; a < landmarks.length; a += 1) {
      for (let b = a + 1; b < landmarks.length; b += 1) {
        const distance = Math.hypot(landmarks[a].x - landmarks[b].x, landmarks[a].z - landmarks[b].z);
        if (distance < module.LANDMARK_MIN_DISTANCE - 0.01) throw new Error(`${seed} has clustered landmarks (${distance})`);
      }
    }
  }
  const average = total / seeds.length;
  if (average > 10) throw new Error(`Average landmark count is not rare enough (${average})`);
  if (average < 1) throw new Error(`Landmark generation is effectively disabled (${average})`);
  console.log(`Rare structure validation passed (average ${average.toFixed(1)} landmarks within radius 720).`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
