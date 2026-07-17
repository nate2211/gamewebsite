import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { runHousingWorkCycle } from "../../features/world/worldSlice";

export default function HousingSystem({ enabled = true }) {
  const dispatch = useDispatch();
  const occupiedBeds = useSelector((state) => Object.values(state.world.housing?.beds || {}).filter((bed) => bed?.residentId && bed?.active !== false).length);

  useEffect(() => {
    if (!enabled || occupiedBeds <= 0) return undefined;
    const tick = () => dispatch(runHousingWorkCycle({ now: Date.now() }));
    const timer = window.setInterval(tick, 2500);
    tick();
    return () => window.clearInterval(timer);
  }, [dispatch, enabled, occupiedBeds]);

  return null;
}
