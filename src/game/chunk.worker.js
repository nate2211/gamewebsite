/* eslint-disable no-restricted-globals */
import { generateChunk } from "./worldGenerator";

self.onmessage = (event) => {
  const { requestId, seed, cx, cz } = event.data || {};
  try {
    const chunk = generateChunk(seed, cx, cz);
    self.postMessage({ requestId, ok: true, chunk });
  } catch (error) {
    self.postMessage({
      requestId,
      ok: false,
      error: error?.message || "Chunk generation failed",
    });
  }
};
