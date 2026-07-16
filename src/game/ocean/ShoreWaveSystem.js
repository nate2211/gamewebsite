import React, { useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { worldRuntime } from "../core/worldRuntime";
import { readRuntimeSettings } from "../config/runtimeSettings";

const WAVE_GEOMETRY = new THREE.PlaneGeometry(0.9, 0.24);
const DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function collectShorelinePositions(snapshot, cap = 180) {
  const positions = [];
  for (const chunk of snapshot.chunks) {
    const waters = chunk.visibleByType.water || [];
    for (const [x, y, z] of waters) {
      for (const [dx, dz] of DIRECTIONS) {
        const neighbor = worldRuntime.getBlockTypeAt(x + dx, y, z + dz);
        const belowNeighbor = worldRuntime.getBlockTypeAt(x + dx, y - 1, z + dz);
        if (neighbor !== "water" && belowNeighbor && belowNeighbor !== "water") {
          positions.push([x + dx * 0.42, y + 0.48, z + dz * 0.42, Math.atan2(dx, dz)]);
          break;
        }
      }
      if (positions.length >= cap) return positions;
    }
  }
  return positions;
}

export default function ShoreWaveSystem() {
  const snapshot = useSyncExternalStore(worldRuntime.subscribe, worldRuntime.getSnapshot, worldRuntime.getServerSnapshot);
  const settings = useMemo(readRuntimeSettings, []);
  const waveCap = settings.waterQuality === "low" ? 70 : settings.waterQuality === "medium" ? 120 : 180;
  const waves = useMemo(() => settings.shorelineWaves ? collectShorelinePositions(snapshot, waveCap) : [], [settings.shorelineWaves, snapshot, waveCap]);
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.count = waves.length;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }, [waves.length]);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const time = clock.elapsedTime;
    waves.forEach(([x, y, z, rotation], index) => {
      const phase = time * 1.7 + index * 0.37;
      const advance = (Math.sin(phase) + 1) * 0.11;
      dummy.position.set(x + Math.sin(rotation) * advance, y + Math.sin(phase * 1.3) * 0.035, z + Math.cos(rotation) * advance);
      dummy.rotation.set(-Math.PI / 2, 0, rotation);
      dummy.scale.set(0.72 + (Math.sin(phase) + 1) * 0.28, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (!waves.length) return null;
  return (
    <instancedMesh ref={meshRef} args={[WAVE_GEOMETRY, undefined, waves.length]} frustumCulled dispose={null} renderOrder={8}>
      <meshBasicMaterial color="#d7f7ff" transparent opacity={0.48} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
    </instancedMesh>
  );
}
