const CARDINAL_DIRECTIONS = Object.freeze([
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]);

function keyFor(x, z) {
  return `${x},${z}`;
}

/**
 * Floods every connected terrain column whose ground sits below sea level.
 * Ocean columns seed the flood; higher terrain remains a barrier.
 */
export function buildConnectedCoastalFloodMask({
  minX,
  maxX,
  minZ,
  maxZ,
  margin,
  seaLevel,
  profileAt,
}) {
  const floodMinX = minX - margin;
  const floodMaxX = maxX + margin;
  const floodMinZ = minZ - margin;
  const floodMaxZ = maxZ + margin;
  const profiles = new Map();
  const flooded = new Set();
  const queue = [];

  for (let x = floodMinX; x <= floodMaxX; x += 1) {
    for (let z = floodMinZ; z <= floodMaxZ; z += 1) {
      const profile = profileAt(x, z);
      const key = keyFor(x, z);
      profiles.set(key, profile);
      if (profile?.biome === "ocean" && profile.height < seaLevel) {
        flooded.add(key);
        queue.push([x, z]);
      }
    }
  }

  for (let index = 0; index < queue.length; index += 1) {
    const [x, z] = queue[index];
    for (const [dx, dz] of CARDINAL_DIRECTIONS) {
      const nx = x + dx;
      const nz = z + dz;
      if (nx < floodMinX || nx > floodMaxX || nz < floodMinZ || nz > floodMaxZ) continue;
      const key = keyFor(nx, nz);
      if (flooded.has(key)) continue;
      const profile = profiles.get(key);
      if (!profile || profile.height >= seaLevel) continue;
      flooded.add(key);
      queue.push([nx, nz]);
    }
  }

  return { flooded, profiles };
}
