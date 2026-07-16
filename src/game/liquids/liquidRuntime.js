import { blockKey } from "../utils/worldUtils";
import { worldRuntime } from "../core/worldRuntime";

const SIDE_DIRECTIONS = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];
const MAX_FLOW_LEVEL = 7;
const MAX_CELLS = 520;
const MAX_SOURCE_DISTANCE = 9;

function isSolidAt(x, y, z) {
  const type = worldRuntime.getBlockTypeAt(x, y, z);
  if (!type) return false;
  return type !== "water" && type !== "seagrass" && type !== "kelp" && type !== "torch";
}

function distanceFromOrigin(cell, x, y, z) {
  const origin = cell.origin || [x, y, z];
  return Math.max(Math.abs(origin[0] - x), Math.abs(origin[1] - y), Math.abs(origin[2] - z));
}

class LiquidRuntime {
  constructor() {
    this.cells = new Map();
    this.sources = new Map();
    this.listeners = new Set();
    this.version = 0;
    this.snapshot = Object.freeze({ version: 0, cells: Object.freeze([]) });
  }

  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.snapshot;
  getServerSnapshot = () => this.snapshot;

  reset(serializedSources = []) {
    this.cells.clear();
    this.sources.clear();
    (serializedSources || []).forEach((source) => {
      const position = Array.isArray(source) ? source : source.position;
      if (Array.isArray(position)) this.addSource(position, false);
    });
    this.publish();
  }

  addSource(position, publish = true) {
    const [x, y, z] = position.map((value) => Math.round(Number(value)));
    if (![x, y, z].every(Number.isFinite) || isSolidAt(x, y, z)) return false;
    const key = blockKey(x, y, z);
    const cell = { key, x, y, z, level: 0, source: true, falling: false, origin: [x, y, z] };
    this.sources.set(key, cell);
    this.cells.set(key, cell);
    if (publish) this.publish();
    return true;
  }

  removeSourceAt(x, y, z) {
    const key = blockKey(Math.round(x), Math.round(y), Math.round(z));
    const removed = this.sources.delete(key);
    if (removed) this.rebuildFromSources();
    return removed;
  }

  hasWaterAt(x, y, z) {
    const key = blockKey(Math.round(x), Math.round(y), Math.round(z));
    return this.cells.has(key) || worldRuntime.getBlockType(key) === "water";
  }

  getCellAt(x, y, z) {
    return this.cells.get(blockKey(Math.round(x), Math.round(y), Math.round(z))) || null;
  }

  serializeSources() {
    return Array.from(this.sources.values()).map((source) => ({ position: [source.x, source.y, source.z] }));
  }

  rebuildFromSources() {
    const sources = Array.from(this.sources.values()).map((source) => ({ ...source }));
    this.cells.clear();
    this.sources.clear();
    sources.forEach((source) => {
      this.sources.set(source.key, source);
      this.cells.set(source.key, source);
    });
    for (let index = 0; index < 16; index += 1) this.step(false);
    this.publish();
  }

  step(publish = true) {
    if (!this.cells.size) return false;
    const next = new Map(this.cells);
    const ordered = Array.from(this.cells.values()).sort((a, b) => a.y - b.y || a.level - b.level);
    let changed = false;

    for (const cell of ordered) {
      if (next.size >= MAX_CELLS) break;
      const below = [cell.x, cell.y - 1, cell.z];
      const belowKey = blockKey(...below);
      if (!isSolidAt(...below) && worldRuntime.getBlockTypeAt(...below) !== "water") {
        const existingBelow = next.get(belowKey);
        const nextLevel = Math.min(2, cell.level);
        if (!existingBelow || existingBelow.level > nextLevel || !existingBelow.falling) {
          next.set(belowKey, {
            key: belowKey,
            x: below[0], y: below[1], z: below[2],
            level: nextLevel,
            source: false,
            falling: true,
            origin: cell.origin || [cell.x, cell.y, cell.z],
          });
          changed = true;
        }
        continue;
      }

      const nextLevel = cell.source ? 1 : cell.level + 1;
      if (nextLevel > MAX_FLOW_LEVEL) continue;
      for (const [dx, dy, dz] of SIDE_DIRECTIONS) {
        if (next.size >= MAX_CELLS) break;
        const x = cell.x + dx;
        const y = cell.y + dy;
        const z = cell.z + dz;
        if (distanceFromOrigin(cell, x, y, z) > MAX_SOURCE_DISTANCE) continue;
        if (isSolidAt(x, y, z) || worldRuntime.getBlockTypeAt(x, y, z) === "water") continue;
        const key = blockKey(x, y, z);
        const existing = next.get(key);
        if (existing && existing.level <= nextLevel) continue;
        next.set(key, {
          key, x, y, z,
          level: nextLevel,
          source: false,
          falling: false,
          origin: cell.origin || [cell.x, cell.y, cell.z],
        });
        changed = true;
      }
    }

    if (changed) {
      this.cells = next;
      if (publish) this.publish();
    }
    return changed;
  }

  publish() {
    this.version += 1;
    const cells = Array.from(this.cells.values()).map((cell) => Object.freeze({ ...cell }));
    this.snapshot = Object.freeze({ version: this.version, cells: Object.freeze(cells) });
    this.listeners.forEach((listener) => listener());
  }
}

export const liquidRuntime = new LiquidRuntime();
