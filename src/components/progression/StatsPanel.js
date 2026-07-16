import React from "react";
import { Box, Button, LinearProgress, Paper, Stack, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { allocateStat } from "../../features/world/worldSlice";
import { STAT_KEYS, STAT_LABELS, experienceForLevel, getMaxHealth } from "../../game/config/progression";

const DESCRIPTIONS = {
  strength: "Raises melee damage.",
  agility: "Raises movement, mining support, and jump height.",
  intelligence: "Speeds up furnace smelting and future advanced crafting.",
  vitality: "Adds two maximum health per point.",
  mining: "Reduces block breaking time.",
};

export default function StatsPanel() {
  const dispatch = useDispatch();
  const progression = useSelector((state) => state.world.progression);
  const nextExperience = experienceForLevel(progression.level);
  const percent = Math.min(100, progression.experience / nextExperience * 100);

  return (
    <Box>
      <Typography variant="h6" fontWeight={1000}>Character stats</Typography>
      <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
        Mining, crafting, exploration, and combat grant experience. Each level awards two points to spend.
      </Typography>
      <Paper sx={{ p: 2, mb: 2, bgcolor: "rgba(155,220,90,.07)" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="baseline">
          <Typography variant="h5" fontWeight={1000}>Level {progression.level}</Typography>
          <Typography fontWeight={900}>{progression.unspentPoints} unspent points</Typography>
        </Stack>
        <LinearProgress value={percent} variant="determinate" sx={{ mt: 1.4, height: 10 }} />
        <Typography variant="caption" color="text.secondary">
          {Math.floor(progression.experience)} / {nextExperience} XP · Maximum health {getMaxHealth(progression)}
        </Typography>
      </Paper>
      <Stack spacing={1.2}>
        {STAT_KEYS.map((stat) => (
          <Paper key={stat} sx={{ p: 1.5 }}>
            <Stack direction={{ xs: "column", sm: "row" }} gap={1} alignItems={{ sm: "center" }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography fontWeight={1000}>{STAT_LABELS[stat]} · {progression.stats[stat]}</Typography>
                <Typography variant="body2" color="text.secondary">{DESCRIPTIONS[stat]}</Typography>
              </Box>
              <Button
                variant="contained"
                disabled={progression.unspentPoints <= 0 || progression.stats[stat] >= 50}
                onClick={() => dispatch(allocateStat(stat))}
              >
                Add point
              </Button>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}
