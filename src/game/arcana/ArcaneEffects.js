import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { ARCANE_RESEARCH_BY_ID } from "../config/arcana";
import { arcaneRuntime } from "./arcaneRuntime";

const BOLT_GEOMETRY = new THREE.OctahedronGeometry(0.12, 0);
const RING_GEOMETRY = new THREE.TorusGeometry(0.46, 0.035, 6, 20);

function ArcaneEffect({ event, onDone }) {
  const groupRef = useRef();
  const materialRef = useRef();
  const origin = useMemo(() => new THREE.Vector3(...(event.origin || [0, 0, 0])), [event.origin]);
  const target = useMemo(() => new THREE.Vector3(...(event.target || event.origin || [0, 0, 0])), [event.origin, event.target]);
  const definition = ARCANE_RESEARCH_BY_ID[event.spellId] || ARCANE_RESEARCH_BY_ID.spark_bolt;

  useFrame(() => {
    const age = (performance.now() - event.createdAt) / 1000;
    const duration = event.spellId === "spark_bolt" || event.spellId === "chain_spark" ? 0.42 : 0.78;
    if (age >= duration) {
      onDone(event.id);
      return;
    }
    const progress = THREE.MathUtils.clamp(age / duration, 0, 1);
    const group = groupRef.current;
    if (!group) return;
    if (event.spellId === "spark_bolt" || event.spellId === "chain_spark") {
      group.position.lerpVectors(origin, target, progress);
      group.rotation.x += 0.18;
      group.rotation.y += 0.24;
      group.scale.setScalar(0.8 + Math.sin(progress * Math.PI) * 1.25);
    } else {
      group.position.copy(target);
      group.scale.setScalar(0.35 + progress * 2.2);
      group.rotation.z += 0.04;
    }
    if (materialRef.current) materialRef.current.opacity = Math.max(0, 1 - progress);
  });

  const bolt = event.spellId === "spark_bolt" || event.spellId === "chain_spark";
  return (
    <group ref={groupRef} position={origin}>
      <mesh geometry={bolt ? BOLT_GEOMETRY : RING_GEOMETRY}>
        <meshBasicMaterial ref={materialRef} color={definition.color} transparent opacity={0.95} depthWrite={false} toneMapped={false} />
      </mesh>
      <pointLight color={definition.color} intensity={bolt ? 1.8 : 1.1} distance={bolt ? 4 : 3} />
    </group>
  );
}

export default function ArcaneEffects() {
  const [events, setEvents] = useState([]);
  useEffect(() => arcaneRuntime.subscribe((event) => {
    setEvents((current) => [...current.slice(-18), event]);
  }), []);
  return events.map((event) => (
    <ArcaneEffect key={event.id} event={event} onDone={(id) => setEvents((current) => current.filter((entry) => entry.id !== id))} />
  ));
}
