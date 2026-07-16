import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useFrame, useThree } from "@react-three/fiber";
import {
  breakBlock,
  consumeItem,
  cycleSelected,
  damageMob,
  interactMob,
  placeBlock,
  placeBoat,
  setSelectedIndex,
} from "../features/world/worldSlice";
import { BLOCK_TYPES, ITEM_TYPES, getMiningProfile } from "./blockTypes";
import { SEA_LEVEL } from "./worldGenerator";
import { worldRuntime } from "./worldRuntime";

const PLAYER_RADIUS = 0.3;
const PLAYER_HEIGHT = 1.8;

function blockIntersectsPlayer(blockPosition, player, blockType) {
  if (!player || BLOCK_TYPES[blockType]?.solid === false) return false;
  const [x, y, z] = blockPosition;
  return (
    x - 0.5 < player.x + PLAYER_RADIUS &&
    x + 0.5 > player.x - PLAYER_RADIUS &&
    y - 0.5 < player.y + PLAYER_HEIGHT &&
    y + 0.5 > player.y &&
    z - 0.5 < player.z + PLAYER_RADIUS &&
    z + 0.5 > player.z - PLAYER_RADIUS
  );
}

export default function InteractionController({
  blockTargetRef,
  mobTargetRef,
  miningVisualRef,
  playerRef,
  actionAnimationRef,
  enabled = true,
  onOpenStation,
}) {
  const dispatch = useDispatch();
  const selectedIndex = useSelector((state) => state.world.selectedIndex);
  const hotbar = useSelector((state) => state.world.hotbar);
  const inventory = useSelector((state) => state.world.inventory);
  const { gl } = useThree();
  const miningRef = useRef({ held: false, key: null, elapsed: 0, duration: 1, toolId: null, lastSwingAt: 0 });
  const attackCooldownRef = useRef(0);

  const selectedItem = hotbar[selectedIndex] || null;
  const usableSelectedItem = selectedItem && (inventory[selectedItem] || 0) > 0 ? selectedItem : null;

  const clearMining = (clearVisual = true) => {
    miningRef.current.key = null;
    miningRef.current.elapsed = 0;
    miningRef.current.duration = 1;
    miningRef.current.toolId = null;
    miningRef.current.lastSwingAt = 0;
    if (clearVisual && miningVisualRef.current?.mode !== "burst") miningVisualRef.current = null;
  };

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    attackCooldownRef.current = Math.max(0, attackCooldownRef.current - delta);
    const mining = miningRef.current;

    if (!enabled || !mining.held || document.pointerLockElement !== gl.domElement) {
      clearMining();
      return;
    }

    const mobTarget = mobTargetRef.current;
    const blockTarget = blockTargetRef.current;
    if (mobTarget && (!blockTarget || mobTarget.distance < blockTarget.distance)) {
      clearMining();
      return;
    }
    if (!blockTarget) {
      clearMining();
      return;
    }

    if (mining.key !== blockTarget.key) {
      const profile = getMiningProfile(blockTarget.type, usableSelectedItem);
      mining.key = blockTarget.key;
      mining.elapsed = 0;
      mining.duration = profile.seconds;
      mining.toolId = usableSelectedItem;
    }

    if (!Number.isFinite(mining.duration)) {
      miningVisualRef.current = {
        mode: "mining",
        position: blockTarget.position,
        progress: 0.05,
        blockType: blockTarget.type,
        toolId: mining.toolId,
      };
      return;
    }

    mining.elapsed += delta;
    if (performance.now() - mining.lastSwingAt > 330) {
      mining.lastSwingAt = performance.now();
      actionAnimationRef.current?.trigger?.("mine", 1);
    }
    const progress = Math.min(1, mining.elapsed / mining.duration);
    miningVisualRef.current = {
      mode: "mining",
      position: blockTarget.position,
      progress,
      blockType: blockTarget.type,
      toolId: mining.toolId,
    };

    if (progress >= 1) {
      const brokenPosition = [...blockTarget.position];
      const brokenType = blockTarget.type;
      const removed = worldRuntime.removeBlock(blockTarget.key);
      if (removed) {
        dispatch(breakBlock({ key: blockTarget.key, blockType: removed.type, toolId: mining.toolId }));
      }
      mining.held = false;
      clearMining(false);
      miningVisualRef.current = {
        mode: "burst",
        position: brokenPosition,
        blockType: brokenType,
        startedAt: performance.now(),
      };
    }
  });

  useEffect(() => {
    const onMouseDown = (event) => {
      if (!enabled || document.pointerLockElement !== gl.domElement) return;

      if (event.button === 0) {
        const mobTarget = mobTargetRef.current;
        const blockTarget = blockTargetRef.current;
        if (mobTarget && (!blockTarget || mobTarget.distance < blockTarget.distance) && attackCooldownRef.current <= 0) {
          actionAnimationRef.current?.trigger?.("attack", 1.15);
          dispatch(damageMob({ mobId: mobTarget.mobId, itemId: usableSelectedItem }));
          attackCooldownRef.current = 0.42;
          return;
        }
        actionAnimationRef.current?.trigger?.("mine", 1);
        miningRef.current.lastSwingAt = performance.now();
        miningRef.current.held = true;
      }

      if (event.button === 2) {
        actionAnimationRef.current?.trigger?.("use", 0.8);
        const target = blockTargetRef.current;
        const mobTarget = mobTargetRef.current;
        if (mobTarget && (!target || mobTarget.distance < target.distance)) {
          miningRef.current.held = false;
          clearMining();
          dispatch(interactMob({ mobId: mobTarget.mobId, itemId: usableSelectedItem }));
          return;
        }

        if (usableSelectedItem === "boat" && target?.type === "water") {
          dispatch(placeBoat({ position: [target.position[0], SEA_LEVEL + 0.25, target.position[2]] }));
          return;
        }

        if (target && BLOCK_TYPES[target.type]?.station) {
          miningRef.current.held = false;
          clearMining();
          onOpenStation?.({ type: BLOCK_TYPES[target.type].station, key: target.key });
          return;
        }

        const selectedDefinition = ITEM_TYPES[usableSelectedItem];
        if (selectedDefinition?.food) {
          dispatch(consumeItem(usableSelectedItem));
          return;
        }

        const blockDefinition = BLOCK_TYPES[usableSelectedItem];
        if (!target || !blockDefinition?.placeable) return;
        const position = [
          target.position[0] + target.normal[0],
          target.position[1] + target.normal[1],
          target.position[2] + target.normal[2],
        ];
        if (blockIntersectsPlayer(position, playerRef.current, usableSelectedItem)) return;
        if (worldRuntime.hasBlockAt(position[0], position[1], position[2])) return;
        if (!worldRuntime.setBlock(position, usableSelectedItem)) return;
        dispatch(placeBlock({ position, type: usableSelectedItem }));
      }
    };

    const onMouseUp = (event) => {
      if (event.button !== 0) return;
      miningRef.current.held = false;
      clearMining();
    };

    const onContextMenu = (event) => event.preventDefault();

    const onWheel = (event) => {
      if (!enabled || document.pointerLockElement !== gl.domElement) return;
      event.preventDefault();
      dispatch(cycleSelected(event.deltaY > 0 ? 1 : -1));
    };

    const onKeyDown = (event) => {
      const numeric = Number(event.key);
      if (numeric >= 1 && numeric <= hotbar.length) dispatch(setSelectedIndex(numeric - 1));
    };

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    actionAnimationRef,
    blockTargetRef,
    dispatch,
    enabled,
    gl.domElement,
    hotbar.length,
    mobTargetRef,
    onOpenStation,
    playerRef,
    usableSelectedItem,
  ]);

  return null;
}
