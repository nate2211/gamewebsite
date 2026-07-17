export const KEYBINDING_STORAGE_KEY = "voxel:keybindings:v1";

export const DEFAULT_KEYBINDINGS = Object.freeze({
  forward: "KeyW",
  backward: "KeyS",
  left: "KeyA",
  right: "KeyD",
  jump: "Space",
  sprint: "ShiftLeft",
  crouch: "ControlLeft",
  inventory: "KeyE",
  dropItem: "KeyQ",
  arcaneCycle: "KeyR",
});

export const KEYBINDING_LABELS = Object.freeze({
  forward: "Move forward",
  backward: "Move backward",
  left: "Strafe left",
  right: "Strafe right",
  jump: "Jump / stand from chair",
  sprint: "Sprint / dismount",
  crouch: "Crouch / stand from chair",
  inventory: "Inventory",
  dropItem: "Drop held item",
  arcaneCycle: "Cycle arcane spell",
});

export function readKeybindings() {
  if (typeof window === "undefined") return { ...DEFAULT_KEYBINDINGS };
  try {
    const parsed = JSON.parse(localStorage.getItem(KEYBINDING_STORAGE_KEY) || "{}");
    return { ...DEFAULT_KEYBINDINGS, ...(parsed && typeof parsed === "object" ? parsed : {}) };
  } catch {
    return { ...DEFAULT_KEYBINDINGS };
  }
}

export function saveKeybindings(bindings) {
  const next = { ...DEFAULT_KEYBINDINGS, ...(bindings || {}) };
  localStorage.setItem(KEYBINDING_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("voxel:keybindings-changed", { detail: next }));
  return next;
}

export function resetKeybindings() {
  return saveKeybindings(DEFAULT_KEYBINDINGS);
}

export function getBoundCode(action) {
  return readKeybindings()[action] || DEFAULT_KEYBINDINGS[action];
}

export function formatKeyCode(code) {
  return String(code || "Unbound")
    .replace(/^Key/, "")
    .replace(/^Digit/, "")
    .replace("ShiftLeft", "Left Shift")
    .replace("ShiftRight", "Right Shift")
    .replace("ControlLeft", "Left Ctrl")
    .replace("ControlRight", "Right Ctrl")
    .replace("Arrow", "Arrow ");
}
