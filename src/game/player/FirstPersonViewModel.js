import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import { useSelector } from "react-redux";
import { BLOCK_TYPES, getItemDefinition } from "../config/blockTypes";
import { getBlockMaterials } from "../world/rendering/voxelTextures";

const HANDLE_GEOMETRY = new THREE.BoxGeometry(0.09, 0.78, 0.09);
const SMALL_CUBE = new THREE.BoxGeometry(0.42, 0.42, 0.42);

function ViewMaterial({ color, emissive = "#000000", emissiveIntensity = 0 }) {
  return (
    <meshLambertMaterial
      color={color}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
      depthTest={false}
      depthWrite={false}
    />
  );
}

function ToolHead({ definition }) {
  const color = definition.color || "#aaaaaa";
  const edge = definition.tier >= 4 ? "#e9ffff" : "#c8c8c8";
  if (definition.toolType === "pickaxe") {
    return (
      <group position={[0, 0.38, 0]}>
        <mesh scale={[0.74, 0.12, 0.13]}><boxGeometry args={[1, 1, 1]} /><ViewMaterial color={color} /></mesh>
        <mesh position={[-0.39, -0.07, 0]} rotation={[0, 0, -0.62]} scale={[0.2, 0.32, 0.13]}><boxGeometry args={[1, 1, 1]} /><ViewMaterial color={color} /></mesh>
        <mesh position={[0.39, -0.07, 0]} rotation={[0, 0, 0.62]} scale={[0.2, 0.32, 0.13]}><boxGeometry args={[1, 1, 1]} /><ViewMaterial color={color} /></mesh>
        <mesh position={[0, 0.07, -0.075]} scale={[0.54, 0.035, 0.018]}><boxGeometry args={[1, 1, 1]} /><ViewMaterial color={edge} /></mesh>
      </group>
    );
  }
  if (definition.toolType === "axe") {
    return (
      <group position={[0.2, 0.33, 0]}>
        <mesh scale={[0.46, 0.5, 0.13]}><boxGeometry args={[1, 1, 1]} /><ViewMaterial color={color} /></mesh>
        <mesh position={[-0.26, 0, -0.075]} scale={[0.04, 0.38, 0.02]}><boxGeometry args={[1, 1, 1]} /><ViewMaterial color={edge} /></mesh>
      </group>
    );
  }
  if (definition.toolType === "shovel") {
    return (
      <group position={[0, 0.4, 0]}>
        <mesh scale={[0.3, 0.4, 0.13]}><boxGeometry args={[1, 1, 1]} /><ViewMaterial color={color} /></mesh>
        <mesh position={[0, -0.23, 0]} scale={[0.16, 0.12, 0.13]}><boxGeometry args={[1, 1, 1]} /><ViewMaterial color={color} /></mesh>
      </group>
    );
  }
  return (
    <group position={[0, 0.38, 0]}>
      <mesh position={[0, 0.29, 0]} scale={[0.12, 0.8, 0.08]}>
        <boxGeometry args={[1, 1, 1]} />
        <ViewMaterial color={color} />
      </mesh>
      <mesh position={[0, -0.1, 0]} scale={[0.5, 0.11, 0.13]}>
        <boxGeometry args={[1, 1, 1]} />
        <ViewMaterial color="#5c3c24" />
      </mesh>
      <mesh position={[0, 0.66, -0.055]} scale={[0.06, 0.58, 0.014]}>
        <boxGeometry args={[1, 1, 1]} />
        <ViewMaterial color={edge} />
      </mesh>
    </group>
  );
}


function HeldBlock({ itemId }) {
  const materials = useMemo(() => {
    const source = getBlockMaterials(itemId);
    const list = Array.isArray(source) ? source : [source];
    return list.map((material) => {
      const clone = material.clone();
      clone.depthTest = false;
      clone.depthWrite = false;
      clone.transparent = material.transparent;
      clone.needsUpdate = true;
      return clone;
    });
  }, [itemId]);

  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials]);

  return (
    <mesh
      geometry={SMALL_CUBE}
      material={materials}
      rotation={[0.2, 0.55, 0]}
      dispose={null}
      renderOrder={1004}
    />
  );
}

function HeldItem({ itemId }) {
  const definition = getItemDefinition(itemId);
  if (!itemId) return null;

  if (definition.category === "tool") {
    return (
      <group rotation={[0, 0, -0.14]}>
        <mesh geometry={HANDLE_GEOMETRY} position={[0, 0, 0]} dispose={null}>
          <ViewMaterial color="#79512f" />
        </mesh>
        <mesh position={[0, -0.05, -0.055]} scale={[0.05, 0.66, 0.014]}>
          <boxGeometry args={[1, 1, 1]} />
          <ViewMaterial color="#b98a55" />
        </mesh>
        <ToolHead definition={definition} />
      </group>
    );
  }

  if (BLOCK_TYPES[itemId]) {
    return <HeldBlock itemId={itemId} />;
  }

  if (itemId === "boat") {
    return (
      <group scale={0.42}>
        <mesh scale={[1.4, 0.3, 2]}><boxGeometry args={[1, 1, 1]} /><ViewMaterial color="#8d5d31" /></mesh>
        <mesh position={[0, 0.28, 0]} scale={[1.1, 0.22, 1.45]}><boxGeometry args={[1, 1, 1]} /><ViewMaterial color="#b07a43" /></mesh>
        <mesh position={[-0.72, 0.25, 0]} scale={[0.09, 0.12, 2.25]}><boxGeometry args={[1, 1, 1]} /><ViewMaterial color="#704420" /></mesh>
        <mesh position={[0.72, 0.25, 0]} scale={[0.09, 0.12, 2.25]}><boxGeometry args={[1, 1, 1]} /><ViewMaterial color="#704420" /></mesh>
      </group>
    );
  }

  return (
    <mesh geometry={SMALL_CUBE} scale={0.72} dispose={null}>
      <ViewMaterial color={definition.color || "#ffffff"} />
    </mesh>
  );
}

function FirstPersonArm({ handRef }) {
  const skin = "#d8a27d";
  const skinShadow = "#b97858";
  const sleeve = "#365d8d";
  const sleeveLight = "#4f78a7";
  return (
    <group>
      <mesh position={[0.05, -0.34, 0.23]} scale={[0.46, 0.5, 0.46]} rotation={[0.08, 0, -0.09]} renderOrder={1000}>
        <boxGeometry args={[1, 1, 1]} />
        <ViewMaterial color={sleeve} />
      </mesh>
      <mesh position={[0.05, -0.1, 0.17]} scale={[0.43, 0.15, 0.43]} rotation={[0.08, 0, -0.09]} renderOrder={1001}>
        <boxGeometry args={[1, 1, 1]} />
        <ViewMaterial color={sleeveLight} />
      </mesh>
      <mesh position={[0.04, 0.1, 0.1]} scale={[0.38, 0.34, 0.38]} rotation={[0.02, 0, -0.08]} renderOrder={1001}>
        <boxGeometry args={[1, 1, 1]} />
        <ViewMaterial color={skin} />
      </mesh>
      <group ref={handRef} position={[0.02, 0.32, 0.02]} rotation={[0.05, 0, -0.12]}>
        <mesh scale={[0.42, 0.3, 0.48]} renderOrder={1002}>
          <boxGeometry args={[1, 1, 1]} />
          <ViewMaterial color={skin} />
        </mesh>
        <mesh position={[-0.27, -0.01, -0.04]} rotation={[0, 0, 0.35]} scale={[0.16, 0.32, 0.2]} renderOrder={1003}>
          <boxGeometry args={[1, 1, 1]} />
          <ViewMaterial color={skinShadow} />
        </mesh>
        {[-0.16, -0.055, 0.055, 0.16].map((x, index) => (
          <mesh key={x} position={[x, 0.22, -0.04]} scale={[0.085, 0.28 - index * 0.012, 0.16]} renderOrder={1003}>
            <boxGeometry args={[1, 1, 1]} />
            <ViewMaterial color={skin} />
          </mesh>
        ))}
        <mesh position={[0, -0.17, 0.245]} scale={[0.34, 0.05, 0.018]} renderOrder={1004}>
          <boxGeometry args={[1, 1, 1]} />
          <ViewMaterial color={skinShadow} />
        </mesh>
      </group>
    </group>
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
  const basePosition = useMemo(() => new THREE.Vector3(0.59, -0.18, -0.76), []);

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
    group.visible = Boolean(enabled);
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
      jab = animation.current.kind === "attack" ? curve * 0.28 : curve * 0.12;
      roll = animation.current.kind === "use" ? -curve * 0.45 : curve * 0.92;
      if (progress >= 1) animation.current.active = false;
    }

    group.position.set(
      basePosition.x - swing * 0.25 + idleSway,
      basePosition.y - swing * 0.19 + idleBob,
      basePosition.z - jab
    );
    group.rotation.set(-0.12 - swing * 0.8, -0.18 + swing * 0.44, -0.18 - roll);

    if (handRef.current) handRef.current.rotation.z = -0.12 + swing * 0.3;
    if (itemRef.current) {
      itemRef.current.rotation.y = swing * 0.16;
      itemRef.current.rotation.x = -0.08 + swing * 0.08;
    }
  });

  return createPortal(
    <group ref={groupRef} frustumCulled={false} renderOrder={1000}>
      <FirstPersonArm handRef={handRef} />
      <group ref={itemRef} position={[0, 0.55, -0.08]} scale={0.92} renderOrder={1005}>
        <HeldItem itemId={usableItem} />
      </group>
      <pointLight position={[0.08, 0.1, 0.28]} intensity={0.52} distance={2.8} color="#ffe2c3" />
    </group>,
    camera
  );
}
