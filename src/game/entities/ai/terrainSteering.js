export function steerAroundTerrain(runtime, definition, seed, sampleSurfaceProfile, lookAhead = 1.8) {
  if (definition.flying) return;
  const direction = runtime.direction || 0;
  const sample = (angle, distance = lookAhead) => sampleSurfaceProfile(
    seed,
    runtime.x + Math.sin(direction + angle) * distance,
    runtime.z + Math.cos(direction + angle) * distance
  );
  const center = sample(0);
  const left = sample(-0.72);
  const right = sample(0.72);
  const current = sampleSurfaceProfile(seed, runtime.x, runtime.z);
  const maxStep = definition.aquatic ? 6 : definition.amphibious ? 2.2 : 1.35;
  const centerBad = (!definition.aquatic && !definition.amphibious && center.biome === "ocean")
    || (definition.aquatic && !definition.amphibious && center.biome !== "ocean")
    || Math.abs(center.height - current.height) > maxStep;
  if (!centerBad) return;

  const score = (profile) => {
    let value = Math.abs(profile.height - current.height);
    if (!definition.aquatic && !definition.amphibious && profile.biome === "ocean") value += 10;
    if (definition.aquatic && !definition.amphibious && profile.biome !== "ocean") value += 10;
    return value;
  };
  runtime.direction += score(left) <= score(right) ? -0.58 : 0.58;
  runtime.behaviorState = "avoid_obstacle";
}
