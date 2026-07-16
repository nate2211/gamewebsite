import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useDispatch, useSelector } from "react-redux";
import { setWeather } from "../../features/world/worldSlice";
import { sampleBiome } from "../world/generation/worldGenerator";

const PARTICLE_COUNT = 240;
const RAIN_GEOMETRY = new THREE.BoxGeometry(0.022, 0.72, 0.022);
const SNOW_GEOMETRY = new THREE.OctahedronGeometry(0.055, 0);

function makeParticle(index) {
  const random = (salt) => {
    const raw = Math.sin((index + 1) * (salt + 12.9898)) * 43758.5453;
    return raw - Math.floor(raw);
  };
  return {
    x: (random(1) - 0.5) * 30,
    y: random(2) * 18,
    z: (random(3) - 0.5) * 30,
    speed: 7 + random(4) * 8,
    sway: random(5) * Math.PI * 2,
  };
}

export default function WeatherSystem({ playerRef, enabled = true }) {
  const dispatch = useDispatch();
  const weather = useSelector((state) => state.world.weather);
  const seed = useSelector((state) => state.world.seed);
  const meshRef = useRef(null);
  const particles = useMemo(
    () => Array.from({ length: PARTICLE_COUNT }, (_, index) => makeParticle(index)),
    []
  );
  const helper = useMemo(() => new THREE.Object3D(), []);
  const weatherRef = useRef(weather);

  useEffect(() => {
    weatherRef.current = weather;
  }, [weather]);

  useEffect(() => {
    const chooseWeather = () => {
      const now = Date.now();
      const current = weatherRef.current || {};
      if (current.endsAt > now) return;

      const position = playerRef.current || { x: 0, z: 0 };
      const biome = sampleBiome(seed, Math.round(position.x), Math.round(position.z));
      const roll = Math.random();
      let type = "clear";
      let intensity = 0;

      if (["ice", "mountains"].includes(biome) && roll > 0.48) {
        type = "snow";
        intensity = 0.55 + Math.random() * 0.4;
      } else if (roll > 0.58) {
        type = "rain";
        intensity = 0.5 + Math.random() * 0.45;
      }

      dispatch(setWeather({
        type,
        intensity,
        startedAt: now,
        endsAt: now + (type === "clear" ? 45000 + Math.random() * 60000 : 55000 + Math.random() * 75000),
      }));
    };

    chooseWeather();
    const timer = window.setInterval(chooseWeather, 5000);
    return () => window.clearInterval(timer);
  }, [dispatch, playerRef, seed]);

  useFrame((_, rawDelta) => {
    const mesh = meshRef.current;
    const current = weatherRef.current;
    if (!mesh || !enabled || current?.type === "clear" || !playerRef.current) {
      if (mesh) mesh.visible = false;
      return;
    }

    mesh.visible = true;
    const delta = Math.min(rawDelta, 0.05);
    const snowing = current.type === "snow";
    const count = Math.round(PARTICLE_COUNT * Math.max(0.3, current.intensity || 0.5));
    mesh.count = count;
    const center = playerRef.current;
    const now = performance.now();

    for (let index = 0; index < count; index += 1) {
      const particle = particles[index];
      particle.y -= particle.speed * delta * (snowing ? 0.22 : 1);
      particle.x += (snowing ? Math.sin(now * 0.001 + particle.sway) * 0.22 : 1.3) * delta;
      if (particle.y < -2) {
        particle.y += 20;
        particle.x = ((particle.x + 15) % 30) - 15;
        particle.z = ((particle.z + 15) % 30) - 15;
      }

      helper.position.set(center.x + particle.x, center.y + particle.y, center.z + particle.z);
      helper.rotation.set(
        snowing ? particle.sway + now * 0.0007 : 0,
        0,
        snowing ? particle.sway : -0.18
      );
      helper.scale.setScalar(snowing ? 1 : 0.75 + (current.intensity || 0.5) * 0.4);
      helper.updateMatrix();
      mesh.setMatrixAt(index, helper.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  const snowing = weather.type === "snow";
  return (
    <instancedMesh
      key={snowing ? "snow" : "rain"}
      ref={meshRef}
      args={[snowing ? SNOW_GEOMETRY : RAIN_GEOMETRY, null, PARTICLE_COUNT]}
      frustumCulled={false}
      renderOrder={30}
    >
      <meshBasicMaterial
        color={snowing ? "#f5fbff" : "#9fccef"}
        transparent
        opacity={snowing ? 0.88 : 0.6}
        depthWrite={false}
        toneMapped={false}
      />
    </instancedMesh>
  );
}
