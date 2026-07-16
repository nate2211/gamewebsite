class ParticleRuntime {
  constructor() {
    this.listeners = new Set();
    this.bursts = [];
    this.version = 0;
    this.snapshot = Object.freeze({ version: 0, bursts: Object.freeze([]) });
    this.nextId = 1;
  }

  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.snapshot;
  getServerSnapshot = () => this.snapshot;

  emitBlockParticles({ position, blockType, count = 12, intensity = 1, kind = "break" }) {
    if (!Array.isArray(position) || !blockType) return;
    const now = performance.now();
    this.bursts = [
      ...this.bursts.slice(-11),
      {
        id: this.nextId++,
        position: position.map(Number),
        blockType,
        count: Math.max(3, Math.min(24, Number(count) || 12)),
        intensity: Math.max(0.25, Math.min(2, Number(intensity) || 1)),
        kind,
        startedAt: now,
      },
    ];
    this.publish();
  }

  removeBurst(id) {
    const next = this.bursts.filter((burst) => burst.id !== id);
    if (next.length === this.bursts.length) return;
    this.bursts = next;
    this.publish();
  }

  clear() {
    this.bursts = [];
    this.publish();
  }

  publish() {
    this.version += 1;
    this.snapshot = Object.freeze({
      version: this.version,
      bursts: Object.freeze([...this.bursts]),
    });
    this.listeners.forEach((listener) => listener());
  }
}

export const particleRuntime = new ParticleRuntime();
