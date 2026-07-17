import React from "react";
import { Alert, Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { summonBoss } from "../../features/world/worldSlice";
import { BOSS_SUMMONS } from "../../game/config/bosses";
import { getItemDefinition } from "../../game/config/blockTypes";
import { parseBlockKey } from "../../game/utils/worldUtils";

export default function BossAltarPanel({ altarKey }) {
  const dispatch = useDispatch();
  const inventory = useSelector((state) => state.world.inventory);
  const bosses = useSelector((state) => state.world.bosses);
  const activeBoss = useSelector((state) => state.world.mobs.find((mob) => mob.id === state.world.bosses?.activeBossId) || null);
  const position = parseBlockKey(altarKey) || [0, 0, 0];

  return (
    <Box>
      <Typography variant="h5" fontWeight={1000}>Convergence Altar</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>Craft a boss catalyst, place this altar in an open arena, and summon a persistent world boss. Only one summoned boss may be active at a time.</Typography>
      {activeBoss && !activeBoss.dyingUntil && <Alert severity="warning" sx={{ mb: 2 }}>{getItemDefinition(BOSS_SUMMONS[activeBoss.type]?.itemId).name} has already awakened {BOSS_SUMMONS[activeBoss.type]?.name}. Defeat it before another ritual.</Alert>}
      <div className="recipe-card-grid compact-recipes">
        {Object.values(BOSS_SUMMONS).map((boss) => {
          const owned = Number(inventory[boss.itemId] || 0);
          const defeated = bosses?.defeated?.includes(boss.id);
          return (
            <article key={boss.id} className="rpg-recipe-card">
              <div className="rpg-recipe-card-header">
                <div>
                  <Typography fontWeight={1000}>{boss.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{boss.description}</Typography>
                </div>
                <Button variant="contained" color="error" disabled={owned <= 0 || Boolean(activeBoss && !activeBoss.dyingUntil)} onClick={() => dispatch(summonBoss({ bossType: boss.id, altarKey, position }))}>Summon</Button>
              </div>
              <Stack direction="row" gap={0.7} sx={{ mt: 1.2 }} flexWrap="wrap">
                <Chip color={owned > 0 ? "success" : "default"} label={`${getItemDefinition(boss.itemId).name} · ${owned} owned`} />
                {defeated && <Chip color="secondary" label="Previously defeated" />}
              </Stack>
            </article>
          );
        })}
      </div>
      <Paper sx={{ p: 2, mt: 2 }}><Typography variant="body2">Boss rewards include unique weapons, armor materials, trophies, arcane components, and catalyst fragments for repeat encounters.</Typography></Paper>
    </Box>
  );
}
