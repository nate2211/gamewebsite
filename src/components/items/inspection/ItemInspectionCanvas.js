import React, { memo, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { BLOCK_TYPES, getItemDefinition } from "../../../game/config/blockTypes";
import { getBlockMaterials } from "../../../game/world/rendering/voxelTextures";

function Material({ color, metalness = 0.25, roughness = 0.55, emissive = "#000000" }) {
  return <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} emissive={emissive} emissiveIntensity={0.18} />;
}

function ToolModel({ definition }) {
  const color = definition.color || "#a9a9a9";
  const toolType = definition.toolType;
  return (
    <group rotation={[0.12, 0, -0.58]}>
      <mesh position={[0, -0.2, 0]} scale={[0.13, 1.65, 0.13]}>
        <boxGeometry args={[1, 1, 1]} />
        <Material color="#83552e" roughness={0.82} />
      </mesh>
      {toolType === "pickaxe" && (
        <>
          <mesh position={[0, 0.72, 0]} scale={[1.15, 0.16, 0.19]}><boxGeometry args={[1, 1, 1]} /><Material color={color} metalness={0.72} /></mesh>
          <mesh position={[-0.62, 0.57, 0]} rotation={[0, 0, -0.65]} scale={[0.24, 0.46, 0.19]}><boxGeometry args={[1, 1, 1]} /><Material color={color} metalness={0.72} /></mesh>
          <mesh position={[0.62, 0.57, 0]} rotation={[0, 0, 0.65]} scale={[0.24, 0.46, 0.19]}><boxGeometry args={[1, 1, 1]} /><Material color={color} metalness={0.72} /></mesh>
        </>
      )}
      {toolType === "axe" && <mesh position={[0.34, 0.62, 0]} scale={[0.72, 0.74, 0.2]}><boxGeometry args={[1, 1, 1]} /><Material color={color} metalness={0.7} /></mesh>}
      {toolType === "shovel" && <mesh position={[0, 0.72, 0]} scale={[0.48, 0.68, 0.18]}><boxGeometry args={[1, 1, 1]} /><Material color={color} metalness={0.64} /></mesh>}
      {toolType === "sword" && (
        <>
          <mesh position={[0, 0.7, 0]} scale={[0.19, 1.38, 0.09]}><boxGeometry args={[1, 1, 1]} /><Material color={color} metalness={0.82} /></mesh>
          <mesh position={[0, 0.04, 0]} scale={[0.82, 0.14, 0.18]}><boxGeometry args={[1, 1, 1]} /><Material color="#c69b53" metalness={0.64} /></mesh>
        </>
      )}
    </group>
  );
}

function ArmorModel({ definition }) {
  const color = definition.color || "#8e8e8e";
  const slot = definition.armorSlot;
  if (slot === "helmet") {
    return (
      <group>
        <mesh scale={[0.9, 0.78, 0.82]}><boxGeometry args={[1, 1, 1]} /><Material color={color} metalness={0.7} /></mesh>
        <mesh position={[0, -0.16, -0.47]} scale={[0.68, 0.12, 0.08]}><boxGeometry args={[1, 1, 1]} /><Material color="#17191d" /></mesh>
      </group>
    );
  }
  if (slot === "chestplate") {
    return (
      <group>
        <mesh scale={[1.1, 1.22, 0.48]}><boxGeometry args={[1, 1, 1]} /><Material color={color} metalness={0.68} /></mesh>
        <mesh position={[0, 0.12, -0.28]} scale={[0.46, 0.7, 0.08]} rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[1, 1, 1]} /><Material color="#e4d3a4" metalness={0.45} /></mesh>
      </group>
    );
  }
  if (slot === "leggings") {
    return (
      <group>
        <mesh position={[-0.32, -0.15, 0]} scale={[0.48, 1.35, 0.48]}><boxGeometry args={[1, 1, 1]} /><Material color={color} metalness={0.65} /></mesh>
        <mesh position={[0.32, -0.15, 0]} scale={[0.48, 1.35, 0.48]}><boxGeometry args={[1, 1, 1]} /><Material color={color} metalness={0.65} /></mesh>
        <mesh position={[0, 0.56, 0]} scale={[0.92, 0.28, 0.48]}><boxGeometry args={[1, 1, 1]} /><Material color={color} metalness={0.65} /></mesh>
      </group>
    );
  }
  return (
    <group>
      <mesh position={[-0.32, -0.15, 0]} scale={[0.52, 0.78, 0.7]}><boxGeometry args={[1, 1, 1]} /><Material color={color} metalness={0.66} /></mesh>
      <mesh position={[0.32, -0.15, 0]} scale={[0.52, 0.78, 0.7]}><boxGeometry args={[1, 1, 1]} /><Material color={color} metalness={0.66} /></mesh>
    </group>
  );
}

function GenericModel({ definition }) {
  const color = definition.color || "#d9d9d9";
  if (definition.category === "food") {
    return (
      <group>
        <mesh scale={[0.72, 0.72, 0.72]}><dodecahedronGeometry args={[0.9, 0]} /><Material color={color} roughness={0.8} /></mesh>
        <mesh position={[0, 0.82, 0]} scale={[0.12, 0.42, 0.12]}><boxGeometry args={[1, 1, 1]} /><Material color="#4d2c18" /></mesh>
      </group>
    );
  }
  return (
    <mesh scale={0.95}>
      <octahedronGeometry args={[0.88, 0]} />
      <Material color={color} metalness={definition.category === "material" ? 0.55 : 0.18} emissive={definition.tier >= 4 ? color : "#000000"} />
    </mesh>
  );
}

function BlockModel({ itemId }) {
  const material = useMemo(() => getBlockMaterials(itemId), [itemId]);
  return <mesh material={material} scale={1.25}><boxGeometry args={[1, 1, 1]} /></mesh>;
}

function DisplayObject({ itemId }) {
  const group = useRef();
  const definition = getItemDefinition(itemId);
  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.58;
    group.current.position.y = Math.sin(clock.elapsedTime * 1.35) * 0.08;
  });
  return (
    <group ref={group} rotation={[0.12, -0.55, 0]}>
      {BLOCK_TYPES[itemId] ? <BlockModel itemId={itemId} /> : definition.category === "tool" ? <ToolModel definition={definition} /> : definition.category === "armor" ? <ArmorModel definition={definition} /> : <GenericModel definition={definition} />}
    </group>
  );
}

function Scene({ itemId }) {
  return (
    <>
      <ambientLight intensity={1.45} />
      <directionalLight position={[3, 4, 4]} intensity={2.2} color="#ffe2aa" />
      <directionalLight position={[-4, 1, 2]} intensity={1.4} color="#6fa9ff" />
      <pointLight position={[0, -1.2, 2]} intensity={1.8} color="#d28b49" distance={6} />
      <DisplayObject itemId={itemId} />
      <mesh position={[0, -1.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 1.35, 48]} />
        <meshBasicMaterial color="#c99a4f" transparent opacity={0.46} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}

function ItemInspectionCanvas({ itemId }) {
  if (!itemId) return <div className="item-inspection-empty">Select an item</div>;
  return (
    <div className="item-inspection-canvas" aria-label={`3D preview of ${getItemDefinition(itemId).name}`}>
      <Canvas camera={{ position: [0, 0.25, 4.1], fov: 38, near: 0.1, far: 20 }} dpr={[1, 1.4]} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}>
        <Scene itemId={itemId} />
      </Canvas>
    </div>
  );
}

export default memo(ItemInspectionCanvas);
