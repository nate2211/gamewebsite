import React, { memo, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";

function Constellation() {
  const group = useRef();
  const points = useMemo(() => {
    const data = [];
    for (let i = 0; i < 90; i += 1) {
      const angle = i * 2.399963;
      const radius = 0.45 + (i % 17) * 0.115;
      data.push(Math.cos(angle) * radius, Math.sin(angle * 1.17) * radius * 0.62, -1 + (i % 9) * 0.16);
    }
    return new Float32Array(data);
  }, []);
  const links = useMemo(() => {
    const data = [];
    for (let i = 0; i < 35; i += 1) {
      const a = i * 3;
      const b = ((i * 7 + 13) % 90) * 3;
      data.push(points[a], points[a + 1], points[a + 2], points[b], points[b + 1], points[b + 2]);
    }
    return new Float32Array(data);
  }, [points]);
  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.rotation.z = Math.sin(clock.elapsedTime * 0.15) * 0.08;
    group.current.rotation.y = clock.elapsedTime * 0.04;
  });
  return (
    <group ref={group}>
      <points>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[points, 3]} /></bufferGeometry>
        <pointsMaterial size={0.045} color="#b9d6ff" transparent opacity={0.85} depthWrite={false} sizeAttenuation />
      </points>
      <lineSegments>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[links, 3]} /></bufferGeometry>
        <lineBasicMaterial color="#668dd6" transparent opacity={0.24} depthWrite={false} />
      </lineSegments>
    </group>
  );
}

function PerkConstellationCanvas() {
  return (
    <div className="perk-constellation-canvas" aria-hidden="true">
      <Canvas camera={{ position: [0, 0, 5.8], fov: 45 }} dpr={[0.7, 1]} gl={{ antialias: false, alpha: true }}>
        <Constellation />
      </Canvas>
    </div>
  );
}
export default memo(PerkConstellationCanvas);
