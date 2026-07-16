import { generateChunk } from "../world/generation/worldGenerator";

export default class ChunkWorkerClient {
  constructor() {
    this.worker = null;
    this.pending = new Map();
    this.nextRequestId = 1;

    if (typeof Worker !== "undefined") {
      try {
        this.worker = new Worker(new URL("./chunk.worker", import.meta.url));
        this.worker.onmessage = (event) => {
          const { requestId, ok, chunk, error } = event.data || {};
          const request = this.pending.get(requestId);
          if (!request) return;
          this.pending.delete(requestId);
          if (request.timer) clearTimeout(request.timer);
          if (ok) request.resolve(chunk);
          else request.reject(new Error(error || "Chunk worker failed"));
        };
        this.worker.onerror = () => {
          this.fallbackAll();
        };
      } catch (error) {
        this.worker = null;
      }
    }
  }

  generate(seed, cx, cz) {
    if (!this.worker) {
      return new Promise((resolve) => {
        const run = () => resolve(generateChunk(seed, cx, cz));
        if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
          window.requestIdleCallback(run, { timeout: 300 });
        } else {
          setTimeout(run, 0);
        }
      });
    }

    const requestId = this.nextRequestId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        // A worker can occasionally fail without dispatching an error event.
        // Fall back to main-thread generation instead of leaving startup stuck.
        if (this.pending.has(requestId)) this.fallbackAll();
      }, 6000);
      this.pending.set(requestId, { resolve, reject, seed, cx, cz, timer });
      try {
        this.worker.postMessage({ requestId, seed, cx, cz });
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(requestId);
        this.worker?.terminate();
        this.worker = null;
        reject(error);
      }
    });
  }

  fallbackAll() {
    const queued = Array.from(this.pending.values());
    this.pending.clear();
    this.worker?.terminate();
    this.worker = null;
    queued.forEach(({ resolve, seed, cx, cz, timer }) => {
      if (timer) clearTimeout(timer);
      setTimeout(() => resolve(generateChunk(seed, cx, cz)), 0);
    });
  }

  dispose() {
    this.pending.forEach(({ reject, timer }) => {
      if (timer) clearTimeout(timer);
      reject(new Error("Chunk worker disposed"));
    });
    this.pending.clear();
    this.worker?.terminate();
    this.worker = null;
  }
}
