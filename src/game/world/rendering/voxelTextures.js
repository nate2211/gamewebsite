import * as THREE from "three";
import { BLOCK_TYPES } from "../../config/blockTypes";

const textureCache = new Map();
const materialCache = new Map();
const crackTextureCache = new Map();

function hashText(value) {
  let hash = 2166136261;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomFrom(seed, index) {
  let value = seed ^ Math.imul(index + 1, 2654435761);
  value = Math.imul(value ^ (value >>> 15), 2246822519);
  value ^= value >>> 13;
  return (value >>> 0) / 4294967296;
}

function shade(color, amount) {
  const next = new THREE.Color(color || "#888888");
  if (amount >= 0) next.lerp(new THREE.Color("#ffffff"), amount);
  else next.lerp(new THREE.Color("#000000"), -amount);
  return `#${next.getHexString()}`;
}

function faceBase(type, face) {
  const color = BLOCK_TYPES[type]?.color || "#888888";
  if (type.endsWith("_ore")) return "#777d82";
  if (type === "grass") {
    if (face === "top") return "#6ead3e";
    if (face === "bottom") return "#795334";
    return "#795334";
  }
  if (type === "frozen_grass") {
    if (face === "top") return "#a6c9bb";
    if (face === "bottom") return "#6d5944";
    return "#6d5944";
  }
  if (["wood", "spruce_wood", "jungle_wood"].includes(type) && ["top", "bottom"].includes(face)) {
    return type === "spruce_wood" ? "#82613d" : type === "jungle_wood" ? "#a97544" : "#a87845";
  }
  return color;
}

function drawOre(ctx, type, seed) {
  const oreColor = BLOCK_TYPES[type]?.color || "#ffffff";
  for (let index = 0; index < 15; index += 1) {
    const x = Math.floor(randomFrom(seed, index * 3) * 15);
    const y = Math.floor(randomFrom(seed, index * 3 + 1) * 15);
    const size = randomFrom(seed, index * 3 + 2) > 0.62 ? 2 : 1;
    ctx.fillStyle = index % 3 === 0 ? shade(oreColor, 0.24) : oreColor;
    ctx.fillRect(x, y, size, size);
    if (size > 1) {
      ctx.fillStyle = shade(oreColor, -0.28);
      ctx.fillRect(x + 1, y + 1, 1, 1);
    }
  }
}

function drawPixelPattern(ctx, type, face, base, seed) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 16, 16);

  for (let index = 0; index < 62; index += 1) {
    const x = Math.floor(randomFrom(seed, index * 2) * 16);
    const y = Math.floor(randomFrom(seed, index * 2 + 1) * 16);
    const delta = randomFrom(seed, index + 150) > 0.52 ? 0.09 : -0.11;
    ctx.fillStyle = shade(base, delta);
    ctx.fillRect(x, y, randomFrom(seed, index + 270) > 0.86 ? 2 : 1, 1);
  }

  if (type === "grass" && face === "side") {
    ctx.fillStyle = "#5f9f38";
    ctx.fillRect(0, 0, 16, 4);
    for (let x = 0; x < 16; x += 1) {
      const depth = 2 + Math.floor(randomFrom(seed, x + 500) * 4);
      ctx.fillRect(x, 3, 1, depth);
    }
  }
  if (type === "frozen_grass" && face === "side") {
    ctx.fillStyle = "#93baaa";
    ctx.fillRect(0, 0, 16, 4);
    for (let x = 0; x < 16; x += 1) {
      const depth = 2 + Math.floor(randomFrom(seed, x + 520) * 3);
      ctx.fillRect(x, 3, 1, depth);
    }
  }

  if (["wood", "spruce_wood", "jungle_wood"].includes(type)) {
    if (["top", "bottom"].includes(face)) {
      ctx.strokeStyle = shade(base, -0.28);
      ctx.lineWidth = 1;
      ctx.strokeRect(2.5, 2.5, 11, 11);
      ctx.strokeRect(5.5, 5.5, 5, 5);
      ctx.fillStyle = shade(base, -0.36);
      ctx.fillRect(7, 7, 2, 2);
    } else {
      ctx.fillStyle = shade(base, -0.24);
      for (let x = 1; x < 16; x += 4) ctx.fillRect(x, 0, 1, 16);
      ctx.fillStyle = shade(base, 0.16);
      for (let x = 3; x < 16; x += 5) ctx.fillRect(x, 0, 1, 16);
    }
  }

  if (type.includes("leaves")) {
    ctx.clearRect(0, 0, 16, 16);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 16, 16);
    for (let index = 0; index < 34; index += 1) {
      const x = Math.floor(randomFrom(seed, index * 2 + 700) * 16);
      const y = Math.floor(randomFrom(seed, index * 2 + 701) * 16);
      if (index % 5 === 0) ctx.clearRect(x, y, 1, 1);
      else {
        ctx.fillStyle = shade(base, index % 2 ? 0.12 : -0.15);
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  if (type.endsWith("_ore")) drawOre(ctx, type, seed + 1701);

  if (type === "cobblestone") {
    ctx.strokeStyle = "rgba(24,28,31,.65)";
    ctx.lineWidth = 1;
    [[0, 4, 6, 4], [6, 4, 10, 1], [6, 4, 8, 10], [8, 10, 16, 8], [0, 12, 8, 10], [12, 0, 10, 6]].forEach((line) => {
      ctx.beginPath();
      ctx.moveTo(line[0], line[1]);
      ctx.lineTo(line[2], line[3]);
      ctx.stroke();
    });
  }

  if (type === "sandstone") {
    ctx.fillStyle = shade(base, -0.17);
    ctx.fillRect(0, 4, 16, 1);
    ctx.fillRect(0, 11, 16, 1);
    ctx.fillStyle = shade(base, 0.11);
    ctx.fillRect(0, 5, 16, 1);
  }

  if (type === "snow") {
    ctx.fillStyle = "rgba(190,220,237,.85)";
    for (let index = 0; index < 16; index += 1) {
      const x = Math.floor(randomFrom(seed, index + 800) * 16);
      const y = Math.floor(randomFrom(seed, index + 900) * 16);
      ctx.fillRect(x, y, 1, 1);
    }
  }

  if (type === "water") {
    ctx.fillStyle = "rgba(39,112,183,.95)";
    ctx.fillRect(0, 0, 16, 16);
    ctx.strokeStyle = "rgba(164,224,255,.45)";
    ctx.lineWidth = 1;
    for (let y = 2; y < 16; y += 5) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(5, y - 1);
      ctx.lineTo(11, y + 1);
      ctx.lineTo(16, y);
      ctx.stroke();
    }
  }

  if (type === "seagrass" || type === "kelp") {
    ctx.clearRect(0, 0, 16, 16);
    ctx.fillStyle = type === "kelp" ? "#246f49" : "#39a86e";
    const blades = type === "kelp" ? [5, 8, 11] : [3, 6, 10, 13];
    blades.forEach((x, index) => {
      const h = type === "kelp" ? 15 - index : 8 + ((index * 3) % 7);
      ctx.fillRect(x, 16 - h, type === "kelp" ? 2 : 1, h);
      if (index % 2 === 0) ctx.fillRect(x + 1, 16 - h + 3, 2, 1);
    });
  }

  if (type === "ice") {
    ctx.strokeStyle = "rgba(225,250,255,.48)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(1, 13);
    ctx.lineTo(6, 7);
    ctx.lineTo(9, 8);
    ctx.lineTo(15, 2);
    ctx.stroke();
  }

  if (type === "planks" || type.endsWith("_planks")) {
    ctx.fillStyle = shade(base, -0.22);
    [3, 8, 13].forEach((y) => ctx.fillRect(0, y, 16, 1));
    ctx.fillRect(5, 0, 1, 3);
    ctx.fillRect(11, 4, 1, 4);
    ctx.fillRect(7, 9, 1, 4);
    ctx.fillRect(13, 14, 1, 2);
  }

  if (type === "crafting_table") {
    ctx.strokeStyle = shade(base, -0.32);
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 14, 14);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(2, 8);
    ctx.lineTo(14, 8);
    ctx.moveTo(8, 2);
    ctx.lineTo(8, 14);
    ctx.stroke();
  }

  if (type === "furnace" && face === "front") {
    ctx.fillStyle = "#24282a";
    ctx.fillRect(3, 6, 10, 7);
    ctx.fillStyle = "#111315";
    ctx.fillRect(4, 7, 8, 5);
    ctx.fillStyle = "#7b7f82";
    ctx.fillRect(4, 2, 8, 2);
  }

  if (type === "bedrock") {
    ctx.fillStyle = "#111315";
    for (let index = 0; index < 28; index += 1) {
      const x = Math.floor(randomFrom(seed, index + 1000) * 16);
      const y = Math.floor(randomFrom(seed, index + 1100) * 16);
      ctx.fillRect(x, y, 2, 1);
    }
  }
}

function createTexture(type, face) {
  const key = `${type}:${face}`;
  if (textureCache.has(key)) return textureCache.get(key);
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext("2d");
  const base = faceBase(type, face);
  drawPixelPattern(ctx, type, face, base, hashText(key));
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipmapNearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}

function faceName(index) {
  if (index === 2) return "top";
  if (index === 3) return "bottom";
  if (index === 4) return "front";
  return "side";
}

export function getBlockMaterials(type) {
  if (materialCache.has(type)) return materialCache.get(type);
  const definition = BLOCK_TYPES[type] || {};
  const materials = Array.from({ length: 6 }, (_, index) => {
    const map = createTexture(type, faceName(index));
    const transparent = Boolean(definition.transparent);
    return new THREE.MeshLambertMaterial({
      color: "#ffffff",
      map,
      flatShading: true,
      transparent,
      opacity: type.includes("leaves") ? 0.92 : type === "glass" ? 0.42 : type === "ice" ? 0.76 : type === "water" ? 0.58 : 1,
      alphaTest: type.includes("leaves") || type === "seagrass" || type === "kelp" ? 0.18 : 0,
      depthWrite: !["glass", "ice", "water"].includes(type),
    });
  });
  materialCache.set(type, materials);
  return materials;
}

function drawCrackBranch(ctx, seed, originX, originY, length, depth, stage) {
  if (depth <= 0 || length < 1.5) return;
  let x = originX;
  let y = originY;
  const segments = 3 + Math.floor(randomFrom(seed, depth + 20) * 3);
  let angle = randomFrom(seed, depth + 30) * Math.PI * 2;

  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let index = 0; index < segments; index += 1) {
    angle += (randomFrom(seed, index + depth * 31) - 0.5) * 0.95;
    x += Math.cos(angle) * (length / segments);
    y += Math.sin(angle) * (length / segments);
    ctx.lineTo(x, y);
  }
  ctx.stroke();

  if (stage > 2 && depth > 1) {
    drawCrackBranch(ctx, seed + 73, x, y, length * 0.58, depth - 1, stage);
  }
  if (stage > 5 && depth > 1) {
    drawCrackBranch(ctx, seed + 149, originX + (x - originX) * 0.55, originY + (y - originY) * 0.55, length * 0.48, depth - 1, stage);
  }
}

export function getCrackTexture(stageValue) {
  const stage = Math.max(0, Math.min(9, Math.floor(stageValue)));
  if (crackTextureCache.has(stage)) return crackTextureCache.get(stage);
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 64, 64);
  ctx.strokeStyle = `rgba(18, 14, 12, ${0.64 + stage * 0.03})`;
  ctx.lineWidth = 1.4 + stage * 0.12;
  ctx.lineCap = "square";
  ctx.lineJoin = "miter";

  const branchCount = 1 + Math.floor(stage / 2);
  for (let index = 0; index < branchCount; index += 1) {
    const seed = 1709 + stage * 431 + index * 97;
    const x = 32 + (randomFrom(seed, 1) - 0.5) * 14;
    const y = 32 + (randomFrom(seed, 2) - 0.5) * 14;
    drawCrackBranch(ctx, seed, x, y, 12 + stage * 2.7, 2 + Math.floor(stage / 3), stage);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  crackTextureCache.set(stage, texture);
  return texture;
}
