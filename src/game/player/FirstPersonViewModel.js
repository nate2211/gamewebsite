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

function HeldItem({ itemId }) {
  if (!itemId) return null;
  const definition = getItemDefinition(itemId);

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

function PixelBlockArm({ handRef }) {
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

  useEffect(() => {
    actionAnimationRef.current = {
      trigger(kind = "mine", strength = 1) {
        animation.current = {
          active: true,
          kind,
          startedAt: performance.now(),
          strength: THREE.MathUtils.clamp(strength, 0.5, 1.45),
        };
        multiplayerSession.setLocalAnimation(kind, kind === "attack" ? 320 : 460);
        invalidate();
      },
    };
    return () => { actionAnimationRef.current = null; };
  }, [actionAnimationRef, invalidate]);

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
      const baseX = portrait ? 0.3 : ultrawide ? 0.6 : 0.5;
      const baseY = portrait ? -0.28 : -0.22;
      const baseZ = portrait ? -1.5 : ultrawide ? -1.28 : -1.34;
      const idleBob = animateEnabled ? Math.sin(clock.elapsedTime * 2.35) * 0.012 : 0;
      const idleSway = animateEnabled ? Math.sin(clock.elapsedTime * 1.55) * 0.014 : 0;
      let swing = 0;
      let thrust = 0;
      let twist = 0;

      if (animateEnabled && animation.current.active) {
        const duration = animation.current.kind === "attack" ? 245 : animation.current.kind === "use" ? 270 : 360;
        const progress = THREE.MathUtils.clamp((performance.now() - animation.current.startedAt) / duration, 0, 1);
        const strike = Math.sin(progress * Math.PI);
        swing = strike * animation.current.strength;
        thrust = animation.current.kind === "attack" ? strike * 0.2 : strike * 0.055;
        twist = animation.current.kind === "use" ? -strike * 0.34 : strike * 0.82;
        if (progress >= 1) animation.current.active = false;
      }

      // Camera-space coordinates: +X is screen-right, +Y is screen-up, and -Z
      // points into the view. Keeping this rig independent from the world camera
      // removes axis inversions and FOV-dependent hand drift.
      model.position.set(baseX - swing * 0.15 + idleSway, baseY - swing * 0.1 + idleBob, baseZ - thrust);
      // Rest higher on screen, roll clockwise toward the right, and pitch the
      // knuckles upward while preserving the full mining/attack arc.
      model.rotation.set(-0.22 - swing * 0.58, 0.46 + swing * 0.16, -0.56 - twist * 0.46);
      model.scale.setScalar(portrait ? 0.48 : ultrawide ? 0.58 : 0.54);
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
        <PixelBlockArm handRef={handRef} />
        <group ref={itemRef} position={[0.03, 0.36, -0.08]} rotation={[0.01, 0.14, -0.1]} scale={0.68} frustumCulled={false}>
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
