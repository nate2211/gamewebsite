import React, { useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { liquidRuntime } from "./liquidRuntime";

const WATER_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);

export default function LiquidSystem({ enabled = true }) {
  const snapshot = useSyncExternalStore(
    liquidRuntime.subscribe,
    liquidRuntime.getSnapshot,
    liquidRuntime.getServerSnapshot
  );
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const simulationTimer = useRef(0);
  const material = useMemo(() => new THREE.MeshLambertMaterial({
    color: "#3f98df",
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  }), []);

  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    if (!enabled) return undefined;
    const timer = window.setInterval(() => liquidRuntime.step(true), 180);
    return () => window.clearInterval(timer);
  }, [enabled]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.count = snapshot.cells.length;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    snapshot.cells.forEach((cell, index) => {
      const height = cell.falling ? 1 : Math.max(0.125, (8 - cell.level) / 8);
      dummy.position.set(cell.x, cell.y - 0.5 + height / 2, cell.z);
      dummy.scale.set(cell.falling ? 0.72 : 0.98, height, cell.falling ? 0.72 : 0.98);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [dummy, snapshot]);

  useFrame(({ clock }, delta) => {
    simulationTimer.current += Math.min(delta, 0.1);
    if (!meshRef.current || simulationTimer.current < 0.05) return;
    simulationTimer.current = 0;
    meshRef.current.position.y = Math.sin(clock.elapsedTime * 2.1) * 0.018;
    material.opacity = 0.68 + Math.sin(clock.elapsedTime * 1.7) * 0.04;
  });

  if (!snapshot.cells.length) return null;
  return (
    <instancedMesh
      ref={meshRef}
      args={[WATER_GEOMETRY, material, Math.max(1, snapshot.cells.length)]}
      frustumCulled
      renderOrder={4}
      dispose={null}
    />
  );
}
