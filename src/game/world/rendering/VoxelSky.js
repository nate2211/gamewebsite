import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useSelector } from "react-redux";

const CLOUD_LAYOUT = [
  [-52, 1, -32, 1.2], [-20, -2, -56, 0.9], [18, 2, -48, 1.15],
  [52, -1, -22, 0.85], [-58, 0, 14, 1.05], [-24, 3, 34, 1.25],
  [16, -2, 46, 0.95], [50, 2, 24, 1.1], [4, 1, -18, 0.8],
];

const CLOUD_BLOCKS = [
  [-3, 0, 0, 3, 1, 2], [-1, 0.45, 0, 4, 1.25, 2.2],
  [2, 0, 0.2, 3, 1, 1.8], [0, 0, 1.6, 4.5, 0.9, 1.3],
];

const STAR_LAYOUT = Array.from({ length: 64 }, (_, index) => {
  const angle = (index / 64) * Math.PI * 2 + (index % 7) * 0.31;
  const radius = 54 + (index % 5) * 6;
  return [Math.cos(angle) * radius, 30 + (index % 9) * 5, Math.sin(angle) * radius, index % 4 === 0 ? 0.22 : 0.13];
});

function Cloud({ layout, index }) {
  const [x, y, z, scale] = layout;
  return (
    <group position={[x, 38 + y, z]} scale={scale}>
      {CLOUD_BLOCKS.map(([bx, by, bz, sx, sy, sz], blockIndex) => (
        <mesh key={blockIndex} position={[bx, by, bz]} scale={[sx, sy, sz]} frustumCulled={false}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial
            color={index % 3 === 0 ? "#e9f1f2" : "#f8fbfb"}
            transparent
            opacity={0.82}
            depthWrite={false}
            toneMapped={false}
            fog={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function SunPixels() {
  return (
    <group>
      <mesh><planeGeometry args={[10, 10]} /><meshBasicMaterial color="#ffe989" depthWrite={false} fog={false} toneMapped={false} /></mesh>
      {[[-3,3],[-1,3],[1,3],[3,3],[-3,1],[3,1],[-3,-1],[3,-1],[-3,-3],[-1,-3],[1,-3],[3,-3]].map(([x,y], index) => (
        <mesh key={index} position={[x, y, 0.01]}><planeGeometry args={[1.45,1.45]} /><meshBasicMaterial color="#fff6bd" depthWrite={false} fog={false} toneMapped={false} /></mesh>
      ))}
    </group>
  );
}

function MoonPixels() {
  return (
    <group>
      <mesh><planeGeometry args={[8, 8]} /><meshBasicMaterial color="#d9e9ef" depthWrite={false} fog={false} toneMapped={false} /></mesh>
      {[[-2.3,2.1,1.4], [1.7,1.4,1.1], [-.6,-1.8,1.6], [2.5,-2.4,.8]].map(([x,y,size], index) => (
        <mesh key={index} position={[x,y,0.01]}><planeGeometry args={[size,size]} /><meshBasicMaterial color="#aebfca" depthWrite={false} fog={false} toneMapped={false} /></mesh>
      ))}
    </group>
  );
}

export default function VoxelSky() {
  const worldTime = useSelector((state) => state.world.worldTime);
  const { camera } = useThree();
  const rootRef = useRef();
  const cloudsRef = useRef();
  const sunRef = useRef();
  const moonRef = useRef();
  const starsRef = useRef();
  const normalized = ((worldTime || 0) % 24000) / 24000;
  const sunAngle = normalized * Math.PI * 2;
  const daylight = THREE.MathUtils.clamp(Math.sin(sunAngle) * 0.72 + 0.38, 0, 1);
  const cloudMaterialOpacity = 0.35 + daylight * 0.55;
  const cloudLayouts = useMemo(() => CLOUD_LAYOUT, []);

  useFrame((state, delta) => {
    if (!rootRef.current) return;
    rootRef.current.position.set(camera.position.x, 0, camera.position.z);
    if (cloudsRef.current) cloudsRef.current.position.x = (cloudsRef.current.position.x + delta * 0.5) % 82;

    const orbit = 74;
    const sunPosition = new THREE.Vector3(Math.cos(sunAngle) * orbit, Math.sin(sunAngle) * orbit, -34);
    const moonPosition = sunPosition.clone().multiplyScalar(-1);
    if (sunRef.current) {
      sunRef.current.position.copy(sunPosition);
      sunRef.current.lookAt(camera.position.x, camera.position.y, camera.position.z);
      sunRef.current.visible = daylight > 0.035;
    }
    if (moonRef.current) {
      moonRef.current.position.copy(moonPosition);
      moonRef.current.lookAt(camera.position.x, camera.position.y, camera.position.z);
      moonRef.current.visible = daylight < 0.7;
    }
    if (starsRef.current) {
      const opacity = THREE.MathUtils.clamp((0.52 - daylight) * 2.3, 0, 0.9);
      starsRef.current.visible = opacity > 0.02;
      starsRef.current.children.forEach((star) => { star.material.opacity = opacity; });
    }
    if (cloudsRef.current) {
      cloudsRef.current.children.forEach((cloud) => {
        cloud.children.forEach((block) => { if (block.material) block.material.opacity = cloudMaterialOpacity; });
      });
    }
  });

  return (
    <group ref={rootRef} renderOrder={-100}>
      <group ref={starsRef}>
        {STAR_LAYOUT.map(([x,y,z,size], index) => (
          <mesh key={index} position={[x,y,z]} scale={size} frustumCulled={false}>
            <boxGeometry args={[1,1,1]} />
            <meshBasicMaterial color={index % 5 === 0 ? "#bcd8ff" : "#ffffff"} transparent opacity={0} depthWrite={false} fog={false} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <group ref={cloudsRef}>
        {cloudLayouts.map((layout, index) => <Cloud key={index} layout={layout} index={index} />)}
      </group>
      <group ref={sunRef} renderOrder={-90} frustumCulled={false}><SunPixels /></group>
      <group ref={moonRef} renderOrder={-90} frustumCulled={false}><MoonPixels /></group>
    </group>
  );
}
