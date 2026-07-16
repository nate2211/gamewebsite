import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useDispatch, useSelector } from "react-redux";
import { damagePlayer, syncMobs } from "../features/world/worldSlice";
import { MOB_TYPES } from "./mobTypes";
import { createHeightMap } from "./worldUtils";

const CENTER = new THREE.Vector2(0, 0);

function MobVisual({ runtimeMap, mob, registerHitMesh, active }) {
  const groupRef = useRef();
  const bodyRef = useRef();
  const headRef = useRef();
  const legRefs = useRef([]);
  const definition = MOB_TYPES[mob.type];

  useFrame(({ clock }) => {
    const group = groupRef.current;
    const current = runtimeMap.current[mob.id];
    if (!group || !current) return;
    group.visible = active;
    group.position.set(current.x, current.y, current.z);
    group.rotation.y = current.direction;

    const walk = Math.sin(clock.elapsedTime * 7 + current.phase) * 0.55;
    legRefs.current.forEach((leg, index) => {
      if (leg) leg.rotation.x = index % 2 === 0 ? walk : -walk;
    });

    if (mob.type === "slime") {
      const bounce = 1 + Math.sin(clock.elapsedTime * 5 + current.phase) * 0.08;
      group.scale.set(1 / bounce, bounce, 1 / bounce);
    } else {
      group.scale.set(1, 1, 1);
    }

    if (bodyRef.current) {
      bodyRef.current.position.y =
        mob.type === "zombie"
          ? 1.05 + Math.abs(Math.sin(clock.elapsedTime * 6 + current.phase)) * 0.025
          : 0.72 + Math.abs(Math.sin(clock.elapsedTime * 6 + current.phase)) * 0.02;
    }
    if (headRef.current && mob.type !== "slime") {
      headRef.current.rotation.y = Math.sin(clock.elapsedTime * 1.8 + current.phase) * 0.13;
    }
  });

  if (!definition) return null;

  const hostile = Boolean(definition.hostile);
  const zombie = mob.type === "zombie";
  const slime = mob.type === "slime";

  return (
    <group ref={groupRef} visible={active}>
      <mesh
        ref={(node) => {
          bodyRef.current = node;
          registerHitMesh(mob.id, node);
        }}
        position={[0, zombie ? 1.05 : slime ? 0.52 : 0.72, 0]}
        scale={definition.scale}
        userData={{ mobId: mob.id }}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshLambertMaterial
          color={definition.bodyColor}
          emissive={hostile ? "#100000" : "#000000"}
          emissiveIntensity={hostile ? 0.12 : 0}
        />
      </mesh>

      {!slime && (
        <mesh
          ref={headRef}
          position={zombie ? [0, 2.02, -0.02] : [0, 0.98, -0.72]}
          scale={zombie ? [0.7, 0.7, 0.7] : [0.58, 0.58, 0.62]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshLambertMaterial color={definition.headColor} />
        </mesh>
      )}

      {slime && (
        <>
          <mesh position={[-0.2, 0.65, -0.49]} scale={[0.12, 0.14, 0.04]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#101010" />
          </mesh>
          <mesh position={[0.2, 0.65, -0.49]} scale={[0.12, 0.14, 0.04]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#101010" />
          </mesh>
        </>
      )}

      {!slime &&
        [
          [-0.28, 0.24, -0.34],
          [0.28, 0.24, -0.34],
          [-0.28, 0.24, 0.34],
          [0.28, 0.24, 0.34],
        ].map((position, index) => (
          <mesh
            key={index}
            ref={(node) => {
              legRefs.current[index] = node;
            }}
            position={zombie ? [index < 2 ? -0.18 : 0.18, 0.35, 0] : position}
            scale={zombie ? [0.18, 0.7, 0.18] : [0.16, 0.5, 0.16]}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshLambertMaterial color={definition.headColor} />
          </mesh>
        ))}
    </group>
  );
}

export default function MobSystem({ playerRef, targetRef }) {
  const dispatch = useDispatch();
  const mobs = useSelector((state) => state.world.mobs);
  const blocks = useSelector((state) => state.world.blocks);
  const worldTime = useSelector((state) => state.world.worldTime);
  const { camera } = useThree();
  const runtimeMap = useRef({});
  const hitMeshes = useRef({});
  const syncTimer = useRef(0);
  const raycaster = useMemo(() => {
    const next = new THREE.Raycaster();
    next.far = 5.5;
    return next;
  }, []);
  const heightMap = useMemo(() => createHeightMap(blocks), [blocks]);
  const night = worldTime >= 13000 && worldTime <= 23000;

  useEffect(() => {
    const nextMap = {};
    mobs.forEach((mob, index) => {
      const current = runtimeMap.current[mob.id];
      nextMap[mob.id] = {
        x: current?.x ?? mob.x,
        y: current?.y ?? mob.y,
        z: current?.z ?? mob.z,
        direction: current?.direction ?? mob.direction ?? 0,
        wanderTimer: current?.wanderTimer ?? mob.wanderTimer ?? 2,
        phase: current?.phase ?? index * 1.37,
        attackCooldown: current?.attackCooldown ?? 0,
      };
    });
    runtimeMap.current = nextMap;
  }, [mobs]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const player = playerRef.current;
    if (!player) return;

    mobs.forEach((mob) => {
      const definition = MOB_TYPES[mob.type];
      const runtime = runtimeMap.current[mob.id];
      if (!definition || !runtime) return;
      const active = !definition.hostile || night;
      if (!active) return;

      runtime.attackCooldown = Math.max(0, runtime.attackCooldown - delta);
      runtime.wanderTimer -= delta;
      const dx = player.x - runtime.x;
      const dz = player.z - runtime.z;
      const distance = Math.hypot(dx, dz);

      let speed = definition.speed;
      if (definition.hostile && distance < 16) {
        runtime.direction = Math.atan2(dx, dz);
      } else if (runtime.wanderTimer <= 0) {
        runtime.wanderTimer = 1.5 + Math.random() * 4.5;
        runtime.direction += (Math.random() - 0.5) * Math.PI * 1.6;
        speed *= 0.62;
      } else {
        speed *= 0.42;
      }

      if (distance > 0.8 || !definition.hostile) {
        runtime.x += Math.sin(runtime.direction) * speed * delta;
        runtime.z += Math.cos(runtime.direction) * speed * delta;
      }
      runtime.x = THREE.MathUtils.clamp(runtime.x, -18.5, 18.5);
      runtime.z = THREE.MathUtils.clamp(runtime.z, -18.5, 18.5);

      const ground = heightMap[`${Math.round(runtime.x)},${Math.round(runtime.z)}`];
      if (ground != null) runtime.y = ground + 0.52;

      if (
        definition.hostile &&
        distance <= definition.attackRange &&
        runtime.attackCooldown <= 0
      ) {
        runtime.attackCooldown = 1.05;
        dispatch(damagePlayer(definition.attackDamage));
      }
    });

    raycaster.setFromCamera(CENTER, camera);
    const activeMeshes = mobs
      .filter((mob) => !MOB_TYPES[mob.type]?.hostile || night)
      .map((mob) => hitMeshes.current[mob.id])
      .filter(Boolean);
    const hit = raycaster.intersectObjects(activeMeshes, false)[0];
    targetRef.current = hit
      ? {
          kind: "mob",
          mobId: hit.object.userData.mobId,
          distance: hit.distance,
        }
      : null;

    syncTimer.current += delta;
    if (syncTimer.current >= 4) {
      syncTimer.current = 0;
      const positions = Object.fromEntries(
        Object.entries(runtimeMap.current).map(([id, runtime]) => [
          id,
          {
            x: Number(runtime.x.toFixed(3)),
            y: Number(runtime.y.toFixed(3)),
            z: Number(runtime.z.toFixed(3)),
            direction: runtime.direction,
            wanderTimer: runtime.wanderTimer,
          },
        ])
      );
      dispatch(syncMobs(positions));
    }
  });

  return mobs.map((mob) => {
    const definition = MOB_TYPES[mob.type];
    const active = !definition?.hostile || night;
    return (
      <MobVisual
        key={mob.id}
        mob={mob}
        runtimeMap={runtimeMap}
        active={active}
        registerHitMesh={(id, node) => {
          if (node) hitMeshes.current[id] = node;
          else delete hitMeshes.current[id];
        }}
      />
    );
  });
}
