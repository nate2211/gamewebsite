import React, { memo, useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { getBlockMaterials } from "../world/rendering/voxelTextures";
import { createParticleVelocity, integrateParticle } from "../physics/particlePhysics";
import { particleRuntime } from "./particleRuntime";

const PARTICLE_GEOMETRY = new THREE.BoxGeometry(0.13, 0.13, 0.13);
const DUMMY = new THREE.Object3D();

function BlockParticleBurst({ burst }) {
  const meshRef = useRef();
  const finishedRef = useRef(false);
  const bodies = useMemo(() => Array.from({ length: burst.count }, (_, index) => ({
    position: new THREE.Vector3(
      burst.position[0] + (Math.random() - 0.5) * 0.45,
      burst.position[1] + (Math.random() - 0.5) * 0.45,
      burst.position[2] + (Math.random() - 0.5) * 0.45
    ),
    velocity: createParticleVelocity(index, burst.intensity),
    rotation: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI),
    spin: new THREE.Vector3(
      (Math.random() - 0.5) * 9,
      (Math.random() - 0.5) * 9,
      (Math.random() - 0.5) * 9
    ),
    scale: 0.72 + Math.random() * 0.5,
  })), [burst]);
  const materials = useMemo(() => {
    const source = getBlockMaterials(burst.blockType);
    const material = (Array.isArray(source) ? source[0] : source).clone();
    material.transparent = true;
    material.depthWrite = true;
    material.vertexColors = false;
    return material;
  }, [burst.blockType]);

  useEffect(() => () => materials.dispose(), [materials]);

  useLayoutEffect(() => {
    if (meshRef.current) meshRef.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }, []);

  useFrame((_, rawDelta) => {
    const mesh = meshRef.current;
    if (!mesh || finishedRef.current) return;
    const elapsed = (performance.now() - burst.startedAt) / 1000;
    const delta = Math.min(rawDelta, 0.05);
    const floorY = burst.position[1] - 0.47;
    bodies.forEach((body, index) => {
      integrateParticle(body, delta, floorY);
      const fade = THREE.MathUtils.clamp(1 - elapsed / 1.15, 0, 1);
      DUMMY.position.copy(body.position);
      DUMMY.rotation.copy(body.rotation);
      DUMMY.scale.setScalar(body.scale * Math.max(0.01, fade));
      DUMMY.updateMatrix();
      mesh.setMatrixAt(index, DUMMY.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    materials.opacity = THREE.MathUtils.clamp(1 - elapsed / 1.15, 0, 1);
    if (elapsed >= 1.18) {
      finishedRef.current = true;
      particleRuntime.removeBurst(burst.id);
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[PARTICLE_GEOMETRY, materials, Math.max(1, burst.count)]}
      frustumCulled={false}
      castShadow={false}
      receiveShadow={false}
      dispose={null}
    />
  );
}

const MemoBurst = memo(BlockParticleBurst);

export default function ParticleSystem() {
  const snapshot = useSyncExternalStore(
    particleRuntime.subscribe,
    particleRuntime.getSnapshot,
    particleRuntime.getServerSnapshot
  );

  return snapshot.bursts.map((burst) => <MemoBurst key={burst.id} burst={burst} />);
}
