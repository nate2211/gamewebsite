import { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useDispatch, useSelector } from "react-redux";
import { damagePlayer, dismount, setPlayerPosition, survivalTick } from "../../features/world/worldSlice";
import { BLOCK_TYPES } from "../config/blockTypes";
import useKeyboard from "./useKeyboard";
import { findSupportedWaterLedgeStep } from "./movementUtils";
import { worldRuntime } from "../core/worldRuntime";
import { liquidRuntime } from "../liquids/liquidRuntime";
import { getJumpVelocity } from "../config/progression";
import { readRuntimeSettings } from "../config/runtimeSettings";
import {
  createStreamingBoundarySampler,
  touchesUnloadedChunk,
} from "./streamingBoundarySafety";

const PLAYER_RADIUS = 0.3;
const PLAYER_HEIGHT = 1.8;
const EYE_HEIGHT = 1.62;
const WATER_LEDGE_STEP = 1.35;
const UP = new THREE.Vector3(0, 1, 0);
const EPSILON = 0.0001;
const LOOK_SENSITIVITY = 0.0022;
const INITIAL_CAMERA_PITCH = -0.72;

function overlappingBlockRange(min, max) {
  return [Math.ceil(min - 0.5 + EPSILON), Math.floor(max + 0.5 - EPSILON)];
}

export default function PlayerController({ playerRef, mountRef, controlsEnabled = true, worldReady = false }) {
  const { camera, gl, invalidate } = useThree();
  const dispatch = useDispatch();
  const savedPlayer = useSelector((state) => state.world.player);
  const deaths = useSelector((state) => state.world.deaths);
  const mount = useSelector((state) => state.world.mount);
  const mobs = useSelector((state) => state.world.mobs);
  const progression = useSelector((state) => state.world.progression);
  const seed = useSelector((state) => state.world.seed);
  const keys = useKeyboard();
  const velocityY = useRef(0);
  const grounded = useRef(false);
  const lastStoreUpdate = useRef(0);
  const survivalTimer = useRef(0);
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const movement = useRef(new THREE.Vector3());
  const initializedRef = useRef(false);
  const lastWorldReadyRef = useRef(false);
  const lastDeathCountRef = useRef(deaths);
  const yawRef = useRef(0);
  const pitchRef = useRef(INITIAL_CAMERA_PITCH);
  const dismountLatchRef = useRef(false);
  const hasEnteredGameplayRef = useRef(false);
  const runtimeSettingsRef = useRef(readRuntimeSettings());
  const streamingSamplerRef = useRef(createStreamingBoundarySampler(seed));


  useEffect(() => {
    streamingSamplerRef.current = createStreamingBoundarySampler(seed);
  }, [seed]);

  useEffect(() => {
    const refresh = (event) => {
      runtimeSettingsRef.current = event?.detail || readRuntimeSettings();
    };
    window.addEventListener("voxel:runtime-settings-changed", refresh);
    return () => window.removeEventListener("voxel:runtime-settings-changed", refresh);
  }, []);

  useEffect(() => {
    camera.rotation.order = "YXZ";
    const sensitivityScale = Number(localStorage.getItem("voxel:sensitivity") || 1);
    const sensitivity = LOOK_SENSITIVITY * (Number.isFinite(sensitivityScale) ? sensitivityScale : 1);
    const onMouseMove = (event) => {
      if (!controlsEnabled || document.pointerLockElement !== gl.domElement) return;
      yawRef.current -= event.movementX * sensitivity;
      pitchRef.current -= event.movementY * sensitivity;
      pitchRef.current = THREE.MathUtils.clamp(pitchRef.current, -Math.PI / 2 + 0.02, Math.PI / 2 - 0.02);
      camera.rotation.set(pitchRef.current, yawRef.current, 0, "YXZ");
    };
    document.addEventListener("mousemove", onMouseMove);
    return () => document.removeEventListener("mousemove", onMouseMove);
  }, [camera, controlsEnabled, gl.domElement]);

  useEffect(() => {
    const becameWorldReady = worldReady && !lastWorldReadyRef.current;
    const shouldTeleport = !initializedRef.current
      || lastDeathCountRef.current !== deaths
      || becameWorldReady;
    lastWorldReadyRef.current = worldReady;
    if (!shouldTeleport) return;

    initializedRef.current = true;
    lastDeathCountRef.current = deaths;
    const source = playerRef.current || savedPlayer;
    const safeSource = {
      x: Number.isFinite(Number(source?.x)) ? Number(source.x) : Number(savedPlayer.x) || 0,
      y: Number.isFinite(Number(source?.y)) ? Number(source.y) : Number(savedPlayer.y) || 12,
      z: Number.isFinite(Number(source?.z)) ? Number(source.z) : Number(savedPlayer.z) || 0,
    };
    playerRef.current = { ...safeSource };
    // Begin with a slight downward voxel-world viewing angle so terrain and the
    // loading platform are visible even before pointer lock is acquired.
    pitchRef.current = INITIAL_CAMERA_PITCH;
    camera.rotation.set(pitchRef.current, yawRef.current, 0, "YXZ");
    camera.position.set(safeSource.x, safeSource.y + EYE_HEIGHT, safeSource.z);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    velocityY.current = 0;
    grounded.current = false;
    invalidate();
  }, [camera, deaths, invalidate, playerRef, savedPlayer, worldReady]);


  useEffect(() => {
    if (!controlsEnabled) return;
    // Continue from the exact paused camera orientation when pointer lock resumes.
    // This prevents the first mouse movement from snapping back to an old pitch.
    const current = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
    pitchRef.current = THREE.MathUtils.clamp(current.x, -Math.PI / 2 + 0.02, Math.PI / 2 - 0.02);
    yawRef.current = current.y;
  }, [camera, controlsEnabled]);

  const collidesAt = useCallback(
    (position) => {
      const [minX, maxX] = overlappingBlockRange(position.x - PLAYER_RADIUS, position.x + PLAYER_RADIUS);
      const [minY, maxY] = overlappingBlockRange(position.y, position.y + PLAYER_HEIGHT);
      const [minZ, maxZ] = overlappingBlockRange(position.z - PLAYER_RADIUS, position.z + PLAYER_RADIUS);
      const settings = runtimeSettingsRef.current;

      for (let x = minX; x <= maxX; x += 1) {
        for (let z = minZ; z <= maxZ; z += 1) {
          const predicted = streamingSamplerRef.current(x, z);
          const chunkLoaded = worldRuntime.isChunkLoaded(predicted.chunkId);

          if (!chunkLoaded) {
            // Optional hard boundary for players who prefer never entering data that
            // has not been generated yet. The default allows movement and supplies
            // deterministic collision until the real chunk arrives.
            if (!settings.walkAcrossStreamingBoundary) return true;
            if (settings.preventVoidFall && minY <= predicted.supportBlockY) return true;
            continue;
          }

          for (let y = minY; y <= maxY; y += 1) {
            const type = worldRuntime.getBlockTypeAt(x, y, z);
            if (type && BLOCK_TYPES[type]?.solid !== false) return true;
          }
        }
      }
      return false;
    },
    []
  );

  const getPredictiveStandingY = useCallback((position) => {
    let standingY = -Infinity;
    const [minX, maxX] = overlappingBlockRange(position.x - PLAYER_RADIUS, position.x + PLAYER_RADIUS);
    const [minZ, maxZ] = overlappingBlockRange(position.z - PLAYER_RADIUS, position.z + PLAYER_RADIUS);
    for (let x = minX; x <= maxX; x += 1) {
      for (let z = minZ; z <= maxZ; z += 1) {
        const sample = streamingSamplerRef.current(x, z);
        if (!worldRuntime.isChunkLoaded(sample.chunkId)) standingY = Math.max(standingY, sample.standingY);
      }
    }
    return standingY;
  }, []);

  const isWaterAt = useCallback(
    (position) => {
      const x = Math.round(position.x);
      const z = Math.round(position.z);
      const sampleHeights = [0.12, 0.75, 1.35];
      return sampleHeights.some((offset) => {
        const sampleY = position.y + offset;
        const blockY = Math.floor(sampleY + 0.5);
        return worldRuntime.getBlockTypeAt(x, blockY, z) === "water"
          || liquidRuntime.containsPoint(position.x, sampleY, position.z);
      });
    },
    []
  );

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const position = playerRef.current;
    if (!position) return;

    const pointerLocked = document.pointerLockElement === gl.domElement;
    if (pointerLocked) hasEnteredGameplayRef.current = true;

    // Before the player's first Resume click, keep the camera anchored at the
    // confirmed spawn and tilted toward the real terrain. This avoids a stale
    // saved quaternion or browser resize leaving the initial paused view aimed
    // only at the sky even though the voxels are correctly mounted.
    if (!controlsEnabled) {
      if (worldReady && !hasEnteredGameplayRef.current) {
        pitchRef.current = INITIAL_CAMERA_PITCH;
        camera.rotation.set(pitchRef.current, yawRef.current, 0, "YXZ");
        camera.position.set(position.x, position.y + EYE_HEIGHT, position.z);
        camera.updateMatrixWorld(true);
        invalidate();
      }
      return;
    }
    if (mount?.id) {
      const runtime = mountRef?.current;
      const stored = mobs.find((mob) => mob.id === mount.id);
      const mounted = runtime?.id === mount.id ? runtime : stored;
      if (mounted) {
        const shiftDown = Boolean(keys.current.ShiftLeft || keys.current.ShiftRight);
        if (shiftDown && !dismountLatchRef.current) {
          dismountLatchRef.current = true;
          const side = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
          side.y = 0;
          if (side.lengthSq() > 0) side.normalize();
          playerRef.current = {
            x: mounted.x + side.x * 1.5,
            y: mounted.y + (mount.type === "horse" ? 0.2 : 0.8),
            z: mounted.z + side.z * 1.5,
          };
          dispatch(dismount());
          return;
        }
        if (!shiftDown) dismountLatchRef.current = false;
        position.x = mounted.x;
        position.y = mounted.y;
        position.z = mounted.z;
        const eyeOffset = mount.type === "horse" ? 2.25 : 1.42;
        camera.position.set(position.x, position.y + eyeOffset, position.z);
        const now = performance.now();
        if (now - lastStoreUpdate.current > 900) {
          lastStoreUpdate.current = now;
          dispatch(setPlayerPosition({ x: position.x, y: position.y, z: position.z }));
        }
        return;
      }
    } else {
      dismountLatchRef.current = false;
    }

    const sprinting = Boolean(keys.current.ShiftLeft || keys.current.ShiftRight);
    const inWater = isWaterAt(position);

    const moveAxis = (axis, amount) => {
      if (Math.abs(amount) < 0.000001) return false;
      const candidate = { ...position, [axis]: position[axis] + amount };
      if (!collidesAt(candidate)) {
        position[axis] = candidate[axis];
        return true;
      }

      // Swim out of water onto a shoreline whose top is roughly level with the water.
      // The raised position must have headroom and solid support, so this cannot climb walls.
      if (!inWater) return false;
      const raised = findSupportedWaterLedgeStep({
        position,
        candidate,
        collidesAt,
        maxStep: WATER_LEDGE_STEP,
      });
      if (!raised) return false;
      position[axis] = candidate[axis];
      position.y = raised.y;
      velocityY.current = Math.max(0, velocityY.current);
      grounded.current = true;
      return true;
    };

    if (pointerLocked) {
      camera.getWorldDirection(forward.current);
      forward.current.y = 0;
      if (forward.current.lengthSq() > 0) forward.current.normalize();
      right.current.crossVectors(forward.current, UP).normalize();

      const forwardInput = (keys.current.KeyW ? 1 : 0) - (keys.current.KeyS ? 1 : 0);
      const sideInput = (keys.current.KeyD ? 1 : 0) - (keys.current.KeyA ? 1 : 0);

      movement.current
        .set(0, 0, 0)
        .addScaledVector(forward.current, forwardInput)
        .addScaledVector(right.current, sideInput);

      if (movement.current.lengthSq() > 1) movement.current.normalize();
      const agility = Math.max(1, progression?.stats?.agility || 1);
      const movementMultiplier = 1 + (agility - 1) * 0.018;
      const speed = (inWater ? 3.3 : sprinting ? 7.4 : 4.8) * movementMultiplier;
      movement.current.multiplyScalar(speed * delta);

      moveAxis("x", movement.current.x);
      moveAxis("z", movement.current.z);

      if (inWater && keys.current.Space) {
        velocityY.current = Math.min(4.2, velocityY.current + 12 * delta);
        grounded.current = false;
      } else if (keys.current.Space && grounded.current) {
        velocityY.current = getJumpVelocity(progression);
        grounded.current = false;
      }
    }

    if (isWaterAt(position)) velocityY.current = Math.max(-2.2, velocityY.current - 4.5 * delta);
    else velocityY.current -= 23 * delta;
    const fallingVelocity = velocityY.current;
    const nextY = { ...position, y: position.y + velocityY.current * delta };

    if (!collidesAt(nextY)) {
      position.y = nextY.y;
      grounded.current = false;
    } else {
      if (velocityY.current < 0) {
        if (!grounded.current && fallingVelocity < -13) {
          dispatch(damagePlayer(Math.max(1, Math.floor((-fallingVelocity - 10) / 2))));
        }
        grounded.current = true;
      }
      velocityY.current = 0;
    }

    const runtimeSettings = runtimeSettingsRef.current;
    if (runtimeSettings.preventVoidFall && touchesUnloadedChunk(worldRuntime, position, PLAYER_RADIUS)) {
      const predictiveStandingY = getPredictiveStandingY(position);
      if (Number.isFinite(predictiveStandingY) && position.y < predictiveStandingY) {
        position.y = predictiveStandingY;
        velocityY.current = 0;
        grounded.current = true;
      }
    }

    // Absolute final guard. Even a malformed save, a failed chunk worker, or an
    // externally removed terrain column cannot send the player into an endless
    // fall when streaming-boundary protection is enabled.
    if (position.y < -8) {
      if (runtimeSettings.preventVoidFall) {
        const runtimeSupport = worldRuntime.findTopSolidY(position.x, position.z, 72, -4);
        const predicted = streamingSamplerRef.current(position.x, position.z);
        position.y = (runtimeSupport == null ? predicted.supportBlockY : runtimeSupport) + 0.52;
        velocityY.current = 0;
        grounded.current = true;
        dispatch(setPlayerPosition({ x: position.x, y: position.y, z: position.z }));
      } else {
        dispatch(damagePlayer(100));
        velocityY.current = 0;
        return;
      }
    }

    camera.position.set(position.x, position.y + EYE_HEIGHT, position.z);

    const now = performance.now();
    if (now - lastStoreUpdate.current > 1000) {
      lastStoreUpdate.current = now;
      dispatch(setPlayerPosition({
        x: Number(position.x.toFixed(3)),
        y: Number(position.y.toFixed(3)),
        z: Number(position.z.toFixed(3)),
      }));
    }

    survivalTimer.current += delta;
    if (survivalTimer.current >= 3) {
      survivalTimer.current = 0;
      dispatch(survivalTick({ sprinting: sprinting && movement.current.lengthSq() > 0.001 }));
    }
  });

  return null;
}
