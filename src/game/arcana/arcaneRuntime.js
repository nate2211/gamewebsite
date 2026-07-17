class ArcaneRuntime {
  constructor() {
    this.listeners = new Set();
    this.sequence = 0;
  }

  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  emitCast(payload = {}) {
    const event = {
      id: `arcane-${Date.now()}-${this.sequence += 1}`,
      createdAt: performance.now(),
      ...payload,
    };
    this.listeners.forEach((listener) => listener(event));
    return event;
  }
}

export const arcaneRuntime = new ArcaneRuntime();
