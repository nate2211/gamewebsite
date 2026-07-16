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
