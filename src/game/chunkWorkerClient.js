import { generateChunk } from "./worldGenerator";

export default class ChunkWorkerClient {
  constructor() {
    this.worker = null;
    this.pending = new Map();
    this.nextRequestId = 1;

    if (typeof Worker !== "undefined") {
      try {
        this.worker = new Worker(new URL("./chunk.worker.js", import.meta.url));
        this.worker.onmessage = (event) => {
          const { requestId, ok, chunk, error } = event.data || {};
          const request = this.pending.get(requestId);
          if (!request) return;
          this.pending.delete(requestId);
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
      this.pending.set(requestId, { resolve, reject, seed, cx, cz });
      this.worker.postMessage({ requestId, seed, cx, cz });
    });
  }

  fallbackAll() {
    const queued = Array.from(this.pending.values());
    this.pending.clear();
    this.worker?.terminate();
    this.worker = null;
    queued.forEach(({ resolve, seed, cx, cz }) => {
      setTimeout(() => resolve(generateChunk(seed, cx, cz)), 0);
    });
  }

  dispose() {
    this.pending.forEach(({ reject }) => reject(new Error("Chunk worker disposed")));
    this.pending.clear();
    this.worker?.terminate();
    this.worker = null;
  }
}
