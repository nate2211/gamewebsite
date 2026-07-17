export function findSupportedWaterLedgeStep({
  position,
  candidate,
  collidesAt,
  maxStep = 1.35,
  increment = 0.1,
  supportProbeDepth = 0.12,
}) {
  if (!position || !candidate || typeof collidesAt !== "function") return null;

  for (let step = 0.15; step <= maxStep + 0.0001; step += increment) {
    const raised = { ...candidate, y: position.y + step };
    if (collidesAt(raised)) continue;

    const supportProbe = { ...raised, y: raised.y - supportProbeDepth };
    if (!collidesAt(supportProbe)) continue;

    return raised;
  }

  return null;
}

export function findSupportedOneBlockAutoStep({
  position,
  candidate,
  collidesAt,
  maxStep = 1.08,
  increment = 0.05,
  minimumStep = 0.42,
  supportProbeDepth = 0.11,
}) {
  if (!position || !candidate || typeof collidesAt !== "function") return null;

  const firstStep = Math.max(increment, minimumStep);
  for (let step = firstStep; step <= maxStep + 0.0001; step += increment) {
    const raised = { ...candidate, y: position.y + step };
    // The raised player capsule must have full body and head clearance.
    if (collidesAt(raised)) continue;

    // A solid support probe directly below the raised feet prevents wall
    // climbing, corner climbing, and stepping into unloaded empty space.
    const supportProbe = { ...raised, y: raised.y - supportProbeDepth };
    if (!collidesAt(supportProbe)) continue;

    return { ...raised, stepHeight: step };
  }

  return null;
}
