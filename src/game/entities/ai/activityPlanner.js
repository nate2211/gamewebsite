import { groupKind } from "./behaviorEngine";

export function chooseContextualActivity(runtime, mob, definition, context, random = Math.random) {
  const memory = runtime.memory || {};
  const daylight = context.worldTime < 13000 || context.worldTime > 23000;
  const weather = context.weather?.type || "clear";
  const grouped = Boolean(groupKind(mob.type));

  if (definition.burnsInSun && daylight) return { state: "seek_cover", duration: 1.5 + random() * 2.5, speedMultiplier: 1.25 };
  if (weather === "storm" && !definition.hostile && !definition.aquatic) return { state: "seek_shelter", duration: 2 + random() * 4, speedMultiplier: 0.8 };
  if ((memory.fear || 0) > 0.55) return { state: "flee", duration: 1.2 + random() * 2, speedMultiplier: 1.7 };
  if ((memory.restDrive || 0) > 0.78 && !definition.hostile) {
    memory.restDrive = 0.2;
    return { state: "rest", duration: 2.5 + random() * 5, speedMultiplier: 0 };
  }
  if ((memory.hungerDrive || 0) > 0.72 && (definition.grazer || definition.herdAnimal)) {
    memory.hungerDrive = 0.18;
    return { state: "graze", duration: 2 + random() * 4, speedMultiplier: 0.08 };
  }
  if (grouped && (memory.socialNeed || 0) > 0.66) {
    memory.socialNeed = 0.15;
    return { state: "socialize", duration: 1.5 + random() * 3, speedMultiplier: 0.35 };
  }
  if (definition.hostile && !daylight) return { state: random() < 0.42 ? "patrol" : "stalk", duration: 2 + random() * 4, speedMultiplier: 0.68 };
  if (definition.flying) return { state: random() < 0.55 ? "circle" : "forage", duration: 2 + random() * 5, speedMultiplier: 0.8 };
  return null;
}

export function applyPlannedActivity(runtime, plan) {
  if (!plan) return false;
  runtime.behaviorState = plan.state;
  runtime.behaviorTimer = plan.duration;
  runtime.wanderTimer = plan.duration;
  runtime.activitySpeedMultiplier = plan.speedMultiplier;
  runtime.moving = plan.speedMultiplier > 0.1;
  return true;
}
