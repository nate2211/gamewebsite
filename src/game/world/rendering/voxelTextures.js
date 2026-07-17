import * as THREE from "three";
import { BLOCK_TYPES } from "../../config/blockTypes";

const textureCache = new Map();
const materialCache = new Map();
const plantMaterialCache = new Map();
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
    if (face === "top") return "#63b13d";
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

  for (let index = 0; index < 132; index += 1) {
    const x = Math.floor(randomFrom(seed, index * 2) * 16);
    const y = Math.floor(randomFrom(seed, index * 2 + 1) * 16);
    const delta = randomFrom(seed, index + 150) > 0.52 ? 0.12 : -0.15;
    ctx.fillStyle = shade(base, delta);
    ctx.fillRect(x, y, randomFrom(seed, index + 270) > 0.86 ? 2 : 1, 1);
  }

  if (type === "grass" && face === "side") {
    ctx.fillStyle = "#62aa38";
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
    if (type === "apple_leaves") {
      ctx.fillStyle = "#d84238";
      [[3,5],[11,3],[7,10],[13,12]].forEach(([x,y], index) => { ctx.fillRect(x,y,2,2); if (index % 2 === 0) { ctx.fillStyle="#f06a52"; ctx.fillRect(x,y,1,1); ctx.fillStyle="#d84238"; } });
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

  if (type === "lava") {
    ctx.fillStyle = "#e13f16";
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = "#ffb52e";
    for (let y = 1; y < 16; y += 4) {
      ctx.fillRect((y * 3) % 7, y, 8, 1);
      ctx.fillRect((y * 5) % 11, Math.min(15, y + 1), 4, 1);
    }
    ctx.fillStyle = "#8d1f16";
    for (let i = 0; i < 12; i += 1) ctx.fillRect(Math.floor(randomFrom(seed, i + 1900) * 16), Math.floor(randomFrom(seed, i + 2000) * 16), 1, 1);
  }

  if (type === "basalt") {
    ctx.fillStyle = "#302f35";
    ctx.fillRect(0, 0, 16, 16);
    ctx.strokeStyle = "#56535e";
    ctx.lineWidth = 1;
    [2, 6, 10, 14].forEach((x, index) => {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (index % 2 ? -1 : 1), 16);
      ctx.stroke();
    });
    ctx.fillStyle = "rgba(18,17,22,.45)";
    for (let i = 0; i < 18; i += 1) ctx.fillRect(Math.floor(randomFrom(seed, i + 2020) * 16), Math.floor(randomFrom(seed, i + 2060) * 16), 1, 2);
  }

  if (type === "black_sand" || type === "volcanic_ash") {
    ctx.fillStyle = type === "black_sand" ? "#3b3738" : "#57515a";
    ctx.fillRect(0, 0, 16, 16);
    for (let i = 0; i < 42; i += 1) {
      const light = randomFrom(seed, i + 2070) > 0.55;
      ctx.fillStyle = light ? (type === "black_sand" ? "#5a5250" : "#746b76") : "#29272d";
      ctx.fillRect(Math.floor(randomFrom(seed, i + 2080) * 16), Math.floor(randomFrom(seed, i + 2090) * 16), 1, 1);
    }
  }

  if (type === "obsidian") {
    ctx.fillStyle = "#20162f";
    ctx.fillRect(0, 0, 16, 16);
    ctx.strokeStyle = "#5a3877";
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i += 1) {
      ctx.beginPath();
      ctx.moveTo(Math.floor(randomFrom(seed, i + 2100) * 16), 0);
      ctx.lineTo(Math.floor(randomFrom(seed, i + 2200) * 16), 16);
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


  const meadowPlant = ["tall_grass", "meadow_grass_0", "meadow_grass_1", "meadow_grass_2"].includes(type);
  const flowerPlant = ["wildflower", "yellow_flower_0", "yellow_flower_1", "yellow_flower_2"].includes(type);
  const wheatPlant = type.startsWith("wheat_crop_");
  const caveMushroom = ["brown_mushroom", "red_mushroom"].includes(type);
  if (type === "vine" || meadowPlant || flowerPlant || wheatPlant || caveMushroom || type === "cobweb" || type === "snow_layer") {
    ctx.clearRect(0, 0, 16, 16);
    if (type === "snow_layer") {
      ctx.fillStyle = "#f5fbff";
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = "rgba(180,215,235,.55)";
      for (let i = 0; i < 18; i += 1) ctx.fillRect(Math.floor(randomFrom(seed, i + 1400) * 16), Math.floor(randomFrom(seed, i + 1500) * 16), 1, 1);
    } else if (type === "vine") {
      ctx.fillStyle = "#2d8238";
      [3, 5, 9, 12].forEach((x, index) => {
        ctx.fillRect(x, 0, 2, 16);
        if (index % 2 === 0) ctx.fillRect(Math.max(0, x - 2), 3 + index * 2, 4, 1);
        ctx.fillRect(x + 1, 8 + (index % 3), 3, 1);
      });
    } else if (type === "cobweb") {
      ctx.strokeStyle = "rgba(245,248,250,.95)";
      ctx.lineWidth = 1;
      [[0,8,16,8],[8,0,8,16],[0,0,16,16],[16,0,0,16]].forEach(([x1,y1,x2,y2]) => { ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke(); });
      [3,6].forEach((radius) => { ctx.beginPath();ctx.arc(8,8,radius,0,Math.PI*2);ctx.stroke(); });
    } else if (caveMushroom) {
      ctx.fillStyle = "#dfc7a2";
      ctx.fillRect(7,7,2,9);
      ctx.fillStyle = type === "red_mushroom" ? "#bd3740" : "#7c5a43";
      ctx.fillRect(3,5,10,3); ctx.fillRect(5,3,6,2); ctx.fillRect(1,7,14,2);
      ctx.fillStyle = type === "red_mushroom" ? "#f0d9bd" : "#c6a27d";
      ctx.fillRect(5,5,1,1);ctx.fillRect(9,4,1,1);ctx.fillRect(12,7,1,1);
    } else {
      const definition = BLOCK_TYPES[type] || {};
      const stage = Number.isFinite(definition.growthStage) ? definition.growthStage : 2;
      const maxStage = wheatPlant ? 3 : 2;
      const height = 6 + Math.round((stage / maxStage) * 9);
      const stemColor = wheatPlant && stage >= 2 ? "#b6a141" : flowerPlant ? "#5f9f34" : "#61a83c";
      ctx.fillStyle = stemColor;
      const stems = stage === 0 ? [7, 9] : stage === 1 ? [4, 7, 10, 13] : [2, 5, 8, 11, 14];
      stems.forEach((x, index) => {
        const bladeHeight = Math.max(4, height - (index % 3));
        ctx.fillRect(x, 16 - bladeHeight, 1, bladeHeight);
        if (stage > 0 && index % 2 === 0) ctx.fillRect(Math.max(0, x - 1), 16 - bladeHeight + 4, 3, 1);
      });
      if (wheatPlant && stage >= 2) {
        ctx.fillStyle = stage >= 3 ? "#e3bd4b" : "#b9b34b";
        stems.forEach((x, index) => {
          if (index % 2 === 0) ctx.fillRect(Math.max(0, x - 1), Math.max(0, 16 - height - 1), 3, 3);
        });
      }
      if (flowerPlant && stage >= 2) {
        ctx.fillStyle = "#f2cf43";
        [[5, 5], [11, 4]].forEach(([x, y]) => {
          ctx.fillRect(x - 1, y, 3, 1);
          ctx.fillRect(x, y - 1, 1, 3);
          ctx.fillStyle = "#8b5a24";
          ctx.fillRect(x, y, 1, 1);
          ctx.fillStyle = "#f2cf43";
        });
      }
    }
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


  if (["oak_window", "oak_door", "oak_door_ew", "oak_door_open", "oak_door_ew_open", "oak_stairs", "stone_stairs", "ladder", "oak_fence", "fence_post", "oak_fence_gate", "oak_fence_gate_open", "hay_bale", "oak_table", "oak_chair", "bookshelf", "flower_pot", "woven_rug", "wall_lantern", "arcane_table", "wardstone", "arcane_lantern", "frontier_bed", "boss_altar", "titan_trophy", "ember_trophy", "void_trophy"].includes(type)) {
    if (type === "oak_window") {
      ctx.fillStyle = "#9ed9e5"; ctx.fillRect(2, 2, 12, 12);
      ctx.fillStyle = "rgba(232,252,255,.75)"; ctx.fillRect(3, 3, 4, 4); ctx.fillRect(9, 8, 4, 4);
      ctx.fillStyle = "#6e4529"; ctx.fillRect(0, 0, 16, 2); ctx.fillRect(0, 14, 16, 2); ctx.fillRect(0, 0, 2, 16); ctx.fillRect(14, 0, 2, 16); ctx.fillRect(7, 1, 2, 14);
    } else if (["oak_door", "oak_door_ew", "oak_door_open", "oak_door_ew_open", "oak_stairs", "ladder", "oak_fence", "fence_post", "oak_fence_gate", "oak_fence_gate_open", "oak_table", "oak_chair"].includes(type)) {
      ctx.fillStyle = "#6d4228"; [3,8,13].forEach((x) => ctx.fillRect(x,0,1,16));
      ctx.fillStyle = "#c38a50"; ctx.fillRect(1,2,14,1); ctx.fillRect(1,12,14,1);
      if (type.startsWith("oak_door")) { ctx.fillStyle="#d8b55e"; ctx.fillRect(12,8,2,2); }
    } else if (type === "hay_bale") {
      ctx.fillStyle="#c8ab3c"; ctx.fillRect(0,0,16,16); ctx.strokeStyle="#e4cd65"; ctx.lineWidth=1;
      for(let y=1;y<16;y+=3){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(16,y+2);ctx.stroke();}
      ctx.fillStyle="#8e6d27"; ctx.fillRect(0,4,16,2); ctx.fillRect(0,11,16,2);
    } else if (type === "stone_stairs") {
      ctx.fillStyle="#70767a"; ctx.fillRect(0,0,16,16); ctx.strokeStyle="#4c5155"; ctx.lineWidth=1;
      ctx.strokeRect(1,1,14,14); ctx.beginPath();ctx.moveTo(0,6);ctx.lineTo(16,6);ctx.moveTo(0,11);ctx.lineTo(16,11);ctx.stroke();
    } else if (type === "bookshelf") {
      ctx.fillStyle="#50301e"; ctx.fillRect(0,0,16,16); ctx.fillStyle="#a36a38"; [0,7,14].forEach((y)=>ctx.fillRect(0,y,16,2));
      ["#b6534e","#4f79a8","#d0a34a","#6d9a56"].forEach((color,index)=>{ctx.fillStyle=color;ctx.fillRect(2+index*3,2,2,5);ctx.fillRect(3+index*3,9,2,5);});
    } else if (type === "woven_rug") {
      ctx.fillStyle="#6d2634"; ctx.fillRect(0,0,16,16); ctx.fillStyle="#d28a63"; for(let y=1;y<16;y+=4)ctx.fillRect(0,y,16,1); ctx.fillStyle="#f1c47d"; for(let x=2;x<16;x+=5)ctx.fillRect(x,0,1,16);
    } else if (["arcane_table","wardstone","arcane_lantern"].includes(type)) {
      ctx.fillStyle = type === "wardstone" ? "#655384" : "#3d2857"; ctx.fillRect(0,0,16,16);
      ctx.strokeStyle="#79e8f2"; ctx.lineWidth=1; ctx.strokeRect(3,3,10,10); ctx.beginPath();ctx.moveTo(8,1);ctx.lineTo(14,8);ctx.lineTo(8,15);ctx.lineTo(2,8);ctx.closePath();ctx.stroke();
      ctx.fillStyle="#c7f8ff"; ctx.fillRect(7,7,2,2);
    } else if (type === "flower_pot") {
      ctx.fillStyle="#b75d45"; ctx.fillRect(3,3,10,3); ctx.fillStyle="#7f3d31"; ctx.fillRect(5,6,6,8); ctx.fillStyle="#d68060"; ctx.fillRect(6,7,2,5);
    } else if (type === "wall_lantern") {
      ctx.fillStyle="#29241e"; ctx.fillRect(2,2,12,12); ctx.fillStyle="#f7bf55"; ctx.fillRect(5,4,6,8); ctx.fillStyle="#fff0a6"; ctx.fillRect(7,5,2,5);
    } else if (type === "frontier_bed") {
      ctx.fillStyle="#552d31"; ctx.fillRect(0,0,16,16); ctx.fillStyle="#a44958"; ctx.fillRect(1,1,14,9); ctx.fillStyle="#d9c6a3"; ctx.fillRect(2,10,12,5); ctx.fillStyle="#e9ddc5"; ctx.fillRect(3,11,5,3); ctx.fillStyle="#6b402b"; ctx.fillRect(0,14,16,2);
    } else if (type === "boss_altar") {
      ctx.fillStyle="#21172e"; ctx.fillRect(0,0,16,16); ctx.fillStyle="#644787"; ctx.fillRect(1,1,14,14); ctx.strokeStyle="#d4a9ff"; ctx.lineWidth=1; ctx.strokeRect(3,3,10,10); ctx.beginPath();ctx.moveTo(8,1);ctx.lineTo(15,8);ctx.lineTo(8,15);ctx.lineTo(1,8);ctx.closePath();ctx.stroke(); ctx.fillStyle="#f7d273";ctx.fillRect(7,7,2,2);
    } else if (["titan_trophy","ember_trophy","void_trophy"].includes(type)) {
      const accent=type==="titan_trophy"?"#d7ad55":type==="ember_trophy"?"#ff7a42":"#c58cff"; ctx.fillStyle="#242126";ctx.fillRect(0,0,16,16);ctx.fillStyle=accent;ctx.fillRect(2,2,12,2);ctx.fillRect(2,12,12,2);ctx.fillRect(7,4,2,8);ctx.fillRect(4,7,8,2);
    }
  }

  if (["ancient_brick", "carved_rune_brick"].includes(type)) {
    ctx.fillStyle = shade(base, -0.3);
    [0, 8].forEach((y) => ctx.fillRect(0, y, 16, 1));
    ctx.fillRect(7, 0, 1, 8); ctx.fillRect(3, 9, 1, 7); ctx.fillRect(12, 9, 1, 7);
    ctx.fillStyle = shade(base, 0.18); ctx.fillRect(1, 1, 5, 1); ctx.fillRect(9, 9, 3, 1);
    if (type === "carved_rune_brick") {
      ctx.strokeStyle = "#9eefff"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(8,2);ctx.lineTo(12,7);ctx.lineTo(8,13);ctx.lineTo(4,7);ctx.closePath();ctx.stroke();
      ctx.fillStyle="#d9fbff";ctx.fillRect(7,7,2,2);
    }
  }
  if (type === "fossil_block") {
    ctx.strokeStyle="#e6d9b8";ctx.lineWidth=2;ctx.lineCap="round";
    ctx.beginPath();ctx.moveTo(2,13);ctx.lineTo(13,3);ctx.stroke();
    [[2,13],[5,14],[13,3],[11,1]].forEach(([x,y])=>{ctx.fillStyle="#ddd0ad";ctx.fillRect(x-1,y-1,3,3);});
    ctx.strokeStyle="#b8a67f";ctx.beginPath();ctx.arc(8,8,5,0.4,5.6);ctx.stroke();
  }
  if (["treasure_chest", "storage_chest", "enchantment_table", "paleontology_lab", "village_bell"].includes(type)) {
    if (["treasure_chest", "storage_chest"].includes(type)) {
      ctx.fillStyle=type === "storage_chest" ? "#78491f" : "#71431e";ctx.fillRect(0,0,16,16);ctx.fillStyle=type === "storage_chest" ? "#c8873d" : "#bd7b32";[2,8,14].forEach((y)=>ctx.fillRect(0,y,16,1));ctx.fillStyle=type === "storage_chest" ? "#d7dde1" : "#e7c15e";ctx.fillRect(7,5,2,6);
    } else if (type === "enchantment_table") {
      ctx.fillStyle="#27163a";ctx.fillRect(0,0,16,16);ctx.strokeStyle="#c98aff";ctx.strokeRect(2,2,12,12);ctx.beginPath();ctx.moveTo(2,8);ctx.lineTo(8,2);ctx.lineTo(14,8);ctx.lineTo(8,14);ctx.closePath();ctx.stroke();
    } else if (type === "paleontology_lab") {
      ctx.fillStyle="#5b5248";ctx.fillRect(0,0,16,16);ctx.fillStyle="#c7bd9e";ctx.fillRect(2,3,12,9);ctx.strokeStyle="#5d8f7a";ctx.beginPath();ctx.moveTo(4,10);ctx.lineTo(7,6);ctx.lineTo(10,9);ctx.lineTo(13,4);ctx.stroke();ctx.fillStyle="#79d4a5";ctx.fillRect(7,6,2,2);
    } else {
      ctx.fillStyle="#725722";ctx.fillRect(0,0,16,16);ctx.fillStyle="#e4b94c";ctx.beginPath();ctx.arc(8,8,5,0,Math.PI*2);ctx.fill();ctx.fillStyle="#6f511b";ctx.fillRect(7,3,2,8);
    }
  }

  if (type === "cracked_bone_brick") {
    ctx.fillStyle = "#8b806b";
    [0,8].forEach((y)=>ctx.fillRect(0,y,16,1)); ctx.fillRect(7,0,1,8); ctx.fillRect(3,9,1,7); ctx.fillRect(12,9,1,7);
    ctx.strokeStyle="#e6dcc4";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(2,13);ctx.lineTo(6,9);ctx.lineTo(10,12);ctx.lineTo(14,5);ctx.stroke();
    ctx.fillStyle="#d9cfb8";[[2,13],[14,5],[6,9]].forEach(([x,y])=>ctx.fillRect(x-1,y-1,2,2));
  }
  if (type === "monster_spawner") {
    ctx.fillStyle="#211a2a";ctx.fillRect(0,0,16,16);
    ctx.strokeStyle="#6f6380";ctx.lineWidth=1;[1,5,10,14].forEach((x)=>{ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,16);ctx.stroke();});[1,8,14].forEach((y)=>{ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(16,y);ctx.stroke();});
    ctx.fillStyle="#bd6cff";ctx.fillRect(6,6,4,4);ctx.fillStyle="#f0ccff";ctx.fillRect(7,7,2,2);
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
  if (typeof document === "undefined") return null;
  const requested = Number(localStorage.getItem("voxel:textureResolution") || 64);
  const resolution = [32,64,96,128,160,192,224,256].reduce((best,value)=>Math.abs(value-requested)<Math.abs(best-requested)?value:best,64);
  const key = `${type}:${face}:${resolution}`;
  if (textureCache.has(key)) return textureCache.get(key);
  const canvas = document.createElement("canvas");
  canvas.width = resolution; canvas.height = resolution;
  const ctx = canvas.getContext("2d"); ctx.imageSmoothingEnabled = false; ctx.scale(resolution / 16, resolution / 16);
  const base = faceBase(type, face);
  const textureSeed = hashText(key);
  drawPixelPattern(ctx, type, face, base, textureSeed);
  if (resolution >= 64) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const detailCount = resolution >= 256 ? 1500 : resolution >= 192 ? 1050 : resolution >= 128 ? 620 : resolution >= 96 ? 300 : 160;
    const grain = Math.max(1, Math.floor(resolution / 160));
    for (let index = 0; index < detailCount; index += 1) {
      const x = Math.floor(randomFrom(textureSeed, 3000 + index * 3) * resolution);
      const y = Math.floor(randomFrom(textureSeed, 3001 + index * 3) * resolution);
      const light = randomFrom(textureSeed, 3002 + index * 3) > 0.5;
      ctx.fillStyle = light ? "rgba(255,255,255,.055)" : "rgba(0,0,0,.07)";
      ctx.fillRect(x, y, grain, grain);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
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
  const requested = typeof window === "undefined" ? 64 : Number(localStorage.getItem("voxel:textureResolution") || 64);
  const cacheKey = `${type}:${requested}`;
  if (materialCache.has(cacheKey)) return materialCache.get(cacheKey);
  const definition = BLOCK_TYPES[type] || {};
  const faceShade = [0.84, 0.73, 1, 0.57, 0.91, 0.78];
  const materials = Array.from({ length: 6 }, (_, index) => {
    const map = createTexture(type, faceName(index));
    const transparent = Boolean(definition.transparent);
    const shadeValue = faceShade[index] ?? 0.88;
    return new THREE.MeshLambertMaterial({
      color: new THREE.Color(shadeValue, shadeValue, shadeValue),
      map,
      flatShading: true,
      transparent,
      opacity: type.includes("leaves") ? 0.92 : type === "glass" || type === "oak_window" ? 0.55 : type === "ice" ? 0.76 : type === "water" ? 0.58 : type === "lava" ? 0.9 : 1,
      alphaTest: type.includes("leaves") || ["seagrass", "kelp", "vine", "tall_grass", "wildflower"].includes(type) || type.startsWith("meadow_grass_") || type.startsWith("yellow_flower_") || type.startsWith("wheat_crop_") ? 0.18 : 0,
      depthWrite: !["glass", "oak_window", "ice", "water", "lava"].includes(type),
      dithering: false,
    });
  });
  materialCache.set(cacheKey, materials);
  return materials;
}

export function getPlantMaterial(type) {
  const requested = typeof window === "undefined" ? 64 : Number(localStorage.getItem("voxel:textureResolution") || 64);
  const cacheKey = `${type}:${requested}`;
  if (plantMaterialCache.has(cacheKey)) return plantMaterialCache.get(cacheKey);
  const source = getBlockMaterials(type)[0];
  const material = source.clone();
  material.side = THREE.DoubleSide;
  material.transparent = true;
  material.alphaTest = Math.max(0.2, material.alphaTest || 0);
  material.depthWrite = true;
  material.flatShading = true;
  material.needsUpdate = true;
  plantMaterialCache.set(cacheKey, material);
  return material;
}

const STRAIGHT_CRACK_SEGMENTS = [
  [32, 32, 32, 20],
  [32, 20, 24, 12],
  [32, 20, 42, 13],
  [32, 32, 21, 38],
  [21, 38, 12, 50],
  [21, 38, 14, 30],
  [32, 32, 44, 40],
  [44, 40, 55, 34],
  [44, 40, 49, 54],
  [32, 32, 28, 48],
  [28, 48, 20, 58],
  [28, 48, 38, 60],
  [32, 32, 46, 26],
  [46, 26, 58, 24],
  [46, 26, 52, 15],
  [32, 20, 31, 6],
  [24, 12, 15, 8],
  [42, 13, 52, 7],
  [12, 50, 7, 59],
  [55, 34, 61, 29],
  [49, 54, 55, 62],
  [20, 58, 12, 63],
  [58, 24, 63, 17],
  [14, 30, 5, 25],
];

function strokeStraightCracks(ctx, segments, width, color, offsetX = 0, offsetY = 0) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "square";
  ctx.lineJoin = "miter";
  ctx.beginPath();
  segments.forEach(([x1, y1, x2, y2]) => {
    ctx.moveTo(x1 + offsetX, y1 + offsetY);
    ctx.lineTo(x2 + offsetX, y2 + offsetY);
  });
  ctx.stroke();
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

  // Reveal a fixed, angular fracture network in clean stages. Every mark is a
  // straight line segment, so the damage reads like a voxel block splitting
  // instead of a hand-drawn squiggle or circular HUD overlay.
  const visibleCount = Math.min(
    STRAIGHT_CRACK_SEGMENTS.length,
    2 + stage * 2 + Math.floor(stage / 3)
  );
  const visibleSegments = STRAIGHT_CRACK_SEGMENTS.slice(0, visibleCount);
  const strength = 0.68 + stage * 0.028;

  // A one-pixel warm edge under the dark fracture gives the crack a recessed,
  // industrial cut while preserving the nearest-neighbor voxel presentation.
  strokeStraightCracks(
    ctx,
    visibleSegments,
    2.6 + stage * 0.1,
    `rgba(208, 181, 142, ${0.16 + stage * 0.012})`,
    1,
    1
  );
  strokeStraightCracks(
    ctx,
    visibleSegments,
    1.45 + stage * 0.11,
    `rgba(18, 14, 12, ${strength})`
  );

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  crackTextureCache.set(stage, texture);
  return texture;
}
