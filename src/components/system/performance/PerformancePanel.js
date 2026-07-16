import React from "react";
import { Box, Chip, LinearProgress, Paper, Stack, Typography } from "@mui/material";
import MemoryIcon from "@mui/icons-material/Memory";
import { useSelector } from "react-redux";
import { worldRuntime } from "../../../game/core/worldRuntime";

export default function PerformancePanel() {
  const mobs = useSelector((state) => state.world.mobs.length);
  const edits = useSelector((state) => Object.keys(state.world.blockEdits || {}).length);
  const revision = useSelector((state) => state.world.revision);
  const snapshot = worldRuntime.getSnapshot();
  const chunks = snapshot?.chunks?.length || snapshot?.chunkList?.length || 0;
  const pressure = Math.min(100, chunks * 6 + mobs * 0.35);
  return (
    <Box>
      <Typography variant="h6" fontWeight={1000}>Runtime diagnostics</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>A lightweight snapshot of the active deterministic runtime. This panel performs no per-frame polling.</Typography>
      <Paper sx={{ p: 2 }}>
        <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
          <MemoryIcon color="primary" />
          <Chip label={`${chunks} runtime chunks`} />
          <Chip label={`${mobs} creatures`} />
          <Chip label={`${edits} permanent edits`} />
          <Chip label={`save revision ${revision}`} />
        </Stack>
        <Typography fontWeight={900} sx={{ mt: 2 }}>Estimated scene pressure</Typography>
        <LinearProgress variant="determinate" value={pressure} sx={{ mt: 0.8, height: 10 }} />
        <Typography variant="caption" color="text.secondary">Chunk meshes, creature count, local lights, particles, waves, and UI overlays remain capped by the selected graphics profile.</Typography>
      </Paper>
    </Box>
  );
}
