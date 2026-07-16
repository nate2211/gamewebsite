const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function bytesToBase64Url(bytes) {
  let binary = "";
  const step = 0x8000;
  for (let index = 0; index < bytes.length; index += step) {
    binary += String.fromCharCode(...bytes.subarray(index, Math.min(bytes.length, index + step)));
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  const normalized = String(value || "").replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function encodeSignalPayload(payload) {
  return bytesToBase64Url(textEncoder.encode(JSON.stringify(payload)));
}

export function decodeSignalPayload(token) {
  try {
    const parsed = JSON.parse(textDecoder.decode(base64UrlToBytes(token)));
    if (!parsed || typeof parsed !== "object") throw new Error("Signal payload is empty.");
    return parsed;
  } catch (error) {
    throw new Error(`Invalid multiplayer link: ${error?.message || "unable to decode"}`);
  }
}

export function readSignalToken(name, locationLike = window.location) {
  const search = new URLSearchParams(locationLike.search || "");
  if (search.get(name)) return search.get(name);
  const rawHash = String(locationLike.hash || "").replace(/^#/, "");
  const hashQuery = rawHash.includes("?") ? rawHash.slice(rawHash.indexOf("?") + 1) : rawHash;
  const hash = new URLSearchParams(hashQuery);
  return hash.get(name) || "";
}

export function buildFrontendSignalUrl(path, name, token) {
  const encoded = encodeURIComponent(token);
  if (window.location.protocol === "file:") {
    const base = window.location.href.split("#")[0];
    return `${base}#${path}?${name}=${encoded}`;
  }
  return `${window.location.origin}${path}#${name}=${encoded}`;
}
