import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { regenerateArcana } from "../../features/world/worldSlice";

export default function ArcaneSystem({ enabled = true }) {
  const dispatch = useDispatch();
  useEffect(() => {
    if (!enabled) return undefined;
    const timer = window.setInterval(() => dispatch(regenerateArcana({ amount: 1.6 })), 1000);
    return () => window.clearInterval(timer);
  }, [dispatch, enabled]);
  return null;
}
