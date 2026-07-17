import { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";
import { useDispatch, useSelector } from "react-redux";
import { useFrame, useThree } from "@react-three/fiber";
import {
  breakBlock,
  castArcaneSpell,
  clearReplaceableBlock,
  consumeItem,
  consumeThrowableItem,
  cycleArcaneSpell,
  cycleSelected,
  damageMob,
  dropInventoryItem,
  emptyWaterBucket,
  fillWaterBucket,
  emptyLavaBucket,
  fillLavaBucket,
  solidifyLava,
  interactMob,
  placeBlock,
  placeBoat,
  plantCrop,
  setSelectedIndex,
  sitOnChair,
  tillSoil,
  toggleFenceGate,
  toggleDoor,
} from "../../features/world/worldSlice";
import { BLOCK_TYPES, ITEM_TYPES, getMiningProfile, getPlantGrowth } from "../config/blockTypes";
import { MOB_TYPES } from "../config/mobTypes";
import { SEA_LEVEL } from "../world/generation/worldGenerator";
import { worldRuntime } from "../core/worldRuntime";
import { particleRuntime } from "../particles/particleRuntime";
import { liquidRuntime } from "../liquids/liquidRuntime";
import { getMiningSpeedMultiplier } from "../config/progression";
import { hasPerk } from "../config/perks";
import { blockKey } from "../utils/worldUtils";
import { projectileRuntime } from "../projectiles/projectileRuntime";
import { ARCANE_RESEARCH_BY_ID, getWandManaMultiplier } from "../config/arcana";
import { arcaneRuntime } from "../arcana/arcaneRuntime";
import { getBoundCode } from "../config/keybindings";

const PLAYER_RADIUS = 0.3;
const PLAYER_HEIGHT = 1.8;
const REPLACEABLE_COVER = new Set([
  "snow", "snow_layer", "tall_grass", "wildflower", "reeds", "seagrass", "vine",
  "meadow_grass_0", "meadow_grass_1", "meadow_grass_2",
  "yellow_flower_0", "yellow_flower_1", "yellow_flower_2",
]);

const LIQUID_CONTACT_DIRECTIONS = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
function touchingWater(position) {
  return LIQUID_CONTACT_DIRECTIONS.some(([dx,dy,dz]) => {
    const x=position[0]+dx, y=position[1]+dy, z=position[2]+dz;
    return worldRuntime.getBlockTypeAt(x,y,z) === "water" || liquidRuntime.hasWaterAt(x,y,z);
  });
}
function adjacentLavaPositions(position) {
  return LIQUID_CONTACT_DIRECTIONS.map(([dx,dy,dz]) => [position[0]+dx,position[1]+dy,position[2]+dz])
    .filter(([x,y,z]) => worldRuntime.getBlockTypeAt(x,y,z) === "lava");
}

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
  const progression = useSelector((state) => state.world.progression);
  const arcana = useSelector((state) => state.world.arcana);
  const enchantments = useSelector((state) => state.world.enchantments || {});
  const { gl, camera } = useThree();
  const throwDirectionRef = useRef(new THREE.Vector3());
  const miningRef = useRef({ held: false, key: null, elapsed: 0, duration: 1, toolId: null, lastSwingAt: 0, lastParticleStage: -1, lastBrokenKey: null, retargetAt: 0 });
  const attackCooldownRef = useRef(0);

  const selectedItem = hotbar[selectedIndex] || null;
  const usableSelectedItem = selectedItem && (inventory[selectedItem] || 0) > 0 ? selectedItem : null;

  const clearMining = useCallback((clearVisual = true) => {
    miningRef.current.key = null;
    miningRef.current.elapsed = 0;
    miningRef.current.duration = 1;
    miningRef.current.toolId = null;
    miningRef.current.lastSwingAt = 0;
    miningRef.current.lastParticleStage = -1;
    if (clearVisual && miningVisualRef.current?.mode !== "burst") miningVisualRef.current = null;
  }, [miningVisualRef]);

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
    if (blockTarget.key === mining.lastBrokenKey && performance.now() < mining.retargetAt) {
      if (miningVisualRef.current?.mode !== "burst") miningVisualRef.current = null;
      return;
    }

    if (mining.key !== blockTarget.key) {
      const profile = getMiningProfile(blockTarget.type, usableSelectedItem);
      mining.key = blockTarget.key;
      mining.elapsed = 0;
      const efficiencyLevel = Number(enchantments[usableSelectedItem]?.efficiency || ITEM_TYPES[usableSelectedItem]?.preEnchanted?.efficiency || 0);
      const perkSpeed = (hasPerk(progression, "deep_delver") ? 1.15 : 1) * (hasPerk(progression, "master_excavator") ? 1.18 : 1);
      mining.duration = profile.seconds / (getMiningSpeedMultiplier(progression) * perkSpeed * (1 + efficiencyLevel * 0.18));
      mining.lastParticleStage = -1;
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
    const particleStage = Math.floor(progress * 6);
    if (particleStage > mining.lastParticleStage && particleStage > 0) {
      mining.lastParticleStage = particleStage;
      particleRuntime.emitBlockParticles({
        position: blockTarget.position,
        blockType: blockTarget.type,
        count: 4,
        intensity: 0.42,
        kind: "chip",
      });
    }
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
        // If the mined block opened a channel beside ocean or flowing water,
        // immediately seed the liquid solver so the lower terrain floods.
        liquidRuntime.flowIntoOpenedCell(brokenPosition);
      }
      // Preserve the held state so the next block under the crosshair begins
      // mining automatically. A short retarget gate lets the raycaster advance
      // past the removed voxel without replaying the same break.
      mining.lastBrokenKey = blockTarget.key;
      mining.retargetAt = performance.now() + 85;
      mining.key = null;
      mining.elapsed = 0;
      mining.duration = 1;
      mining.lastParticleStage = -1;
      miningVisualRef.current = {
        mode: "burst",
        position: brokenPosition,
        blockType: brokenType,
        startedAt: performance.now(),
      };
      particleRuntime.emitBlockParticles({
        position: brokenPosition,
        blockType: brokenType,
        count: 18,
        intensity: 1,
        kind: "break",
      });
    }
  });

  useEffect(() => {
    const onMouseDown = (event) => {
      if (!enabled || document.pointerLockElement !== gl.domElement) return;

      if (event.button === 0) {
        const mobTarget = mobTargetRef.current;
        const blockTarget = blockTargetRef.current;
        if (mobTarget && (!blockTarget || mobTarget.distance < blockTarget.distance) && attackCooldownRef.current <= 0) {
          const weaponClass = ITEM_TYPES[usableSelectedItem]?.weaponClass;
          actionAnimationRef.current?.trigger?.(weaponClass ? `attack_${weaponClass}` : "attack", weaponClass === "warhammer" ? 1.44 : weaponClass === "greatsword" ? 1.35 : weaponClass === "scythe" ? 1.26 : 1.15);
          dispatch(damageMob({ mobId: mobTarget.mobId, itemId: usableSelectedItem }));
          attackCooldownRef.current = weaponClass === "katana" ? 0.28 : weaponClass === "spear" ? 0.38 : weaponClass === "scythe" ? 0.52 : weaponClass === "halberd" ? 0.58 : weaponClass === "greatsword" ? 0.72 : weaponClass === "warhammer" ? 0.78 : 0.42;
          return;
        }
        actionAnimationRef.current?.trigger?.("mine", 1);
        miningRef.current.lastSwingAt = performance.now();
        miningRef.current.held = true;
      }

      if (event.button === 2) {
        const target = blockTargetRef.current;
        const mobTarget = mobTargetRef.current;
        const selectedDefinition = ITEM_TYPES[usableSelectedItem];
        const adjacentPosition = target ? [
          target.position[0] + target.normal[0],
          target.position[1] + target.normal[1],
          target.position[2] + target.normal[2],
        ] : null;

        if (target?.type === "oak_chair" && (!mobTarget || target.distance <= mobTarget.distance)) {
          miningRef.current.held = false; clearMining();
          actionAnimationRef.current?.trigger?.("sit", 0.75);
          dispatch(sitOnChair({ key: target.key, position: target.position, yaw: camera.rotation.y }));
          return;
        }

        if (target && ["oak_fence_gate", "oak_fence_gate_open"].includes(target.type) && (!mobTarget || target.distance <= mobTarget.distance)) {
          actionAnimationRef.current?.trigger?.("use", 0.7);
          miningRef.current.held = false;
          clearMining();
          const nextType = target.type === "oak_fence_gate" ? "oak_fence_gate_open" : "oak_fence_gate";
          if (worldRuntime.replaceBlock(target.position, nextType)) {
            dispatch(toggleFenceGate({ key: target.key, position: target.position, type: nextType }));
          }
          return;
        }

        const doorTransitions = {
          oak_door: "oak_door_open",
          oak_door_open: "oak_door",
          oak_door_ew: "oak_door_ew_open",
          oak_door_ew_open: "oak_door_ew",
        };
        if (target && doorTransitions[target.type] && (!mobTarget || target.distance <= mobTarget.distance)) {
          actionAnimationRef.current?.trigger?.("use", 0.72);
          miningRef.current.held = false;
          clearMining();
          const nextType = doorTransitions[target.type];
          if (worldRuntime.replaceBlock(target.position, nextType)) {
            dispatch(toggleDoor({ key: target.key, position: target.position, type: nextType }));
          }
          return;
        }

        if (target && BLOCK_TYPES[target.type]?.station && (!mobTarget || target.distance <= mobTarget.distance)) {
          actionAnimationRef.current?.trigger?.("use", 0.7);
          miningRef.current.held = false;
          clearMining();
          onOpenStation?.({ type: BLOCK_TYPES[target.type].station, key: target.key });
          return;
        }

        if (selectedDefinition?.arcaneFocus) {
          miningRef.current.held = false;
          clearMining();
          const spellId = arcana.selectedSpell || "spark_bolt";
          const spell = ARCANE_RESEARCH_BY_ID[spellId];
          const manaCost = Math.max(1, Math.ceil((spell?.manaCost || 7) * getWandManaMultiplier(selectedDefinition.wandTier || 1)));
          const hasCore = !["golemancy", "runic_sentinel"].includes(spellId) || (inventory.golem_core || 0) > 0;
          if (!spell || !arcana.unlocked.includes(spellId) || arcana.mana < manaCost || !hasCore) {
            dispatch(castArcaneSpell({ spellId, wandId: usableSelectedItem, mobId: mobTarget?.mobId, now: Date.now() }));
            return;
          }
          camera.getWorldDirection(throwDirectionRef.current);
          const origin = [camera.position.x, camera.position.y - 0.08, camera.position.z];
          const fallbackTarget = [
            camera.position.x + throwDirectionRef.current.x * 6,
            camera.position.y + throwDirectionRef.current.y * 6,
            camera.position.z + throwDirectionRef.current.z * 6,
          ];
          const targetPosition = mobTarget && (!target || mobTarget.distance < target.distance)
            ? [mobTarget.position?.[0] ?? fallbackTarget[0], mobTarget.position?.[1] ?? fallbackTarget[1], mobTarget.position?.[2] ?? fallbackTarget[2]]
            : target?.position || fallbackTarget;
          let placePosition = null;
          if (["warding_stone", "arcane_lantern"].includes(spellId)) {
            placePosition = adjacentPosition || target?.position || targetPosition.map(Math.round);
            const occupiedType = worldRuntime.getBlockTypeAt(...placePosition);
            if (occupiedType && REPLACEABLE_COVER.has(occupiedType)) {
              const key = blockKey(...placePosition);
              worldRuntime.removeBlock(key);
              dispatch(clearReplaceableBlock({ key, blockType: occupiedType }));
            } else if (occupiedType) return;
            const conjuredType = spellId === "warding_stone" ? "wardstone" : "arcane_lantern";
            if (blockIntersectsPlayer(placePosition, playerRef.current, conjuredType)) return;
            worldRuntime.setBlock(placePosition, conjuredType);
          }
          actionAnimationRef.current?.trigger?.("cast", 1.12);
          dispatch(castArcaneSpell({
            spellId,
            wandId: usableSelectedItem,
            mobId: mobTarget && (!target || mobTarget.distance < target.distance) ? mobTarget.mobId : null,
            origin,
            targetPosition,
            placePosition,
            now: Date.now(),
          }));
          arcaneRuntime.emitCast({ spellId, origin, target: targetPosition });
          return;
        }

        actionAnimationRef.current?.trigger?.("use", 0.8);
        if (mobTarget && (!target || mobTarget.distance < target.distance)) {
          miningRef.current.held = false;
          clearMining();
          if (mobTarget.housingBedKey) {
            onOpenStation?.({ type: "housing_bed", key: mobTarget.housingBedKey, mobId: mobTarget.mobId });
          } else if (MOB_TYPES[mobTarget.mobType]?.villager) {
            onOpenStation?.({ type: "village_dialogue", key: mobTarget.mobId, mobId: mobTarget.mobId });
          } else {
            dispatch(interactMob({ mobId: mobTarget.mobId, itemId: usableSelectedItem }));
          }
          return;
        }

        if (usableSelectedItem === "egg") {
          camera.getWorldDirection(throwDirectionRef.current);
          projectileRuntime.throwEgg(
            { x: camera.position.x, y: camera.position.y - 0.12, z: camera.position.z },
            throwDirectionRef.current
          );
          dispatch(consumeThrowableItem("egg"));
          return;
        }

        const selectedTool = selectedDefinition;
        if (target && selectedTool?.toolType === "hoe" && ["grass", "dirt", "frozen_grass"].includes(target.type)) {
          if (worldRuntime.replaceBlock(target.position, "farmland")) {
            dispatch(tillSoil({ key: target.key, position: target.position, toolId: usableSelectedItem }));
            particleRuntime.emitBlockParticles({
              position: target.position,
              blockType: target.type,
              count: 7,
              intensity: 0.55,
              kind: "chip",
            });
          }
          return;
        }

        const selectedPlantType = ITEM_TYPES[usableSelectedItem]?.plantType || null;
        const plantGrowth = getPlantGrowth(selectedPlantType);
        if (target && target.normal?.[1] > 0.5 && plantGrowth) {
          const allowedGround = plantGrowth.requiresFarmland
            ? target.type === "farmland"
            : ["grass", "dirt", "farmland", "frozen_grass"].includes(target.type);
          if (allowedGround) {
            const cropPosition = [target.position[0], target.position[1] + 1, target.position[2]];
            const cropKey = blockKey(...cropPosition);
            if (!worldRuntime.hasBlockAt(...cropPosition) && worldRuntime.setBlock(cropPosition, plantGrowth.stages[0])) {
              dispatch(plantCrop({
                position: cropPosition,
                key: cropKey,
                plantType: selectedPlantType,
                groundPosition: target.position,
              }));
            }
            return;
          }
        }

        if (usableSelectedItem === "water_bucket" && adjacentPosition) {
          if (!worldRuntime.hasBlockAt(...adjacentPosition) && liquidRuntime.addSource(adjacentPosition)) {
            const lavaPositions = adjacentLavaPositions(adjacentPosition);
            lavaPositions.forEach((position) => worldRuntime.setBlock(position, "obsidian"));
            if (lavaPositions.length) dispatch(solidifyLava({ positions: lavaPositions }));
            dispatch(emptyWaterBucket());
          }
          return;
        }

        if (usableSelectedItem === "lava_bucket" && adjacentPosition) {
          if (!worldRuntime.hasBlockAt(...adjacentPosition)) {
            const solidified = touchingWater(adjacentPosition);
            if (worldRuntime.setBlock(adjacentPosition, solidified ? "obsidian" : "lava")) {
              dispatch(emptyLavaBucket({ position: adjacentPosition, solidified }));
            }
          }
          return;
        }

        if (usableSelectedItem === "bucket" && target) {
          const liquidCell = adjacentPosition ? liquidRuntime.getCellAt(...adjacentPosition) : null;
          if (target.type === "lava") {
            if (worldRuntime.removeBlock(target.key)) dispatch(fillLavaBucket({ key: target.key }));
          } else if (target.type === "water" || liquidCell) {
            if (liquidCell?.source) liquidRuntime.removeSourceAt(liquidCell.x, liquidCell.y, liquidCell.z);
            dispatch(fillWaterBucket());
          }
          return;
        }

        if (usableSelectedItem === "boat" && target?.type === "water") {
          dispatch(placeBoat({ position: [target.position[0], SEA_LEVEL + 0.25, target.position[2]] }));
          return;
        }

        if (selectedDefinition?.food) {
          dispatch(consumeItem(usableSelectedItem));
          return;
        }

        const blockDefinition = BLOCK_TYPES[usableSelectedItem];
        if (!target || !blockDefinition?.placeable) return;
        const replacingTargetCover = REPLACEABLE_COVER.has(target.type);
        const position = replacingTargetCover
          ? [...target.position]
          : [target.position[0] + target.normal[0], target.position[1] + target.normal[1], target.position[2] + target.normal[2]];
        let placedBlockType = usableSelectedItem;
        if (usableSelectedItem === "oak_door") {
          camera.getWorldDirection(throwDirectionRef.current);
          placedBlockType = Math.abs(throwDirectionRef.current.x) > Math.abs(throwDirectionRef.current.z)
            ? "oak_door_ew"
            : "oak_door";
          // The rendered door occupies two vertical blocks, matching Minecraft's
          // clearance rules even though the lower voxel stores its state.
          const upperType = worldRuntime.getBlockTypeAt(position[0], position[1] + 1, position[2]);
          if (upperType && !REPLACEABLE_COVER.has(upperType)) return;
          if (upperType && REPLACEABLE_COVER.has(upperType)) {
            const upperKey = blockKey(position[0], position[1] + 1, position[2]);
            worldRuntime.removeBlock(upperKey);
            dispatch(clearReplaceableBlock({ key: upperKey, blockType: upperType }));
          }
        }
        if (blockIntersectsPlayer(position, playerRef.current, placedBlockType)) return;
        const occupiedType = worldRuntime.getBlockTypeAt(...position);
        if (occupiedType && REPLACEABLE_COVER.has(occupiedType)) {
          const occupiedKey = blockKey(...position);
          worldRuntime.removeBlock(occupiedKey);
          dispatch(clearReplaceableBlock({ key: occupiedKey, blockType: occupiedType }));
          particleRuntime.emitBlockParticles({ position, blockType: occupiedType, count: 6, intensity: 0.45, kind: "chip" });
        } else if (occupiedType) return;
        if (!worldRuntime.setBlock(position, placedBlockType)) return;
        dispatch(placeBlock({ position, type: placedBlockType, itemType: usableSelectedItem }));
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
      const tag = event.target?.tagName?.toLowerCase?.();
      if (tag === "input" || tag === "textarea" || tag === "select" || event.target?.isContentEditable) return;
      const numeric = Number(event.key);
      if (numeric >= 1 && numeric <= hotbar.length) dispatch(setSelectedIndex(numeric - 1));
      if (event.code === getBoundCode("arcaneCycle") && ITEM_TYPES[usableSelectedItem]?.arcaneFocus) {
        event.preventDefault(); dispatch(cycleArcaneSpell(event.shiftKey ? -1 : 1));
      }
      if (event.code === getBoundCode("dropItem") && usableSelectedItem && !event.repeat) {
        event.preventDefault();
        camera.getWorldDirection(throwDirectionRef.current);
        dispatch(dropInventoryItem({ itemId: usableSelectedItem, amount: 1, position: [camera.position.x, camera.position.y - 0.35, camera.position.z], velocity: { x: throwDirectionRef.current.x * 3.6, y: 2.4 + throwDirectionRef.current.y * 1.2, z: throwDirectionRef.current.z * 3.6 } }));
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
    actionAnimationRef,
    arcana,
    blockTargetRef,
    camera,
    clearMining,
    dispatch,
    enabled,
    enchantments,
    gl.domElement,
    hotbar.length,
    inventory,
    mobTargetRef,
    onOpenStation,
    playerRef,
    progression,
    usableSelectedItem,
  ]);

  return null;
}
