import React, { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useDispatch, useSelector } from "react-redux";
import {
  addAmbientMobs,
  damagePlayer,
  mobCombatHit,
  removeMobsById,
  syncMobs,
  syncMountedMob,
} from "../features/world/worldSlice";
import { createMob, isNightOnly, MOB_TYPES } from "./mobTypes";
import { SEA_LEVEL, sampleSurfaceProfile } from "./worldGenerator";
import useKeyboard from "./useKeyboard";
import { useMobDisplaySettings } from "./mobDisplaySettings";
import { getPerformanceProfile } from "./performanceProfile";

const CENTER = new THREE.Vector2(0, 0);
const BIPEDS = new Set(["zombie", "skeleton", "iron_golem"]);
const HIT_RADIUS = 7;
const FORWARD = new THREE.Vector3();
const RIGHT = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const MOUNT_MOVEMENT = new THREE.Vector3();
const PART_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);
const HITBOX_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);
// Creature meshes face local -Z while runtime direction uses +Z.
const MODEL_FORWARD_YAW = Math.PI;

function Part({
  color,
  scale = [1, 1, 1],
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  meshRef,
  mobId,
  emissive = "#000000",
  emissiveIntensity = 0,
}) {
  return (
    <mesh ref={meshRef} position={position} scale={scale} rotation={rotation} userData={mobId ? { mobId } : undefined} dispose={null}>
      <primitive object={PART_GEOMETRY} attach="geometry" />
      <meshLambertMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} />
    </mesh>
  );
}

function rememberMaterial(material) {
  if (!material || material.userData.voxelBaseCaptured) return;
  material.userData.voxelBaseCaptured = true;
  material.userData.voxelBaseColor = material.color?.getHexString?.() || null;
  material.userData.voxelBaseEmissive = material.emissive?.getHexString?.() || null;
  material.userData.voxelBaseEmissiveIntensity = Number(material.emissiveIntensity || 0);
}

function applyWholeMobHitGlow(group, hurt, pulse = 1) {
  group.traverse((node) => {
    if (!node.isMesh || !node.material) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      rememberMaterial(material);
      if (hurt) {
        if (material.emissive) {
          material.emissive.set("#ff1f1f");
          material.emissiveIntensity = 0.95 + pulse * 0.55;
        }
        if (material.color && !material.emissive) material.color.set("#ff5a5a");
      } else {
        if (material.emissive && material.userData.voxelBaseEmissive != null) {
          material.emissive.set(`#${material.userData.voxelBaseEmissive}`);
          material.emissiveIntensity = material.userData.voxelBaseEmissiveIntensity || 0;
        }
        if (material.color && material.userData.voxelBaseColor != null) {
          material.color.set(`#${material.userData.voxelBaseColor}`);
        }
      }
    });
  });
}

function mobLabelHeight(type) {
  if (type === "iron_golem") return 3.45;
  if (type === "horse") return 2.55;
  if (type === "boat") return 1.25;
  if (type === "bird") return 1.25;
  if (["shark", "dolphin", "big_fish"].includes(type)) return 1.45;
  if (BIPEDS.has(type)) return 2.75;
  return 1.85;
}

function createOverlayTexture({ displayName, health, maxHealth, displaySettings, hearts = false }) {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = hearts ? 64 : 112;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (hearts) {
    ctx.font = "900 40px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,.9)";
    ctx.shadowBlur = 7;
    ctx.fillStyle = "#ff5b70";
    ctx.fillText("♥  ♥", 128, 32);
  } else {
    const ratio = maxHealth > 0 ? health / maxHealth : 0;
    ctx.fillStyle = "rgba(0,0,0,.66)";
    ctx.fillRect(4, 4, 248, 104);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,.95)";
    ctx.shadowBlur = 4;

    let cursorY = 22;
    if (displaySettings.showNames) {
      ctx.font = "900 25px Arial";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(displayName, 128, cursorY);
      cursorY += 28;
    }
    if (displaySettings.showHealthBars) {
      const barY = cursorY + 1;
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#351010";
      ctx.fillRect(24, barY, 208, 18);
      ctx.strokeStyle = "rgba(255,255,255,.9)";
      ctx.lineWidth = 3;
      ctx.strokeRect(24, barY, 208, 18);
      ctx.fillStyle = ratio > 0.55 ? "#36d35d" : ratio > 0.25 ? "#e7c43b" : "#ef4444";
      ctx.fillRect(27, barY + 3, Math.max(0, 202 * ratio), 12);
      cursorY += 27;
    }
    if (displaySettings.showHealthNumbers) {
      ctx.shadowBlur = 4;
      ctx.font = "900 20px Arial";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`${Math.ceil(health)} / ${Math.ceil(maxHealth)} HP`, 128, Math.min(94, cursorY + 11));
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function MobOverlay({ mob, definition, displaySettings }) {
  const showAny = displaySettings.showNames || displaySettings.showHealthBars || displaySettings.showHealthNumbers;
  const maxHealth = Math.max(1, Number(mob.maxHealth || definition.maxHealth || 1));
  const health = THREE.MathUtils.clamp(Number(mob.health || 0), 0, maxHealth);
  const displayName = mob.customName || definition.name;
  const texture = useMemo(
    () => showAny ? createOverlayTexture({ displayName, health, maxHealth, displaySettings }) : null,
    [displayName, displaySettings, health, maxHealth, showAny]
  );

  useEffect(() => () => texture?.dispose(), [texture]);
  if (!showAny || !texture) return null;
  return (
    <sprite position={[0, mobLabelHeight(mob.type), 0]} scale={[2.35, 1.03, 1]} renderOrder={80}>
      <spriteMaterial map={texture} transparent depthTest={false} depthWrite={false} toneMapped={false} />
    </sprite>
  );
}

function HeartOverlay({ type }) {
  const texture = useMemo(
    () => createOverlayTexture({ displayName: "", health: 1, maxHealth: 1, displaySettings: {}, hearts: true }),
    []
  );
  useEffect(() => () => texture?.dispose(), [texture]);
  if (!texture) return null;
  return (
    <sprite position={[0, mobLabelHeight(type) + 0.4, 0]} scale={[1.35, 0.42, 1]} renderOrder={81}>
      <spriteMaterial map={texture} transparent depthTest={false} depthWrite={false} toneMapped={false} />
    </sprite>
  );
}

function FaceEyes({ y, z, spread = 0.18, eyeColor = "#111111", scale = [0.09, 0.09, 0.035] }) {
  return (
    <>
      <Part color={eyeColor} position={[-spread, y, z]} scale={scale} />
      <Part color={eyeColor} position={[spread, y, z]} scale={scale} />
    </>
  );
}

function QuadrupedDetails({ type, definition, headRef, legRefs, tailRef }) {
  const horse = type === "horse";
  const headY = horse ? 1.58 : type === "wolf" ? 1.02 : 1.0;
  const headZ = horse ? -1.08 : -0.78;
  const headScale = horse ? [0.58, 0.68, 0.76] : [0.6, 0.58, 0.64];
  const bodyY = horse ? 1.12 : 0.72;
  const bodyScale = definition.scale;
  const legY = horse ? 0.38 : 0.25;
  const legScale = horse ? [0.19, 0.82, 0.19] : [0.17, 0.52, 0.17];
  const legZ = horse ? 0.58 : 0.36;
  const legX = horse ? 0.39 : 0.29;
  const snoutColor = type === "pig" ? "#efb0b0" : type === "cow" ? "#b98a68" : definition.headColor;

  return (
    <>
      <Part color={definition.bodyColor} position={[0, bodyY, 0]} scale={bodyScale} />
      {type === "sheep" && <Part color="#fafafa" position={[0, bodyY + 0.02, 0]} scale={[bodyScale[0] + 0.14, bodyScale[1] + 0.14, bodyScale[2] + 0.14]} />}
      <Part color={definition.headColor} position={[0, headY, headZ]} scale={headScale} meshRef={headRef} />
      <Part color={snoutColor} position={[0, headY - 0.1, headZ - headScale[2] * 0.57]} scale={horse ? [0.42, 0.26, 0.3] : [0.38, 0.24, 0.24]} />
      <FaceEyes y={headY + 0.12} z={headZ - headScale[2] * 0.53} spread={horse ? 0.19 : 0.18} />
      {[-1, 1].map((side) => (
        <Part key={`ear-${side}`} color={definition.headColor} position={[side * (horse ? 0.25 : 0.23), headY + headScale[1] * 0.55, headZ + 0.02]} scale={[0.14, horse ? 0.28 : 0.18, 0.12]} rotation={[0, 0, side * 0.16]} />
      ))}
      {type === "cow" && [-1, 1].map((side) => (
        <Part key={`horn-${side}`} color="#e7dec0" position={[side * 0.27, headY + 0.34, headZ - 0.02]} scale={[0.09, 0.24, 0.09]} rotation={[0, 0, side * 0.42]} />
      ))}
      {type === "horse" && (
        <>
          <Part color="#3d281b" position={[0, 1.46, -0.35]} scale={[0.12, 0.62, 0.72]} />
          <Part color="#3d281b" position={[0, 1.36, 0.82]} scale={[0.15, 0.2, 0.68]} rotation={[0.55, 0, 0]} meshRef={tailRef} />
        </>
      )}
      {type === "wolf" && <Part color={definition.bodyColor} position={[0, 0.78, 0.72]} scale={[0.18, 0.18, 0.72]} rotation={[-0.38, 0, 0]} meshRef={tailRef} />}
      {type === "pig" && <Part color="#d98989" position={[0, 0.82, 0.7]} scale={[0.1, 0.1, 0.38]} rotation={[-0.55, 0, 0]} meshRef={tailRef} />}
      {type === "cow" && <Part color="#4d3021" position={[0, 0.83, 0.78]} scale={[0.11, 0.12, 0.65]} rotation={[-0.45, 0, 0]} meshRef={tailRef} />}
      {[0, 1, 2, 3].map((index) => {
        const x = index % 2 === 0 ? -legX : legX;
        const z = index < 2 ? -legZ : legZ;
        return (
          <group key={index} ref={(node) => { legRefs.current[index] = node; }} position={[x, legY, z]}>
            <Part color={definition.headColor} scale={legScale} />
            <Part color={horse ? "#30241d" : definition.headColor} position={[0, -legScale[1] * 0.52, -0.015]} scale={[legScale[0] + 0.04, 0.12, legScale[2] + 0.06]} />
          </group>
        );
      })}
      {type === "cow" && (
        <>
          <Part color="#3d251a" position={[-0.28, 1.02, -0.15]} scale={[0.3, 0.42, 0.06]} />
          <Part color="#3d251a" position={[0.22, 0.76, 0.38]} scale={[0.28, 0.28, 0.06]} />
        </>
      )}
    </>
  );
}

function ChickenModel({ definition, headRef, legRefs, wingRefs }) {
  return (
    <>
      <Part color={definition.bodyColor} position={[0, 0.58, 0]} scale={[0.66, 0.66, 0.75]} />
      <Part color={definition.headColor} position={[0, 1.05, -0.28]} scale={[0.44, 0.45, 0.43]} meshRef={headRef} />
      <Part color="#e5a23d" position={[0, 0.98, -0.55]} scale={[0.24, 0.14, 0.24]} />
      <Part color="#d84141" position={[0, 1.34, -0.28]} scale={[0.16, 0.18, 0.12]} />
      <FaceEyes y={1.13} z={-0.505} spread={0.13} scale={[0.07, 0.07, 0.03]} />
      {[-1, 1].map((side, index) => (
        <group key={side} ref={(node) => { wingRefs.current[index] = node; }} position={[side * 0.42, 0.65, 0]}>
          <Part color="#e5e0cf" scale={[0.22, 0.48, 0.58]} rotation={[0, 0, side * 0.18]} />
        </group>
      ))}
      {[-1, 1].map((side, index) => (
        <group key={side} ref={(node) => { legRefs.current[index] = node; }} position={[side * 0.18, 0.18, 0]}>
          <Part color="#d99c37" scale={[0.07, 0.35, 0.07]} />
          <Part color="#d99c37" position={[0, -0.2, -0.08]} scale={[0.18, 0.05, 0.24]} />
        </group>
      ))}
      <Part color="#eee9d8" position={[0, 0.65, 0.47]} scale={[0.48, 0.28, 0.38]} rotation={[0.25, 0, 0]} />
    </>
  );
}

function TurtleModel({ definition, headRef, legRefs }) {
  return (
    <>
      <Part color="#365f35" position={[0, 0.42, 0]} scale={[1.18, 0.38, 1.42]} />
      <Part color={definition.bodyColor} position={[0, 0.5, 0]} scale={[0.96, 0.38, 1.16]} />
      <Part color={definition.headColor} position={[0, 0.44, -0.92]} scale={[0.48, 0.38, 0.5]} meshRef={headRef} />
      <FaceEyes y={0.52} z={-1.19} spread={0.15} scale={[0.07, 0.07, 0.025]} />
      {[[-0.62, -0.5], [0.62, -0.5], [-0.62, 0.5], [0.62, 0.5]].map(([x, z], index) => (
        <group key={index} ref={(node) => { legRefs.current[index] = node; }} position={[x, 0.32, z]}>
          <Part color={definition.headColor} scale={[0.48, 0.14, 0.34]} rotation={[0, 0, x < 0 ? -0.18 : 0.18]} />
        </group>
      ))}
      <Part color={definition.headColor} position={[0, 0.4, 0.86]} scale={[0.18, 0.14, 0.42]} />
    </>
  );
}

function BipedModel({ type, definition, headRef, legRefs }) {
  const golem = type === "iron_golem";
  const headY = golem ? 2.58 : 2.04;
  const bodyY = golem ? 1.38 : 1.18;
  const bodyScale = golem ? [1.18, 1.55, 0.72] : definition.scale;
  return (
    <>
      <Part color={definition.bodyColor} position={[0, bodyY, 0]} scale={bodyScale} />
      <Part color={definition.headColor} position={[0, headY, -0.03]} scale={golem ? [0.82, 0.72, 0.78] : [0.72, 0.72, 0.72]} meshRef={headRef} />
      <FaceEyes y={headY + 0.08} z={golem ? -0.44 : -0.41} spread={0.2} eyeColor={type === "zombie" ? "#d33b3b" : "#242424"} />
      {golem && <Part color="#9e9b8b" position={[0, headY - 0.08, -0.48]} scale={[0.18, 0.32, 0.22]} />}
      {[-1, 1].map((side, index) => (
        <group key={`arm-${side}`} ref={(node) => { legRefs.current[index] = node; }} position={[side * (golem ? 0.78 : 0.52), golem ? 1.28 : 1.24, 0]}>
          <Part color={definition.headColor} scale={golem ? [0.32, 1.35, 0.34] : [0.2, 0.95, 0.2]} />
        </group>
      ))}
      {[-1, 1].map((side, index) => (
        <group key={`leg-${side}`} ref={(node) => { legRefs.current[index + 2] = node; }} position={[side * (golem ? 0.34 : 0.22), golem ? 0.36 : 0.35, 0]}>
          <Part color={definition.bodyColor} scale={golem ? [0.36, 0.92, 0.42] : [0.22, 0.74, 0.24]} />
        </group>
      ))}
      {golem && (
        <>
          <Part color="#4e8b58" position={[-0.46, 1.52, -0.38]} scale={[0.12, 0.62, 0.08]} rotation={[0, 0, -0.24]} />
          <Part color="#b76666" position={[-0.5, 1.78, -0.44]} scale={[0.12, 0.12, 0.08]} />
        </>
      )}
    </>
  );
}

function AquaticModel({ type, definition, headRef, tailRef }) {
  const shark = type === "shark";
  const dolphin = type === "dolphin";
  const body = definition.scale;
  const frontZ = -body[2] * 0.62;
  return (
    <>
      <Part color={definition.bodyColor} scale={body} />
      <Part color={definition.headColor} position={[0, 0, frontZ]} scale={[body[0] * 0.66, body[1] * 0.75, 0.42]} meshRef={headRef} />
      <FaceEyes y={body[1] * 0.14} z={frontZ - 0.23} spread={Math.max(0.14, body[0] * 0.23)} scale={[0.08, 0.08, 0.03]} />
      <group ref={tailRef} position={[0, 0, body[2] * 0.67]}>
        <Part color={definition.bodyColor} rotation={[0, 0, Math.PI / 4]} scale={[0.09, body[1] * 1.35, body[0] * 0.92]} />
      </group>
      <Part color={definition.bodyColor} position={[0, body[1] * 0.72, 0.12]} rotation={[0.12, 0, 0]} scale={[0.12, body[1] * (shark ? 1.55 : 1.0), body[0] * 0.72]} />
      {[-1, 1].map((side) => (
        <Part key={side} color={definition.bodyColor} position={[side * body[0] * 0.62, -body[1] * 0.08, 0.08]} rotation={[0, 0, side * 0.48]} scale={[body[0] * 0.72, 0.08, body[2] * 0.34]} />
      ))}
      {dolphin && <Part color={definition.headColor} position={[0, 0, frontZ - 0.36]} scale={[0.24, 0.16, 0.48]} />}
      {shark && (
        <>
          <Part color="#f0eeee" position={[0, -body[1] * 0.2, frontZ - 0.24]} scale={[body[0] * 0.38, 0.05, 0.04]} />
          {[-0.18, 0, 0.18].map((x) => <Part key={x} color="#ffffff" position={[x, -body[1] * 0.17, frontZ - 0.28]} scale={[0.06, 0.1, 0.04]} rotation={[0, 0, 0.35]} />)}
        </>
      )}
    </>
  );
}

function BirdModel({ definition, headRef, wingRefs, tailRef }) {
  return (
    <>
      <Part color={definition.bodyColor} scale={definition.scale} />
      {[-1, 1].map((side, index) => (
        <group key={side} ref={(node) => { wingRefs.current[index] = node; }} position={[side * 0.48, 0, 0]}>
          <Part color={definition.bodyColor} scale={[0.78, 0.08, 0.42]} />
          <Part color="#aaa99f" position={[side * 0.34, 0, 0.08]} scale={[0.35, 0.06, 0.3]} />
        </group>
      ))}
      <Part color={definition.headColor} position={[0, 0, -0.43]} scale={[0.32, 0.26, 0.34]} meshRef={headRef} />
      <Part color="#e7a33c" position={[0, -0.02, -0.66]} scale={[0.18, 0.1, 0.24]} />
      <FaceEyes y={0.07} z={-0.62} spread={0.105} scale={[0.055, 0.055, 0.025]} />
      <group ref={tailRef} position={[0, 0, 0.4]}>
        <Part color={definition.bodyColor} scale={[0.42, 0.08, 0.52]} rotation={[0.2, 0, 0]} />
      </group>
    </>
  );
}

function SlimeModel({ definition }) {
  return (
    <>
      <Part color={definition.bodyColor} position={[0, 0.52, 0]} scale={definition.scale} />
      <Part color="#92eb83" position={[0, 0.52, 0]} scale={[0.66, 0.66, 0.66]} />
      <Part color="#101010" position={[-0.2, 0.65, -0.49]} scale={[0.12, 0.14, 0.04]} />
      <Part color="#101010" position={[0.2, 0.65, -0.49]} scale={[0.12, 0.14, 0.04]} />
      <Part color="#245f23" position={[0, 0.38, -0.5]} scale={[0.28, 0.08, 0.04]} />
    </>
  );
}

function BoatModel() {
  return (
    <>
      <Part color="#8b5b31" scale={[1.55, 0.32, 2.15]} position={[0, 0.18, 0]} />
      <Part color="#b77b43" position={[0, 0.43, 0]} scale={[1.25, 0.22, 1.65]} />
      <Part color="#3b2a1d" position={[0, 0.47, 0]} scale={[0.85, 0.18, 1.22]} />
      {[-1, 1].map((side) => <Part key={side} color="#80502a" position={[side * 0.95, 0.37, 0]} rotation={[0, 0, side * 0.25]} scale={[0.12, 0.1, 2.4]} />)}
      {[-0.55, 0.55].map((z) => <Part key={z} color="#6f4525" position={[0, 0.52, z]} scale={[1.15, 0.08, 0.12]} />)}
    </>
  );
}

function MobVisual({ runtimeMap, mob, registerHitMesh, active, playerRef, displaySettings, renderRadius, showOverlay }) {
  const groupRef = useRef();
  const hitboxRef = useRef();
  const headRef = useRef();
  const legRefs = useRef([]);
  const wingRefs = useRef([]);
  const tailRef = useRef();
  const definition = MOB_TYPES[mob.type];
  const lastGlowState = useRef(null);

  useEffect(() => {
    registerHitMesh(mob.id, hitboxRef.current);
    return () => registerHitMesh(mob.id, null);
  }, [mob.id, registerHitMesh]);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    const current = runtimeMap.current[mob.id];
    if (!group || !current || !definition) return;
    const player = playerRef.current;
    const distanceSq = player ? (current.x - player.x) ** 2 + (current.z - player.z) ** 2 : 0;
    group.visible = active && distanceSq <= renderRadius * renderRadius;
    if (!group.visible) return;

    group.position.set(current.x, current.y, current.z);
    group.rotation.y = current.direction + MODEL_FORWARD_YAW;

    const walk = Math.sin(clock.elapsedTime * 7 + current.phase) * 0.55 * (current.moving ? 1 : 0.14);
    legRefs.current.forEach((leg, index) => {
      if (leg) leg.rotation.x = index % 2 === 0 ? walk : -walk;
    });
    wingRefs.current.forEach((wing, index) => {
      if (wing) wing.rotation.z = (index ? -1 : 1) * (0.35 + Math.sin(clock.elapsedTime * 11 + current.phase) * 0.75);
    });
    if (tailRef.current) tailRef.current.rotation.y = Math.sin(clock.elapsedTime * 4 + current.phase) * 0.34;

    if (mob.type === "slime") {
      const bounce = 1 + Math.sin(clock.elapsedTime * 5 + current.phase) * 0.08;
      group.scale.set(1 / bounce, bounce, 1 / bounce);
    } else if (definition.aquatic || definition.vehicle) {
      const wave = Math.sin(clock.elapsedTime * 1.9 + current.phase + current.x * 0.14) * (definition.vehicle ? 0.08 : 0.12);
      group.rotation.z = wave;
      group.rotation.x = Math.sin(clock.elapsedTime * 1.3 + current.phase) * 0.035;
      group.scale.set(1, 1, 1);
    } else {
      group.rotation.z = 0;
      group.rotation.x = 0;
      group.scale.set(1, 1, 1);
    }

    if (headRef.current && mob.type !== "slime") headRef.current.rotation.y = Math.sin(clock.elapsedTime * 1.8 + current.phase) * 0.13;

    const hurt = (mob.hurtUntil || 0) > Date.now();
    if (lastGlowState.current !== hurt) {
      lastGlowState.current = hurt;
      applyWholeMobHitGlow(group, hurt, 1);
    }
  });

  if (!definition) return null;
  const biped = BIPEDS.has(mob.type);
  const aquatic = Boolean(definition.aquatic && !definition.amphibious && !definition.vehicle);
  const bird = Boolean(definition.flying);
  const boat = mob.type === "boat";
  const friendly = Boolean(definition.friendly || mob.tamed);
  const hostile = Boolean(definition.hostile);
  const hitboxScale = boat
    ? [1.55, 0.6, 2.15]
    : aquatic
      ? definition.scale
      : biped
        ? [Math.max(0.72, definition.scale[0]), Math.max(1.7, definition.scale[1]), Math.max(0.52, definition.scale[2])]
        : mob.type === "horse"
          ? [1.1, 1.9, 1.8]
          : [Math.max(0.7, definition.scale[0]), Math.max(0.9, definition.scale[1]), Math.max(0.8, definition.scale[2])];
  const hitboxY = boat ? 0.35 : aquatic || bird ? 0 : biped ? 1.25 : mob.type === "horse" ? 1.05 : 0.65;

  return (
    <group ref={groupRef} visible={active}>
      <mesh ref={hitboxRef} position={[0, hitboxY, 0]} scale={hitboxScale} userData={{ mobId: mob.id }} dispose={null}>
        <primitive object={HITBOX_GEOMETRY} attach="geometry" />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {boat ? (
        <BoatModel />
      ) : aquatic ? (
        <AquaticModel type={mob.type} definition={definition} headRef={headRef} tailRef={tailRef} />
      ) : bird ? (
        <BirdModel definition={definition} headRef={headRef} wingRefs={wingRefs} tailRef={tailRef} />
      ) : mob.type === "turtle" ? (
        <TurtleModel definition={definition} headRef={headRef} legRefs={legRefs} />
      ) : mob.type === "chicken" ? (
        <ChickenModel definition={definition} headRef={headRef} legRefs={legRefs} wingRefs={wingRefs} />
      ) : mob.type === "slime" ? (
        <SlimeModel definition={definition} />
      ) : biped ? (
        <BipedModel type={mob.type} definition={definition} headRef={headRef} legRefs={legRefs} />
      ) : (
        <QuadrupedDetails type={mob.type} definition={definition} headRef={headRef} legRefs={legRefs} tailRef={tailRef} />
      )}

      {friendly && !boat && (
        <mesh position={[0, mobLabelHeight(mob.type) - 0.28, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.22, 0.3, 16]} />
          <meshBasicMaterial color="#6dff88" transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}

      {mob.heartUntil > Date.now() && <HeartOverlay type={mob.type} />}
      {showOverlay && <MobOverlay mob={mob} definition={definition} displaySettings={displaySettings} />}
    </group>
  );
}

function nearestMob(mobs, runtimeMap, from, predicate, maxDistance) {
  let best = null;
  let bestDistanceSq = maxDistance * maxDistance;
  mobs.forEach((candidate) => {
    if (!predicate(candidate)) return;
    const runtime = runtimeMap.current[candidate.id];
    if (!runtime) return;
    const distanceSq = (runtime.x - from.x) ** 2 + (runtime.z - from.z) ** 2;
    if (distanceSq < bestDistanceSq) {
      best = candidate;
      bestDistanceSq = distanceSq;
    }
  });
  return best ? { mob: best, runtime: runtimeMap.current[best.id], distance: Math.sqrt(bestDistanceSq) } : null;
}

function isActiveAtTime(definition, night) {
  return !isNightOnly(definition) || night;
}

export default function MobSystem({ playerRef, targetRef, mountRef, enabled = true }) {
  const dispatch = useDispatch();
  const displaySettings = useMobDisplaySettings();
  const profile = useMemo(getPerformanceProfile, []);
  const aiStep = profile.id === "performance" ? 0.16 : profile.id === "quality" ? 0.1 : 0.12;
  const mobs = useSelector((state) => state.world.mobs);
  const mount = useSelector((state) => state.world.mount);
  const seed = useSelector((state) => state.world.seed);
  const worldTime = useSelector((state) => state.world.worldTime);
  const playerState = useSelector((state) => state.world.player);
  const { camera } = useThree();
  const keys = useKeyboard();
  const runtimeMap = useRef({});
  const hitMeshes = useRef({});
  const syncTimer = useRef(0);
  const mountedSyncTimer = useRef(0);
  const aiAccumulator = useRef(0);
  const ambientTimer = useRef(0);
  const pruneTimer = useRef(0);
  const spawnCounter = useRef(0);
  const mobRaycastTimer = useRef(0);
  const raycaster = useMemo(() => {
    const next = new THREE.Raycaster();
    next.far = HIT_RADIUS;
    return next;
  }, []);
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
        moving: current?.moving ?? false,
        verticalVelocity: current?.verticalVelocity ?? 0,
      };
    });
    runtimeMap.current = nextMap;
  }, [mobs]);

  const visibleMobs = useMemo(() => {
    const sorted = mobs
      .map((mob) => ({ mob, distanceSq: (mob.x - playerState.x) ** 2 + (mob.z - playerState.z) ** 2 }))
      .filter((entry) => entry.distanceSq <= profile.mobRenderRadius * profile.mobRenderRadius || entry.mob.id === mount?.id)
      .sort((a, b) => a.distanceSq - b.distanceSq)
      .slice(0, profile.maxVisibleMobs)
      .map((entry) => ({
        mob: entry.mob,
        showOverlay: entry.distanceSq <= profile.overlayDistance * profile.overlayDistance,
      }));
    return sorted;
  }, [mobs, mount?.id, playerState.x, playerState.z, profile]);

  const registerHitMesh = useCallback((id, node) => {
    if (node) hitMeshes.current[id] = node;
    else delete hitMeshes.current[id];
  }, []);

  useFrame((_, rawDelta) => {
    if (!enabled) {
      targetRef.current = null;
      return;
    }

    const delta = Math.min(rawDelta, 0.05);
    const player = playerRef.current;
    if (!player) return;

    // Mounted travel stays frame-rate smooth while regular AI is fixed-step.
    if (mount?.id) {
      const mountedMob = mobs.find((mob) => mob.id === mount.id);
      const mountedDefinition = MOB_TYPES[mountedMob?.type];
      const runtime = runtimeMap.current[mount.id];
      if (runtime && mountedDefinition) {
        camera.getWorldDirection(FORWARD);
        FORWARD.y = 0;
        if (FORWARD.lengthSq() > 0) FORWARD.normalize();
        RIGHT.crossVectors(FORWARD, UP).normalize();
        const forwardInput = (keys.current.KeyW ? 1 : 0) - (keys.current.KeyS ? 1 : 0);
        const sideInput = (keys.current.KeyD ? 1 : 0) - (keys.current.KeyA ? 1 : 0);
        MOUNT_MOVEMENT.copy(FORWARD).multiplyScalar(forwardInput).addScaledVector(RIGHT, sideInput);
        if (MOUNT_MOVEMENT.lengthSq() > 1) MOUNT_MOVEMENT.normalize();
        const speed = mountedDefinition.mountedSpeed || 7;
        const nextX = runtime.x + MOUNT_MOVEMENT.x * speed * delta;
        const nextZ = runtime.z + MOUNT_MOVEMENT.z * speed * delta;
        const nextProfile = sampleSurfaceProfile(seed, nextX, nextZ);
        const allowed = mountedMob.type === "boat" ? nextProfile.biome === "ocean" : nextProfile.biome !== "ocean";
        if (allowed) {
          runtime.x = nextX;
          runtime.z = nextZ;
        }
        runtime.moving = allowed && MOUNT_MOVEMENT.lengthSq() > 0.001;
        if (runtime.moving) runtime.direction = Math.atan2(MOUNT_MOVEMENT.x, MOUNT_MOVEMENT.z);

        if (mountedMob.type === "boat") {
          runtime.y = SEA_LEVEL + 0.22 + Math.sin(performance.now() * 0.0018 + runtime.x * 0.12) * 0.09;
        } else {
          const ground = sampleSurfaceProfile(seed, runtime.x, runtime.z).height;
          runtime.verticalVelocity -= 18 * delta;
          if (keys.current.Space && Math.abs(runtime.verticalVelocity) < 0.01) runtime.verticalVelocity = 6.3;
          const targetY = ground + 0.55;
          runtime.y += runtime.verticalVelocity * delta;
          if (runtime.y <= targetY) {
            runtime.y = targetY;
            runtime.verticalVelocity = 0;
          }
        }

        mountRef.current = { id: mount.id, type: mountedMob.type, x: runtime.x, y: runtime.y, z: runtime.z, direction: runtime.direction };
        mountedSyncTimer.current += delta;
        if (mountedSyncTimer.current >= 0.5) {
          mountedSyncTimer.current = 0;
          dispatch(syncMountedMob({ id: mount.id, x: runtime.x, y: runtime.y, z: runtime.z, direction: runtime.direction }));
        }
      }
    } else {
      mountRef.current = null;
    }

    aiAccumulator.current += delta;
    while (aiAccumulator.current >= aiStep) {
      aiAccumulator.current -= aiStep;
      const aiMobs = mobs.filter((mob) => {
        const runtime = runtimeMap.current[mob.id];
        if (!runtime) return false;
        return (player.x - runtime.x) ** 2 + (player.z - runtime.z) ** 2 <= profile.mobRenderRadius * profile.mobRenderRadius;
      });
      aiMobs.forEach((mob) => {
        const definition = MOB_TYPES[mob.type];
        const runtime = runtimeMap.current[mob.id];
        if (!definition || !runtime || mob.id === mount?.id || !isActiveAtTime(definition, night)) return;
        const distanceSqToPlayer = (player.x - runtime.x) ** 2 + (player.z - runtime.z) ** 2;
        runtime.attackCooldown = Math.max(0, runtime.attackCooldown - aiStep);
        runtime.wanderTimer -= aiStep;
        runtime.moving = false;
        let target = null;
        let targetKind = null;

        if (definition.friendly || mob.tamed) {
          target = nearestMob(
            aiMobs,
            runtimeMap,
            runtime,
            (candidate) => {
              const candidateDefinition = MOB_TYPES[candidate.type];
              return candidateDefinition?.hostile &&
                isActiveAtTime(candidateDefinition, night) &&
                (!definition.aquatic || candidateDefinition.aquatic);
            },
            definition.aggroRange || 12
          );
          if (target) targetKind = "hostile";
          else if (mob.tamed || definition.friendly) {
            const playerDistance = Math.sqrt(distanceSqToPlayer);
            if (playerDistance > 7 && !definition.aquatic) {
              target = { runtime: player, distance: playerDistance };
              targetKind = "follow";
            }
          }
        } else if (definition.hostile) {
          const playerDistance = Math.sqrt(distanceSqToPlayer);
          const friendlyTarget = nearestMob(
            aiMobs,
            runtimeMap,
            runtime,
            (candidate) => MOB_TYPES[candidate.type]?.friendly || candidate.tamed,
            10
          );
          if (friendlyTarget && friendlyTarget.distance < playerDistance) {
            target = friendlyTarget;
            targetKind = "friendly";
          } else if (playerDistance < (definition.aggroRange || 17)) {
            target = { runtime: player, distance: playerDistance };
            targetKind = "player";
          }
        }

        let speed = definition.aquatic ? definition.swimSpeed || definition.speed : definition.speed;
        if (target) {
          const dx = target.runtime.x - runtime.x;
          const dz = target.runtime.z - runtime.z;
          runtime.direction = Math.atan2(dx, dz);
          const stopDistance = targetKind === "follow" ? 3.2 : definition.attackRange || 1.2;
          if (target.distance > stopDistance) {
            runtime.x += Math.sin(runtime.direction) * speed * aiStep;
            runtime.z += Math.cos(runtime.direction) * speed * aiStep;
            runtime.moving = true;
          }
          if (targetKind !== "follow" && target.distance <= (definition.attackRange || 1.2) && runtime.attackCooldown <= 0) {
            runtime.attackCooldown = definition.attackCooldown || 1;
            if (targetKind === "player") dispatch(damagePlayer(definition.attackDamage || 1));
            else if (target.mob) dispatch(mobCombatHit({ targetId: target.mob.id, amount: definition.attackDamage || 1, friendlyAttack: Boolean(definition.friendly || mob.tamed) }));
          }
        } else if (runtime.wanderTimer <= 0) {
          runtime.wanderTimer = 1.5 + Math.random() * 4.5;
          runtime.direction += (Math.random() - 0.5) * Math.PI * 1.6;
        } else {
          speed *= definition.hostile ? 0.15 : 0.35;
          runtime.x += Math.sin(runtime.direction) * speed * aiStep;
          runtime.z += Math.cos(runtime.direction) * speed * aiStep;
          runtime.moving = true;
        }

        if (definition.flying) {
          const profile = sampleSurfaceProfile(seed, runtime.x, runtime.z);
          const desired = Math.max(profile.height, SEA_LEVEL) + 8 + Math.sin(performance.now() * 0.0007 + runtime.phase) * 3;
          runtime.y += (desired - runtime.y) * 0.04;
        } else if (definition.aquatic && !definition.amphibious) {
          const profile = sampleSurfaceProfile(seed, runtime.x, runtime.z);
          if (profile.biome !== "ocean") runtime.direction += Math.PI * 0.7;
          runtime.y = THREE.MathUtils.clamp(runtime.y + Math.sin(performance.now() * 0.001 + runtime.phase) * 0.025, profile.height + 1.1, SEA_LEVEL - 0.5);
        } else {
          const profile = sampleSurfaceProfile(seed, runtime.x, runtime.z);
          runtime.y = profile.height + 0.52;
        }
      });
    }

    mobRaycastTimer.current += delta;
    if (mobRaycastTimer.current >= 1 / 30) {
      mobRaycastTimer.current = 0;
      raycaster.setFromCamera(CENTER, camera);
      const activeMeshes = visibleMobs
        .map((entry) => entry.mob)
        .filter((mob) => isActiveAtTime(MOB_TYPES[mob.type], night))
        .filter((mob) => {
          const runtime = runtimeMap.current[mob.id];
          return runtime && (runtime.x - player.x) ** 2 + (runtime.z - player.z) ** 2 <= HIT_RADIUS * HIT_RADIUS;
        })
        .map((mob) => hitMeshes.current[mob.id])
        .filter(Boolean);
      const hit = raycaster.intersectObjects(activeMeshes, false)[0];
      targetRef.current = hit ? { kind: "mob", mobId: hit.object.userData.mobId, distance: hit.distance } : null;
    }

    ambientTimer.current += delta;
    if (ambientTimer.current >= 8 && mobs.length < profile.maxVisibleMobs + 20) {
      ambientTimer.current = 0;
      const angle = Math.random() * Math.PI * 2;
      const distance = 22 + Math.random() * 28;
      const x = Math.round(player.x + Math.cos(angle) * distance);
      const z = Math.round(player.z + Math.sin(angle) * distance);
      const profile = sampleSurfaceProfile(seed, x, z);
      let pool;
      if (profile.biome === "ocean") pool = ["fish", "fish", "fish", "big_fish", "dolphin", "turtle", night ? "shark" : "fish"];
      else if (profile.biome === "beach") pool = ["turtle", "chicken", "pig", "bird"];
      else pool = night ? ["zombie", "skeleton", "slime", "bird"] : ["sheep", "cow", "pig", "chicken", "horse", "bird"];
      const type = pool[Math.floor(Math.random() * pool.length)];
      const definition = MOB_TYPES[type];
      const y = definition.flying
        ? Math.max(profile.height, SEA_LEVEL) + 9 + Math.random() * 6
        : definition.aquatic && !definition.amphibious
          ? SEA_LEVEL - 1.1 - Math.random() * 2
          : profile.height + 0.55;
      const ambient = createMob(`ambient-${spawnCounter.current++}-${Date.now()}`, type, x, y, z);
      ambient.ambient = true;
      dispatch(addAmbientMobs(ambient));
    }

    pruneTimer.current += delta;
    if (pruneTimer.current >= 12) {
      pruneTimer.current = 0;
      const ids = mobs
        .filter((mob) => mob.ambient && !mob.tamed && !MOB_TYPES[mob.type]?.vehicle)
        .filter((mob) => (mob.x - player.x) ** 2 + (mob.z - player.z) ** 2 > 125 * 125)
        .map((mob) => mob.id);
      if (ids.length) dispatch(removeMobsById(ids));
    }

    syncTimer.current += delta;
    if (syncTimer.current >= 10) {
      syncTimer.current = 0;
      const positions = Object.fromEntries(
        Object.entries(runtimeMap.current).map(([id, runtime]) => [id, {
          x: Number(runtime.x.toFixed(3)), y: Number(runtime.y.toFixed(3)), z: Number(runtime.z.toFixed(3)),
          direction: runtime.direction, wanderTimer: runtime.wanderTimer,
        }])
      );
      dispatch(syncMobs(positions));
    }
  });

  return visibleMobs.map(({ mob, showOverlay }) => (
    <MobVisual
      key={mob.id}
      mob={mob}
      runtimeMap={runtimeMap}
      active={isActiveAtTime(MOB_TYPES[mob.type], night)}
      playerRef={playerRef}
      displaySettings={displaySettings}
      renderRadius={profile.mobRenderRadius}
      showOverlay={showOverlay}
      registerHitMesh={registerHitMesh}
    />
  ));
}
