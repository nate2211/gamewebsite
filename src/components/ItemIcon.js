import React, { memo, useMemo } from "react";
import { BLOCK_TYPES, getItemDefinition } from "../game/blockTypes";

const iconCache = new Map();

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

function drawMaterial(ctx, itemId, definition) {
  const color = definition.color || "#cccccc";
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

function ItemIcon({ itemId, size = 38, alt = "" }) {
  const src = useMemo(() => (itemId ? createIcon(itemId) : ""), [itemId]);
  if (!itemId || !src) return null;
  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      width={size}
      height={size}
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
