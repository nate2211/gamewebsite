import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { applyCropGrowth } from "../../features/world/worldSlice";
import { worldRuntime } from "../core/worldRuntime";

const BASE_GROWTH_MS = 12000;
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
      const updates = [];
      cropsRef.current.forEach((crop) => {
        if (!crop || crop.stage >= 3 || now < (crop.nextGrowthAt || 0)) return;
        const nextStage = crop.stage + 1;
        const blockType = `wheat_crop_${nextStage}`;
        if (!worldRuntime.replaceBlock(crop.position, blockType)) return;
        updates.push({ id: crop.id, blockType, patch: { stage: nextStage, nextGrowthAt: now + Math.round(BASE_GROWTH_MS * rainMultiplier) } });
      });
      if (updates.length) dispatch(applyCropGrowth(updates));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [active, dispatch]);
  return null;
}
