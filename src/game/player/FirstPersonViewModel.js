import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import { useSelector } from "react-redux";
import { BLOCK_TYPES, getItemDefinition } from "../config/blockTypes";
import { getBlockMaterials } from "../world/rendering/voxelTextures";
import { multiplayerSession } from "../multiplayer/MultiplayerSession";

const HANDLE_GEOMETRY = new THREE.BoxGeometry(0.13, 1.02, 0.13);
const HELD_BLOCK_GEOMETRY = new THREE.BoxGeometry(0.44, 0.44, 0.44);
const SKIN_BASE = "#c98a63";
const SKIN_LIGHT = "#e6aa80";
const SKIN_DARK = "#9f6449";
const SLEEVE_BASE = "#3f7d56";
const SLEEVE_LIGHT = "#a8d5a2";
const SLEEVE_DARK = "#315f43";
const VIEWMODEL_FOV = 52;

/**
 * View-model materials use normal depth testing against the rest of the arm and
 * held item. The entire view model is rendered in its own depth-cleared scene,
 * so world blocks can never cover it while the hand still has correct 3-D
 * self-occlusion instead of looking like a stack of flat, incorrectly ordered
 * rectangles.
 */
function FlatMaterial({ color }) {
  return (
    <meshBasicMaterial
      color={color}
      depthTest
      depthWrite
      fog={false}
      toneMapped={false}
    />
  );
}

function PixelToolHead({ definition }) {
  const color = definition.color || "#a8adb2";
  const bright = definition.tier >= 4 ? "#ddffff" : "#dce1e4";
  const dark = new THREE.Color(color).multiplyScalar(0.66).getStyle();

  if (definition.toolType === "pickaxe") {
    return (
      <group position={[0, 0.43, 0]}>
        <mesh scale={[0.88, 0.14, 0.15]}><boxGeometry args={[1, 1, 1]} /><FlatMaterial color={color} /></mesh>
        <mesh position={[-0.48, -0.07, 0]} rotation={[0, 0, -0.68]} scale={[0.22, 0.38, 0.15]}><boxGeometry args={[1, 1, 1]} /><FlatMaterial color={color} /></mesh>
        <mesh position={[0.48, -0.07, 0]} rotation={[0, 0, 0.68]} scale={[0.22, 0.38, 0.15]}><boxGeometry args={[1, 1, 1]} /><FlatMaterial color={color} /></mesh>
        <mesh position={[0, 0.075, -0.083]} scale={[0.68, 0.035, 0.018]}><boxGeometry args={[1, 1, 1]} /><FlatMaterial color={bright} /></mesh>
      </group>
    );
  }

  if (definition.toolType === "axe") {
    return (
      <group position={[0.25, 0.38, 0]}>
        <mesh scale={[0.52, 0.56, 0.16]}><boxGeometry args={[1, 1, 1]} /><FlatMaterial color={color} /></mesh>
        <mesh position={[-0.29, 0, -0.09]} scale={[0.055, 0.44, 0.025]}><boxGeometry args={[1, 1, 1]} /><FlatMaterial color={bright} /></mesh>
        <mesh position={[0.18, -0.2, 0.08]} scale={[0.24, 0.12, 0.12]}><boxGeometry args={[1, 1, 1]} /><FlatMaterial color={dark} /></mesh>
      </group>
    );
  }

  if (definition.toolType === "shovel") {
    return (
      <group position={[0, 0.43, 0]}>
        <mesh scale={[0.34, 0.44, 0.16]}><boxGeometry args={[1, 1, 1]} /><FlatMaterial color={color} /></mesh>
        <mesh position={[0, -0.27, 0]} scale={[0.19, 0.13, 0.15]}><boxGeometry args={[1, 1, 1]} /><FlatMaterial color={dark} /></mesh>
        <mesh position={[-0.12, 0.02, -0.09]} scale={[0.035, 0.32, 0.02]}><boxGeometry args={[1, 1, 1]} /><FlatMaterial color={bright} /></mesh>
      </group>
    );
  }

  return (
    <group position={[0, 0.42, 0]}>
      <mesh position={[0, 0.32, 0]} scale={[0.16, 0.86, 0.1]}><boxGeometry args={[1, 1, 1]} /><FlatMaterial color={color} /></mesh>
      <mesh position={[0, -0.12, 0]} scale={[0.58, 0.13, 0.16]}><boxGeometry args={[1, 1, 1]} /><FlatMaterial color="#654126" /></mesh>
      <mesh position={[-0.055, 0.53, -0.06]} scale={[0.035, 0.54, 0.018]}><boxGeometry args={[1, 1, 1]} /><FlatMaterial color={bright} /></mesh>
    </group>
  );
}

function HeldBlock({ itemId }) {
  const materials = useMemo(() => {
    const source = getBlockMaterials(itemId);
    const list = Array.isArray(source) ? source : [source];
    return list.map((material) => {
      const clone = material.clone();
      clone.depthTest = true;
      clone.depthWrite = true;
      clone.fog = false;
      clone.toneMapped = false;
      clone.needsUpdate = true;
      return clone;
    });
  }, [itemId]);

  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials]);

  return (
    <mesh
      geometry={HELD_BLOCK_GEOMETRY}
      material={materials}
      rotation={[0.12, 0.63, 0.05]}
      dispose={null}
      frustumCulled={false}
    />
  );
}

function ArcaneWand({ definition }) {
  const tier = definition.wandTier || 1;
  const metal = tier >= 3 ? "#b8d8df" : tier >= 2 ? "#d48a5f" : "#8c633f";
  const glow = tier >= 3 ? "#8af3ff" : tier >= 2 ? "#bca0ff" : "#7ddcff";
  return (
    <group rotation={[0.03, 0, -0.08]}>
      <mesh position={[0, 0.02, 0]} scale={[0.1, 1.18, 0.1]}><boxGeometry args={[1, 1, 1]} /><FlatMaterial color="#68462f" /></mesh>
      <mesh position={[-0.034, -0.08, -0.058]} scale={[0.024, 0.9, 0.018]}><boxGeometry args={[1, 1, 1]} /><FlatMaterial color="#c28d59" /></mesh>
      {[0.28, 0.42].map((y) => <mesh key={y} position={[0, y, 0]} scale={[0.15, 0.07, 0.15]}><boxGeometry args={[1, 1, 1]} /><FlatMaterial color={metal} /></mesh>)}
      <mesh position={[0, 0.68, 0]} rotation={[0, 0, Math.PI / 4]} scale={[0.24, 0.24, 0.18]}><octahedronGeometry args={[1, 0]} /><meshBasicMaterial color={glow} toneMapped={false} /></mesh>
      <mesh position={[0, 0.68, 0]} scale={[0.34, 0.34, 0.25]}><octahedronGeometry args={[1, 0]} /><meshBasicMaterial color={glow} transparent opacity={0.16} depthWrite={false} toneMapped={false} /></mesh>
      {tier >= 2 && <mesh position={[0, -0.48, 0]} scale={[0.18, 0.13, 0.18]}><boxGeometry args={[1, 1, 1]} /><FlatMaterial color={metal} /></mesh>}
    </group>
  );
}


function WeaponModel({ definition }) {
  const kind = definition.weaponClass;
  const metal = definition.color || "#c8cdd1";
  const edge = new THREE.Color(metal).lerp(new THREE.Color("#ffffff"), 0.38).getStyle();
  if (kind === "spear") return (
    <group rotation={[0.04, 0, -0.06]}>
      <mesh position={[0, 0.28, 0]} scale={[0.09, 1.85, 0.09]}><boxGeometry args={[1,1,1]} /><FlatMaterial color="#795237" /></mesh>
      <mesh position={[0, 1.35, 0]} rotation={[0,0,Math.PI/4]} scale={[0.24,0.58,0.14]}><octahedronGeometry args={[1,0]} /><FlatMaterial color={metal} /></mesh>
      <mesh position={[-0.055, 0.38, -0.055]} scale={[0.02, 1.45, 0.018]}><boxGeometry args={[1,1,1]} /><FlatMaterial color="#c3925e" /></mesh>
    </group>
  );
  if (kind === "katana") return (
    <group rotation={[0.03, 0, -0.1]}>
      <mesh position={[0, -0.22, 0]} scale={[0.13, 0.75, 0.13]}><boxGeometry args={[1,1,1]} /><FlatMaterial color="#27232a" /></mesh>
      {[ -0.44, -0.27, -0.1 ].map((y) => <mesh key={y} position={[0,y,0]} scale={[0.15,0.035,0.15]}><boxGeometry args={[1,1,1]} /><FlatMaterial color="#9a6258" /></mesh>)}
      <mesh position={[0,0.19,0]} scale={[0.58,0.11,0.2]}><boxGeometry args={[1,1,1]} /><FlatMaterial color="#c7a861" /></mesh>
      <mesh position={[0.04,1.02,0]} rotation={[0,0,-0.045]} scale={[0.12,1.65,0.075]}><boxGeometry args={[1,1,1]} /><FlatMaterial color={metal} /></mesh>
      <mesh position={[-0.025,1.02,-0.052]} rotation={[0,0,-0.045]} scale={[0.025,1.48,0.018]}><boxGeometry args={[1,1,1]} /><FlatMaterial color={edge} /></mesh>
      <mesh position={[0.11,1.83,0]} rotation={[0,0,0.32]} scale={[0.12,0.4,0.075]}><boxGeometry args={[1,1,1]} /><FlatMaterial color={metal} /></mesh>
    </group>
  );
  if (kind === "greatsword") return (
    <group rotation={[0.02, 0, -0.08]}>
      <mesh position={[0,-0.35,0]} scale={[0.16,0.72,0.16]}><boxGeometry args={[1,1,1]} /><FlatMaterial color="#4f3426" /></mesh>
      <mesh position={[0,0.12,0]} scale={[0.92,0.14,0.24]}><boxGeometry args={[1,1,1]} /><FlatMaterial color="#8d6a45" /></mesh>
      <mesh position={[0,1.05,0]} scale={[0.36,1.8,0.14]}><boxGeometry args={[1,1,1]} /><FlatMaterial color={metal} /></mesh>
      <mesh position={[-0.14,1.05,-0.08]} scale={[0.055,1.55,0.02]}><boxGeometry args={[1,1,1]} /><FlatMaterial color={edge} /></mesh>
      <mesh position={[0,2.03,0]} rotation={[0,0,Math.PI/4]} scale={[0.34,0.34,0.14]}><boxGeometry args={[1,1,1]} /><FlatMaterial color={metal} /></mesh>
    </group>
  );
  if (kind === "halberd") return (
    <group rotation={[0.02,0,-0.06]}>
      <mesh position={[0,0.38,0]} scale={[0.1,2.05,0.1]}><boxGeometry args={[1,1,1]} /><FlatMaterial color="#62422e" /></mesh>
      <mesh position={[0,1.57,0]} scale={[0.16,0.7,0.14]}><boxGeometry args={[1,1,1]} /><FlatMaterial color={metal} /></mesh>
      <mesh position={[0.4,1.42,0]} rotation={[0,0,-0.38]} scale={[0.72,0.52,0.16]}><boxGeometry args={[1,1,1]} /><FlatMaterial color={metal} /></mesh>
      <mesh position={[0.66,1.52,-0.095]} rotation={[0,0,-0.38]} scale={[0.05,0.42,0.018]}><boxGeometry args={[1,1,1]} /><FlatMaterial color={edge} /></mesh>
      <mesh position={[0,2.02,0]} rotation={[0,0,Math.PI/4]} scale={[0.2,0.5,0.14]}><octahedronGeometry args={[1,0]} /><FlatMaterial color={metal} /></mesh>
    </group>
  );
  if (kind === "warhammer") return (
    <group rotation={[0.01,0,-0.07]}>
      <mesh position={[0,0.25,0]} scale={[0.13,1.72,0.13]}><boxGeometry args={[1,1,1]} /><FlatMaterial color="#60402d" /></mesh>
      <mesh position={[0,1.17,0]} scale={[1.0,0.48,0.52]}><boxGeometry args={[1,1,1]} /><FlatMaterial color={metal} /></mesh>
      <mesh position={[-0.48,1.17,-0.2]} scale={[0.07,0.34,0.04]}><boxGeometry args={[1,1,1]} /><FlatMaterial color={edge} /></mesh>
      <mesh position={[0.58,1.17,0]} scale={[0.25,0.3,0.34]}><boxGeometry args={[1,1,1]} /><FlatMaterial color={metal} /></mesh>
      <mesh position={[0,-0.64,0]} scale={[0.22,0.16,0.22]}><boxGeometry args={[1,1,1]} /><FlatMaterial color="#8e6847" /></mesh>
    </group>
  );
  if (kind === "scythe") return (
    <group rotation={[0.02,0,-0.08]}>
      <mesh position={[0,0.35,0]} scale={[0.1,2.15,0.1]}><boxGeometry args={[1,1,1]} /><FlatMaterial color="#62422e" /></mesh>
      <mesh position={[0.36,1.55,0]} rotation={[0,0,-0.62]} scale={[0.78,0.16,0.13]}><boxGeometry args={[1,1,1]} /><FlatMaterial color={metal} /></mesh>
      <mesh position={[0.86,1.81,0]} rotation={[0,0,-1.0]} scale={[0.72,0.14,0.11]}><boxGeometry args={[1,1,1]} /><FlatMaterial color={metal} /></mesh>
      <mesh position={[1.16,2.18,-0.07]} rotation={[0,0,-1.24]} scale={[0.48,0.08,0.035]}><boxGeometry args={[1,1,1]} /><FlatMaterial color={edge} /></mesh>
      <mesh position={[0,-0.72,0]} scale={[0.18,0.16,0.18]}><boxGeometry args={[1,1,1]} /><FlatMaterial color="#8d6441" /></mesh>
    </group>
  );
  return null;
}

function HeldItem({ itemId }) {
  if (!itemId) return null;
  const definition = getItemDefinition(itemId);

  if (definition.arcaneFocus) return <ArcaneWand definition={definition} />;
  if (definition.weaponClass) return <WeaponModel definition={definition} />;

  if (definition.category === "tool") {
    return (
      <group rotation={[0.06, 0, -0.18]}>
        <mesh geometry={HANDLE_GEOMETRY} dispose={null}><FlatMaterial color="#735035" /></mesh>
        <mesh position={[-0.042, -0.02, -0.068]} scale={[0.025, 0.78, 0.018]}><boxGeometry args={[1, 1, 1]} /><FlatMaterial color="#bd8b57" /></mesh>
        <PixelToolHead definition={definition} />
      </group>
    );
  }

  if (BLOCK_TYPES[itemId]) return <HeldBlock itemId={itemId} />;

  if (itemId === "boat") {
    return (
      <group scale={0.42}>
        <mesh scale={[1.5, 0.32, 2.05]}><boxGeometry args={[1, 1, 1]} /><FlatMaterial color="#85562f" /></mesh>
        <mesh position={[0, 0.29, 0]} scale={[1.15, 0.22, 1.55]}><boxGeometry args={[1, 1, 1]} /><FlatMaterial color="#b17841" /></mesh>
      </group>
    );
  }

  return <mesh geometry={HELD_BLOCK_GEOMETRY} scale={0.72}><FlatMaterial color={definition.color || "#ffffff"} /></mesh>;
}

function PixelBlockArm({ handRef, detail = "high" }) {
  return (
    <group rotation={[-0.1, 0.36, -0.34]}>
      <mesh position={[0.02, -0.58, 0.08]} rotation={[0.08, 0.06, -0.05]} scale={[0.34, 0.48, 0.36]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <FlatMaterial color={SLEEVE_BASE} />
      </mesh>
      <mesh position={[-0.08, -0.56, -0.02]} rotation={[0.08, 0.06, -0.05]} scale={[0.05, 0.42, 0.1]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <FlatMaterial color={SLEEVE_LIGHT} />
      </mesh>
      <mesh position={[0.08, -0.61, 0.13]} rotation={[0.08, 0.06, -0.05]} scale={[0.06, 0.38, 0.08]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <FlatMaterial color={SLEEVE_DARK} />
      </mesh>
      {detail !== "standard" && (<>
        <mesh position={[-0.095, -0.48, 0.12]} rotation={[0.08, 0.06, -0.05]} scale={[0.055, 0.16, 0.1]} frustumCulled={false}><boxGeometry args={[1,1,1]} /><FlatMaterial color={SLEEVE_LIGHT} /></mesh>
        <mesh position={[0.13, -0.42, 0.02]} rotation={[0.08, 0.06, -0.05]} scale={[0.05, 0.13, 0.09]} frustumCulled={false}><boxGeometry args={[1,1,1]} /><FlatMaterial color={SLEEVE_DARK} /></mesh>
      </>)}
      {["ultra", "cinematic"].includes(detail) && (<>
        <mesh position={[-0.02,-0.72,0.15]} scale={[0.22,0.055,0.08]} frustumCulled={false}><boxGeometry args={[1,1,1]} /><FlatMaterial color={SLEEVE_LIGHT} /></mesh>
        <mesh position={[0.015,-0.78,0.12]} scale={[0.18,0.04,0.07]} frustumCulled={false}><boxGeometry args={[1,1,1]} /><FlatMaterial color={SLEEVE_DARK} /></mesh>
      </>)}
      {detail === "cinematic" && (<>
        {[-0.12, -0.04, 0.04, 0.12].map((x, index) => (
          <mesh key={`sleeve-stitch-${x}`} position={[x, -0.63 + index * 0.018, 0.195]} scale={[0.028, 0.045, 0.024]} frustumCulled={false}><boxGeometry args={[1,1,1]} /><FlatMaterial color={index % 2 ? SLEEVE_DARK : SLEEVE_LIGHT} /></mesh>
        ))}
        <mesh position={[0.03, -0.87, 0.11]} scale={[0.3, 0.045, 0.12]} frustumCulled={false}><boxGeometry args={[1,1,1]} /><FlatMaterial color="#7d573f" /></mesh>
        <mesh position={[0.03, -0.87, -0.02]} scale={[0.24, 0.036, 0.04]} frustumCulled={false}><boxGeometry args={[1,1,1]} /><FlatMaterial color="#c6a45f" /></mesh>
      </>)}

      <mesh position={[0.03, -0.19, 0.07]} rotation={[0.16, 0.12, -0.08]} scale={[0.28, 0.52, 0.3]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <FlatMaterial color={SKIN_BASE} />
      </mesh>
      <mesh position={[-0.04, -0.19, -0.01]} rotation={[0.16, 0.12, -0.08]} scale={[0.05, 0.44, 0.08]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <FlatMaterial color={SKIN_LIGHT} />
      </mesh>
      <mesh position={[0.09, -0.22, 0.12]} rotation={[0.16, 0.12, -0.08]} scale={[0.05, 0.42, 0.06]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <FlatMaterial color={SKIN_DARK} />
      </mesh>
      <mesh position={[0.03, 0.055, 0.02]} scale={[0.24, 0.05, 0.24]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <FlatMaterial color={SKIN_LIGHT} />
      </mesh>

      <group ref={handRef} position={[0.045, 0.19, 0.005]} rotation={[-0.08, 0.18, -0.08]}>
        <mesh scale={[0.25, 0.22, 0.27]} frustumCulled={false}>
          <boxGeometry args={[1, 1, 1]} />
          <FlatMaterial color={SKIN_BASE} />
        </mesh>
        <mesh position={[-0.09, 0.09, -0.055]} scale={[0.065, 0.018, 0.06]} frustumCulled={false}>
          <boxGeometry args={[1, 1, 1]} />
          <FlatMaterial color={SKIN_LIGHT} />
        </mesh>
        <mesh position={[0.08, -0.09, 0.06]} scale={[0.06, 0.018, 0.07]} frustumCulled={false}>
          <boxGeometry args={[1, 1, 1]} />
          <FlatMaterial color={SKIN_DARK} />
        </mesh>
        <mesh position={[0.14, -0.005, -0.02]} rotation={[0, 0, -0.26]} scale={[0.09, 0.16, 0.11]} frustumCulled={false}>
          <boxGeometry args={[1, 1, 1]} />
          <FlatMaterial color={SKIN_BASE} />
        </mesh>
        {[-0.08, -0.025, 0.025, 0.075].map((x, index) => (
          <mesh key={x} position={[x, 0.12 + Math.abs(index - 1.5) * -0.007, -0.02]} scale={[0.045, 0.09, 0.07]} frustumCulled={false}>
            <boxGeometry args={[1, 1, 1]} />
            <FlatMaterial color={index === 0 ? SKIN_DARK : SKIN_BASE} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export default function FirstPersonViewModel({ actionAnimationRef, visible = true, animateEnabled = true }) {
  const { camera, gl, scene, size, invalidate } = useThree();
  const overlayScene = useMemo(() => {
    const next = new THREE.Scene();
    next.matrixWorldAutoUpdate = true;
    next.background = null;
    return next;
  }, []);
  const overlayCamera = useMemo(() => {
    const next = new THREE.PerspectiveCamera(VIEWMODEL_FOV, 1, 0.02, 8);
    next.position.set(0, 0, 0);
    next.rotation.set(0, 0, 0);
    next.updateProjectionMatrix();
    return next;
  }, []);
  const rootRef = useRef();
  const modelRef = useRef();
  const handRef = useRef();
  const itemRef = useRef();
  const usableItem = useSelector((state) => {
    const selectedItem = state.world.hotbar[state.world.selectedIndex] || null;
    return selectedItem && (state.world.inventory[selectedItem] || 0) > 0 ? selectedItem : null;
  });
  const animation = useRef({ active: false, kind: "mine", startedAt: 0, strength: 1 });
  const modelDetail = useMemo(() => (typeof window === "undefined" ? "high" : localStorage.getItem("voxel:modelDetail") || "high"), []);

  useEffect(() => {
    actionAnimationRef.current = {
      trigger(kind = "mine", strength = 1) {
        animation.current = {
          active: true,
          kind,
          startedAt: performance.now(),
          strength: THREE.MathUtils.clamp(strength, 0.5, 1.45),
        };
        multiplayerSession.setLocalAnimation(kind, kind.startsWith("attack") ? (kind === "attack_warhammer" ? 780 : kind === "attack_greatsword" ? 700 : kind === "attack_halberd" ? 560 : kind === "attack_scythe" ? 520 : 380) : kind === "cast" ? 520 : kind === "step" ? 280 : 460);
        invalidate();
      },
    };
    return () => { actionAnimationRef.current = null; };
  }, [actionAnimationRef, invalidate]);

  useEffect(() => {
    const onAutoStep = (event) => {
      animation.current = {
        active: true,
        kind: "step",
        startedAt: performance.now(),
        strength: THREE.MathUtils.clamp(0.72 + Number(event?.detail?.height || 0) * 0.18, 0.72, 0.98),
      };
      invalidate();
    };
    window.addEventListener("voxel:auto-step", onAutoStep);
    return () => window.removeEventListener("voxel:auto-step", onAutoStep);
  }, [invalidate]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.traverse((object) => {
      object.frustumCulled = false;
      if (object.isMesh) renderOrderForViewModel(object);
    });
    root.visible = Boolean(visible);
    invalidate();
  }, [invalidate, usableItem, visible]);

  useEffect(() => {
    const aspect = Math.max(0.55, size.width / Math.max(1, size.height));
    if (Math.abs(overlayCamera.aspect - aspect) > 0.0001) {
      overlayCamera.aspect = aspect;
      overlayCamera.updateProjectionMatrix();
      invalidate();
    }
  }, [invalidate, overlayCamera, size.height, size.width]);

  // Priority 100 intentionally owns the final render. It draws the normal world
  // once, clears only the depth buffer, and then draws the tiny camera-space hand
  // scene. This guarantees blocks never cover the hand without creating a second
  // WebGL context or a second full world render.
  useFrame(({ clock }) => {
    const root = rootRef.current;
    const model = modelRef.current;
    if (root && model) {
      root.visible = Boolean(visible);
      const aspect = Math.max(0.55, size.width / Math.max(1, size.height));
      const portrait = aspect < 1.05;
      const ultrawide = aspect > 2.15;
      const baseX = portrait ? 0.27 : ultrawide ? 0.55 : 0.44;
      const baseY = portrait ? -0.39 : -0.34;
      const baseZ = portrait ? -1.58 : ultrawide ? -1.38 : -1.46;
      const idleBob = animateEnabled ? Math.sin(clock.elapsedTime * 2.35) * 0.012 : 0;
      const idleSway = animateEnabled ? Math.sin(clock.elapsedTime * 1.55) * 0.014 : 0;
      let swing = 0;
      let thrust = 0;
      let twist = 0;
      let recoil = 0;

      if (animateEnabled && animation.current.active) {
        const kind = animation.current.kind;
        const duration = kind === "attack_warhammer" ? 770 : kind === "attack_greatsword" ? 690 : kind === "attack_halberd" ? 560 : kind === "attack_scythe" ? 510 : kind === "attack_spear" ? 360 : kind === "attack_katana" ? 300 : kind === "attack" ? 245 : kind === "use" ? 290 : kind === "cast" ? 520 : kind === "step" ? 275 : 360;
        const progress = THREE.MathUtils.clamp((performance.now() - animation.current.startedAt) / duration, 0, 1);
        const anticipation = THREE.MathUtils.smoothstep(progress, 0, 0.22);
        const strike = Math.sin(Math.pow(progress, 0.78) * Math.PI);
        const followThrough = Math.sin(Math.min(1, Math.max(0, (progress - 0.18) / 0.82)) * Math.PI);
        const impact = Math.exp(-Math.pow((progress - 0.48) / 0.105, 2));
        const settle = Math.sin(progress * Math.PI * 3.2) * (1 - progress);
        swing = strike * animation.current.strength;
        recoil = (impact * 0.12 + settle * 0.035) * animation.current.strength;
        if (kind === "attack_spear") {
          thrust = strike * 0.46;
          twist = -0.12 + followThrough * 0.18;
          swing *= 0.35;
        } else if (kind === "attack_katana") {
          thrust = strike * 0.12;
          twist = -anticipation * 0.42 + followThrough * 1.45;
          swing *= 1.08;
        } else if (kind === "attack_greatsword") {
          thrust = strike * 0.17;
          twist = -anticipation * 1.05 + followThrough * 1.65;
          swing *= 1.24;
        } else if (kind === "attack_halberd") {
          thrust = strike * 0.2;
          twist = -anticipation * 0.7 + followThrough * 1.8;
          swing *= 1.18;
        } else if (kind === "attack_warhammer") {
          thrust = strike * 0.18;
          twist = -anticipation * 1.18 + followThrough * 1.42;
          swing *= 1.42;
          recoil *= 1.75;
        } else if (kind === "attack_scythe") {
          thrust = strike * 0.16;
          twist = -anticipation * 0.82 + followThrough * 2.15;
          swing *= 1.26;
          recoil *= 1.18;
        } else if (kind === "step") {
          swing = Math.sin(progress * Math.PI) * 0.16 * animation.current.strength;
          thrust = -Math.sin(progress * Math.PI) * 0.055;
          twist = settle * 0.22;
          recoil = Math.sin(progress * Math.PI) * 0.075;
        } else {
          thrust = kind === "attack" ? strike * 0.2 : kind === "cast" ? strike * 0.13 : strike * 0.055;
          twist = kind === "use" ? -strike * 0.34 : kind === "cast" ? -strike * 0.72 + Math.sin(progress * Math.PI * 4) * 0.08 : strike * 0.82;
        }
        if (progress >= 1) animation.current.active = false;
      }

      // Camera-space coordinates: +X is screen-right, +Y is screen-up, and -Z
      // points into the view. Keeping this rig independent from the world camera
      // removes axis inversions and FOV-dependent hand drift.
      const activeKind = animation.current.active ? animation.current.kind : "idle";
      const spearThrust = activeKind === "attack_spear" ? thrust : 0;
      model.position.set(baseX - swing * (activeKind === "attack_spear" ? 0.045 : activeKind === "attack_scythe" ? 0.16 : 0.13) + idleSway, baseY - swing * (activeKind === "attack_greatsword" || activeKind === "attack_warhammer" ? 0.16 : 0.085) + idleBob - recoil, baseZ - thrust - spearThrust * 0.22 + recoil * 0.18);
      // Anticipation, impact, and follow-through keep the camera-space hand
      // readable while matching the shoulder direction of the third-person rig.
      model.rotation.set(-0.31 - swing * (activeKind === "attack_spear" ? 0.16 : activeKind === "attack_greatsword" || activeKind === "attack_warhammer" ? 0.78 : 0.54), 0.38 + swing * (activeKind === "attack_halberd" || activeKind === "attack_scythe" ? 0.28 : 0.14), -0.45 - twist * 0.42 + recoil * 0.14);
      model.scale.setScalar(portrait ? 0.44 : ultrawide ? 0.53 : 0.49);
      if (handRef.current) handRef.current.rotation.z = -0.08 + swing * 0.16;
      if (itemRef.current) itemRef.current.rotation.set(-0.02 + swing * 0.14, 0.16 + swing * 0.1, -0.12);
    }

    const previousAutoClear = gl.autoClear;
    gl.autoClear = true;
    gl.render(scene, camera);
    if (visible) {
      gl.autoClear = false;
      gl.clearDepth();
      gl.render(overlayScene, overlayCamera);
    }
    gl.autoClear = previousAutoClear;
  }, 100);

  return createPortal(
    <group ref={rootRef} visible={visible} matrixAutoUpdate>
      <group ref={modelRef} frustumCulled={false}>
        <PixelBlockArm handRef={handRef} detail={modelDetail} />
        <group ref={itemRef} position={[0.04, 0.34, -0.1]} rotation={[0.01, 0.14, -0.1]} scale={0.66} frustumCulled={false}>
          <HeldItem itemId={usableItem} />
        </group>
      </group>
    </group>,
    overlayScene
  );
}

function renderOrderForViewModel(object) {
  object.renderOrder = 10000;
  if (Array.isArray(object.material)) {
    object.material.forEach((material) => {
      material.depthTest = true;
      material.depthWrite = true;
    });
  } else if (object.material) {
    object.material.depthTest = true;
    object.material.depthWrite = true;
  }
}
