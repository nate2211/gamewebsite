import { BLOCK_TYPES } from "./blockTypes";
import { getChunkIdForPosition } from "./worldGenerator";
import { DIRECTIONS, blockKey, parseBlockKey } from "./worldUtils";

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function computeVisibleByType(blocks) {
  const byType = {};

  Object.entries(blocks).forEach(([key, current]) => {
    const definition = BLOCK_TYPES[current.type];
    if (!definition) return;
    const [x, y, z] = parseBlockKey(key);

    const exposed = current.type === "water"
      ? blocks[blockKey(x, y + 1, z)]?.type !== "water"
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
    this.chunks = new Map();
    this.blockIndex = new Map();
    this.listeners = new Set();
    this.version = 0;
    this.snapshot = Object.freeze({ version: 0, chunks: Object.freeze([]), blockCount: 0 });
    this.emitQueued = false;
  }

  reset(seed = "", blockEdits = {}) {
    this.seed = String(seed || "");
    this.blockEdits = { ...(blockEdits || {}) };
    this.chunks.clear();
    this.blockIndex.clear();
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

  applyChunk(chunk, edits = this.blockEdits) {
    if (!chunk?.id || this.chunks.has(chunk.id)) return false;

    const blocks = {};
    Object.entries(chunk.blocks || {}).forEach(([key, generated]) => {
      if (hasOwn(edits, key) && edits[key] == null) return;
      const edit = hasOwn(edits, key) ? edits[key] : null;
      blocks[key] = { type: edit?.type || generated.type, chunk: chunk.id };
    });

    // Restore placed blocks above or beside generated terrain.
    Object.entries(edits || {}).forEach(([key, edit]) => {
      if (!edit) return;
      const [x, , z] = parseBlockKey(key);
      if (getChunkIdForPosition(x, z) !== chunk.id) return;
      blocks[key] = { type: edit.type, chunk: chunk.id };
    });

    const runtimeChunk = {
      id: chunk.id,
      cx: chunk.cx,
      cz: chunk.cz,
      blocks,
      biomes: chunk.biomes || {},
      revision: 1,
      visibleByType: Object.keys(edits || {}).length === 0 && chunk.visibleByType
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
    if (chunk) {
      delete chunk.blocks[key];
      this.rebuildChunk(chunk);
    } else {
      this.bump();
    }
    return current;
  }

  setBlock(position, type) {
    const [x, y, z] = position.map(Number);
    const key = blockKey(x, y, z);
    if (this.blockIndex.has(key)) return false;
    const id = getChunkIdForPosition(x, z);
    const chunk = this.chunks.get(id);
    if (!chunk) return false;
    const value = { type, chunk: id };
    this.blockEdits[key] = { type };
    chunk.blocks[key] = value;
    this.blockIndex.set(key, value);
    this.rebuildChunk(chunk);
    return true;
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
      });
      this.listeners.forEach((listener) => listener());
    });
  }
}

export const worldRuntime = new VoxelWorldRuntime();
