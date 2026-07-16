import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import { useSelector } from "react-redux";
import { BLOCK_TYPES, getItemDefinition } from "./blockTypes";
import { getBlockMaterials } from "./voxelTextures";

const HANDLE_GEOMETRY = new THREE.BoxGeometry(0.09, 0.78, 0.09);
const SMALL_CUBE = new THREE.BoxGeometry(0.42, 0.42, 0.42);
const HAND_GEOMETRY = new THREE.BoxGeometry(0.34, 0.58, 0.34);

function ToolHead({ definition }) {
  const color = definition.color || "#aaaaaa";
  if (definition.toolType === "pickaxe") {
    return (
      <group position={[0, 0.38, 0]}>
        <mesh scale={[0.72, 0.12, 0.12]}><boxGeometry args={[1, 1, 1]} /><meshLambertMaterial color={color} /></mesh>
        <mesh position={[-0.36, -0.06, 0]} rotation={[0, 0, -0.6]} scale={[0.18, 0.28, 0.12]}><boxGeometry args={[1, 1, 1]} /><meshLambertMaterial color={color} /></mesh>
        <mesh position={[0.36, -0.06, 0]} rotation={[0, 0, 0.6]} scale={[0.18, 0.28, 0.12]}><boxGeometry args={[1, 1, 1]} /><meshLambertMaterial color={color} /></mesh>
      </group>
    );
  }
  if (definition.toolType === "axe") {
    return (
      <mesh position={[0.18, 0.33, 0]} scale={[0.42, 0.46, 0.11]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshLambertMaterial color={color} />
      </mesh>
    );
  }
  if (definition.toolType === "shovel") {
    return (
      <mesh position={[0, 0.38, 0]} scale={[0.28, 0.38, 0.12]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshLambertMaterial color={color} />
      </mesh>
    );
  }
  return (
    <group position={[0, 0.38, 0]}>
      <mesh position={[0, 0.28, 0]} scale={[0.11, 0.78, 0.08]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshLambertMaterial color={color} />
      </mesh>
      <mesh position={[0, -0.1, 0]} scale={[0.48, 0.1, 0.12]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshLambertMaterial color="#5c3c24" />
      </mesh>
    </group>
  );
}

function HeldItem({ itemId }) {
  const definition = getItemDefinition(itemId);
  if (!itemId) return null;

  if (definition.category === "tool") {
    return (
      <group rotation={[0, 0, -0.14]}>
        <mesh geometry={HANDLE_GEOMETRY} position={[0, 0, 0]} dispose={null}>
          <meshLambertMaterial color="#79512f" />
        </mesh>
        <ToolHead definition={definition} />
      </group>
    );
  }

  if (BLOCK_TYPES[itemId]) {
    return (
      <mesh geometry={SMALL_CUBE} material={getBlockMaterials(itemId)} rotation={[0.2, 0.55, 0]} dispose={null} />
    );
  }

  if (itemId === "boat") {
    return (
      <group scale={0.42}>
        <mesh scale={[1.4, 0.3, 2]}><boxGeometry args={[1, 1, 1]} /><meshLambertMaterial color="#8d5d31" /></mesh>
        <mesh position={[0, 0.28, 0]} scale={[1.1, 0.22, 1.45]}><boxGeometry args={[1, 1, 1]} /><meshLambertMaterial color="#b07a43" /></mesh>
      </group>
    );
  }

  return (
    <mesh geometry={SMALL_CUBE} scale={0.72} dispose={null}>
      <meshLambertMaterial color={definition.color || "#ffffff"} />
    </mesh>
  );
}

export default function FirstPersonViewModel({ actionAnimationRef, enabled = true }) {
  const { camera } = useThree();
  const groupRef = useRef();
  const handRef = useRef();
  const itemRef = useRef();
  const selectedIndex = useSelector((state) => state.world.selectedIndex);
  const hotbar = useSelector((state) => state.world.hotbar);
  const inventory = useSelector((state) => state.world.inventory);
  const selectedItem = hotbar[selectedIndex] || null;
  const usableItem = selectedItem && (inventory[selectedItem] || 0) > 0 ? selectedItem : null;
  const animation = useRef({ active: false, kind: "mine", startedAt: 0, strength: 1 });
  const basePosition = useMemo(() => new THREE.Vector3(0.54, -0.48, -0.86), []);

  useEffect(() => {
    actionAnimationRef.current = {
      trigger(kind = "mine", strength = 1) {
        animation.current = {
          active: true,
          kind,
          startedAt: performance.now(),
          strength: THREE.MathUtils.clamp(strength, 0.5, 1.4),
        };
      },
    };
    return () => {
      actionAnimationRef.current = null;
    };
  }, [actionAnimationRef]);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;
    group.visible = enabled;
    if (!enabled) return;

    const idleBob = Math.sin(clock.elapsedTime * 2.2) * 0.012;
    const idleSway = Math.sin(clock.elapsedTime * 1.55) * 0.018;
    let swing = 0;
    let jab = 0;
    let roll = 0;

    if (animation.current.active) {
      const duration = animation.current.kind === "attack" ? 285 : animation.current.kind === "use" ? 240 : 360;
      const elapsed = performance.now() - animation.current.startedAt;
      const progress = THREE.MathUtils.clamp(elapsed / duration, 0, 1);
      const curve = Math.sin(progress * Math.PI);
      swing = curve * animation.current.strength;
      jab = animation.current.kind === "attack" ? Math.sin(progress * Math.PI) * 0.24 : curve * 0.12;
      roll = animation.current.kind === "use" ? -curve * 0.45 : curve * 0.92;
      if (progress >= 1) animation.current.active = false;
    }

    group.position.set(
      basePosition.x - swing * 0.23 + idleSway,
      basePosition.y - swing * 0.18 + idleBob,
      basePosition.z - jab
    );
    group.rotation.set(-0.12 - swing * 0.78, -0.18 + swing * 0.42, -0.18 - roll);

    if (handRef.current) handRef.current.rotation.z = -0.18 + swing * 0.24;
    if (itemRef.current) itemRef.current.rotation.y = swing * 0.16;
  });

  return createPortal(
    <group ref={groupRef} frustumCulled={false} renderOrder={1000}>
      <mesh position={[0.02, -0.64, 0.18]} scale={[0.38, 0.72, 0.38]} rotation={[0.04, 0, -0.08]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshLambertMaterial color="#365d8d" depthTest={false} depthWrite={false} />
      </mesh>
      <mesh ref={handRef} geometry={HAND_GEOMETRY} dispose={null} position={[0.02, -0.34, 0.08]} scale={[0.9, 1.25, 0.9]}>
        <meshLambertMaterial color="#d8a27d" depthTest={false} depthWrite={false} />
      </mesh>
      <group ref={itemRef} position={[0, 0.04, -0.04]} scale={0.9}>
        <HeldItem itemId={usableItem} />
      </group>
      <pointLight position={[0.1, 0.1, 0.3]} intensity={0.35} distance={2.4} color="#ffe2c3" />
    </group>,
    camera
  );
}
