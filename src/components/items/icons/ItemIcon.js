import React, { memo, useEffect, useState } from "react";
import { BLOCK_TYPES, getItemDefinition } from "../../../game/config/blockTypes";

const iconCache = new Map();
const ICON_BATCH_SIZE = 6;

const iconListeners = new Map();
const pendingIconIds = [];
const pendingIconSet = new Set();
let iconQueueScheduled = false;

function publishIcon(itemId, src) {
  const listeners = iconListeners.get(itemId);
  if (!listeners) return;
  listeners.forEach((listener) => listener(src));
  iconListeners.delete(itemId);
}

function processIconQueue(deadline) {
  iconQueueScheduled = false;
  let processed = 0;
  while (pendingIconIds.length && processed < ICON_BATCH_SIZE) {
    if (deadline?.timeRemaining && deadline.timeRemaining() < 2 && processed > 0) break;
    const itemId = pendingIconIds.shift();
    pendingIconSet.delete(itemId);
    const src = createIcon(itemId);
    publishIcon(itemId, src);
    processed += 1;
  }
  if (pendingIconIds.length) scheduleIconQueue();
}

function scheduleIconQueue() {
  if (iconQueueScheduled || typeof window === "undefined") return;
  iconQueueScheduled = true;
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(processIconQueue, { timeout: 90 });
  } else {
    window.setTimeout(() => processIconQueue(null), 0);
  }
}

function queueIcon(itemId) {
  if (!itemId || iconCache.has(itemId) || pendingIconSet.has(itemId)) return;
  pendingIconSet.add(itemId);
  pendingIconIds.push(itemId);
  scheduleIconQueue();
}

function subscribeToIcon(itemId, listener) {
  if (!iconListeners.has(itemId)) iconListeners.set(itemId, new Set());
  iconListeners.get(itemId).add(listener);
  queueIcon(itemId);
  return () => {
    const listeners = iconListeners.get(itemId);
    listeners?.delete(listener);
    if (listeners?.size === 0) iconListeners.delete(itemId);
  };
}

function shade(hex, amount) {
  const value = String(hex || "#888888").replace("#", "");
  const full = value.length === 3 ? value.split("").map((part) => part + part).join("") : value.padEnd(6, "8");
  const number = Number.parseInt(full, 16);
  const mix = (channel) => {
    const source = (number >> channel) & 255;
    const target = amount >= 0 ? 255 : 0;
    return Math.max(0, Math.min(255, Math.round(source + (target - source) * Math.abs(amount))));
  };
  return `rgb(${mix(16)}, ${mix(8)}, ${mix(0)})`;
}

function polygon(ctx, points, fill, stroke = "rgba(0,0,0,.35)") {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawCube(ctx, itemId, color) {
  const top = [[32, 7], [55, 20], [32, 33], [9, 20]];
  const left = [[9, 20], [32, 33], [32, 57], [9, 44]];
  const right = [[32, 33], [55, 20], [55, 44], [32, 57]];
  polygon(ctx, top, shade(color, 0.24));
  polygon(ctx, left, shade(color, -0.18));
  polygon(ctx, right, shade(color, -0.32));

  ctx.save();
  ctx.globalAlpha = 0.62;
  const ore = itemId.endsWith("_ore");
  for (let index = 0; index < 18; index += 1) {
    const x = 14 + ((index * 17 + itemId.length * 7) % 36);
    const y = 15 + ((index * 13 + itemId.length * 11) % 34);
    ctx.fillStyle = ore && index % 3 === 0 ? shade(color, 0.34) : index % 2 ? shade(color, -0.18) : shade(color, 0.18);
    ctx.fillRect(x, y, index % 5 === 0 ? 3 : 2, 2);
  }
  ctx.restore();

  if (itemId === "grass" || itemId === "frozen_grass") {
    ctx.strokeStyle = itemId === "grass" ? "#78c447" : "#b4d8c9";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(10, 21);
    ctx.lineTo(32, 34);
    ctx.lineTo(54, 21);
    ctx.stroke();
  }
  if (itemId.includes("wood")) {
    ctx.strokeStyle = shade(color, -0.34);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(32, 20, 11, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (itemId === "torch") {
    ctx.clearRect(0, 0, 64, 64);
    ctx.save();
    ctx.translate(32, 34);
    ctx.rotate(-0.24);
    ctx.fillStyle = "#72502e";
    ctx.fillRect(-4, -3, 8, 28);
    polygon(ctx, [[-8, -5], [0, -17], [8, -5], [4, 4], [-4, 4]], "#ffbf3f", null);
    polygon(ctx, [[-4, -5], [0, -12], [4, -5], [2, 1], [-2, 1]], "#fff2a1", null);
    ctx.restore();
  }
}

function drawTool(ctx, definition) {
  const color = definition.color || "#aaaaaa";
  ctx.save();
  ctx.translate(32, 34);
  ctx.rotate(-0.7);
  ctx.lineCap = "square";
  ctx.strokeStyle = "#5b3a22";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-18, 20);
  ctx.lineTo(15, -17);
  ctx.stroke();
  ctx.strokeStyle = "#9c7045";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-16, 18);
  ctx.lineTo(15, -17);
  ctx.stroke();

  if (definition.toolType === "pickaxe") {
    polygon(ctx, [[3, -22], [22, -25], [27, -18], [12, -14], [-5, -8], [-9, -14]], shade(color, 0.12));
    polygon(ctx, [[3, -22], [22, -25], [16, -21], [-8, -12]], shade(color, 0.3), null);
  } else if (definition.toolType === "axe") {
    polygon(ctx, [[7, -25], [24, -22], [27, -9], [16, -2], [3, -9]], shade(color, 0.1));
    polygon(ctx, [[7, -25], [24, -22], [18, -17], [5, -18]], shade(color, 0.32), null);
  } else if (definition.toolType === "shovel") {
    polygon(ctx, [[7, -28], [18, -23], [17, -10], [8, -4], [1, -12]], shade(color, 0.12));
  } else {
    polygon(ctx, [[9, -31], [17, -24], [9, 4], [2, -5]], shade(color, 0.18));
    polygon(ctx, [[7, -26], [12, -23], [8, -3], [4, -7]], shade(color, 0.42), null);
    ctx.fillStyle = shade(color, -0.32);
    ctx.fillRect(-3, -7, 18, 4);
  }
  ctx.restore();
}


function drawArmor(ctx, definition) {
  const color = definition.color || "#c8c8c8";
  const light = shade(color, 0.3);
  const dark = shade(color, -0.28);
  if (definition.armorSlot === "helmet") {
    polygon(ctx, [[16, 19], [24, 10], [43, 10], [51, 19], [49, 43], [40, 48], [40, 34], [25, 34], [25, 48], [16, 43]], dark);
    polygon(ctx, [[20, 19], [27, 14], [40, 14], [47, 19], [44, 28], [23, 28]], light, null);
  } else if (definition.armorSlot === "chestplate") {
    polygon(ctx, [[14, 17], [25, 9], [39, 9], [50, 17], [45, 28], [46, 54], [18, 54], [19, 28]], dark);
    polygon(ctx, [[22, 16], [28, 12], [36, 12], [42, 16], [39, 45], [25, 45]], light, null);
    polygon(ctx, [[14, 17], [6, 29], [15, 35], [22, 22]], shade(color, -0.08), null);
    polygon(ctx, [[50, 17], [58, 29], [49, 35], [42, 22]], shade(color, -0.18), null);
  } else if (definition.armorSlot === "leggings") {
    polygon(ctx, [[18, 10], [46, 10], [45, 32], [39, 54], [28, 54], [28, 31], [23, 54], [12, 54], [18, 31]], dark);
    polygon(ctx, [[22, 14], [42, 14], [39, 28], [25, 28]], light, null);
  } else {
    polygon(ctx, [[12, 22], [28, 22], [28, 43], [23, 52], [8, 52], [10, 39]], dark);
    polygon(ctx, [[36, 22], [52, 22], [56, 52], [41, 52], [36, 43]], shade(color, -0.18));
    polygon(ctx, [[14, 25], [25, 25], [23, 39], [12, 39]], light, null);
    polygon(ctx, [[39, 25], [50, 25], [52, 39], [41, 39]], shade(color, 0.18), null);
  }
}

function drawMaterial(ctx, itemId, definition) {
  const color = definition.color || "#cccccc";
  if (definition.category === "armor") {
    drawArmor(ctx, definition);
    return;
  }
  if (itemId === "bucket" || itemId === "water_bucket") {
    polygon(ctx, [[15, 16], [49, 16], [45, 52], [19, 52]], itemId === "water_bucket" ? "#3e97d8" : "#9da9b0");
    ctx.strokeStyle = "#e4edf1";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(32, 18, 20, Math.PI, Math.PI * 2); ctx.stroke();
    if (itemId === "water_bucket") {
      ctx.fillStyle = "#75c7ff";
      ctx.fillRect(20, 31, 24, 14);
    }
    return;
  }
  if (itemId === "boat") {
    polygon(ctx, [[8, 28], [18, 20], [51, 20], [58, 29], [50, 48], [16, 48]], "#8d5d31");
    polygon(ctx, [[16, 24], [48, 24], [43, 40], [21, 40]], "#3b2a1d", null);
    ctx.strokeStyle = "#c18a50";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(14, 31); ctx.lineTo(2, 18);
    ctx.moveTo(50, 31); ctx.lineTo(62, 18);
    ctx.stroke();
    return;
  }
  if (itemId === "grass_seeds" || itemId === "flower_seeds") {
    ctx.fillStyle = itemId === "grass_seeds" ? "#78a942" : "#d7b33f";
    for (let i = 0; i < 9; i += 1) {
      const x = 17 + ((i * 13) % 31);
      const y = 18 + ((i * 17) % 29);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((i % 5) * 0.43);
      ctx.beginPath();
      ctx.ellipse(0, 0, 4, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    return;
  }
  if (itemId === "grass_clippings") {
    ctx.strokeStyle = "#5fa63b";
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i += 1) {
      ctx.beginPath();
      ctx.moveTo(16 + i * 4, 51);
      ctx.lineTo(11 + i * 6, 17 + (i % 3) * 6);
      ctx.stroke();
    }
    return;
  }
  if (itemId === "yellow_flower") {
    ctx.strokeStyle = "#4f8e32";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(32, 54); ctx.lineTo(32, 26); ctx.stroke();
    ctx.fillStyle = "#f1cf45";
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * Math.PI * 2;
      ctx.beginPath(); ctx.ellipse(32 + Math.cos(angle) * 9, 21 + Math.sin(angle) * 9, 6, 3, angle, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "#7b4d24"; ctx.beginPath(); ctx.arc(32, 21, 5, 0, Math.PI * 2); ctx.fill();
    return;
  }
  if (itemId === "wheat") {
    ctx.strokeStyle = "#8f6d25";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(31, 55); ctx.lineTo(33, 12); ctx.stroke();
    ctx.fillStyle = "#e1bd50";
    for (let i = 0; i < 6; i += 1) {
      ctx.beginPath(); ctx.ellipse(25, 18 + i * 6, 6, 3, -0.45, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(40, 16 + i * 6, 6, 3, 0.45, 0, Math.PI * 2); ctx.fill();
    }
    return;
  }
  if (itemId === "apple") {
    ctx.fillStyle = "#d83b36";
    ctx.beginPath(); ctx.arc(31, 35, 17, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f06c58";
    ctx.beginPath(); ctx.arc(25, 29, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#5f3a1f"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(32, 18); ctx.lineTo(35, 9); ctx.stroke();
    ctx.fillStyle = "#55a447";
    ctx.beginPath(); ctx.ellipse(42, 13, 8, 4, 0.4, 0, Math.PI * 2); ctx.fill();
    return;
  }
  if (itemId.includes("fish")) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(31, 32, 19, 11, 0, 0, Math.PI * 2); ctx.fill();
    polygon(ctx, [[12, 32], [2, 21], [2, 43]], shade(color, -0.2), null);
    ctx.fillStyle = "#101010"; ctx.fillRect(42, 28, 3, 3);
    return;
  }
  if (itemId.includes("ingot")) {
    polygon(ctx, [[13, 39], [23, 23], [49, 20], [55, 34], [44, 46], [20, 47]], shade(color, -0.08));
    polygon(ctx, [[23, 23], [49, 20], [43, 29], [20, 32]], shade(color, 0.36));
    polygon(ctx, [[20, 32], [43, 29], [55, 34], [44, 41], [19, 42]], shade(color, 0.1), null);
    return;
  }
  if (["diamond", "emerald", "redstone"].includes(itemId) || itemId.startsWith("raw_")) {
    polygon(ctx, [[32, 7], [50, 20], [54, 38], [39, 56], [20, 51], [9, 33], [16, 16]], shade(color, -0.1));
    polygon(ctx, [[32, 7], [50, 20], [39, 28], [16, 16]], shade(color, 0.35), null);
    polygon(ctx, [[16, 16], [39, 28], [20, 51], [9, 33]], shade(color, 0.08), null);
    polygon(ctx, [[39, 28], [54, 38], [39, 56], [20, 51]], shade(color, -0.28), null);
    return;
  }
  if (definition.category === "food") {
    ctx.fillStyle = shade(color, -0.2);
    ctx.beginPath();
    ctx.ellipse(31, 35, 21, 14, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shade(color, 0.25);
    ctx.beginPath();
    ctx.ellipse(27, 30, 14, 7, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#efe4d0";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(45, 34);
    ctx.lineTo(56, 27);
    ctx.stroke();
    return;
  }
  ctx.fillStyle = shade(color, -0.18);
  ctx.beginPath();
  ctx.arc(32, 33, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shade(color, 0.27);
  ctx.beginPath();
  ctx.arc(27, 27, 9, 0, Math.PI * 2);
  ctx.fill();
}

function createIcon(itemId) {
  if (iconCache.has(itemId)) return iconCache.get(itemId);
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, 64, 64);
  ctx.shadowColor = "rgba(0,0,0,.55)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 3;

  const definition = getItemDefinition(itemId);
  if (BLOCK_TYPES[itemId]) drawCube(ctx, itemId, definition.color);
  else if (definition.category === "tool") drawTool(ctx, definition);
  else drawMaterial(ctx, itemId, definition);

  const url = canvas.toDataURL("image/png");
  iconCache.set(itemId, url);
  return url;
}

export function preloadItemIcons(itemIds = []) {
  if (typeof document === "undefined") return;
  [...new Set(itemIds)].filter(Boolean).forEach(queueIcon);
}

function ItemIcon({ itemId, size = 38, alt = "" }) {
  const [src, setSrc] = useState(() => (itemId ? iconCache.get(itemId) || "" : ""));

  useEffect(() => {
    if (!itemId) {
      setSrc("");
      return undefined;
    }
    const cached = iconCache.get(itemId);
    if (cached) {
      setSrc(cached);
      return undefined;
    }
    setSrc("");
    return subscribeToIcon(itemId, setSrc);
  }, [itemId]);

  if (!itemId) return null;
  if (!src) {
    return <span className="inventory-icon-placeholder" aria-hidden="true" style={{ width: size, height: size }} />;
  }
  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      style={{
        display: "block",
        width: "82%",
        height: "82%",
        maxWidth: size,
        maxHeight: size,
        objectFit: "contain",
        imageRendering: "pixelated",
        filter: "drop-shadow(0 2px 1px rgba(0,0,0,.8))",
        pointerEvents: "none",
      }}
    />
  );
}

export default memo(ItemIcon);
