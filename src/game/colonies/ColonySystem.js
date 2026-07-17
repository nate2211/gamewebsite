import { useFrame } from "@react-three/fiber";
import { useDispatch, useSelector } from "react-redux";
import { useRef } from "react";
import {
  addColonyResources,
  advanceColonyConstruction,
  applyColonyFrame,
  applyCropGrowth,
  assignColonyAnimals,
  breedColonyAnimal,
  mobCombatHit,
  maintainColonyStation,
  plantCrop,
  respawnColonyWorker,
} from "../../features/world/worldSlice";
import {
  COLONY_GUARD_RADIUS,
  COLONY_MAX_MANAGED_ANIMALS,
  COLONY_TICK_SECONDS,
  COLONY_WORK_RADIUS,
  FARM_PLOT_OFFSETS,
} from "../config/colony";
import { BLOCK_TYPES } from "../config/blockTypes";
import { MOB_TYPES } from "../config/mobTypes";
import { hasPerk } from "../config/perks";
import { worldRuntime } from "../core/worldRuntime";
import { findFarmPlot } from "../farming/farmUtils";

const ORE_PRIORITY = ["diamond_ore", "emerald_ore", "gold_ore", "redstone_ore", "iron_ore", "copper_ore", "coal_ore", "stone"];
const PASSIVE_TYPES = new Set(["sheep", "cow", "pig", "chicken", "horse"]);
const distance2d = (a, b) => Math.hypot((a.x ?? a[0]) - (b.x ?? b[0]), (a.z ?? a[2]) - (b.z ?? b[2]));

function moveWorker(worker, target, speed, delta) {
  const dx = target.x - worker.x;
  const dz = target.z - worker.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 0.04) return { ...worker, moving: false };
  const step = Math.min(distance, speed * delta);
  const direction = Math.atan2(dx, dz);
  const x = worker.x + Math.sin(direction) * step;
  const z = worker.z + Math.cos(direction) * step;
  const ground = worldRuntime.findTopSolidY(x, z, Math.ceil(worker.y + 6), -3);
  return { ...worker, x, y: ground == null ? worker.y : ground + 0.55, z, direction, moving: true };
}
const stationHome = (station) => ({ x: station.position[0] + 1.35, y: station.position[1] + 0.55, z: station.position[2] + 0.35 });

export default function ColonySystem({ enabled = true }) {
  const dispatch = useDispatch();
  const colony = useSelector((state) => state.world.colony);
  const mobs = useSelector((state) => state.world.mobs);
  const progression = useSelector((state) => state.world.progression);
  const accumulator = useRef(0);
  const runtimeMap = useRef(new Map());

  useFrame((_, rawDelta) => {
    if (!enabled || !colony?.stations?.length) return;
    accumulator.current += Math.min(rawDelta, 0.1);
    if (accumulator.current < COLONY_TICK_SECONDS) return;
    const delta = accumulator.current;
    accumulator.current = 0;
    const now = Date.now();
    const workers = {};
    const stations = {};

    colony.stations.forEach((station) => {
      if (station.destroyed) {
        stations[station.id] = { status: "Station destroyed", progress: 0, workerState: "station destroyed" };
        return;
      }
      const worker = mobs.find((mob) => mob.id === station.workerId && !mob.dyingUntil);
      if (!worker) {
        if (station.respawnAt && now >= station.respawnAt) dispatch(respawnColonyWorker({ stationId: station.id, now }));
        const remaining = Math.max(0, Math.ceil(((station.respawnAt || now) - now) / 1000));
        stations[station.id] = {
          status: station.respawnAt ? `Respawning in ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}` : "Worker missing",
          progress: station.respawnAt ? 1 - remaining / 600 : 0,
          workerState: station.respawnAt ? "respawning" : "dead",
        };
        return;
      }
      const runtime = runtimeMap.current.get(station.id) || { target: null, searchAt: 0, actionAt: 0, patrol: Math.random() * Math.PI * 2 };
      runtimeMap.current.set(station.id, runtime);
      let next = { ...worker };
      const home = stationHome(station);
      if (hasPerk(progression, "guardian_aura") && next.health < next.maxHealth && distance2d(next, home) <= 8) {
        next.health = Math.min(next.maxHealth, next.health + delta * 0.45);
      }
      let status = station.enabled ? "Working" : "Work paused";
      let progress = 0;
      if (!station.enabled) {
        workers[worker.id] = moveWorker(next, home, 0.8, delta);
        stations[station.id] = { status, progress, workerState: "idle" };
        return;
      }

      if (station.maintenancePolicy === "auto" && station.health < station.maxHealth * 0.72 && now >= (runtime.maintenanceAt || 0)) {
        runtime.maintenanceAt = now + 12000;
        dispatch(maintainColonyStation({ stationId: station.id }));
      }

      const immediateThreat = mobs
        .filter((mob) => MOB_TYPES[mob.type]?.hostile && !mob.dyingUntil)
        .map((mob) => ({ mob, distance: distance2d(worker, mob) }))
        .filter((entry) => entry.distance <= (station.job === "guard" ? COLONY_GUARD_RADIUS : 8))
        .sort((a, b) => a.distance - b.distance)[0];
      if (immediateThreat && station.job !== "guard") {
        const guardNearby = colony.stations.some((other) => other.job === "guard" && !other.destroyed && other.workerState !== "dead" && distance2d(other.position, worker) <= 12);
        const orderedToDefend = station.threatMode === "defend" || station.orderMode === "defend";
        const orderedToFlee = station.threatMode === "flee";
        if (!orderedToFlee && (orderedToDefend || station.job === "miner") && (!guardNearby || orderedToDefend) && immediateThreat.distance <= 6) {
          next = moveWorker(next, immediateThreat.mob, 1.15, delta);
          status = `Defending against ${MOB_TYPES[immediateThreat.mob.type]?.name || immediateThreat.mob.type}`;
          progress = 1;
          if (immediateThreat.distance <= 1.5 && now >= runtime.actionAt) {
            runtime.actionAt = now + 1100;
            dispatch(mobCombatHit({ targetId: immediateThreat.mob.id, amount: 3, friendlyAttack: true }));
          }
          workers[worker.id] = next;
          stations[station.id] = { status, progress, workerState: "defending" };
          return;
        }
        if (orderedToFlee || ["farmer", "rancher", "fisher", "builder"].includes(station.job) || !guardNearby) {
          const fleeTarget = { x: home.x + (home.x - immediateThreat.mob.x) * 0.8, y: home.y, z: home.z + (home.z - immediateThreat.mob.z) * 0.8 };
          next = moveWorker(next, fleeTarget, 1.75, delta);
          workers[worker.id] = next;
          stations[station.id] = { status: `Fleeing ${MOB_TYPES[immediateThreat.mob.type]?.name || "enemy"}`, progress: 0, workerState: "fleeing" };
          return;
        }
      }

      if (station.job === "guard") {
        const hostile = mobs
          .filter((mob) => MOB_TYPES[mob.type]?.hostile && !mob.dyingUntil)
          .map((mob) => ({ mob, distance: distance2d(worker, mob) }))
          .filter((entry) => entry.distance <= COLONY_GUARD_RADIUS)
          .sort((a, b) => a.distance - b.distance)[0];
        if (hostile) {
          next = moveWorker(next, hostile.mob, 1.75, delta);
          status = `Defending against ${MOB_TYPES[hostile.mob.type]?.name || hostile.mob.type}`;
          progress = 1 - hostile.distance / COLONY_GUARD_RADIUS;
          if (hostile.distance <= 1.6 && now >= runtime.actionAt) {
            runtime.actionAt = now + 850;
            const guardDamage = 5 * (hasPerk(progression, "war_banner") ? 1.18 : 1);
            dispatch(mobCombatHit({ targetId: hostile.mob.id, amount: guardDamage, friendlyAttack: true }));
            dispatch(addColonyResources({ stationId: station.id, totals: { hostilesStopped: 1 } }));
          }
        } else if (station.orderMode === "hold") {
          next = moveWorker(next, home, 0.8, delta);
          status = "Holding the assigned guard post";
          progress = 0.25;
        } else {
          runtime.patrol += delta * (station.orderMode === "escort" ? 0.52 : 0.35);
          const patrolRadius = station.orderMode === "escort" ? 7 : 4;
          next = moveWorker(next, { x: home.x + Math.sin(runtime.patrol) * patrolRadius, y: home.y, z: home.z + Math.cos(runtime.patrol) * patrolRadius }, 0.9, delta);
          status = station.orderMode === "escort" ? "Escorting workers around the settlement" : "Patrolling the settlement";
          progress = 0.2;
        }
      } else if (station.job === "miner") {
        if ((!runtime.target || !worldRuntime.getBlock(runtime.target.key)) && now >= runtime.searchAt) {
          runtime.searchAt = now + 3000;
          runtime.target = worldRuntime.findBlocksNear(station.position, (type) => ORE_PRIORITY.includes(type), COLONY_WORK_RADIUS, 80)
            .sort((a, b) => (ORE_PRIORITY.indexOf(a.type) - ORE_PRIORITY.indexOf(b.type)) || a.distanceSq - b.distanceSq)[0] || null;
        }
        if (runtime.target) {
          const target = { x: runtime.target.position[0], y: runtime.target.position[1], z: runtime.target.position[2] };
          next = moveWorker(next, target, 1.1, delta);
          const distance = distance2d(next, target);
          status = `Mining ${BLOCK_TYPES[runtime.target.type]?.name || runtime.target.type}`;
          progress = Math.max(0.08, 1 - distance / COLONY_WORK_RADIUS);
          if (distance <= 1.7 && now >= runtime.actionAt) {
            runtime.actionAt = now + Math.max(1100, 2800 - (station.workPriority || 1) * 450);
            const removed = worldRuntime.removeBlock(runtime.target.key);
            if (removed) {
              const item = BLOCK_TYPES[removed.type]?.drop || (removed.type === "stone" ? "cobblestone" : null);
              if (item) dispatch(addColonyResources({ stationId: station.id, items: { [item]: 1 }, totals: { blocksMined: 1 }, blockEdits: { [runtime.target.key]: null }, message: `${station.workerName} delivered ${BLOCK_TYPES[removed.type]?.name || removed.type}` }));
            }
            runtime.target = null;
          }
        } else {
          next = moveWorker(next, home, 0.8, delta);
          status = "Surveying nearby ore";
        }
      } else if (station.job === "farmer") {
        const crops = (colony.crops || []).filter((crop) => crop.stationId === station.id);
        const mature = crops.find((crop) => crop.stage >= 3);
        if (mature) {
          const target = { x: mature.position[0], y: mature.position[1], z: mature.position[2] };
          next = moveWorker(next, target, 1.05, delta);
          status = "Harvesting wheat";
          progress = 1;
          if (distance2d(next, target) <= 1.5 && now >= runtime.actionAt) {
            runtime.actionAt = now + 1800;
            if (worldRuntime.replaceBlock(mature.position, "wheat_crop_0")) {
              dispatch(applyCropGrowth([{ id: mature.id, blockType: "wheat_crop_0", patch: { stage: 0, plantedAt: now, nextGrowthAt: now + 11000 } }]));
              dispatch(addColonyResources({ stationId: station.id, items: { wheat: 2, wheat_seeds: 1 }, totals: { cropsHarvested: 1 }, message: `${station.workerName} harvested wheat` }));
            }
          }
        } else if (crops.length < 12 && now >= runtime.actionAt) {
          const plot = findFarmPlot(station.position, FARM_PLOT_OFFSETS, new Set(crops.map((crop) => crop.key)));
          if (plot) {
            const target = { x: plot.groundPosition[0], y: plot.groundPosition[1], z: plot.groundPosition[2] };
            next = moveWorker(next, target, 1, delta);
            status = plot.groundType === "farmland" ? "Planting wheat" : "Tilling farmland";
            progress = crops.length / 12;
            if (distance2d(next, target) <= 1.55) {
              if (plot.groundType !== "farmland") worldRuntime.replaceBlock(plot.groundPosition, "farmland");
              if (!worldRuntime.hasBlockAt(...plot.cropPosition) && worldRuntime.setBlock(plot.cropPosition, "wheat_crop_0")) {
                dispatch(plantCrop({ position: plot.cropPosition, key: plot.cropKey, groundPosition: plot.groundPosition, stationId: station.id }));
              }
              runtime.actionAt = now + 1600;
            }
          } else status = "Tending the planted field";
        } else {
          next = moveWorker(next, home, 0.7, delta);
          status = "Watching crop growth";
          progress = crops.length ? crops.reduce((sum, crop) => sum + crop.stage / 3, 0) / crops.length : 0;
        }
      } else if (station.job === "rancher") {
        const nearby = mobs.filter((mob) => PASSIVE_TYPES.has(mob.type) && !mob.dyingUntil && distance2d(station.position, mob) <= COLONY_WORK_RADIUS);
        const managed = nearby.filter((mob) => mob.colonyStationId === station.id);
        if (managed.length < COLONY_MAX_MANAGED_ANIMALS) {
          const candidates = nearby.filter((mob) => !mob.colonyStationId).slice(0, COLONY_MAX_MANAGED_ANIMALS - managed.length);
          if (candidates.length) dispatch(assignColonyAnimals({ stationId: station.id, mobIds: candidates.map((mob) => mob.id) }));
        }
        const target = managed[0] || nearby[0];
        next = moveWorker(next, target || home, 0.92, delta);
        status = managed.length ? `Caring for ${managed.length} animals` : "Looking for animals";
        progress = managed.length / COLONY_MAX_MANAGED_ANIMALS;
        if (managed.length && station.orderMode === "feed" && now >= runtime.actionAt && (colony.storage.hay_bale || 0) >= 1) {
          runtime.actionAt = now + 18000;
          dispatch(addColonyResources({ stationId: station.id, items: { hay_bale: -1 }, totals: { animalsManaged: managed.length }, message: `${station.workerName} fed the managed herd with hay` }));
        } else if (managed.length >= 2 && now >= runtime.actionAt && (colony.storage.wheat || 0) >= 2) {
          runtime.actionAt = now + 30000;
          const parent = managed[Math.floor(Math.random() * managed.length)];
          dispatch(breedColonyAnimal({ stationId: station.id, type: parent.type, position: [parent.x + 0.6, parent.y, parent.z + 0.6] }));
        }
      } else if (station.job === "builder") {
        const plan = Array.isArray(station.buildPlan) ? station.buildPlan : [];
        const planIndex = Math.max(0, Number(station.buildIndex || 0));
        const step = plan[planIndex];
        if (!step) {
          next = moveWorker(next, home, 0.82, delta);
          status = station.houseCompleted ? "Maintaining completed house" : "Construction plan complete";
          progress = 1;
        } else {
          const target = { x: step.position[0] + 0.5, y: step.position[1] + 0.5, z: step.position[2] + 0.5 };
          next = moveWorker(next, target, 1.08, delta);
          status = `Building ${String(step.phase || "house").replaceAll("_", " ")}`;
          progress = plan.length ? planIndex / plan.length : 0;
          if (distance2d(next, target) <= 1.8 && now >= runtime.actionAt) {
            runtime.actionAt = now + Math.max(300, 760 - (station.workPriority || 1) * 140);
            const existing = worldRuntime.getBlockTypeAt(...step.position);
            const replaceable = new Set(["snow_layer", "tall_grass", "wildflower", "meadow_grass_0", "meadow_grass_1", "meadow_grass_2", "yellow_flower_0", "yellow_flower_1", "yellow_flower_2", "vine", "reeds", "seagrass", "kelp"]);
            if (existing && replaceable.has(existing)) worldRuntime.removeBlock(`${step.position[0]},${step.position[1]},${step.position[2]}`);
            const afterClear = worldRuntime.getBlockTypeAt(...step.position);
            const placed = afterClear === step.type || (!afterClear && worldRuntime.setBlock(step.position, step.type));
            if (placed) {
              const completed = planIndex + 1 >= plan.length;
              dispatch(advanceColonyConstruction({ stationId: station.id, position: step.position, type: step.type, phase: step.phase, planIndex, completed }));
            } else {
              status = `Construction blocked at ${step.position.join(", ")}`;
            }
          }
        }
      } else if (station.job === "fisher") {
        const water = worldRuntime.findBlocksNear(station.position, (type) => type === "water", 16, 20)[0];
        if (water) {
          const target = { x: water.position[0], y: water.position[1], z: water.position[2] };
          next = moveWorker(next, target, 0.9, delta);
          status = "Fishing the shoreline";
          progress = Math.min(1, Math.max(0.1, (now - (runtime.actionAt - 9000)) / 9000));
          if (distance2d(next, target) <= 2.2 && now >= runtime.actionAt) {
            runtime.actionAt = now + 7000 + Math.random() * 5000;
            dispatch(addColonyResources({ stationId: station.id, items: { raw_fish: Math.random() > 0.8 ? 2 : 1 }, totals: { fishCaught: 1 }, message: `${station.workerName} caught fish` }));
          }
        } else {
          next = moveWorker(next, home, 0.8, delta);
          status = "Fishing hut needs nearby water";
        }
      }
      workers[worker.id] = next;
      stations[station.id] = { status, progress: Math.max(0, Math.min(1, progress)), workerState: status.startsWith("Defending") ? "defending" : "working" };
    });
    if (Object.keys(workers).length || Object.keys(stations).length) dispatch(applyColonyFrame({ workers, stations }));
  });
  return null;
}
