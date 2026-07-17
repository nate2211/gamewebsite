import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { damagePlayer, recordBossAbility, spawnBossMinions } from "../../features/world/worldSlice";
import { BOSS_SUMMONS } from "../config/bosses";
import { particleRuntime } from "../particles/particleRuntime";

export default function BossSystem({ playerRef, enabled = true }) {
  const dispatch = useDispatch();
  const bossState = useSelector((state) => state.world.bosses);
  const boss = useSelector((state) => state.world.mobs.find((mob) => mob.id === state.world.bosses?.activeBossId) || null);
  const lastCastRef = useRef(0);

  useEffect(() => {
    if (!enabled || !boss || boss.dyingUntil) return undefined;
    const timer = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      const definition = BOSS_SUMMONS[boss.type];
      const now = Date.now();
      if (!definition || now - lastCastRef.current < definition.abilityCooldownMs) return;
      const distance = Math.hypot((boss.x || 0) - player.x, (boss.z || 0) - player.z);
      if (distance > 24) return;
      lastCastRef.current = now;

      if (boss.type === "stone_titan") {
        particleRuntime.emitBlockParticles({ position: [boss.x, boss.y, boss.z], blockType: "stone", count: 24, intensity: 1.8, kind: "break" });
        if (distance <= 11) dispatch(damagePlayer({ amount: 7, source: "Granite Shockwave" }));
        dispatch(recordBossAbility({ bossId: boss.id, ability: "Granite Shockwave", now }));
      } else if (boss.type === "ember_wyrm") {
        particleRuntime.emitBlockParticles({ position: [boss.x, boss.y, boss.z], blockType: "redstone_ore", count: 24, intensity: 1.65, kind: "break" });
        if (distance <= 18) dispatch(damagePlayer({ amount: 5, source: "Ember Torrent" }));
        dispatch(spawnBossMinions({ bossId: boss.id, types: ["emberling", "emberling"] }));
        dispatch(recordBossAbility({ bossId: boss.id, ability: "Ember Torrent", now }));
      } else if (boss.type === "void_lich") {
        particleRuntime.emitBlockParticles({ position: [boss.x, boss.y, boss.z], blockType: "carved_rune_brick", count: 20, intensity: 1.7, kind: "break" });
        if (distance <= 16) dispatch(damagePlayer({ amount: 4, source: "Void Drain" }));
        dispatch(spawnBossMinions({ bossId: boss.id, types: ["skeleton", "elite_zombie"] }));
        dispatch(recordBossAbility({ bossId: boss.id, ability: "Grave Convergence", now }));
      }
    }, 850);
    return () => window.clearInterval(timer);
  }, [boss, bossState?.activeBossId, dispatch, enabled, playerRef]);

  return null;
}
