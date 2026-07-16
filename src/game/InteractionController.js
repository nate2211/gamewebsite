import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useFrame, useThree } from "@react-three/fiber";
import {
  breakBlock,
  consumeItem,
  cycleSelected,
  damageMob,
  placeBlock,
  setSelectedIndex,
} from "../features/world/worldSlice";
import { BLOCK_TYPES, ITEM_TYPES, getMiningProfile } from "./blockTypes";

const PLAYER_RADIUS = 0.3;
const PLAYER_HEIGHT = 1.8;

function blockIntersectsPlayer(blockPosition, player) {
  if (!player) return false;

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
  enabled = true,
  onOpenStation,
}) {
  const dispatch = useDispatch();
  const selectedIndex = useSelector((state) => state.world.selectedIndex);
  const hotbar = useSelector((state) => state.world.hotbar);
  const inventory = useSelector((state) => state.world.inventory);
  const { gl } = useThree();
  const miningRef = useRef({
    held: false,
    key: null,
    elapsed: 0,
    duration: 1,
    toolId: null,
  });
  const attackCooldownRef = useRef(0);

  const selectedItem = hotbar[selectedIndex] || null;
  const usableSelectedItem =
    selectedItem && (inventory[selectedItem] || 0) > 0 ? selectedItem : null;

  const resetMining = () => {
    miningRef.current.key = null;
    miningRef.current.elapsed = 0;
    miningVisualRef.current = null;
  };

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    attackCooldownRef.current = Math.max(0, attackCooldownRef.current - delta);

    const mining = miningRef.current;
    if (!enabled || !mining.held || document.pointerLockElement !== gl.domElement) {
      resetMining();
      return;
    }

    const mobTarget = mobTargetRef.current;
    const blockTarget = blockTargetRef.current;
    if (mobTarget && (!blockTarget || mobTarget.distance < blockTarget.distance)) {
      resetMining();
      return;
    }
    if (!blockTarget) {
      resetMining();
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
        position: blockTarget.position,
        progress: 0.05,
      };
      return;
    }

    mining.elapsed += delta;
    const progress = Math.min(1, mining.elapsed / mining.duration);
    miningVisualRef.current = {
      position: blockTarget.position,
      progress,
      blockType: blockTarget.type,
      toolId: mining.toolId,
    };

    if (progress >= 1) {
      dispatch(
        breakBlock({
          key: blockTarget.key,
          toolId: mining.toolId,
        })
      );
      resetMining();
    }
  });

  useEffect(() => {
    const onMouseDown = (event) => {
      if (!enabled || document.pointerLockElement !== gl.domElement) return;

      if (event.button === 0) {
        const mobTarget = mobTargetRef.current;
        const blockTarget = blockTargetRef.current;
        if (
          mobTarget &&
          (!blockTarget || mobTarget.distance < blockTarget.distance) &&
          attackCooldownRef.current <= 0
        ) {
          dispatch(
            damageMob({
              mobId: mobTarget.mobId,
              itemId: usableSelectedItem,
            })
          );
          attackCooldownRef.current = 0.42;
          return;
        }
        miningRef.current.held = true;
      }

      if (event.button === 2) {
        const target = blockTargetRef.current;
        if (target && BLOCK_TYPES[target.type]?.station) {
          onOpenStation?.(BLOCK_TYPES[target.type].station);
          return;
        }

        const selectedDefinition = ITEM_TYPES[usableSelectedItem];
        if (selectedDefinition?.food) {
          dispatch(consumeItem(usableSelectedItem));
          return;
        }

        const block = BLOCK_TYPES[usableSelectedItem];
        if (!target || !block?.placeable) return;
        const position = [
          target.position[0] + target.normal[0],
          target.position[1] + target.normal[1],
          target.position[2] + target.normal[2],
        ];
        if (blockIntersectsPlayer(position, playerRef.current)) return;
        dispatch(placeBlock({ position, type: usableSelectedItem }));
      }
    };

    const onMouseUp = (event) => {
      if (event.button !== 0) return;
      miningRef.current.held = false;
      resetMining();
    };

    const onContextMenu = (event) => event.preventDefault();

    const onWheel = (event) => {
      if (!enabled || document.pointerLockElement !== gl.domElement) return;
      event.preventDefault();
      dispatch(cycleSelected(event.deltaY > 0 ? 1 : -1));
    };

    const onKeyDown = (event) => {
      const numeric = Number(event.key);
      if (numeric >= 1 && numeric <= hotbar.length) {
        dispatch(setSelectedIndex(numeric - 1));
      }
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
