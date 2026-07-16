import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useDispatch, useSelector } from "react-redux";
import { setWorldTime } from "../features/world/worldSlice";
import { WORLD_START_TIME } from "./worldGenerator";
import { getPerformanceProfile } from "./performanceProfile";

const DAY_COLOR = new THREE.Color("#7ec9ff");
const SUNSET_COLOR = new THREE.Color("#e88b65");
const NIGHT_COLOR = new THREE.Color("#071225");
const DAY_GROUND = new THREE.Color("#31441f");
const NIGHT_GROUND = new THREE.Color("#080b12");

export default function DayNightCycle({ enabled = true }) {
  const dispatch = useDispatch();
  const storedTime = useSelector((state) => state.world.worldTime);
  const { scene } = useThree();
  const timeRef = useRef(Number.isFinite(storedTime) ? storedTime : WORLD_START_TIME);
  const dispatchTimer = useRef(0);
  const visualTimer = useRef(0);
  const profile = useMemo(getPerformanceProfile, []);
  const sunRef = useRef();
  const hemisphereRef = useRef();
  const backgroundColor = useMemo(() => new THREE.Color(), []);
  const groundColor = useMemo(() => new THREE.Color(), []);

  useEffect(() => {
    timeRef.current = Number.isFinite(storedTime) ? storedTime : WORLD_START_TIME;
  }, [storedTime]);

  useEffect(() => {
    scene.fog = new THREE.Fog("#7ec9ff", Math.max(18, profile.cameraFar * 0.28), profile.cameraFar * 0.92);
    return () => {
      scene.fog = null;
    };
  }, [profile.cameraFar, scene]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    if (enabled) timeRef.current = (timeRef.current + delta * 72) % 24000;
    visualTimer.current += delta;
    dispatchTimer.current += enabled ? delta : 0;
    if (visualTimer.current < 1 / 24) return;
    visualTimer.current = 0;
    const normalized = timeRef.current / 24000;
    // 0 is sunrise, 6000 is noon, 12000 is sunset, and 18000 is midnight.
    const sunAngle = normalized * Math.PI * 2;
    const daylight = THREE.MathUtils.clamp(Math.sin(sunAngle) * 0.72 + 0.38, 0.02, 1);
    const sunset = 1 - Math.min(1, Math.abs(daylight - 0.42) * 4.5);

    backgroundColor.copy(NIGHT_COLOR).lerp(DAY_COLOR, daylight);
    if (sunset > 0 && daylight > 0.12) backgroundColor.lerp(SUNSET_COLOR, sunset * 0.24);
    groundColor.copy(NIGHT_GROUND).lerp(DAY_GROUND, daylight);
    scene.background = backgroundColor;
    if (scene.fog) scene.fog.color.copy(backgroundColor);

    if (sunRef.current) {
      sunRef.current.position.set(Math.cos(sunAngle) * 42, Math.sin(sunAngle) * 48, 18);
      sunRef.current.intensity = 0.08 + daylight * 1.65;
      sunRef.current.color.set(daylight < 0.4 ? "#ffb17a" : "#fff4d6");
    }
    if (hemisphereRef.current) {
      hemisphereRef.current.intensity = 0.12 + daylight * 0.9;
      hemisphereRef.current.color.copy(backgroundColor);
      hemisphereRef.current.groundColor.copy(groundColor);
    }

    if (enabled) {
      if (dispatchTimer.current >= 2) {
        dispatchTimer.current = 0;
        dispatch(setWorldTime(Math.floor(timeRef.current)));
      }
    }
  });

  return (
    <>
      <hemisphereLight ref={hemisphereRef} intensity={0.8} color="#d8efff" groundColor="#26351c" />
      <directionalLight ref={sunRef} position={[30, 45, 20]} intensity={1.4} />
      <ambientLight intensity={0.06} />
    </>
  );
}
