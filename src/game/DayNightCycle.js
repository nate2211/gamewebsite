import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useDispatch, useSelector } from "react-redux";
import { setWorldTime } from "../features/world/worldSlice";

const DAY_COLOR = new THREE.Color("#7ec9ff");
const SUNSET_COLOR = new THREE.Color("#e88b65");
const NIGHT_COLOR = new THREE.Color("#071225");
const DAY_GROUND = new THREE.Color("#31441f");
const NIGHT_GROUND = new THREE.Color("#080b12");

export default function DayNightCycle() {
  const dispatch = useDispatch();
  const storedTime = useSelector((state) => state.world.worldTime);
  const { scene } = useThree();
  const timeRef = useRef(storedTime || 5500);
  const dispatchTimer = useRef(0);
  const sunRef = useRef();
  const hemisphereRef = useRef();
  const backgroundColor = useMemo(() => new THREE.Color(), []);
  const groundColor = useMemo(() => new THREE.Color(), []);

  useEffect(() => {
    timeRef.current = storedTime || 0;
  }, [storedTime]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    timeRef.current = (timeRef.current + delta * 20) % 24000;
    dispatchTimer.current += delta;

    const angle = (timeRef.current / 24000) * Math.PI * 2 - Math.PI / 2;
    const sunHeight = Math.sin(angle);
    const daylight = THREE.MathUtils.clamp((sunHeight + 0.18) / 0.82, 0, 1);
    const sunset = 1 - Math.min(1, Math.abs(sunHeight) * 5);

    backgroundColor.copy(NIGHT_COLOR).lerp(DAY_COLOR, daylight);
    if (sunset > 0 && daylight > 0.05) {
      backgroundColor.lerp(SUNSET_COLOR, sunset * 0.42);
    }
    groundColor.copy(NIGHT_GROUND).lerp(DAY_GROUND, daylight);

    scene.background = backgroundColor;
    if (!scene.fog) scene.fog = new THREE.Fog(backgroundColor, 24, 76);
    scene.fog.color.copy(backgroundColor);

    if (sunRef.current) {
      sunRef.current.position.set(
        Math.cos(angle) * 34,
        sunHeight * 42,
        Math.sin(angle) * 30
      );
      sunRef.current.intensity = 0.12 + daylight * 2.05;
      sunRef.current.color.set(daylight > 0.2 ? "#fff2ce" : "#7797cc");
    }

    if (hemisphereRef.current) {
      hemisphereRef.current.intensity = 0.18 + daylight * 1.35;
      hemisphereRef.current.color.copy(backgroundColor).lerp(DAY_COLOR, 0.45);
      hemisphereRef.current.groundColor.copy(groundColor);
    }

    if (dispatchTimer.current >= 1) {
      dispatchTimer.current = 0;
      dispatch(setWorldTime(Math.floor(timeRef.current)));
    }
  });

  return (
    <>
      <hemisphereLight
        ref={hemisphereRef}
        args={["#dff4ff", "#26351d", 1.4]}
      />
      <directionalLight
        ref={sunRef}
        position={[20, 32, 12]}
        intensity={2}
      />
      <ambientLight intensity={0.08} />
    </>
  );
}
