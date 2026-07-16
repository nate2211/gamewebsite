import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { applyCropGrowth } from "../../features/world/worldSlice";
import { getPlantGrowth, getPlantStageDuration } from "../config/blockTypes";
import { worldRuntime } from "../core/worldRuntime";

const TICK_MS = 1000;

export default function FarmSystem({ active = true }) {
  const dispatch = useDispatch();
  const crops = useSelector((state) => state.world.crops);
  const weather = useSelector((state) => state.world.weather);
  const cropsRef = useRef(crops);
  const weatherRef = useRef(weather);

  useEffect(() => { cropsRef.current = crops; }, [crops]);
  useEffect(() => { weatherRef.current = weather; }, [weather]);

  useEffect(() => {
    if (!active) return undefined;
    const timer = window.setInterval(() => {
      const now = Date.now();
      const rainMultiplier = weatherRef.current?.type === "rain" ? 0.72 : 1;
      const snowMultiplier = weatherRef.current?.type === "snow" ? 1.45 : 1;
      const updates = [];

      cropsRef.current.forEach((crop) => {
        if (!crop || now < (crop.nextGrowthAt || 0)) return;
        const growth = getPlantGrowth(crop.type || "wheat");
        if (!growth) return;
        const currentStage = Math.max(0, Number(crop.stage) || 0);
        const maxStage = growth.stages.length - 1;
        if (currentStage >= maxStage) return;

        const nextStage = currentStage + 1;
        const blockType = growth.stages[nextStage];
        const currentType = worldRuntime.getBlockTypeAt(...crop.position);
        if (!currentType || !getPlantGrowth(crop.type || "wheat")?.stages.includes(currentType)) return;
        if (!worldRuntime.replaceBlock(crop.position, blockType)) return;

        updates.push({
          id: crop.id,
          blockType,
          patch: {
            stage: nextStage,
            nextGrowthAt: now + Math.round(getPlantStageDuration(crop.type || "wheat", nextStage) * rainMultiplier * snowMultiplier),
          },
        });
      });

      if (updates.length) dispatch(applyCropGrowth(updates));
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [active, dispatch]);

  return null;
}
