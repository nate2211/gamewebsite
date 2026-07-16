const MEMORY_TTL_MS = 12000;

export function ensureSensoryMemory(runtime) {
  if (!runtime.memory) {
    runtime.memory = {
      lastThreat: null,
      lastTarget: null,
      lastInterestingPoint: null,
      alertness: 0,
      fear: 0,
      confidence: 0.5,
      socialNeed: Math.random(),
      hungerDrive: Math.random(),
      restDrive: Math.random() * 0.4,
    };
  }
  return runtime.memory;
}

export function updateSensoryMemory(runtime, context, delta) {
  const memory = ensureSensoryMemory(runtime);
  const now = Date.now();
  const playerDistance = Math.sqrt(Math.max(0, context.distanceSqToPlayer || 0));
  const hostile = Boolean(context.definition?.hostile);
  const passive = Boolean(context.definition?.passive);

  memory.alertness = Math.max(0, memory.alertness - delta * (hostile ? 0.08 : 0.14));
  memory.fear = Math.max(0, memory.fear - delta * 0.11);
  memory.hungerDrive = Math.min(1, memory.hungerDrive + delta * 0.006);
  memory.restDrive = Math.min(1, memory.restDrive + delta * 0.004);
  memory.socialNeed = Math.min(1, memory.socialNeed + delta * 0.003);

  if (playerDistance < (hostile ? 16 : 7)) {
    memory.lastTarget = { x: context.player.x, y: context.player.y, z: context.player.z, seenAt: now, kind: "player" };
    memory.alertness = Math.min(1, memory.alertness + delta * (hostile ? 2.4 : 0.7));
    if (passive && playerDistance < 4.2) memory.fear = Math.min(1, memory.fear + delta * 1.2);
  }

  if (memory.lastTarget && now - memory.lastTarget.seenAt > MEMORY_TTL_MS) memory.lastTarget = null;
  if (memory.lastThreat && now - memory.lastThreat.seenAt > MEMORY_TTL_MS) memory.lastThreat = null;
  return memory;
}

export function rememberThreat(runtime, threat) {
  const memory = ensureSensoryMemory(runtime);
  memory.lastThreat = {
    x: threat?.runtime?.x || 0,
    y: threat?.runtime?.y || 0,
    z: threat?.runtime?.z || 0,
    id: threat?.mob?.id || null,
    seenAt: Date.now(),
  };
  memory.fear = 1;
  memory.alertness = 1;
}

export function rememberTarget(runtime, target, kind = "target") {
  const memory = ensureSensoryMemory(runtime);
  memory.lastTarget = {
    x: target?.runtime?.x || 0,
    y: target?.runtime?.y || 0,
    z: target?.runtime?.z || 0,
    id: target?.mob?.id || null,
    kind,
    seenAt: Date.now(),
  };
  memory.alertness = Math.min(1, memory.alertness + 0.45);
}
