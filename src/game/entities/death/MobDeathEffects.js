import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

const SHARD_GEOMETRY = new THREE.BoxGeometry(0.12, 0.12, 0.12);
const SOUL_GEOMETRY = new THREE.IcosahedronGeometry(0.16, 1);
const RING_GEOMETRY = new THREE.RingGeometry(0.34, 0.42, 28);
const DUMMY = new THREE.Object3D();

function seeded(seed, index) {
  const value = Math.sin((seed + index * 19.37) * 91.71) * 43758.5453;
  return value - Math.floor(value);
}

export default function MobDeathEffects({ mob, definition }) {
  const shardRef = useRef();
  const soulRef = useRef();
  const ringRef = useRef();
  const startedAt = Number(mob.dyingAt || Date.now());
  const endsAt = Number(mob.dyingUntil || startedAt + 1350);
  const duration = Math.max(1, endsAt - startedAt);
  const seed = Number(mob.deathSeed || 0.5) * 100;
  const particles = useMemo(() => Array.from({ length: 18 }, (_, index) => {
    const angle = seeded(seed, index) * Math.PI * 2;
    const speed = 0.42 + seeded(seed, index + 41) * 1.25;
    return {
      x: (seeded(seed, index + 7) - 0.5) * 0.45,
      y: 0.45 + seeded(seed, index + 13) * 1.25,
      z: (seeded(seed, index + 23) - 0.5) * 0.45,
      vx: Math.cos(angle) * speed,
      vy: 1.1 + seeded(seed, index + 31) * 1.7,
      vz: Math.sin(angle) * speed,
      spin: (seeded(seed, index + 53) - 0.5) * 8,
      scale: 0.55 + seeded(seed, index + 61) * 1.25,
    };
  }), [seed]);

  useFrame(() => {
    const progress = THREE.MathUtils.clamp((Date.now() - startedAt) / duration, 0, 1);
    const time = progress * 1.35;
    const fade = 1 - THREE.MathUtils.smoothstep(progress, 0.52, 1);
    if (shardRef.current) {
      particles.forEach((particle, index) => {
        const floorY = -0.15;
        const x = particle.x + particle.vx * time;
        const rawY = particle.y + particle.vy * time - 4.8 * time * time;
        const y = Math.max(floorY, rawY);
        const z = particle.z + particle.vz * time;
        DUMMY.position.set(x, y, z);
        DUMMY.rotation.set(particle.spin * time, particle.spin * time * 0.63, particle.spin * time * 0.37);
        const settle = rawY <= floorY ? Math.max(0.2, 1 - (time - 0.45) * 0.5) : 1;
        DUMMY.scale.setScalar(particle.scale * settle * Math.max(0.08, fade));
        DUMMY.updateMatrix();
        shardRef.current.setMatrixAt(index, DUMMY.matrix);
      });
      shardRef.current.instanceMatrix.needsUpdate = true;
      shardRef.current.material.opacity = Math.max(0, fade);
    }
    if (soulRef.current) {
      soulRef.current.position.y = 1.0 + progress * 1.55 + Math.sin(progress * Math.PI * 5) * 0.08;
      soulRef.current.scale.setScalar((0.7 + Math.sin(progress * Math.PI) * 0.7) * fade);
      soulRef.current.rotation.y += 0.05;
      soulRef.current.material.opacity = fade * 0.82;
    }
    if (ringRef.current) {
      ringRef.current.scale.setScalar(0.8 + progress * 3.4);
      ringRef.current.material.opacity = fade * 0.65;
    }
  });

  const bodyColor = definition?.bodyColor || "#a8a8a8";
  const headColor = definition?.headColor || "#eeeeee";
  return (
    <group frustumCulled={false}>
      <instancedMesh ref={shardRef} args={[SHARD_GEOMETRY, null, particles.length]} frustumCulled={false}>
        <meshBasicMaterial color={bodyColor} transparent opacity={1} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <mesh ref={soulRef} geometry={SOUL_GEOMETRY} position={[0, 1, 0]} frustumCulled={false}>
        <meshBasicMaterial color={headColor} transparent opacity={0.82} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={ringRef} geometry={RING_GEOMETRY} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} frustumCulled={false}>
        <meshBasicMaterial color={bodyColor} transparent opacity={0.65} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}
