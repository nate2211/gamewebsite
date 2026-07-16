import React, {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useSelector } from "react-redux";
import { BLOCK_TYPES } from "./blockTypes";
import { blockKey, parseBlockKey } from "./worldUtils";
import { getBlockMaterials, getCrackTexture } from "./voxelTextures";
import { getPerformanceProfile } from "./performanceProfile";
import { worldRuntime } from "./worldRuntime";

const CENTER = new THREE.Vector2(0, 0);
const CUBE_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);
const TORCH_GEOMETRY = new THREE.CylinderGeometry(0.055, 0.075, 0.72, 6);
const PLANT_GEOMETRY = new THREE.BoxGeometry(0.58, 0.88, 0.08);
const FLAME_GEOMETRY = new THREE.OctahedronGeometry(0.105, 0);
const SHARD_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);
const HIGHLIGHT_GEOMETRY = new THREE.BoxGeometry(1.025, 1.025, 1.025);
const CRACK_PLANE_GEOMETRY = new THREE.PlaneGeometry(1.01, 1.01);
const SHARD_DIRECTIONS = [
  [1, 0.15, 0.15], [-1, -0.1, -0.2], [0.15, 1, 0.1], [-0.2, -1, 0.1],
  [0.1, 0.2, 1], [-0.15, -0.15, -1], [0.75, 0.65, 0.2], [-0.7, 0.55, -0.25],
  [0.6, -0.7, -0.1], [-0.55, -0.75, 0.25], [0.3, 0.55, -0.8], [-0.35, -0.45, 0.85],
].map((direction) => new THREE.Vector3(...direction).normalize());

function BlockInstances({ chunkId, cx, cz, type, positions, registerMesh }) {
  const meshRef = useRef();
  const matrixObject = useMemo(() => new THREE.Object3D(), []);
  const plant = type === "seagrass" || type === "kelp";
  const geometry = type === "torch" ? TORCH_GEOMETRY : plant ? PLANT_GEOMETRY : CUBE_GEOMETRY;
  const materials = useMemo(
    () => (type === "torch" ? getBlockMaterials(type)[0] : getBlockMaterials(type)),
    [type]
  );

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.count = positions.length;
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    positions.forEach(([x, y, z], index) => {
      matrixObject.position.set(x, type === "torch" ? y - 0.12 : plant ? y - 0.05 : y, z);
      matrixObject.rotation.set(0, plant ? ((x * 13 + z * 7) % 4) * Math.PI / 4 : 0, 0);
      matrixObject.scale.set(1, 1, 1);
      matrixObject.updateMatrix();
      mesh.setMatrixAt(index, matrixObject.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
    mesh.userData.positions = positions;
  }, [matrixObject, plant, positions, type]);

  const meshId = `${chunkId}:${type}`;
  return (
    <instancedMesh
      key={`${type}-${positions.length}`}
      ref={(node) => {
        meshRef.current = node;
        registerMesh(meshId, node, type, cx, cz);
      }}
      args={[geometry, materials, Math.max(1, positions.length)]}
      castShadow={false}
      receiveShadow={false}
      dispose={null}
      matrixAutoUpdate={type === "water" || plant}
      userData={{ blockType: type, chunkId, positions }}
    />
  );
}

const ChunkRender = memo(function ChunkRender({ chunk, registerMesh }) {
  return Object.entries(chunk.visibleByType).map(([type, positions]) => (
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
}, (previous, next) => previous.chunk.id === next.chunk.id && previous.chunk.revision === next.chunk.revision);

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

    const shake = Math.sin(clock.elapsedTime * (9 + progress * 30)) * progress * 0.012;
    group.rotation.set(shake, -shake * 0.7, shake * 0.45);
    group.scale.setScalar(1.001 + progress * 0.004);
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

export default function WorldRenderer({ targetRef, miningVisualRef, playerRef }) {
  const snapshot = useSyncExternalStore(
    worldRuntime.subscribe,
    worldRuntime.getSnapshot,
    worldRuntime.getServerSnapshot
  );
  const meshMap = useRef(new Map());
  const animationTimer = useRef(0);
  const raycastTimer = useRef(0);
  const raycaster = useMemo(() => {
    const next = new THREE.Raycaster();
    next.far = 6;
    return next;
  }, []);
  const { camera, invalidate } = useThree();
  const [highlight, setHighlight] = useState(null);
  const lastTargetKey = useRef("");

  // External runtime updates happen outside React Three Fiber's frame loop.
  // Demand mode therefore needs an explicit invalidation when a chunk arrives
  // or changes, otherwise the scene can stay visually blank while paused.
  useEffect(() => {
    invalidate();
  }, [invalidate, snapshot.version]);
  const torchPositions = useMemo(
    () => snapshot.chunks.flatMap((chunk) => chunk.visibleByType.torch || []),
    [snapshot]
  );

  const registerMesh = (id, node, type, cx, cz) => {
    if (node) {
      node.userData.blockType = type;
      node.userData.chunkCenter = [cx * 10 + 5, cz * 10 + 5];
      meshMap.current.set(id, node);
    } else {
      meshMap.current.delete(id);
    }
  };

  useFrame(({ clock }, delta) => {
    animationTimer.current += Math.min(delta, 0.1);
    if (animationTimer.current >= 0.05) {
      animationTimer.current = 0;
      const waterOffset = Math.sin(clock.elapsedTime * 1.25) * 0.028;
      const plantSway = Math.sin(clock.elapsedTime * 1.6) * 0.025;
      meshMap.current.forEach((mesh) => {
        if (mesh.userData.blockType === "water") mesh.position.y = waterOffset;
        else if (mesh.userData.blockType === "seagrass" || mesh.userData.blockType === "kelp") mesh.rotation.z = plantSway;
      });
    }

    raycastTimer.current += Math.min(delta, 0.1);
    if (raycastTimer.current < 1 / 30) return;
    raycastTimer.current = 0;
    raycaster.setFromCamera(CENTER, camera);

    const candidates = [];
    meshMap.current.forEach((mesh) => {
      const center = mesh.userData.chunkCenter;
      if (!center) return;
      const dx = center[0] - camera.position.x;
      const dz = center[1] - camera.position.z;
      if (dx * dx + dz * dz <= 18 * 18) candidates.push(mesh);
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
      {snapshot.chunks.map((chunk) => (
        <ChunkRender key={chunk.id} chunk={chunk} registerMesh={registerMesh} />
      ))}
      <TorchField positions={torchPositions} playerRef={playerRef} />
      <FurnaceGlow playerRef={playerRef} />
      {highlight && (
        <mesh position={highlight} geometry={HIGHLIGHT_GEOMETRY} renderOrder={25}>
          <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.62} depthTest={false} />
        </mesh>
      )}
      <MiningEffect miningVisualRef={miningVisualRef} />
    </>
  );
}
