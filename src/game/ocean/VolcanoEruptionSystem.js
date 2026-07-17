import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useSelector } from "react-redux";
import {
  getVolcanoSites,
  sampleBiome,
  sampleSurfaceHeight,
  SEA_LEVEL,
  VOLCANO_ERUPTION_PERIOD_SECONDS,
} from "../world/generation/worldGenerator";
import { particleRuntime } from "../particles/particleRuntime";

const SEGMENTS_PER_WAVE = 32;
const WAVE_COUNT = 3;
const MAX_ACTIVE_VOLCANOES = 3;
const WAVE_CAPACITY = SEGMENTS_PER_WAVE * WAVE_COUNT * MAX_ACTIVE_VOLCANOES;
const BOMB_CAPACITY = 18 * MAX_ACTIVE_VOLCANOES;
const LAVA_WAVE_GEOMETRY = new THREE.BoxGeometry(1, 0.18, 0.52);
const LAVA_BOMB_GEOMETRY = new THREE.BoxGeometry(0.32, 0.32, 0.32);

function distanceSquared(site, player) {
  const dx = site.x - (Number(player?.x) || 0);
  const dz = site.z - (Number(player?.z) || 0);
  return dx * dx + dz * dz;
}

export default function VolcanoEruptionSystem({ playerRef, enabled = true }) {
  const seed = useSelector((state) => state.world.seed);
  const sites = useMemo(() => getVolcanoSites(seed, 1600), [seed]);
  const waveRef = useRef();
  const bombRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const emittedCycleRef = useRef(new Map());
  const waveMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#ff5a1f",
    emissive: "#ff2a00",
    emissiveIntensity: 2.35,
    roughness: 0.42,
    metalness: 0.08,
    transparent: true,
    opacity: 0.94,
    toneMapped: false,
  }), []);
  const bombMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#ff9b28",
    emissive: "#ff3200",
    emissiveIntensity: 2.8,
    roughness: 0.55,
    transparent: true,
    opacity: 0.98,
    toneMapped: false,
  }), []);

  useEffect(() => () => {
    waveMaterial.dispose();
    bombMaterial.dispose();
  }, [bombMaterial, waveMaterial]);

  useFrame(({ clock }) => {
    const waveMesh = waveRef.current;
    const bombMesh = bombRef.current;
    if (!waveMesh || !bombMesh || !enabled || !seed) {
      if (waveMesh) waveMesh.count = 0;
      if (bombMesh) bombMesh.count = 0;
      return;
    }

    const player = playerRef?.current || { x: 0, z: 0 };
    const nearby = sites
      .filter((site) => distanceSquared(site, player) <= 340 * 340)
      .sort((a, b) => distanceSquared(a, player) - distanceSquared(b, player))
      .slice(0, MAX_ACTIVE_VOLCANOES);

    let waveIndex = 0;
    let bombIndex = 0;
    const elapsed = clock.elapsedTime;

    nearby.forEach((site) => {
      const shifted = elapsed + site.eruptionOffset;
      const cycleNumber = Math.floor(shifted / VOLCANO_ERUPTION_PERIOD_SECONDS);
      const cycleTime = shifted % VOLCANO_ERUPTION_PERIOD_SECONDS;
      const activeDuration = 8.4;
      if (cycleTime >= activeDuration) return;

      if (emittedCycleRef.current.get(site.id) !== cycleNumber) {
        emittedCycleRef.current.set(site.id, cycleNumber);
        particleRuntime.emitBlockParticles({
          position: [site.x, site.summitY + 1.2, site.z],
          blockType: "lava",
          count: 24,
          intensity: 1.9,
          kind: "volcanic-eruption",
        });
      }

      for (let wave = 0; wave < WAVE_COUNT; wave += 1) {
        const localTime = cycleTime - wave * 1.18;
        if (localTime < 0 || localTime > 6.4) continue;
        const radius = 2.3 + localTime * 5.25;
        const fade = THREE.MathUtils.clamp(1 - localTime / 6.4, 0.12, 1);
        for (let segment = 0; segment < SEGMENTS_PER_WAVE && waveIndex < WAVE_CAPACITY; segment += 1) {
          const angle = (segment / SEGMENTS_PER_WAVE) * Math.PI * 2 + wave * 0.23;
          const x = site.x + Math.cos(angle) * radius;
          const z = site.z + Math.sin(angle) * radius;
          const biome = sampleBiome(seed, Math.round(x), Math.round(z));
          const surfaceY = biome === "ocean"
            ? SEA_LEVEL + 0.54
            : sampleSurfaceHeight(seed, Math.round(x), Math.round(z)) + 0.58;
          const pulse = 0.88 + Math.sin(elapsed * 7 + segment * 0.6) * 0.12;
          dummy.position.set(x, surfaceY + Math.sin(elapsed * 5 + segment) * 0.045, z);
          dummy.rotation.set(0, -angle, 0);
          dummy.scale.set((radius * Math.PI * 2 / SEGMENTS_PER_WAVE) * 1.15, pulse, 0.72 + fade * 0.38);
          dummy.updateMatrix();
          waveMesh.setMatrixAt(waveIndex, dummy.matrix);
          waveIndex += 1;
        }
      }

      const bombTime = Math.min(cycleTime, 3.4);
      if (cycleTime < 3.4) {
        for (let index = 0; index < 18 && bombIndex < BOMB_CAPACITY; index += 1) {
          const launchDelay = (index % 6) * 0.11;
          const t = Math.max(0, bombTime - launchDelay);
          const angle = (index / 18) * Math.PI * 2 + cycleNumber * 0.71;
          const speed = 4.2 + (index % 5) * 0.55;
          const horizontal = t * speed;
          const height = Math.max(0, t * (8.4 + (index % 3)) - 4.9 * t * t);
          dummy.position.set(
            site.x + Math.cos(angle) * horizontal,
            site.summitY + 1.4 + height,
            site.z + Math.sin(angle) * horizontal
          );
          dummy.rotation.set(t * (2.2 + index * 0.03), angle, t * 1.7);
          dummy.scale.setScalar(0.72 + (index % 4) * 0.09);
          dummy.updateMatrix();
          bombMesh.setMatrixAt(bombIndex, dummy.matrix);
          bombIndex += 1;
        }
      }
    });

    waveMesh.count = waveIndex;
    bombMesh.count = bombIndex;
    waveMesh.instanceMatrix.needsUpdate = true;
    bombMesh.instanceMatrix.needsUpdate = true;
    waveMaterial.opacity = 0.88 + Math.sin(elapsed * 4.8) * 0.08;
    bombMaterial.emissiveIntensity = 2.5 + Math.sin(elapsed * 8) * 0.45;
  });

  return (
    <group name="volcanic-archipelago-eruptions" userData={{ volcanicLavaWaves: true, islandBiomes: true }}>
      <instancedMesh
        ref={waveRef}
        args={[LAVA_WAVE_GEOMETRY, waveMaterial, WAVE_CAPACITY]}
        frustumCulled={false}
        renderOrder={9}
        dispose={null}
      />
      <instancedMesh
        ref={bombRef}
        args={[LAVA_BOMB_GEOMETRY, bombMaterial, BOMB_CAPACITY]}
        frustumCulled={false}
        renderOrder={10}
        dispose={null}
      />
    </group>
  );
}
