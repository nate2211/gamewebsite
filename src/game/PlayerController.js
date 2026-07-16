import React, { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";
import { PointerLockControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useDispatch, useSelector } from "react-redux";
import {
  damagePlayer,
  setPlayerPosition,
  survivalTick,
} from "../features/world/worldSlice";
import { blockKey } from "./worldUtils";
import useKeyboard from "./useKeyboard";

const PLAYER_RADIUS = 0.3;
const PLAYER_HEIGHT = 1.8;
const EYE_HEIGHT = 1.62;
const UP = new THREE.Vector3(0, 1, 0);
const EPSILON = 0.0001;

function overlappingBlockRange(min, max) {
  return [
    Math.ceil(min - 0.5 + EPSILON),
    Math.floor(max + 0.5 - EPSILON),
  ];
}

export default function PlayerController({ playerRef, controlsEnabled = true }) {
  const { camera, gl } = useThree();
  const dispatch = useDispatch();
  const blocks = useSelector((state) => state.world.blocks);
  const savedPlayer = useSelector((state) => state.world.player);
  const deaths = useSelector((state) => state.world.deaths);
  const keys = useKeyboard();
  const velocityY = useRef(0);
  const grounded = useRef(false);
  const lastStoreUpdate = useRef(0);
  const survivalTimer = useRef(0);
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const movement = useRef(new THREE.Vector3());
  const initializedRef = useRef(false);
  const lastDeathCountRef = useRef(deaths);

  useEffect(() => {
    const shouldTeleport =
      !initializedRef.current || lastDeathCountRef.current !== deaths;
    if (!shouldTeleport) return;

    initializedRef.current = true;
    lastDeathCountRef.current = deaths;
    playerRef.current = { ...savedPlayer };
    camera.position.set(
      savedPlayer.x,
      savedPlayer.y + EYE_HEIGHT,
      savedPlayer.z
    );
    velocityY.current = 0;
  }, [camera, deaths, playerRef, savedPlayer]);

  const collidesAt = useCallback(
    (position) => {
      const [minX, maxX] = overlappingBlockRange(
        position.x - PLAYER_RADIUS,
        position.x + PLAYER_RADIUS
      );
      const [minY, maxY] = overlappingBlockRange(
        position.y,
        position.y + PLAYER_HEIGHT
      );
      const [minZ, maxZ] = overlappingBlockRange(
        position.z - PLAYER_RADIUS,
        position.z + PLAYER_RADIUS
      );

      for (let x = minX; x <= maxX; x += 1) {
        for (let y = minY; y <= maxY; y += 1) {
          for (let z = minZ; z <= maxZ; z += 1) {
            if (blocks[blockKey(x, y, z)]) return true;
          }
        }
      }

      return false;
    },
    [blocks]
  );

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const position = playerRef.current;
    if (!position) return;

    const pointerLocked = document.pointerLockElement === gl.domElement;
    const sprinting = Boolean(
      keys.current.ShiftLeft || keys.current.ShiftRight
    );

    if (controlsEnabled && pointerLocked) {
      camera.getWorldDirection(forward.current);
      forward.current.y = 0;
      if (forward.current.lengthSq() > 0) forward.current.normalize();
      right.current.crossVectors(forward.current, UP).normalize();

      const forwardInput =
        (keys.current.KeyW ? 1 : 0) - (keys.current.KeyS ? 1 : 0);
      const sideInput =
        (keys.current.KeyD ? 1 : 0) - (keys.current.KeyA ? 1 : 0);

      movement.current
        .set(0, 0, 0)
        .addScaledVector(forward.current, forwardInput)
        .addScaledVector(right.current, sideInput);

      if (movement.current.lengthSq() > 1) movement.current.normalize();
      const speed = sprinting ? 7.4 : 4.8;
      movement.current.multiplyScalar(speed * delta);

      const nextX = { ...position, x: position.x + movement.current.x };
      if (!collidesAt(nextX)) position.x = nextX.x;

      const nextZ = { ...position, z: position.z + movement.current.z };
      if (!collidesAt(nextZ)) position.z = nextZ.z;

      if (keys.current.Space && grounded.current) {
        velocityY.current = 8.4;
        grounded.current = false;
      }
    }

    velocityY.current -= 23 * delta;
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

    if (position.y < -25) {
      dispatch(damagePlayer(100));
      velocityY.current = 0;
      return;
    }

    camera.position.set(position.x, position.y + EYE_HEIGHT, position.z);

    const now = performance.now();
    if (now - lastStoreUpdate.current > 1000) {
      lastStoreUpdate.current = now;
      dispatch(
        setPlayerPosition({
          x: Number(position.x.toFixed(3)),
          y: Number(position.y.toFixed(3)),
          z: Number(position.z.toFixed(3)),
        })
      );
    }

    survivalTimer.current += delta;
    if (survivalTimer.current >= 3) {
      survivalTimer.current = 0;
      dispatch(
        survivalTick({
          sprinting: sprinting && movement.current.lengthSq() > 0.001,
        })
      );
    }
  });

  return <PointerLockControls makeDefault enabled={controlsEnabled} />;
}
