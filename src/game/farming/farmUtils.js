import { worldRuntime } from "../core/worldRuntime";
import { blockKey } from "../utils/worldUtils";

export function findFarmPlot(stationPosition, offsets, usedKeys = new Set()) {
  for (const [dx, dz] of offsets) {
    const x = stationPosition[0] + dx;
    const z = stationPosition[2] + dz;
    const topY = worldRuntime.findTopSolidY(x, z, stationPosition[1] + 5, stationPosition[1] - 5);
    if (topY == null) continue;
    const groundPosition = [x, topY, z];
    const cropPosition = [x, topY + 1, z];
    const cropKey = blockKey(...cropPosition);
    if (usedKeys.has(cropKey) || worldRuntime.hasBlockAt(...cropPosition)) continue;
    const groundType = worldRuntime.getBlockTypeAt(...groundPosition);
    if (!["grass", "dirt", "farmland", "frozen_grass"].includes(groundType)) continue;
    return { groundPosition, cropPosition, cropKey, groundType };
  }
  return null;
}
