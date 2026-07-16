import { useFrame } from "@react-three/fiber";
import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useDispatch, useSelector } from "react-redux";
import { collectWorldDrop, spawnWorldDrop } from "../../../features/world/worldSlice";
import { getItemDefinition } from "../../config/blockTypes";

const DROP_GEOMETRY = new THREE.BoxGeometry(0.28, 0.28, 0.28);
function DroppedItem({ drop }) {
  const ref = useRef();
  const definition = getItemDefinition(drop.item);
  const material = useMemo(() => new THREE.MeshLambertMaterial({ color: definition.color || "#ffffff" }), [definition.color]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y += 0.025;
    ref.current.rotation.x = Math.sin(clock.elapsedTime * 1.4 + drop.x) * 0.16;
    ref.current.position.y = drop.y + 0.2 + Math.sin(clock.elapsedTime * 2.8 + drop.z) * 0.08;
  });
  return <mesh ref={ref} geometry={DROP_GEOMETRY} material={material} position={[drop.x, drop.y + 0.2, drop.z]} castShadow={false} receiveShadow={false} />;
}

export default function ItemDropSystem({ playerRef, enabled = true }) {
  const dispatch = useDispatch();
  const drops = useSelector((state) => state.world.droppedItems);
  const mobs = useSelector((state) => state.world.mobs);
  const pickupAccumulator = useRef(0);
  const eggAccumulator = useRef(0);
  const visibleDrops = useMemo(() => {
    const player = playerRef.current || { x: 0, z: 0 };
    return drops.map((drop) => ({ drop, d: (drop.x - player.x) ** 2 + (drop.z - player.z) ** 2 }))
      .filter(({ d }) => d < 52 * 52).sort((a, b) => a.d - b.d).slice(0, 90).map(({ drop }) => drop);
  }, [drops, playerRef]);
  useFrame((_, rawDelta) => {
    if (!enabled) return;
    const delta = Math.min(rawDelta, 0.1);
    pickupAccumulator.current += delta;
    eggAccumulator.current += delta;
    const player = playerRef.current;
    if (!player) return;
    if (pickupAccumulator.current >= 0.1) {
      pickupAccumulator.current = 0;
      const now = Date.now();
      const pickup = drops.find((drop) => now >= (drop.pickupDelayUntil || 0) && (drop.x-player.x)**2 + (drop.y-player.y)**2 + (drop.z-player.z)**2 <= 1.8**2);
      if (pickup) dispatch(collectWorldDrop(pickup.id));
    }
    if (eggAccumulator.current >= 22 && drops.length < 80) {
      eggAccumulator.current = 0;
      const chicken = mobs.find((mob) => mob.type === "chicken" && !mob.dyingUntil && (mob.x-player.x)**2 + (mob.z-player.z)**2 < 28**2);
      if (chicken && !drops.some((drop) => drop.item === "egg" && (drop.x-chicken.x)**2 + (drop.z-chicken.z)**2 < 3)) {
        dispatch(spawnWorldDrop({ item: "egg", amount: 1, x: chicken.x, y: chicken.y + 0.2, z: chicken.z, pickupDelayUntil: Date.now()+700 }));
      }
    }
  });
  return visibleDrops.map((drop) => <DroppedItem key={drop.id} drop={drop} />);
}
