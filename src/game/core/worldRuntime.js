import { BLOCK_TYPES } from "../config/blockTypes";
import { getChunkIdForPosition } from "../world/generation/worldGenerator";
import { DIRECTIONS, blockKey, parseBlockKey } from "../utils/worldUtils";
import { normalizeBlockType, sanitizeBlockEdits } from "../world/loading/terrainMigration";

function computeVisibleByType(blocks) {
  const byType = {};

  Object.entries(blocks).forEach(([key, current]) => {
    const definition = BLOCK_TYPES[current.type];
    if (!definition) return;
    const [x, y, z] = parseBlockKey(key);

    const exposed = current.type === "water"
      ? [[0, 1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]]
          .some(([dx, dy, dz]) => blocks[blockKey(x + dx, y + dy, z + dz)]?.type !== "water")
      : definition.solid === false || DIRECTIONS.some(([dx, dy, dz]) => {
          // Chunk-border blocks intentionally count as exposed. This trades a small
          // amount of hidden overdraw for much cheaper independent chunk rebuilds.
          const neighbor = blocks[blockKey(x + dx, y + dy, z + dz)];
          if (!neighbor) return true;
          if (neighbor.type === current.type && definition.transparent) return false;
          const neighborDefinition = BLOCK_TYPES[neighbor.type];
          return neighborDefinition?.transparent || neighborDefinition?.solid === false;
        });

    if (!exposed) return;
    if (!byType[current.type]) byType[current.type] = [];
    byType[current.type].push([x, y, z]);
  });

  return byType;
}

class VoxelWorldRuntime {
  constructor() {
    this.seed = "";
    this.blockEdits = {};
    this.editsByChunk = new Map();
    this.chunks = new Map();
    this.blockIndex = new Map();
    this.listeners = new Set();
    this.pinnedChunks = new Set();
    this.version = 0;
    this.snapshot = Object.freeze({ version: 0, chunks: Object.freeze([]), blockCount: 0 });
    this.emitQueued = false;
  }

  reset(seed = "", blockEdits = {}) {
    this.seed = String(seed || "");
    this.blockEdits = sanitizeBlockEdits(blockEdits);
    this.editsByChunk.clear();
    Object.entries(this.blockEdits).forEach(([key, edit]) => {
      const [x, , z] = parseBlockKey(key);
      const chunkId = getChunkIdForPosition(x, z);
      if (!this.editsByChunk.has(chunkId)) this.editsByChunk.set(chunkId, new Map());
      this.editsByChunk.get(chunkId).set(key, edit);
    });
    this.chunks.clear();
    this.blockIndex.clear();
    this.pinnedChunks.clear();
    this.bump();
  }

  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.snapshot;

  getServerSnapshot = () => this.snapshot;

  isChunkLoaded(id) {
    return this.chunks.has(id);
  }

  getLoadedChunkIds() {
    return Array.from(this.chunks.keys());
  }


  setPinnedChunks(ids) {
    const next = new Set((ids || []).filter(Boolean));
    if (next.size === this.pinnedChunks.size
      && Array.from(next).every((id) => this.pinnedChunks.has(id))) return false;
    this.pinnedChunks = next;
    this.bump();
    return true;
  }

  pinChunks(ids) {
    let changed = false;
    (ids || []).forEach((id) => {
      if (!id || this.pinnedChunks.has(id)) return;
      this.pinnedChunks.add(id);
      changed = true;
    });
    if (changed) this.bump();
  }

  unpinChunks(ids) {
    let changed = false;
    (ids || []).forEach((id) => {
      if (this.pinnedChunks.delete(id)) changed = true;
    });
    if (changed) this.bump();
  }

  getPinnedChunkIds() {
    return Array.from(this.pinnedChunks);
  }

  getBlock(key) {
    return this.blockIndex.get(key) || null;
  }

  getBlockType(key) {
    return this.blockIndex.get(key)?.type || null;
  }

  getBlockTypeAt(x, y, z) {
    return this.getBlockType(blockKey(x, y, z));
  }

  hasBlockAt(x, y, z) {
    return this.blockIndex.has(blockKey(x, y, z));
  }

  applyChunk(chunk) {
    if (!chunk?.id || this.chunks.has(chunk.id)) return false;

    // Only inspect edits that belong to this chunk. The previous implementation
    // scanned the entire lifetime edit history for every streamed chunk, which
    // became increasingly expensive in long-running worlds.
    const chunkEdits = this.editsByChunk.get(chunk.id) || new Map();
    const blocks = {};
    Object.entries(chunk.blocks || {}).forEach(([key, generated]) => {
      if (chunkEdits.has(key) && chunkEdits.get(key) == null) return;
      const edit = chunkEdits.has(key) ? chunkEdits.get(key) : null;
      const type = normalizeBlockType(edit?.type || generated.type) || generated.type;
      blocks[key] = { type, chunk: chunk.id };
    });

    // Restore player-placed blocks above or beside generated terrain.
    chunkEdits.forEach((edit, key) => {
      if (!edit) return;
      const type = normalizeBlockType(edit.type);
      if (!type) return;
      blocks[key] = { type, chunk: chunk.id };
    });

    const runtimeChunk = {
      id: chunk.id,
      cx: chunk.cx,
      cz: chunk.cz,
      blocks,
      biomes: chunk.biomes || {},
      revision: 1,
      visibleByType: chunkEdits.size === 0 && chunk.visibleByType
        ? chunk.visibleByType
        : computeVisibleByType(blocks),
    };

    this.chunks.set(chunk.id, runtimeChunk);
    Object.entries(blocks).forEach(([key, value]) => this.blockIndex.set(key, value));
    this.bump();
    return true;
  }

  unloadChunks(ids) {
    let changed = false;
    (ids || []).forEach((id) => {
      if (this.pinnedChunks.has(id)) return;
      const chunk = this.chunks.get(id);
      if (!chunk) return;
      Object.keys(chunk.blocks).forEach((key) => this.blockIndex.delete(key));
      this.chunks.delete(id);
      changed = true;
    });
    if (changed) this.bump();
  }

  removeBlock(key) {
    const current = this.blockIndex.get(key);
    if (!current) return null;
    const [x, , z] = parseBlockKey(key);
    const chunk = this.chunks.get(current.chunk || getChunkIdForPosition(x, z));
    this.blockIndex.delete(key);
    this.blockEdits[key] = null;
    const chunkId = current.chunk || getChunkIdForPosition(x, z);
    if (!this.editsByChunk.has(chunkId)) this.editsByChunk.set(chunkId, new Map());
    this.editsByChunk.get(chunkId).set(key, null);
    if (chunk) {
      delete chunk.blocks[key];
      this.rebuildChunk(chunk);
    } else {
      this.bump();
    }
    return current;
  }

  setBlock(position, type) {
    type = normalizeBlockType(type);
    if (!type) return false;
    const [x, y, z] = position.map(Number);
    const key = blockKey(x, y, z);
    if (this.blockIndex.has(key)) return false;
    const id = getChunkIdForPosition(x, z);
    const chunk = this.chunks.get(id);
    if (!chunk) return false;
    const value = { type, chunk: id };
    this.blockEdits[key] = { type };
    if (!this.editsByChunk.has(id)) this.editsByChunk.set(id, new Map());
    this.editsByChunk.get(id).set(key, { type });
    chunk.blocks[key] = value;
    this.blockIndex.set(key, value);
    this.rebuildChunk(chunk);
    return true;
  }

  applyBlockEdits(nextEdits = {}) {
    const sanitized = sanitizeBlockEdits(nextEdits);
    const allKeys = new Set([...Object.keys(this.blockEdits), ...Object.keys(sanitized)]);
    let changed = false;

    allKeys.forEach((key) => {
      const previous = this.blockEdits[key];
      const next = Object.prototype.hasOwnProperty.call(sanitized, key) ? sanitized[key] : undefined;
      if (JSON.stringify(previous) === JSON.stringify(next)) return;
      const [x, , z] = parseBlockKey(key);
      const chunkId = getChunkIdForPosition(x, z);
      if (!this.editsByChunk.has(chunkId)) this.editsByChunk.set(chunkId, new Map());
      if (next === undefined) this.editsByChunk.get(chunkId).delete(key);
      else this.editsByChunk.get(chunkId).set(key, next);
      this.blockEdits[key] = next;
      if (next === undefined) delete this.blockEdits[key];

      const chunk = this.chunks.get(chunkId);
      if (!chunk) { changed = true; return; }
      if (next == null) {
        delete chunk.blocks[key];
        this.blockIndex.delete(key);
      } else {
        const type = normalizeBlockType(next.type);
        if (type) {
          const value = { type, chunk: chunkId };
          chunk.blocks[key] = value;
          this.blockIndex.set(key, value);
        }
      }
      this.rebuildChunk(chunk);
      changed = true;
    });

    if (changed && allKeys.size === 0) this.bump();
    return changed;
  }

  replaceBlock(position, type) {
    type = normalizeBlockType(type);
    if (!type) return false;
    const [x, y, z] = position.map(Number);
    const key = blockKey(x, y, z);
    const current = this.blockIndex.get(key);
    if (!current) return false;
    const id = current.chunk || getChunkIdForPosition(x, z);
    const chunk = this.chunks.get(id);
    if (!chunk) return false;
    const value = { type, chunk: id };
    this.blockIndex.set(key, value);
    chunk.blocks[key] = value;
    this.blockEdits[key] = { type };
    if (!this.editsByChunk.has(id)) this.editsByChunk.set(id, new Map());
    this.editsByChunk.get(id).set(key, { type });
    this.rebuildChunk(chunk);
    return true;
  }

  findTopSolidY(x, z, maxY = 48, minY = -4) {
    const bx = Math.round(x);
    const bz = Math.round(z);
    for (let y = Math.floor(maxY); y >= Math.floor(minY); y -= 1) {
      const type = this.getBlockTypeAt(bx, y, bz);
      if (type && BLOCK_TYPES[type]?.solid !== false) return y;
    }
    return null;
  }

  findBlocksNear(origin, predicate, radius = 12, limit = 64) {
    const [ox, oy, oz] = Array.isArray(origin) ? origin : [origin.x, origin.y, origin.z];
    const radiusSq = radius * radius;
    const found = [];
    for (const [key, block] of this.blockIndex.entries()) {
      if (!predicate(block.type)) continue;
      const [x, y, z] = parseBlockKey(key);
      const distanceSq = (x - ox) ** 2 + (y - oy) ** 2 + (z - oz) ** 2;
      if (distanceSq > radiusSq) continue;
      found.push({ key, type: block.type, position: [x, y, z], distanceSq });
      if (found.length >= limit * 3) break;
    }
    return found.sort((a, b) => a.distanceSq - b.distanceSq).slice(0, limit);
  }

  getBiomeAt(x, z) {
    const id = getChunkIdForPosition(x, z);
    return this.chunks.get(id)?.biomes?.[`${Math.round(x)},${Math.round(z)}`] || null;
  }

  rebuildChunk(chunk) {
    chunk.visibleByType = computeVisibleByType(chunk.blocks);
    chunk.revision += 1;
    this.bump();
  }

  bump() {
    this.version += 1;
    if (this.emitQueued) return;
    this.emitQueued = true;
    queueMicrotask(() => {
      this.emitQueued = false;
      const chunks = Array.from(this.chunks.values())
        .sort((a, b) => (a.cx - b.cx) || (a.cz - b.cz))
        .map((chunk) => Object.freeze({
          id: chunk.id,
          cx: chunk.cx,
          cz: chunk.cz,
          revision: chunk.revision,
          visibleByType: chunk.visibleByType,
        }));
      this.snapshot = Object.freeze({
        version: this.version,
        chunks: Object.freeze(chunks),
        blockCount: this.blockIndex.size,
        pinnedChunkIds: Object.freeze(Array.from(this.pinnedChunks)),
      });
      this.listeners.forEach((listener) => listener());
    });
  }
}

export const worldRuntime = new VoxelWorldRuntime();
