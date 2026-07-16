import React, { memo, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useSelector } from "react-redux";
import { ITEM_TYPES } from "../../../game/config/blockTypes";


function PreviewTicker({ fps = 20 }) {
  const { invalidate } = useThree();
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") invalidate();
    }, Math.max(34, Math.round(1000 / fps)));
    return () => window.clearInterval(interval);
  }, [fps, invalidate]);
  return null;
}

const SKIN = "#c58b68";
const CLOTH = "#202936";
const CLOTH_DARK = "#111821";

function ArmorMaterial({ color, metalness = 0.55, roughness = 0.38 }) {
  return <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />;
}

function BoxPart({ position, scale, color, rotation = [0, 0, 0], metalness = 0.05, roughness = 0.72 }) {
  return (
    <mesh position={position} scale={scale} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <ArmorMaterial color={color} metalness={metalness} roughness={roughness} />
    </mesh>
  );
}

function armorColor(itemId, fallback = "#3b4656") {
  return itemId ? ITEM_TYPES[itemId]?.color || fallback : fallback;
}

function CharacterModel({ armor }) {
  const groupRef = useRef();
  const helmet = armor.helmet;
  const chestplate = armor.chestplate;
  const leggings = armor.leggings;
  const boots = armor.boots;
  const helmetColor = armorColor(helmet, "#34404d");
  const chestColor = armorColor(chestplate, CLOTH);
  const legColor = armorColor(leggings, CLOTH_DARK);
  const bootColor = armorColor(boots, "#171d25");

  useFrame(({ clock }, delta) => {
    const group = groupRef.current;
    if (!group) return;
    group.rotation.y += delta * 0.18;
    group.position.y = Math.sin(clock.elapsedTime * 1.7) * 0.025 - 0.15;
  });

  return (
    <group ref={groupRef} rotation={[0, -0.35, 0]}>
      <BoxPart position={[0, 2.53, 0]} scale={[0.72, 0.72, 0.68]} color={SKIN} />
      <BoxPart position={[-0.19, 2.63, -0.36]} scale={[0.09, 0.09, 0.035]} color="#151515" />
      <BoxPart position={[0.19, 2.63, -0.36]} scale={[0.09, 0.09, 0.035]} color="#151515" />
      <BoxPart position={[0, 2.38, -0.37]} scale={[0.24, 0.06, 0.035]} color="#8f4d47" />

      {helmet ? (
        <>
          <BoxPart position={[0, 2.78, 0]} scale={[0.84, 0.34, 0.76]} color={helmetColor} metalness={0.72} roughness={0.26} />
          <BoxPart position={[0, 2.6, -0.42]} scale={[0.82, 0.11, 0.08]} color={THREE.Color.NAMES.slategray} metalness={0.82} roughness={0.2} />
          <BoxPart position={[-0.34, 2.47, 0]} scale={[0.13, 0.34, 0.64]} color={helmetColor} metalness={0.72} roughness={0.26} />
          <BoxPart position={[0.34, 2.47, 0]} scale={[0.13, 0.34, 0.64]} color={helmetColor} metalness={0.72} roughness={0.26} />
        </>
      ) : (
        <BoxPart position={[0, 2.92, 0.04]} scale={[0.76, 0.22, 0.68]} color="#3a241c" />
      )}

      <BoxPart position={[0, 1.66, 0]} scale={[1.02, 1.22, 0.56]} color={chestplate ? chestColor : CLOTH} metalness={chestplate ? 0.7 : 0.05} roughness={chestplate ? 0.28 : 0.75} />
      {chestplate && (
        <>
          <BoxPart position={[0, 1.72, -0.31]} scale={[0.72, 0.75, 0.08]} color={chestColor} metalness={0.78} roughness={0.24} />
          <BoxPart position={[0, 1.34, -0.33]} scale={[0.9, 0.13, 0.09]} color="#2c2119" metalness={0.18} roughness={0.65} />
          <BoxPart position={[-0.62, 2.03, 0]} scale={[0.28, 0.22, 0.72]} color={chestColor} metalness={0.78} roughness={0.24} />
          <BoxPart position={[0.62, 2.03, 0]} scale={[0.28, 0.22, 0.72]} color={chestColor} metalness={0.78} roughness={0.24} />
        </>
      )}

      {[-1, 1].map((side) => (
        <group key={`arm-${side}`} position={[side * 0.72, 1.62, 0]}>
          <BoxPart position={[0, 0.08, 0]} scale={[0.27, 1.1, 0.3]} color={chestplate ? chestColor : CLOTH} metalness={chestplate ? 0.58 : 0.04} roughness={chestplate ? 0.34 : 0.78} />
          <BoxPart position={[0, -0.58, -0.01]} scale={[0.29, 0.24, 0.32]} color={SKIN} />
        </group>
      ))}

      <BoxPart position={[-0.3, 0.55, 0]} scale={[0.42, 1.42, 0.48]} color={leggings ? legColor : CLOTH_DARK} metalness={leggings ? 0.64 : 0.02} roughness={leggings ? 0.33 : 0.8} />
      <BoxPart position={[0.3, 0.55, 0]} scale={[0.42, 1.42, 0.48]} color={leggings ? legColor : CLOTH_DARK} metalness={leggings ? 0.64 : 0.02} roughness={leggings ? 0.33 : 0.8} />
      {leggings && (
        <>
          <BoxPart position={[-0.3, 0.95, -0.28]} scale={[0.43, 0.48, 0.08]} color={legColor} metalness={0.75} roughness={0.25} />
          <BoxPart position={[0.3, 0.95, -0.28]} scale={[0.43, 0.48, 0.08]} color={legColor} metalness={0.75} roughness={0.25} />
        </>
      )}
      <BoxPart position={[-0.3, -0.22, -0.08]} scale={[0.48, 0.34, 0.72]} color={boots ? bootColor : "#2b211b"} metalness={boots ? 0.68 : 0.05} roughness={boots ? 0.32 : 0.78} />
      <BoxPart position={[0.3, -0.22, -0.08]} scale={[0.48, 0.34, 0.72]} color={boots ? bootColor : "#2b211b"} metalness={boots ? 0.68 : 0.05} roughness={boots ? 0.32 : 0.78} />
    </group>
  );
}

function Scene({ armor }) {
  const ringMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: "#c99a4d", transparent: true, opacity: 0.42, side: THREE.DoubleSide }), []);
  return (
    <>
      <color attach="background" args={["#070b10"]} />
      <fog attach="fog" args={["#070b10", 6, 12]} />
      <ambientLight intensity={1.1} />
      <directionalLight position={[4, 7, 3]} intensity={2.2} color="#ffe7bd" />
      <directionalLight position={[-4, 2, -2]} intensity={1.3} color="#5f8ad7" />
      <pointLight position={[0, 2.6, -3]} intensity={12} distance={7} color="#d29348" />
      <CharacterModel armor={armor} />
      <mesh position={[0, -0.47, 0]} rotation={[-Math.PI / 2, 0, 0]} material={ringMaterial}>
        <ringGeometry args={[1.25, 1.5, 64]} />
      </mesh>
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[2.25, 64]} />
        <meshStandardMaterial color="#111820" metalness={0.2} roughness={0.72} />
      </mesh>
    </>
  );
}

function ArmorMannequinCanvas() {
  const armor = useSelector((state) => state.world.armor);
  return (
    <div className="armor-mannequin-canvas" aria-label="Rotating 3D player armor preview">
      <Canvas
        frameloop="demand"
        dpr={[0.85, 1.1]}
        camera={{ position: [0, 1.35, 6.2], fov: 38, near: 0.1, far: 30 }}
        gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
        shadows={false}
      >
        <PreviewTicker fps={20} />
        <Scene armor={armor} />
      </Canvas>
    </div>
  );
}

export default memo(ArmorMannequinCanvas);
