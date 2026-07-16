import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useSelector } from "react-redux";
import { BLOCK_TYPES } from "./blockTypes";
import { blockKey, getVisibleBlocksByType } from "./worldUtils";

const CENTER = new THREE.Vector2(0, 0);
const CUBE_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);
const MATERIALS = Object.fromEntries(
  Object.values(BLOCK_TYPES).map((block) => [
    block.id,
    new THREE.MeshLambertMaterial({
      color: block.color,
      flatShading: true,
      transparent: Boolean(block.transparent),
      opacity: block.id === "leaves" ? 0.9 : block.id === "glass" ? 0.42 : 1,
      depthWrite: block.id !== "glass",
    }),
  ])
);

function BlockInstances({ type, positions, registerMesh }) {
  const meshRef = useRef();
  const matrixObject = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    positions.forEach(([x, y, z], index) => {
      matrixObject.position.set(x, y, z);
      matrixObject.rotation.set(0, 0, 0);
      matrixObject.scale.set(1, 1, 1);
      matrixObject.updateMatrix();
      mesh.setMatrixAt(index, matrixObject.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [matrixObject, positions]);

  if (!MATERIALS[type]) return null;

  return (
    <instancedMesh
      key={`${type}-${positions.length}`}
      ref={(node) => {
        meshRef.current = node;
        registerMesh(type, node);
      }}
      args={[CUBE_GEOMETRY, MATERIALS[type], positions.length]}
      castShadow={false}
      receiveShadow
      dispose={null}
      userData={{ blockType: type }}
    />
  );
}

function MiningCracks({ miningVisualRef }) {
  const groupRef = useRef();
  const outerRef = useRef();
  const middleRef = useRef();
  const innerRef = useRef();

  useFrame(({ clock }) => {
    const group = groupRef.current;
    const visual = miningVisualRef.current;
    if (!group || !visual?.position || visual.progress <= 0) {
      if (group) group.visible = false;
      return;
    }

    group.visible = true;
    group.position.set(...visual.position);
    const progress = THREE.MathUtils.clamp(visual.progress, 0, 1);
    const pulse = Math.sin(clock.elapsedTime * 28) * 0.003 * progress;
    group.scale.setScalar(1.018 + progress * 0.035 + pulse);
    group.rotation.set(
      progress * 0.12,
      progress * -0.14,
      Math.sin(clock.elapsedTime * 8) * progress * 0.025
    );

    if (outerRef.current) {
      outerRef.current.opacity = 0.25 + progress * 0.55;
      outerRef.current.color.set(progress > 0.72 ? "#ff5d4a" : "#ffffff");
    }
    if (middleRef.current) {
      middleRef.current.opacity = progress > 0.32 ? 0.55 : 0;
    }
    if (innerRef.current) {
      innerRef.current.opacity = progress > 0.68 ? 0.78 : 0;
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          ref={outerRef}
          wireframe
          transparent
          opacity={0.4}
          depthTest={false}
        />
      </mesh>
      <mesh rotation={[0.36, 0.48, 0.18]} scale={0.88}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          ref={middleRef}
          color="#161616"
          wireframe
          transparent
          opacity={0}
          depthTest={false}
        />
      </mesh>
      <mesh rotation={[-0.52, 0.25, -0.31]} scale={0.69}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          ref={innerRef}
          color="#000000"
          wireframe
          transparent
          opacity={0}
          depthTest={false}
        />
      </mesh>
    </group>
  );
}

export default function WorldRenderer({ targetRef, miningVisualRef }) {
  const blocks = useSelector((state) => state.world.blocks);
  const visibleByType = useMemo(() => getVisibleBlocksByType(blocks), [blocks]);
  const meshMap = useRef({});
  const raycaster = useMemo(() => {
    const next = new THREE.Raycaster();
    next.far = 6;
    return next;
  }, []);
  const { camera } = useThree();
  const [highlight, setHighlight] = useState(null);
  const lastTargetKey = useRef("");

  const registerMesh = (type, node) => {
    if (node) meshMap.current[type] = node;
    else delete meshMap.current[type];
  };

  useFrame(() => {
    raycaster.setFromCamera(CENTER, camera);
    const meshes = Object.values(meshMap.current).filter(Boolean);
    const hit = raycaster.intersectObjects(meshes, false)[0];

    if (!hit || hit.instanceId == null || !hit.face) {
      targetRef.current = null;
      if (lastTargetKey.current) {
        lastTargetKey.current = "";
        setHighlight(null);
      }
      return;
    }

    const type = hit.object.userData.blockType;
    const position = visibleByType[type]?.[hit.instanceId];
    if (!position) return;

    const normal = hit.face.normal
      .clone()
      .transformDirection(hit.object.matrixWorld)
      .round();
    const key = blockKey(position[0], position[1], position[2]);
    targetRef.current = {
      kind: "block",
      key,
      position,
      normal: [normal.x, normal.y, normal.z],
      type,
      distance: hit.distance,
    };

    if (lastTargetKey.current !== key) {
      lastTargetKey.current = key;
      setHighlight(position);
    }
  });

  return (
    <>
      {Object.entries(visibleByType).map(([type, positions]) => (
        <BlockInstances
          key={type}
          type={type}
          positions={positions}
          registerMesh={registerMesh}
        />
      ))}

      {highlight && (
        <mesh position={highlight}>
          <boxGeometry args={[1.025, 1.025, 1.025]} />
          <meshBasicMaterial
            color="#ffffff"
            wireframe
            transparent
            opacity={0.8}
            depthTest={false}
          />
        </mesh>
      )}
      <MiningCracks miningVisualRef={miningVisualRef} />
    </>
  );
}
