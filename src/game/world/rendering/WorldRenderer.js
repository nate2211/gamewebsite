import React, {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useFrame, useThree } from "@react-three/fiber";
import { useSelector } from "react-redux";
import { BLOCK_TYPES } from "../../config/blockTypes";
import { blockKey, parseBlockKey } from "../../utils/worldUtils";
import { getBlockMaterials, getCrackTexture, getPlantMaterial } from "./voxelTextures";
import { getPerformanceProfile } from "../../config/performanceProfile";
import { worldRuntime } from "../../core/worldRuntime";
import { getChunkIdForPosition, getChunkIdsAround, parseChunkId } from "../generation/worldGenerator";

const CENTER = new THREE.Vector2(0, 0);
const CUBE_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);
const TORCH_GEOMETRY = new THREE.CylinderGeometry(0.055, 0.075, 0.72, 6);
function mergedBoxes(specs) {
  const parts = specs.map(([x, y, z, sx, sy, sz]) => {
    const geometry = new THREE.BoxGeometry(sx, sy, sz);
    geometry.translate(x, y, z);
    return geometry;
  });
  const result = mergeGeometries(parts, false);
  parts.forEach((part) => part.dispose());
  result.computeBoundingBox();
  result.computeBoundingSphere();
  return result;
}
const DECOR_GEOMETRIES = Object.freeze({
  oak_window: mergedBoxes([[-0.42,0,0,0.16,1,0.16],[0.42,0,0,0.16,1,0.16],[0,0.42,0,0.68,0.16,0.16],[0,-0.42,0,0.68,0.16,0.16],[0,0,0,0.12,0.68,0.12]]),
  // Minecraft-style doors are visually two blocks tall while the lower voxel
  // remains the authoritative interaction/collision cell. Facing is encoded by
  // a hidden block variant so it survives saves and multiplayer synchronization.
  oak_door: mergedBoxes([[0,0.5,0,0.92,2,0.14],[0,0.92,-0.09,0.78,0.12,0.08],[0,0.48,-0.09,0.78,0.12,0.08],[0,0.02,-0.09,0.78,0.12,0.08],[0.31,0.5,-0.105,0.08,0.1,0.06]]),
  oak_door_ew: mergedBoxes([[0,0.5,0,0.14,2,0.92],[-0.09,0.92,0,0.08,0.12,0.78],[-0.09,0.48,0,0.08,0.12,0.78],[-0.09,0.02,0,0.08,0.12,0.78],[-0.105,0.5,0.31,0.06,0.1,0.08]]),
  oak_door_open: mergedBoxes([[-0.42,0.5,0.39,0.14,2,0.92],[-0.51,0.92,0.39,0.08,0.12,0.78],[-0.51,0.48,0.39,0.08,0.12,0.78],[-0.51,0.02,0.39,0.08,0.12,0.78],[-0.525,0.5,0.7,0.06,0.1,0.08]]),
  oak_door_ew_open: mergedBoxes([[0.39,0.5,-0.42,0.92,2,0.14],[0.39,0.92,-0.51,0.78,0.12,0.08],[0.39,0.48,-0.51,0.78,0.12,0.08],[0.39,0.02,-0.51,0.78,0.12,0.08],[0.7,0.5,-0.525,0.08,0.1,0.06]]),
  oak_stairs: mergedBoxes([[0,-0.34,0.25,1,0.32,0.5],[0,-0.18,0,1,0.64,0.5],[0,0.08,-0.25,1,0.84,0.5]]),
  stone_stairs: mergedBoxes([[0,-0.34,0.25,1,0.32,0.5],[0,-0.18,0,1,0.64,0.5],[0,0.08,-0.25,1,0.84,0.5]]),
  ladder: mergedBoxes([[-0.34,0,0,0.1,1,0.1],[0.34,0,0,0.1,1,0.1],[0,-0.38,0,0.68,0.08,0.1],[0,-0.12,0,0.68,0.08,0.1],[0,0.14,0,0.68,0.08,0.1],[0,0.4,0,0.68,0.08,0.1]]),
  oak_fence: mergedBoxes([[0,0,0,0.18,1,0.18],[0,0.18,0,1,0.14,0.14],[0,-0.18,0,1,0.14,0.14]]),
  fence_post: mergedBoxes([[0,0,0,0.28,1,0.28],[0,0.48,0,0.38,0.08,0.38]]),
  oak_fence_gate: mergedBoxes([[-0.42,0,0,0.16,1,0.18],[0.42,0,0,0.16,1,0.18],[0,0.2,0,0.7,0.14,0.14],[0,-0.2,0,0.7,0.14,0.14],[-0.18,0,0,0.08,0.7,0.12],[0.18,0,0,0.08,0.7,0.12]]),
  oak_fence_gate_open: mergedBoxes([[-0.42,0,0,0.16,1,0.18],[-0.42,0,0.34,0.16,0.14,0.68],[-0.42,0,-0.05,0.16,0.14,0.68]]),
  hay_bale: mergedBoxes([[0,0,0,0.96,0.96,0.96],[0,0.18,0,1,0.08,1],[0,-0.18,0,1,0.08,1]]),
  oak_table: mergedBoxes([[0,0.34,0,0.96,0.18,0.96],[-0.34,-0.08,-0.34,0.16,0.72,0.16],[0.34,-0.08,-0.34,0.16,0.72,0.16],[-0.34,-0.08,0.34,0.16,0.72,0.16],[0.34,-0.08,0.34,0.16,0.72,0.16]]),
  oak_chair: mergedBoxes([[0,-0.1,0,0.7,0.16,0.7],[-0.26,-0.36,-0.25,0.12,0.55,0.12],[0.26,-0.36,-0.25,0.12,0.55,0.12],[-0.26,0.18,0.28,0.12,1.15,0.12],[0.26,0.18,0.28,0.12,1.15,0.12],[0,0.34,0.28,0.56,0.16,0.12]]),
  bookshelf: mergedBoxes([[0,0,0,0.92,0.96,0.26],[0,0.16,-0.18,0.82,0.1,0.08],[0,-0.18,-0.18,0.82,0.1,0.08]]),
  flower_pot: mergedBoxes([[0,-0.34,0,0.42,0.12,0.42],[0,-0.15,0,0.32,0.34,0.32],[0,0.03,0,0.46,0.1,0.46]]),
  woven_rug: mergedBoxes([[0,-0.46,0,0.96,0.08,0.96]]),
  wall_lantern: mergedBoxes([[0,-0.1,0,0.3,0.52,0.3],[0,0.24,0,0.42,0.1,0.42],[0,-0.4,0,0.42,0.1,0.42]]),
  arcane_lantern: mergedBoxes([[0,-0.05,0,0.38,0.6,0.38],[0,0.3,0,0.52,0.1,0.52],[0,-0.4,0,0.52,0.1,0.52]]),
  arcane_table: mergedBoxes([[0,0.33,0,0.98,0.2,0.98],[-0.34,-0.08,-0.34,0.18,0.72,0.18],[0.34,-0.08,-0.34,0.18,0.72,0.18],[-0.34,-0.08,0.34,0.18,0.72,0.18],[0.34,-0.08,0.34,0.18,0.72,0.18],[0,0.5,0,0.34,0.14,0.34]]),
  enchantment_table: mergedBoxes([[0,0.28,0,0.96,0.22,0.96],[-0.34,-0.1,-0.34,0.18,0.72,0.18],[0.34,-0.1,-0.34,0.18,0.72,0.18],[-0.34,-0.1,0.34,0.18,0.72,0.18],[0.34,-0.1,0.34,0.18,0.72,0.18],[0,0.51,0,0.56,0.12,0.4]]),
  paleontology_lab: mergedBoxes([[0,-0.22,0,0.96,0.54,0.96],[0,0.16,0,0.82,0.18,0.72],[-0.28,0.41,0,0.18,0.32,0.18],[0.28,0.41,0,0.18,0.32,0.18],[0,0.52,0,0.56,0.12,0.18]]),
  treasure_chest: mergedBoxes([[0,-0.18,0,0.92,0.56,0.74],[0,0.18,0,0.96,0.24,0.78],[0,0,-0.4,0.14,0.34,0.08]]),
  storage_chest: mergedBoxes([[0,-0.18,0,0.94,0.56,0.76],[0,0.18,0,0.98,0.24,0.8],[0,0,-0.41,0.16,0.36,0.09],[-0.38,0,-0.395,0.08,0.7,0.06],[0.38,0,-0.395,0.08,0.7,0.06]]),
  monster_spawner: mergedBoxes([[-0.42,0,0,0.1,0.94,0.1],[0.42,0,0,0.1,0.94,0.1],[0,0,-0.42,0.1,0.94,0.1],[0,0,0.42,0.1,0.94,0.1],[0,0.42,0,0.94,0.1,0.94],[0,-0.42,0,0.94,0.1,0.94],[0,0,0,0.34,0.34,0.34],[-0.27,0,0,0.08,0.72,0.08],[0.27,0,0,0.08,0.72,0.08],[0,0,-0.27,0.08,0.72,0.08],[0,0,0.27,0.08,0.72,0.08]]),
  village_bell: mergedBoxes([[0,-0.18,0,0.18,0.68,0.18],[-0.32,0.16,0,0.18,0.18,0.18],[0.32,0.16,0,0.18,0.18,0.18],[0,0.29,0,0.82,0.16,0.16],[0,0.02,0,0.46,0.48,0.46],[0,-0.26,0,0.16,0.12,0.16]]),
  frontier_bed: mergedBoxes([[0,-0.23,0,0.96,0.22,1.72],[0,0.02,-0.26,0.9,0.26,1.12],[0,0.08,0.52,0.82,0.18,0.42],[-0.4,-0.41,-0.68,0.14,0.44,0.14],[0.4,-0.41,-0.68,0.14,0.44,0.14],[-0.4,-0.41,0.68,0.14,0.44,0.14],[0.4,-0.41,0.68,0.14,0.44,0.14],[0,0.34,0.74,0.94,0.98,0.14]]),
  boss_altar: mergedBoxes([[0,-0.32,0,1.0,0.34,1.0],[0,-0.04,0,0.78,0.22,0.78],[0,0.18,0,0.54,0.22,0.54],[0,0.42,0,0.28,0.32,0.28],[-0.39,0.2,-0.39,0.12,0.66,0.12],[0.39,0.2,-0.39,0.12,0.66,0.12],[-0.39,0.2,0.39,0.12,0.66,0.12],[0.39,0.2,0.39,0.12,0.66,0.12]]),
  titan_trophy: mergedBoxes([[0,-0.35,0,0.72,0.22,0.72],[0,-0.02,0,0.46,0.58,0.38],[0,0.34,0,0.68,0.32,0.5],[-0.38,0.46,0,0.18,0.52,0.2],[0.38,0.46,0,0.18,0.52,0.2]]),
  ember_trophy: mergedBoxes([[0,-0.36,0,0.72,0.2,0.72],[0,-0.02,0,0.32,0.58,0.32],[0,0.34,0,0.56,0.34,0.76],[-0.38,0.4,0.08,0.18,0.5,0.18],[0.38,0.4,0.08,0.18,0.5,0.18],[0,0.62,0.12,0.18,0.38,0.18]]),
  void_trophy: mergedBoxes([[0,-0.36,0,0.72,0.2,0.72],[0,-0.02,0,0.28,0.58,0.28],[0,0.36,0,0.6,0.5,0.34],[-0.32,0.64,0,0.12,0.5,0.14],[0.32,0.64,0,0.12,0.5,0.14]]),
});
function createVoxelPlantGeometry() {
  const bladeSpecs = [
    [-0.3, 0.0, -0.12, 0.12, 1.0, 0.12],
    [-0.08, -0.08, 0.18, 0.12, 0.84, 0.12],
    [0.16, -0.02, -0.2, 0.12, 0.96, 0.12],
    [0.32, -0.12, 0.12, 0.12, 0.76, 0.12],
    [0.02, -0.18, -0.02, 0.14, 0.64, 0.14],
  ];
  const parts = bladeSpecs.map(([x, y, z, width, height, depth]) => {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    geometry.translate(x, y, z);
    return geometry;
  });
  const geometry = mergeGeometries(parts, false);
  parts.forEach((part) => part.dispose());
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function createVoxelVineGeometry() {
  const parts = [
    [-0.24, 0, 0, 0.1, 1, 0.1],
    [0, -0.08, 0, 0.1, 0.84, 0.1],
    [0.24, -0.18, 0, 0.1, 0.64, 0.1],
  ].map(([x, y, z, width, height, depth]) => {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    geometry.translate(x, y, z);
    return geometry;
  });
  const geometry = mergeGeometries(parts, false);
  parts.forEach((part) => part.dispose());
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

const PLANT_GEOMETRY = createVoxelPlantGeometry();
const VINE_GEOMETRY = createVoxelVineGeometry();
const MUSHROOM_GEOMETRY = mergedBoxes([[0,-0.18,0,0.22,0.64,0.22],[0,0.18,0,0.74,0.2,0.74],[-0.24,0.12,0,0.26,0.16,0.52],[0.24,0.12,0,0.26,0.16,0.52],[0,0.12,-0.24,0.52,0.16,0.26],[0,0.12,0.24,0.52,0.16,0.26]]);
const COBWEB_GEOMETRY = mergedBoxes([[0,0,0,0.94,0.045,0.045],[0,0,0,0.045,0.94,0.045],[0,0,0,0.045,0.045,0.94],[-0.23,0,0,0.035,0.72,0.035],[0.23,0,0,0.035,0.72,0.035],[0,-0.23,0,0.72,0.035,0.035],[0,0.23,0,0.72,0.035,0.035]]);
const PLANT_BLOCK_TYPES = new Set([
  "seagrass", "kelp", "tall_grass", "wildflower", "reeds", "vine",
  "meadow_grass_0", "meadow_grass_1", "meadow_grass_2",
  "yellow_flower_0", "yellow_flower_1", "yellow_flower_2",
  "wheat_crop_0", "wheat_crop_1", "wheat_crop_2", "wheat_crop_3",
  "brown_mushroom", "red_mushroom", "cobweb",
]);
const FLAME_GEOMETRY = new THREE.OctahedronGeometry(0.105, 0);
const SHARD_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);
const HIGHLIGHT_GEOMETRY = new THREE.BoxGeometry(1.025, 1.025, 1.025);
const CRACK_PLANE_GEOMETRY = new THREE.PlaneGeometry(1.01, 1.01);
const SURFACE_SHELL_GEOMETRY = new THREE.BoxGeometry(1.012, 1.012, 1.012);
const SHARD_DIRECTIONS = [
  [1, 0.15, 0.15], [-1, -0.1, -0.2], [0.15, 1, 0.1], [-0.2, -1, 0.1],
  [0.1, 0.2, 1], [-0.15, -0.15, -1], [0.75, 0.65, 0.2], [-0.7, 0.55, -0.25],
  [0.6, -0.7, -0.1], [-0.55, -0.75, 0.25], [0.3, 0.55, -0.8], [-0.35, -0.45, 0.85],
].map((direction) => new THREE.Vector3(...direction).normalize());

const PRIMER_SIZE = 11;
const PRIMER_RADIUS = Math.floor(PRIMER_SIZE / 2);
const PRIMER_BLOCKS = Array.from({ length: PRIMER_SIZE * PRIMER_SIZE }, (_, index) => {
  const x = (index % PRIMER_SIZE) - PRIMER_RADIUS;
  const z = Math.floor(index / PRIMER_SIZE) - PRIMER_RADIUS;
  return [x, 0, z, (x + z) % 3 === 0 ? "dirt" : "grass"];
});

function createUnlitBlockMaterials(type) {
  const source = getBlockMaterials(type);
  return source.map((material) => new THREE.MeshBasicMaterial({
    map: material.map || null,
    color: material.color || new THREE.Color("#ffffff"),
    transparent: material.transparent,
    opacity: material.opacity,
    alphaTest: material.alphaTest,
    depthWrite: true,
    toneMapped: false,
    fog: false,
  }));
}

function PrimerInstances({ positions, materials }) {
  const meshRef = useRef();
  const matrixObject = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || positions.length === 0) return;
    mesh.count = positions.length;
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    positions.forEach(([x, y, z], index) => {
      matrixObject.position.set(x, y, z);
      matrixObject.rotation.set(0, 0, 0);
      matrixObject.scale.set(1, 1, 1);
      matrixObject.updateMatrix();
      mesh.setMatrixAt(index, matrixObject.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
  }, [matrixObject, positions]);

  if (positions.length === 0) return null;
  return (
    <instancedMesh
      ref={meshRef}
      args={[CUBE_GEOMETRY, materials, positions.length]}
      count={positions.length}
      frustumCulled={false}
      castShadow={false}
      receiveShadow={false}
      dispose={null}
    />
  );
}

function LoadingVoxelPrimer({ playerRef }) {
  const groupRef = useRef();
  const initialPlayer = playerRef.current || { x: 0, y: 12, z: 0 };
  const grassMaterials = useMemo(() => createUnlitBlockMaterials("grass"), []);
  const dirtMaterials = useMemo(() => createUnlitBlockMaterials("dirt"), []);
  const grassPositions = useMemo(
    () => PRIMER_BLOCKS.filter(([, , , type]) => type === "grass").map(([x, y, z]) => [x, y, z]),
    []
  );
  const dirtTopPositions = useMemo(
    () => PRIMER_BLOCKS.filter(([, , , type]) => type === "dirt").map(([x, y, z]) => [x, y, z]),
    []
  );
  const dirtBasePositions = useMemo(
    () => PRIMER_BLOCKS.map(([x, y, z]) => [x, y - 1, z]),
    []
  );

  useEffect(() => () => {
    grassMaterials.forEach((material) => material.dispose());
    dirtMaterials.forEach((material) => material.dispose());
  }, [dirtMaterials, grassMaterials]);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const player = playerRef.current || initialPlayer;
    group.position.set(
      Math.floor(Number(player.x) || 0),
      (Number(player.y) || 12) - 0.52,
      Math.floor(Number(player.z) || 0)
    );
  });

  return (
    <group
      ref={groupRef}
      position={[
        Math.floor(Number(initialPlayer.x) || 0),
        (Number(initialPlayer.y) || 12) - 0.52,
        Math.floor(Number(initialPlayer.z) || 0),
      ]}
      renderOrder={1}
    >
      <PrimerInstances positions={grassPositions} materials={grassMaterials} />
      <PrimerInstances positions={dirtTopPositions} materials={dirtMaterials} />
      <PrimerInstances positions={dirtBasePositions} materials={dirtMaterials} />
    </group>
  );
}


function createSurfaceShellMaterials(type) {
  return createUnlitBlockMaterials(type).map((material) => {
    material.depthTest = true;
    material.depthWrite = !["water", "lava"].includes(type);
    material.transparent = Boolean(material.transparent || ["water", "lava"].includes(type));
    if (type === "water") material.opacity = Math.max(0.68, material.opacity || 0.68);
    if (type === "lava") material.opacity = Math.max(0.9, material.opacity || 0.9);
    material.polygonOffset = true;
    material.polygonOffsetFactor = -3;
    material.polygonOffsetUnits = -3;
    material.fog = false;
    material.toneMapped = false;
    material.needsUpdate = true;
    return material;
  });
}

function SurfaceShellInstances({ type, positions }) {
  const meshRef = useRef();
  const matrixObject = useMemo(() => new THREE.Object3D(), []);
  const materials = useMemo(() => createSurfaceShellMaterials(type), [type]);

  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || positions.length === 0) return;
    mesh.count = positions.length;
    mesh.visible = true;
    mesh.frustumCulled = true;
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    positions.forEach(([x, y, z], index) => {
      const waterHeight = ["water", "lava"].includes(type) ? 15 / 16 : 1;
      matrixObject.position.set(x, y - (1 - waterHeight) / 2, z);
      matrixObject.rotation.set(0, 0, 0);
      matrixObject.scale.set(1, waterHeight, 1);
      matrixObject.updateMatrix();
      mesh.setMatrixAt(index, matrixObject.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
    mesh.updateMatrixWorld(true);
  }, [matrixObject, positions, type]);

  if (positions.length === 0) return null;
  return (
    <instancedMesh
      ref={meshRef}
      args={[SURFACE_SHELL_GEOMETRY, materials, Math.max(1, positions.length)]}
      count={positions.length}
      frustumCulled
      castShadow={false}
      receiveShadow={false}
      renderOrder={5}
      dispose={null}
      userData={{ renderSafetyGround: true, blockType: type, fullVoxelShell: true }}
    />
  );
}

/**
 * Startup-only nearby surface renderer built from the actual generated world.
 *
 * The normal chunk renderer remains authoritative for interaction, caves, trees,
 * side faces, and all stable terrain. This shell renders the highest real voxel
 * in each nearby column only while primary chunk meshes are becoming ready. It is
 * removed once terrain stabilizes, preventing duplicate surfaces and z-fighting.
 */
function TerrainSurfaceShell({ snapshot, centerChunkId }) {
  const positionsByType = useMemo(() => {
    if (!centerChunkId || snapshot.chunks.length === 0) return {};
    const [centerCx, centerCz] = String(centerChunkId).split(",").map(Number);
    const required = new Set(getChunkIdsAround(centerCx * 10 + 5, centerCz * 10 + 5, 1));
    const highestByColumn = new Map();

    snapshot.chunks.forEach((chunk) => {
      if (!required.has(chunk.id)) return;
      Object.entries(chunk.visibleByType || {}).forEach(([type, positions]) => {
        if (type === "torch" || PLANT_BLOCK_TYPES.has(type)) return;
        const definition = BLOCK_TYPES[type];
        if (!definition || (definition.solid === false && type !== "water")) return;
        positions.forEach(([x, y, z]) => {
          const aboveType = worldRuntime.getBlockTypeAt(x, y + 1, z);
          if (type === "water") {
            if (aboveType === "water") return;
          } else {
            const aboveDefinition = BLOCK_TYPES[aboveType];
            if (aboveType && aboveDefinition?.solid !== false && !aboveDefinition?.transparent) return;
          }
          const key = `${x},${z}`;
          const previous = highestByColumn.get(key);
          if (!previous || y > previous[1]) highestByColumn.set(key, [type, y, x, z]);
        });
      });
    });

    const grouped = {};
    highestByColumn.forEach(([type, y, x, z]) => {
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push([x, y, z]);
    });
    return grouped;
  }, [centerChunkId, snapshot.chunks]);

  return Object.entries(positionsByType).map(([type, positions]) => (
    <SurfaceShellInstances key={`surface-shell-${type}`} type={type} positions={positions} />
  ));
}

function plantScaleForType(type) {
  const definition = BLOCK_TYPES[type] || {};
  if (type === "vine") return [0.9, 1.08, 0.9];
  if (type === "kelp") return [0.95, 1.1, 0.95];
  if (type === "reeds") return [0.78, 1.08, 0.78];
  if (["brown_mushroom", "red_mushroom"].includes(type)) return [0.58, 0.52, 0.58];
  if (type === "cobweb") return [1.05, 1.05, 1.05];
  const stage = Number.isFinite(definition.growthStage) ? definition.growthStage : 2;
  const maxStage = type.startsWith("wheat_crop_") ? 3 : 2;
  const height = 0.32 + (stage / maxStage) * 0.66;
  const width = type.startsWith("yellow_flower_") || type === "wildflower" ? 0.82 : 0.92;
  return [width, height, width];
}

function BlockInstances({ chunkId, cx, cz, type, positions, registerMesh }) {
  const meshRef = useRef();
  const matrixObject = useMemo(() => new THREE.Object3D(), []);
  const plant = PLANT_BLOCK_TYPES.has(type);
  const customGeometry = DECOR_GEOMETRIES[type] || null;
  const geometry = customGeometry || (type === "torch" ? TORCH_GEOMETRY : type === "vine" ? VINE_GEOMETRY : ["brown_mushroom", "red_mushroom"].includes(type) ? MUSHROOM_GEOMETRY : type === "cobweb" ? COBWEB_GEOMETRY : plant ? PLANT_GEOMETRY : CUBE_GEOMETRY);
  const materials = useMemo(() => {
    const blockMaterials = getBlockMaterials(type);
    if (type === "torch") return blockMaterials[0];
    if (plant) return getPlantMaterial(type);
    // mergeGeometries(..., false) produces no material groups. Passing a six-
    // material array to that geometry makes Three.js skip the draw entirely.
    // Use the front-face material for merged custom voxel shapes; cube geometry
    // keeps its normal six-face material array.
    if (customGeometry) return blockMaterials[4] || blockMaterials[0];
    return blockMaterials;
  }, [customGeometry, plant, type]);
  const meshId = `${chunkId}:${type}`;

  // A mesh is not render-ready merely because React assigned its ref. Instance
  // matrices must be written first. Reporting readiness from the ref callback
  // created a race where GamePage closed the loading gate and switched the
  // Canvas to demand mode before any voxel had a valid transform.
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || positions.length === 0) return undefined;

    mesh.count = positions.length;
    mesh.visible = true;
    mesh.frustumCulled = true;
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    positions.forEach(([x, y, z], index) => {
      const waterHeight = ["water", "lava"].includes(type) ? 15 / 16 : 1;
      const snowHeight = type === "snow_layer" ? 2 / 16 : 1;
      const renderHeight = Math.min(waterHeight, snowHeight);
      const renderY = type === "torch" ? y - 0.12 : y - (1 - renderHeight) / 2;
      matrixObject.position.set(x, renderY, z);
      matrixObject.rotation.set(0, plant ? ((x * 13 + z * 7) % 4) * Math.PI / 4 : 0, 0);
      if (plant) {
        const [plantWidth, plantHeight, plantDepth] = plantScaleForType(type);
        matrixObject.scale.set(plantWidth, plantHeight, plantDepth);
        matrixObject.position.y = y - 0.5 + plantHeight / 2;
      } else {
        matrixObject.scale.set(1, renderHeight, 1);
      }
      matrixObject.updateMatrix();
      mesh.setMatrixAt(index, matrixObject.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
    mesh.userData.positions = positions;
    mesh.userData.instanceMatricesReady = true;
    mesh.updateMatrixWorld(true);

    // Register only after the matrices and bounds exist. WorldRenderer then
    // invalidates a real drawable frame and reports the chunk as mounted.
    registerMesh(meshId, mesh, type, cx, cz);
    return () => registerMesh(meshId, null, type, cx, cz);
  }, [cx, cz, matrixObject, meshId, plant, positions, registerMesh, type]);

  return (
    <instancedMesh
      key={`${type}-${positions.length}`}
      ref={meshRef}
      args={[geometry, materials, Math.max(1, positions.length)]}
      frustumCulled
      castShadow={false}
      receiveShadow={false}
      dispose={null}
      matrixAutoUpdate={["water", "lava"].includes(type)}
      userData={{ blockType: type, chunkId, positions, instanceMatricesReady: false, voxelPlant: plant }}
    />
  );
}

const ChunkRender = memo(function ChunkRender({ chunk, registerMesh, renderDecorations = true }) {
  return Object.entries(chunk.visibleByType)
    .filter(([type]) => renderDecorations || (type !== "torch" && !PLANT_BLOCK_TYPES.has(type)))
    .map(([type, positions]) => (
    <BlockInstances
      key={type}
      chunkId={chunk.id}
      cx={chunk.cx}
      cz={chunk.cz}
      type={type}
      positions={positions}
      registerMesh={registerMesh}
    />
    ));
}, (previous, next) => (
  previous.chunk.id === next.chunk.id
  && previous.chunk.revision === next.chunk.revision
  && previous.renderDecorations === next.renderDecorations
));

function TorchField({ positions, playerRef }) {
  const flameRef = useRef();
  const matrixObject = useMemo(() => new THREE.Object3D(), []);
  const profile = useMemo(getPerformanceProfile, []);
  const [litPositions, setLitPositions] = useState([]);
  const lightTimer = useRef(0);

  useLayoutEffect(() => {
    const mesh = flameRef.current;
    if (!mesh) return;
    mesh.count = positions.length;
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    positions.forEach(([x, y, z], index) => {
      matrixObject.position.set(x, y + 0.22, z);
      matrixObject.scale.set(1, 1.25, 1);
      matrixObject.rotation.set(0, index * 0.7, 0);
      matrixObject.updateMatrix();
      mesh.setMatrixAt(index, matrixObject.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [matrixObject, positions]);

  useFrame(({ clock }, delta) => {
    if (flameRef.current) {
      const flicker = 0.93 + Math.sin(clock.elapsedTime * 17) * 0.055 + Math.sin(clock.elapsedTime * 31) * 0.025;
      flameRef.current.scale.setScalar(flicker);
    }
    lightTimer.current += Math.min(delta, 0.1);
    if (lightTimer.current < 0.45) return;
    lightTimer.current = 0;
    const player = playerRef.current || { x: 0, y: 0, z: 0 };
    setLitPositions(
      positions
        .map((position) => ({
          position,
          distance: (position[0] - player.x) ** 2 + (position[1] - player.y) ** 2 + (position[2] - player.z) ** 2,
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, profile.torchLights)
        .map((entry) => entry.position)
    );
  });

  if (positions.length === 0) return null;
  return (
    <>
      <instancedMesh
        ref={flameRef}
        args={[FLAME_GEOMETRY, undefined, Math.max(1, positions.length)]}
        frustumCulled
        dispose={null}
      >
        <meshBasicMaterial color="#ffd25a" toneMapped={false} />
      </instancedMesh>
      {litPositions.map(([x, y, z]) => (
        <pointLight
          key={`torch-light-${x}-${y}-${z}`}
          position={[x, y + 0.28, z]}
          color="#ffb347"
          intensity={1.8}
          distance={7.5}
          decay={2}
        />
      ))}
    </>
  );
}

function FurnaceGlow({ playerRef }) {
  const furnaces = useSelector((state) => state.world.furnaces);
  const player = playerRef.current || { x: 0, y: 0, z: 0 };
  const active = Object.keys(furnaces)
    .map((key) => ({ key, position: parseBlockKey(key) }))
    .sort((a, b) => {
      const ad = (a.position[0] - player.x) ** 2 + (a.position[2] - player.z) ** 2;
      const bd = (b.position[0] - player.x) ** 2 + (b.position[2] - player.z) ** 2;
      return ad - bd;
    })
    .slice(0, 4);

  return active.map(({ key, position: [x, y, z] }) => (
    <group key={`furnace-glow-${key}`} position={[x, y, z]}>
      <mesh position={[0, -0.05, 0.506]} scale={[0.48, 0.34, 0.025]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#ff7a21" toneMapped={false} />
      </mesh>
      <pointLight position={[0, 0.1, 0.7]} color="#ff7a21" intensity={1.15} distance={4.8} decay={2} />
    </group>
  ));
}

const CRACK_FACES = [
  { position: [0, 0, 0.506], rotation: [0, 0, 0] },
  { position: [0, 0, -0.506], rotation: [0, Math.PI, 0] },
  { position: [0.506, 0, 0], rotation: [0, Math.PI / 2, 0] },
  { position: [-0.506, 0, 0], rotation: [0, -Math.PI / 2, 0] },
  { position: [0, 0.506, 0], rotation: [-Math.PI / 2, 0, 0] },
  { position: [0, -0.506, 0], rotation: [Math.PI / 2, 0, 0] },
];

function MiningEffect({ miningVisualRef }) {
  const groupRef = useRef();
  const crackGroupRef = useRef();
  const crackMaterialRefs = useRef([]);
  const shardRefs = useRef([]);
  const shardMaterials = useRef([]);
  const lastStageRef = useRef(-1);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    const crackGroup = crackGroupRef.current;
    const visual = miningVisualRef.current;
    if (!group || !visual?.position) {
      if (group) group.visible = false;
      return;
    }

    const definition = BLOCK_TYPES[visual.blockType];
    const color = definition?.color || "#ffffff";
    group.visible = true;
    group.position.set(...visual.position);

    if (visual.mode === "burst") {
      if (crackGroup) crackGroup.visible = false;
      const elapsed = (performance.now() - visual.startedAt) / 420;
      const t = THREE.MathUtils.clamp(elapsed, 0, 1);
      group.scale.setScalar(1);
      group.rotation.set(t * 0.45, -t * 0.4, t * 0.25);
      shardRefs.current.forEach((shard, index) => {
        if (!shard) return;
        const direction = SHARD_DIRECTIONS[index];
        shard.visible = true;
        shard.position.copy(direction).multiplyScalar(0.36 + t * 1.7);
        shard.position.y += t * 0.5 - t * t * 0.85;
        shard.rotation.set(t * (index + 1), t * (index * 0.7 + 0.4), -t * index * 0.35);
        const size = Math.max(0.001, (1 - t) * (0.18 + (index % 3) * 0.035));
        shard.scale.set(size * 1.5, size, size * 0.8);
        const material = shardMaterials.current[index];
        if (material) {
          material.color.set(color);
          material.opacity = 0.9 * (1 - t);
        }
      });

      if (elapsed >= 1) {
        group.visible = false;
        if (miningVisualRef.current === visual) miningVisualRef.current = null;
      }
      return;
    }

    shardRefs.current.forEach((shard) => { if (shard) shard.visible = false; });
    if (crackGroup) crackGroup.visible = true;
    const progress = THREE.MathUtils.clamp(visual.progress || 0, 0, 1);
    const stage = Math.min(9, Math.floor(progress * 10));
    if (lastStageRef.current !== stage) {
      lastStageRef.current = stage;
      const texture = getCrackTexture(stage);
      crackMaterialRefs.current.forEach((material) => {
        if (!material) return;
        material.map = texture;
        material.opacity = 0.58 + progress * 0.34;
        material.needsUpdate = true;
      });
    }

    const impactPulse = Math.sin(clock.elapsedTime * (12 + progress * 24)) * progress * 0.0035;
    group.rotation.set(0, 0, 0);
    group.position.set(
      visual.position[0] + impactPulse,
      visual.position[1],
      visual.position[2]
    );
    group.scale.setScalar(1.001 + progress * 0.0025);
  });

  return (
    <group ref={groupRef} visible={false}>
      <group ref={crackGroupRef}>
        {CRACK_FACES.map((face, index) => (
          <mesh key={index} position={face.position} rotation={face.rotation} geometry={CRACK_PLANE_GEOMETRY} renderOrder={30}>
            <meshBasicMaterial
              ref={(material) => { crackMaterialRefs.current[index] = material; }}
              map={getCrackTexture(0)}
              transparent
              opacity={0.62}
              alphaTest={0.06}
              depthWrite={false}
              polygonOffset
              polygonOffsetFactor={-4}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
      {SHARD_DIRECTIONS.map((_, index) => (
        <mesh
          key={`shard-${index}`}
          visible={false}
          geometry={SHARD_GEOMETRY}
          ref={(node) => { shardRefs.current[index] = node; }}
        >
          <meshLambertMaterial
            ref={(material) => { shardMaterials.current[index] = material; }}
            transparent
            opacity={0}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function WorldRenderer({
  targetRef,
  miningVisualRef,
  playerRef,
  onChunkRendered,
  onChunkUnmounted,
  onTerrainRenderable,
  onTerrainUnavailable,
  interactionEnabled = true,
}) {
  const snapshot = useSyncExternalStore(
    worldRuntime.subscribe,
    worldRuntime.getSnapshot,
    worldRuntime.getServerSnapshot
  );
  const meshMap = useRef(new Map());
  const meshesByChunkRef = useRef(new Map());
  const waterMeshesRef = useRef(new Set());
  const reportedChunksRef = useRef(new Set());
  const renderableReportedRef = useRef(false);
  const [mountedMeshCount, setMountedMeshCount] = useState(0);
  const [centerChunkMounted, setCenterChunkMounted] = useState(false);
  const [terrainVisuallyStable, setTerrainVisuallyStable] = useState(false);
  const [centerChunkId, setCenterChunkId] = useState(() => getChunkIdForPosition(
    Number(playerRef.current?.x) || 0,
    Number(playerRef.current?.z) || 0
  ));
  const profile = useMemo(getPerformanceProfile, []);
  const renderRadius = Math.max(2, Number(profile.renderDistance) || 2);
  const detailRadius = Math.min(
    renderRadius,
    Math.max(4, Number(profile.simulationDistance) || 6)
  );
  const visibleChunks = useMemo(() => {
    const [centerCx, centerCz] = parseChunkId(centerChunkId);
    const radiusSquared = (renderRadius + 0.35) ** 2;
    return snapshot.chunks.filter((chunk) => {
      const dx = chunk.cx - centerCx;
      const dz = chunk.cz - centerCz;
      return dx * dx + dz * dz <= radiusSquared;
    });
  }, [centerChunkId, renderRadius, snapshot.chunks]);
  const detailedChunkIds = useMemo(() => {
    const [centerCx, centerCz] = parseChunkId(centerChunkId);
    const radiusSquared = (detailRadius + 0.35) ** 2;
    return new Set(visibleChunks.filter((chunk) => {
      const dx = chunk.cx - centerCx;
      const dz = chunk.cz - centerCz;
      return dx * dx + dz * dz <= radiusSquared;
    }).map((chunk) => chunk.id));
  }, [centerChunkId, detailRadius, visibleChunks]);
  const meshRegistryRafRef = useRef(null);
  const callbacksRef = useRef({
    onChunkRendered,
    onChunkUnmounted,
    onTerrainRenderable,
    onTerrainUnavailable,
  });
  const animationTimer = useRef(0);
  const centerCheckTimer = useRef(0);
  const raycastTimer = useRef(0);
  const raycaster = useMemo(() => {
    const next = new THREE.Raycaster();
    next.far = 6;
    return next;
  }, []);
  const visibilityRaycaster = useMemo(() => {
    const next = new THREE.Raycaster();
    next.near = 0;
    next.far = 48;
    return next;
  }, []);
  const downDirection = useMemo(() => new THREE.Vector3(0, -1, 0), []);
  const { camera, invalidate } = useThree();
  const [highlight, setHighlight] = useState(null);
  const lastTargetKey = useRef("");

  useEffect(() => {
    callbacksRef.current = {
      onChunkRendered,
      onChunkUnmounted,
      onTerrainRenderable,
      onTerrainUnavailable,
    };
  }, [onChunkRendered, onChunkUnmounted, onTerrainRenderable, onTerrainUnavailable]);

  // External runtime updates happen outside React Three Fiber's frame loop.
  // Demand mode therefore needs an explicit invalidation when a chunk arrives
  // or changes, otherwise the scene can stay visually blank while paused.
  useEffect(() => {
    invalidate();
  }, [invalidate, snapshot.version]);

  useEffect(() => {
    const loaded = new Set(snapshot.chunks.map((chunk) => chunk.id));
    if (loaded.size === 0) reportedChunksRef.current.clear();
    else {
      Array.from(reportedChunksRef.current).forEach((id) => {
        if (!loaded.has(id)) reportedChunksRef.current.delete(id);
      });
    }
  }, [snapshot.chunks]);
  const torchPositions = useMemo(
    () => visibleChunks
      .filter((chunk) => detailedChunkIds.has(chunk.id))
      .flatMap((chunk) => chunk.visibleByType.torch || []),
    [detailedChunkIds, visibleChunks]
  );

  const hasTerrainBelowCamera = useCallback(() => {
    if (meshMap.current.size === 0) return false;
    const player = playerRef.current || { x: camera.position.x, z: camera.position.z };
    const centerId = getChunkIdForPosition(Number(player.x) || 0, Number(player.z) || 0);
    const [centerCx, centerCz] = String(centerId).split(",").map(Number);
    const nearbyIds = new Set(getChunkIdsAround(centerCx * 10 + 5, centerCz * 10 + 5, 1));
    const candidates = [];
    nearbyIds.forEach((chunkId) => {
      const chunkMeshes = meshesByChunkRef.current.get(chunkId);
      chunkMeshes?.forEach((mesh) => {
        if (mesh.visible && mesh.count > 0) candidates.push(mesh);
      });
    });
    if (candidates.length === 0) return false;
    visibilityRaycaster.set(camera.position, downDirection);
    return visibilityRaycaster.intersectObjects(candidates, false).some((hit) => hit.distance <= 48);
  }, [camera, downDirection, playerRef, visibilityRaycaster]);

  useEffect(() => {
    if (mountedMeshCount <= 0 || !centerChunkMounted) {
      if (renderableReportedRef.current) callbacksRef.current.onTerrainUnavailable?.();
      renderableReportedRef.current = false;
      setTerrainVisuallyStable(false);
      return undefined;
    }
    if (renderableReportedRef.current) return undefined;

    // Readiness now requires geometry beneath the camera, not only React refs.
    // This prevents a mounted-but-offscreen or zero-transform chunk from closing
    // the loading gate and exposing only the scene background.
    let cancelled = false;
    let frameId = null;
    let stableFrames = 0;
    let attempts = 0;
    const verifyFrame = () => {
      if (cancelled) return;
      invalidate();
      attempts += 1;
      stableFrames = hasTerrainBelowCamera() ? stableFrames + 1 : 0;
      if (stableFrames < 10) {
        if (attempts % 30 === 0) callbacksRef.current.onTerrainUnavailable?.();
        frameId = window.requestAnimationFrame(verifyFrame);
        return;
      }
      renderableReportedRef.current = true;
      setTerrainVisuallyStable(true);
      callbacksRef.current.onTerrainRenderable?.({
        chunkCount: snapshot.chunks.length,
        blockCount: snapshot.blockCount,
        mountedMeshCount,
        groundRayConfirmed: true,
      });
      invalidate();
    };
    frameId = window.requestAnimationFrame(verifyFrame);
    return () => {
      cancelled = true;
      if (frameId != null) window.cancelAnimationFrame(frameId);
    };
  }, [
    invalidate,
    hasTerrainBelowCamera,
    centerChunkMounted,
    mountedMeshCount,
    snapshot.blockCount,
    snapshot.chunks.length,
  ]);

  const scheduleMeshRegistryUpdate = useCallback(() => {
    if (meshRegistryRafRef.current != null) return;
    meshRegistryRafRef.current = window.requestAnimationFrame(() => {
      meshRegistryRafRef.current = null;
      setMountedMeshCount(meshMap.current.size);
      const player = playerRef.current || { x: 0, z: 0 };
      const centerId = getChunkIdForPosition(Number(player.x) || 0, Number(player.z) || 0);
      setCenterChunkId((current) => current === centerId ? current : centerId);
      setCenterChunkMounted(meshesByChunkRef.current.has(centerId));
    });
  }, [playerRef]);

  useEffect(() => () => {
    if (meshRegistryRafRef.current != null) window.cancelAnimationFrame(meshRegistryRafRef.current);
  }, []);

  const registerMesh = useCallback((id, node, type, cx, cz) => {
    const chunkId = String(id).split(":")[0];
    if (node) {
      if (!node.userData.instanceMatricesReady || node.count <= 0) return;
      node.userData.blockType = type;
      node.userData.chunkCenter = [cx * 10 + 5, cz * 10 + 5];
      node.visible = true;
      node.frustumCulled = true;
      node.updateMatrixWorld(true);
      meshMap.current.set(id, node);
      let chunkMeshes = meshesByChunkRef.current.get(chunkId);
      if (!chunkMeshes) {
        chunkMeshes = new Set();
        meshesByChunkRef.current.set(chunkId, chunkMeshes);
      }
      chunkMeshes.add(node);
      if (type === "water") waterMeshesRef.current.add(node);
      scheduleMeshRegistryUpdate();
      if (!reportedChunksRef.current.has(chunkId)) {
        reportedChunksRef.current.add(chunkId);
        window.requestAnimationFrame(() => {
          invalidate();
          callbacksRef.current.onChunkRendered?.(chunkId);
        });
      }
      invalidate();
      return;
    }

    const previous = meshMap.current.get(id);
    const removed = meshMap.current.delete(id);
    if (previous) {
      waterMeshesRef.current.delete(previous);
      const chunkMeshes = meshesByChunkRef.current.get(chunkId);
      chunkMeshes?.delete(previous);
      if (chunkMeshes?.size === 0) meshesByChunkRef.current.delete(chunkId);
    }
    if (removed) scheduleMeshRegistryUpdate();
    const chunkStillMounted = meshesByChunkRef.current.has(chunkId);
    if (!chunkStillMounted && reportedChunksRef.current.delete(chunkId)) {
      callbacksRef.current.onChunkUnmounted?.(chunkId);
    }
    invalidate();
  }, [invalidate, scheduleMeshRegistryUpdate]);

  useFrame(({ clock }, delta) => {
    centerCheckTimer.current += Math.min(delta, 0.1);
    if (centerCheckTimer.current >= 0.25) {
      centerCheckTimer.current = 0;
      const player = playerRef.current || { x: 0, z: 0 };
      const centerId = getChunkIdForPosition(Number(player.x) || 0, Number(player.z) || 0);
      setCenterChunkId((current) => current === centerId ? current : centerId);
      const nextCenterMounted = meshesByChunkRef.current.has(centerId);
      setCenterChunkMounted((current) => current === nextCenterMounted ? current : nextCenterMounted);
    }

    if (!interactionEnabled) return;
    animationTimer.current += Math.min(delta, 0.1);
    if (animationTimer.current >= 0.05) {
      animationTimer.current = 0;
      const waterOffset = Math.sin(clock.elapsedTime * 1.25) * 0.028;
      waterMeshesRef.current.forEach((mesh) => {
        if (mesh.visible) mesh.position.y = waterOffset;
      });
    }

    raycastTimer.current += Math.min(delta, 0.1);
    if (raycastTimer.current < 1 / 30) return;
    raycastTimer.current = 0;
    raycaster.setFromCamera(CENTER, camera);

    const candidates = [];
    getChunkIdsAround(camera.position.x, camera.position.z, 1).forEach((chunkId) => {
      const chunkMeshes = meshesByChunkRef.current.get(chunkId);
      chunkMeshes?.forEach((mesh) => {
        if (mesh.visible && mesh.count > 0) candidates.push(mesh);
      });
    });
    const hit = raycaster.intersectObjects(candidates, false)[0];

    if (!hit || hit.instanceId == null || !hit.face) {
      targetRef.current = null;
      if (lastTargetKey.current) {
        lastTargetKey.current = "";
        setHighlight(null);
      }
      return;
    }

    const positions = hit.object.userData.positions;
    const position = positions?.[hit.instanceId];
    if (!position) return;
    const type = hit.object.userData.blockType;
    const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).round();
    const key = blockKey(position[0], position[1], position[2]);
    targetRef.current = {
      kind: "block",
      key,
      position,
      normal: [normal.x, normal.y, normal.z],
      type,
      distance: hit.distance,
    };

    if (lastTargetKey.current !== key) {
      lastTargetKey.current = key;
      setHighlight(position);
    }
  });

  return (
    <>
      {!terrainVisuallyStable && <TerrainSurfaceShell snapshot={snapshot} centerChunkId={centerChunkId} />}
      {!terrainVisuallyStable && <LoadingVoxelPrimer playerRef={playerRef} />}
      {visibleChunks.map((chunk) => (
        <ChunkRender
          key={chunk.id}
          chunk={chunk}
          registerMesh={registerMesh}
          renderDecorations={detailedChunkIds.has(chunk.id)}
        />
      ))}
      <TorchField positions={torchPositions} playerRef={playerRef} />
      <FurnaceGlow playerRef={playerRef} />
      {highlight && (
        <mesh position={highlight} geometry={HIGHLIGHT_GEOMETRY} renderOrder={25}>
          <meshBasicMaterial color="#101010" wireframe transparent opacity={0.78} depthTest={false} toneMapped={false} />
        </mesh>
      )}
      <MiningEffect miningVisualRef={miningVisualRef} />
    </>
  );
}
