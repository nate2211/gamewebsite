import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { worldRuntime } from "../core/worldRuntime";
import { readRuntimeSettings } from "../config/runtimeSettings";
import { SEA_LEVEL } from "../world/generation/worldGenerator";

const MAX_TILES = 1500;
const MAX_WHITECAPS = 360;
const SWELL_TILE = new THREE.PlaneGeometry(1.06, 1.06, 1, 1);
const WHITECAP_TILE = new THREE.PlaneGeometry(0.72, 0.16, 1, 1);

function qualityRadius(quality) {
  if (quality === "low") return 10;
  if (quality === "medium") return 14;
  return 19;
}

function isOceanSurface(x, z) {
  return worldRuntime.getBlockTypeAt(x, SEA_LEVEL, z) === "water"
    && worldRuntime.getBlockTypeAt(x, SEA_LEVEL + 1, z) !== "water";
}

function waveAt(x, z, time) {
  const primary = Math.sin(x * 0.17 + time * 0.92);
  const cross = Math.sin(z * 0.125 - time * 0.69);
  const diagonal = Math.sin((x + z) * 0.073 + time * 0.47);
  const height = primary * 0.055 + cross * 0.035 + diagonal * 0.028;
  const dx = Math.cos(x * 0.17 + time * 0.92) * 0.0094
    + Math.cos((x + z) * 0.073 + time * 0.47) * 0.002;
  const dz = Math.cos(z * 0.125 - time * 0.69) * 0.0044
    + Math.cos((x + z) * 0.073 + time * 0.47) * 0.002;
  return { height, dx, dz, crest: primary * 0.6 + cross * 0.25 + diagonal * 0.15 };
}

export default function OceanSwellSystem({ playerRef, enabled = true }) {
  const settings = useMemo(readRuntimeSettings, []);
  const radius = qualityRadius(settings.waterQuality);
  const waterRef = useRef();
  const foamRef = useRef();
  const cellsRef = useRef([]);
  const lastCenterRef = useRef({ x: Number.NaN, z: Number.NaN, revision: -1 });
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const waterColor = useMemo(() => new THREE.Color(), []);
  const waterMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: "#4da9e8",
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  }), []);
  const foamMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: "#effdff",
    transparent: true,
    opacity: 0.46,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  }), []);

  useEffect(() => () => {
    waterMaterial.dispose();
    foamMaterial.dispose();
  }, [foamMaterial, waterMaterial]);

  useFrame(({ clock }) => {
    const water = waterRef.current;
    const foam = foamRef.current;
    if (!water || !foam || !enabled) {
      if (water) water.count = 0;
      if (foam) foam.count = 0;
      return;
    }

    const player = playerRef?.current || { x: 0, z: 0 };
    const centerX = Math.round(Number(player.x) || 0);
    const centerZ = Math.round(Number(player.z) || 0);
    const revision = worldRuntime.getSnapshot().version;
    const previous = lastCenterRef.current;
    if (Math.abs(centerX - previous.x) >= 2 || Math.abs(centerZ - previous.z) >= 2 || revision !== previous.revision) {
      const next = [];
      for (let x = centerX - radius; x <= centerX + radius && next.length < MAX_TILES; x += 1) {
        for (let z = centerZ - radius; z <= centerZ + radius && next.length < MAX_TILES; z += 1) {
          if (Math.hypot(x - centerX, z - centerZ) > radius + 0.5) continue;
          if (!isOceanSurface(x, z)) continue;
          next.push([x, z]);
        }
      }
      cellsRef.current = next;
      lastCenterRef.current = { x: centerX, z: centerZ, revision };
    }

    const time = clock.elapsedTime;
    let waterIndex = 0;
    let foamIndex = 0;
    cellsRef.current.forEach(([x, z], index) => {
      const wave = waveAt(x, z, time);
      dummy.position.set(x, SEA_LEVEL + 0.506 + wave.height, z);
      dummy.rotation.set(-Math.PI / 2 + wave.dz * 2.5, wave.dx * 1.8, -wave.dx * 2.5);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      water.setMatrixAt(waterIndex, dummy.matrix);
      waterColor.setHSL(0.555 + wave.height * 0.12, 0.72, 0.61 + wave.height * 0.28);
      water.setColorAt(waterIndex, waterColor);
      waterIndex += 1;

      if (foamIndex < MAX_WHITECAPS && wave.crest > 0.82 && index % 3 === 0) {
        const direction = Math.atan2(wave.dz, wave.dx || 0.0001);
        dummy.position.set(x, SEA_LEVEL + 0.525 + wave.height, z);
        dummy.rotation.set(-Math.PI / 2, 0, direction);
        dummy.scale.set(0.7 + wave.crest * 0.25, 1, 1);
        dummy.updateMatrix();
        foam.setMatrixAt(foamIndex, dummy.matrix);
        foamIndex += 1;
      }
    });

    water.count = waterIndex;
    foam.count = foamIndex;
    water.instanceMatrix.needsUpdate = true;
    foam.instanceMatrix.needsUpdate = true;
    if (water.instanceColor) water.instanceColor.needsUpdate = true;
    waterMaterial.opacity = 0.22 + Math.sin(time * 0.55) * 0.025;
    foamMaterial.opacity = 0.42 + Math.sin(time * 1.25) * 0.06;
  });

  return (
    <group name="rolling-ocean-swell-system" userData={{ oceanSwells: true, whitecaps: true, gtaInspiredMotion: true }}>
      <instancedMesh ref={waterRef} args={[SWELL_TILE, waterMaterial, MAX_TILES]} frustumCulled={false} renderOrder={7} dispose={null} />
      <instancedMesh ref={foamRef} args={[WHITECAP_TILE, foamMaterial, MAX_WHITECAPS]} frustumCulled={false} renderOrder={8} dispose={null} />
    </group>
  );
}
