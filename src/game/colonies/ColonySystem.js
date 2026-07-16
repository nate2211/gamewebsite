import { useFrame } from "@react-three/fiber";
import { useDispatch, useSelector } from "react-redux";
import { useRef } from "react";
import {
  addColonyResources,
  applyColonyFrame,
  applyCropGrowth,
  assignColonyAnimals,
  breedColonyAnimal,
  mobCombatHit,
  plantCrop,
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
      const worker = mobs.find((mob) => mob.id === station.workerId);
      if (!worker) return;
      const runtime = runtimeMap.current.get(station.id) || { target: null, searchAt: 0, actionAt: 0, patrol: Math.random() * Math.PI * 2 };
      runtimeMap.current.set(station.id, runtime);
      let next = { ...worker };
      let status = station.enabled ? "Working" : "Work paused";
      let progress = 0;
      const home = stationHome(station);
      if (!station.enabled) {
        workers[worker.id] = moveWorker(next, home, 0.8, delta);
        stations[station.id] = { status, progress };
        return;
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
            dispatch(mobCombatHit({ targetId: hostile.mob.id, amount: 5, friendlyAttack: true }));
            dispatch(addColonyResources({ stationId: station.id, totals: { hostilesStopped: 1 } }));
          }
        } else {
          runtime.patrol += delta * 0.35;
          next = moveWorker(next, { x: home.x + Math.sin(runtime.patrol) * 4, y: home.y, z: home.z + Math.cos(runtime.patrol) * 4 }, 0.9, delta);
          status = "Patrolling the settlement";
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
            runtime.actionAt = now + 2600;
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
        if (managed.length >= 2 && now >= runtime.actionAt && (colony.storage.wheat || 0) >= 2) {
          runtime.actionAt = now + 30000;
          const parent = managed[Math.floor(Math.random() * managed.length)];
          dispatch(breedColonyAnimal({ stationId: station.id, type: parent.type, position: [parent.x + 0.6, parent.y, parent.z + 0.6] }));
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
      stations[station.id] = { status, progress: Math.max(0, Math.min(1, progress)) };
    });
    if (Object.keys(workers).length || Object.keys(stations).length) dispatch(applyColonyFrame({ workers, stations }));
  });
  return null;
}
