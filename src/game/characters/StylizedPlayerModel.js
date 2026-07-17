import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const BOX = new THREE.BoxGeometry(1, 1, 1);

function Piece({ color, position, scale, rotation = [0, 0, 0], pieceRef }) {
  return (
    <mesh ref={pieceRef} geometry={BOX} position={position} scale={scale} rotation={rotation} castShadow={false} receiveShadow={false} dispose={null}>
      <meshLambertMaterial color={color} flatShading />
    </mesh>
  );
}

function paletteFor(profile) {
  return {
    skin: profile?.palette?.skin || "#c98a63",
    skinLight: new THREE.Color(profile?.palette?.skin || "#c98a63").lerp(new THREE.Color("#ffffff"), 0.16).getStyle(),
    shirt: profile?.palette?.shirt || "#3f7d56",
    trim: profile?.palette?.trim || "#a8d5a2",
    trousers: profile?.palette?.trousers || "#3a4656",
    hair: profile?.palette?.hair || "#38291f",
    leather: "#755137",
    metal: "#a9b1b6",
  };
}

export default function StylizedPlayerModel({ playerState, local = false }) {
  const rootRef = useRef();
  const torsoRef = useRef();
  const headRef = useRef();
  const armRefs = useRef([]);
  const legRefs = useRef([]);
  const previous = useRef(new THREE.Vector3());
  const velocity = useRef(0);
  const colors = useMemo(() => paletteFor(playerState), [playerState]);
  const modelDetail = useMemo(() => (typeof window === "undefined" ? "high" : localStorage.getItem("voxel:modelDetail") || "high"), []);

  useFrame(({ clock }, delta) => {
    const root = rootRef.current;
    if (!root) return;
    const position = playerState?.player || playerState?.position || { x: 0, y: 0, z: 0 };
    root.position.lerp(new THREE.Vector3(position.x || 0, position.y || 0, position.z || 0), 1 - Math.pow(0.0001, delta));
    const direction = Number(playerState?.rotation?.yaw ?? playerState?.direction ?? 0);
    root.rotation.y = THREE.MathUtils.lerp(root.rotation.y, direction, 0.22);
    const current = root.position;
    velocity.current = THREE.MathUtils.lerp(velocity.current, current.distanceTo(previous.current) / Math.max(delta, 0.001), 0.2);
    previous.current.copy(current);

    const moving = velocity.current > 0.18 || ["walk", "run", "sprint"].includes(playerState?.animation);
    const sprinting = velocity.current > 4.5 || playerState?.animation === "sprint";
    const attacking = ["mine", "attack", "use", "build"].includes(playerState?.animation);
    const phase = clock.elapsedTime * (sprinting ? 11 : 7.2);
    const gait = moving ? Math.sin(phase) * (sprinting ? 0.82 : 0.52) : Math.sin(clock.elapsedTime * 1.8) * 0.025;
    armRefs.current.forEach((arm, index) => {
      if (!arm) return;
      arm.rotation.x = attacking && index === 1
        ? -1.3 + Math.sin(clock.elapsedTime * 14) * 0.48
        : (index === 0 ? gait : -gait) * 0.82;
      arm.rotation.z = index === 0 ? 0.05 : -0.05;
    });
    legRefs.current.forEach((leg, index) => {
      if (leg) leg.rotation.x = (index === 0 ? -gait : gait) * 0.9;
    });
    if (torsoRef.current) torsoRef.current.rotation.z = moving ? Math.sin(phase * 0.5) * 0.035 : 0;
    if (headRef.current) headRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.7) * 0.06;
    root.position.y += moving ? Math.abs(Math.sin(phase)) * 0.035 : Math.sin(clock.elapsedTime * 1.9) * 0.012;
  });

  if (local) return null;
  return (
    <group ref={rootRef} position={[0, -100, 0]}>
      <group ref={torsoRef}>
        <Piece color={colors.shirt} position={[0, 1.28, 0]} scale={[0.78, 0.92, 0.42]} />
        <Piece color={colors.trim} position={[0, 1.55, -0.225]} scale={[0.62, 0.12, 0.035]} />
        <Piece color={colors.trim} position={[0, 1.33, -0.24]} scale={[0.48, 0.1, 0.03]} />
        <Piece color={colors.skinLight} position={[0, 1.14, -0.24]} scale={[0.2, 0.08, 0.03]} />
        <Piece color={colors.leather} position={[0, 0.89, 0]} scale={[0.84, 0.13, 0.46]} />
        <Piece color="#cbb88d" position={[0, 0.89, -0.24]} scale={[0.16, 0.12, 0.04]} />
        <Piece color={colors.leather} position={[0.18, 1.25, 0.24]} scale={[0.12, 0.78, 0.08]} rotation={[0, 0, -0.23]} />
        <Piece color={colors.metal} position={[-0.36, 1.5, 0]} scale={[0.1, 0.23, 0.47]} />
        {[-1, 1].map((side) => <Piece key={`shoulder-${side}`} color={colors.trim} position={[side * 0.44, 1.56, -0.02]} scale={[0.14, 0.16, 0.36]} />)}
        <Piece color={colors.leather} position={[0, 1.3, 0.22]} scale={[0.14, 0.84, 0.08]} />
        {modelDetail !== "standard" && (<>
          {[-1, 1].map((side) => <Piece key={`torso-rivet-${side}`} color={colors.metal} position={[side * 0.29, 1.02, -0.247]} scale={[0.045, 0.045, 0.025]} />)}
          <Piece color={colors.trim} position={[0, 1.7, -0.24]} scale={[0.34, 0.055, 0.025]} />
        </>)}
        {["ultra", "cinematic"].includes(modelDetail) && (<>
          <Piece color={colors.leather} position={[-0.27, 1.32, 0.25]} scale={[0.07, 0.66, 0.055]} rotation={[0, 0, 0.18]} />
          <Piece color={colors.metal} position={[0.34, 1.02, 0.23]} scale={[0.12, 0.18, 0.09]} />
        </>)}
        {modelDetail === "cinematic" && (<>
          {[-0.31, -0.155, 0, 0.155, 0.31].map((x, index) => <Piece key={`chest-stitch-${x}`} color={index % 2 ? colors.trim : colors.metal} position={[x, 1.43, -0.253]} scale={[0.027, 0.07, 0.018]} />)}
          <Piece color="#d7bd75" position={[0, 1.29, -0.26]} scale={[0.13, 0.13, 0.025]} rotation={[0, 0, Math.PI / 4]} />
        </>)}
      </group>
      <group ref={headRef} position={[0, 2.08, 0]}>
        <Piece color={colors.skin} position={[0, 0, 0]} scale={[0.66, 0.67, 0.62]} />
        <Piece color={colors.skinLight} position={[-0.18, 0.12, -0.322]} scale={[0.12, 0.14, 0.025]} />
        <Piece color={colors.skinLight} position={[0.18, 0.12, -0.322]} scale={[0.12, 0.14, 0.025]} />
        <Piece color="#1c2023" position={[-0.17, 0.08, -0.338]} scale={[0.075, 0.075, 0.02]} />
        <Piece color="#1c2023" position={[0.17, 0.08, -0.338]} scale={[0.075, 0.075, 0.02]} />
        <Piece color="#b98262" position={[0, -0.08, -0.336]} scale={[0.1, 0.12, 0.03]} />
        <Piece color="#9c684f" position={[0, -0.2, -0.334]} scale={[0.22, 0.04, 0.03]} />
        <Piece color={colors.hair} position={[0, 0.34, 0.02]} scale={[0.71, 0.18, 0.66]} />
        <Piece color={colors.hair} position={[0.28, 0.15, 0.12]} scale={[0.13, 0.32, 0.5]} />
        <Piece color={colors.hair} position={[-0.28, 0.15, 0.12]} scale={[0.13, 0.28, 0.48]} />
        <Piece color={colors.hair} position={[0, 0.16, -0.31]} scale={[0.46, 0.08, 0.04]} />
      </group>
      {[-1, 1].map((side, index) => (
        <group key={`arm-${side}`} ref={(node) => { armRefs.current[index] = node; }} position={[side * 0.55, 1.54, 0]}>
          <Piece color={colors.shirt} position={[0, -0.26, 0]} scale={[0.27, 0.62, 0.31]} />
          <Piece color={colors.trim} position={[0, 0.02, -0.02]} scale={[0.23, 0.1, 0.26]} />
          <Piece color={colors.skin} position={[0, -0.78, -0.01]} scale={[0.25, 0.44, 0.29]} />
          <Piece color={colors.leather} position={[0, -0.55, 0]} scale={[0.29, 0.11, 0.33]} />
          <Piece color={colors.leather} position={[0, -0.98, 0.08]} scale={[0.3, 0.08, 0.14]} />
        </group>
      ))}
      {[-1, 1].map((side, index) => (
        <group key={`leg-${side}`} ref={(node) => { legRefs.current[index] = node; }} position={[side * 0.22, 0.82, 0]}>
          <Piece color={colors.trousers} position={[0, -0.31, 0]} scale={[0.31, 0.7, 0.35]} />
          <Piece color="#4a596c" position={[0, -0.1, -0.16]} scale={[0.18, 0.12, 0.04]} />
          <Piece color="#3a2b22" position={[0, -0.77, -0.06]} scale={[0.34, 0.25, 0.47]} />
          <Piece color="#201712" position={[0, -0.9, 0.04]} scale={[0.36, 0.06, 0.48]} />
        </group>
      ))}
    </group>
  );
}
