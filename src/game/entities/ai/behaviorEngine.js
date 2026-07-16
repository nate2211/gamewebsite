import { MOB_TYPES } from "../../config/mobTypes";

const GROUPS = {
  sheep: "herd",
  cow: "herd",
  pig: "herd",
  horse: "herd",
  chicken: "flock",
  wolf: "pack",
  fish: "school",
  big_fish: "school",
  dolphin: "pod",
  bird: "flock",
  turtle: "colony",
};

const WOLF_PREY = new Set(["sheep", "chicken", "pig"]);

export function groupKind(type) {
  return GROUPS[type] || null;
}

export function isNaturalPredator(mob) {
  return mob?.type === "wolf" && !mob.tamed;
}

export function isThreatTo(mob, candidate) {
  if (!mob || !candidate || mob.id === candidate.id) return false;
  const candidateDefinition = MOB_TYPES[candidate.type];
  if (candidateDefinition?.hostile) return true;
  if (mob.type !== "wolf" && isNaturalPredator(candidate)) {
    return WOLF_PREY.has(mob.type) || mob.type === "horse";
  }
  return false;
}

export function isWolfPrey(candidate) {
  return Boolean(candidate && WOLF_PREY.has(candidate.type));
}

export function nearestRuntimeMob(mobs, runtimeMap, origin, predicate, maxDistance = 12) {
  let best = null;
  let bestDistanceSq = maxDistance * maxDistance;
  for (const mob of mobs) {
    if (!predicate(mob)) continue;
    const runtime = runtimeMap.current[mob.id];
    if (!runtime) continue;
    const distanceSq = (runtime.x - origin.x) ** 2 + (runtime.z - origin.z) ** 2;
    if (distanceSq >= bestDistanceSq) continue;
    bestDistanceSq = distanceSq;
    best = { mob, runtime, distance: Math.sqrt(distanceSq) };
  }
  return best;
}

export function computeGroupSteering(mob, mobs, runtimeMap, radius = 8) {
  const runtime = runtimeMap.current[mob.id];
  const kind = groupKind(mob.type);
  if (!runtime || !kind) return null;

  let count = 0;
  let centerX = 0;
  let centerZ = 0;
  let separateX = 0;
  let separateZ = 0;
  let headingX = 0;
  let headingZ = 0;
  const radiusSq = radius * radius;

  for (const candidate of mobs) {
    if (candidate.id === mob.id || groupKind(candidate.type) !== kind) continue;
    if (kind === "pack" && candidate.tamed !== mob.tamed) continue;
    const other = runtimeMap.current[candidate.id];
    if (!other) continue;
    const dx = other.x - runtime.x;
    const dz = other.z - runtime.z;
    const distanceSq = dx * dx + dz * dz;
    if (distanceSq > radiusSq) continue;
    count += 1;
    centerX += other.x;
    centerZ += other.z;
    headingX += Math.sin(other.direction || 0);
    headingZ += Math.cos(other.direction || 0);
    if (distanceSq < 3.2) {
      const inverse = 1 / Math.max(0.15, distanceSq);
      separateX -= dx * inverse;
      separateZ -= dz * inverse;
    }
  }

  if (!count) return null;
  centerX /= count;
  centerZ /= count;
  const cohesionX = centerX - runtime.x;
  const cohesionZ = centerZ - runtime.z;
  const length = Math.hypot(cohesionX, cohesionZ) || 1;
  const separationLength = Math.hypot(separateX, separateZ) || 1;
  return {
    count,
    cohesionX: cohesionX / length,
    cohesionZ: cohesionZ / length,
    separationX: separateX / separationLength,
    separationZ: separateZ / separationLength,
    alignmentX: headingX / count,
    alignmentZ: headingZ / count,
  };
}

export function chooseRoamingState(runtime, definition, random = Math.random) {
  const roll = random();
  if (roll < 0.22 && !definition.hostile) {
    runtime.behaviorState = "idle";
    runtime.behaviorTimer = 0.8 + random() * 2.8;
    runtime.moving = false;
    return;
  }
  if (roll < 0.4 && groupKind(runtime.type)) {
    runtime.behaviorState = "group";
    runtime.behaviorTimer = 1.4 + random() * 3.2;
    return;
  }
  runtime.behaviorState = roll > 0.92 ? "run" : "roam";
  runtime.behaviorTimer = 1.2 + random() * 4.2;
  runtime.direction += (random() - 0.5) * Math.PI * 1.7;
}

export function applyGroupDirection(runtime, steering, weight = 1) {
  if (!steering) return;
  const desiredX = steering.cohesionX * 0.45 + steering.separationX * 0.85 + steering.alignmentX * 0.18;
  const desiredZ = steering.cohesionZ * 0.45 + steering.separationZ * 0.85 + steering.alignmentZ * 0.18;
  if (Math.abs(desiredX) + Math.abs(desiredZ) < 0.001) return;
  const desired = Math.atan2(desiredX, desiredZ);
  let difference = desired - runtime.direction;
  while (difference > Math.PI) difference -= Math.PI * 2;
  while (difference < -Math.PI) difference += Math.PI * 2;
  runtime.direction += difference * Math.min(0.32, 0.12 * weight);
}
