import React from "react";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SaveIcon from "@mui/icons-material/Save";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import GroupsIcon from "@mui/icons-material/Groups";

export default function PauseOverlay({
  open,
  onResume,
  onSave,
  onSaveAndExit,
  onToggleFullscreen,
  fullscreen,
  resumeDisabled,
  pointerError,
  onMultiplayer,
}) {
  if (!open) return null;
  const terrainLoading = Boolean(
    resumeDisabled
    && pointerError
    && !pointerError.toLowerCase().includes("mouse")
    && !pointerError.toLowerCase().includes("pointer")
    && !pointerError.toLowerCase().includes("cooldown")
  );

  return (
    <Box
      className="cinematic-pause-backdrop"
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 20,
        display: "grid",
        placeItems: "center",
        bgcolor: terrainLoading ? "rgba(2,6,10,.08)" : "rgba(2,6,10,.28)",
        backdropFilter: "none",
        overflow: "auto",
        py: "max(20px, env(safe-area-inset-top))",
        px: "max(12px, env(safe-area-inset-left))",
      }}
    >
      <Paper className="cinematic-pause-panel" sx={{ p: 3.5, width: "min(92vw, 440px)", maxHeight: "92dvh", overflowY: "auto", textAlign: "center" }}>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: ".2em" }}>Voxel Frontier</Typography>
        <Typography variant="h4" fontWeight={1000} sx={{ color: "#ffffff", textShadow: "3px 3px 0 #1b1b1b" }}>Game paused</Typography>
        <Typography color="text.secondary" sx={{ mt: 1, mb: 2.5 }}>
          Resume uses a fresh click so the browser never requests pointer lock immediately after inventory or Escape releases it.
        </Typography>
        {pointerError && (
          <Typography color="warning.main" variant="body2" sx={{ mb: 2 }}>
            {pointerError}
          </Typography>
        )}
        <Stack spacing={1.2}>
          <Button variant="contained" size="large" startIcon={<PlayArrowIcon />} disabled={resumeDisabled} onClick={onResume}>
            {resumeDisabled ? (terrainLoading ? "Preparing playable voxels…" : "Mouse unlock cooldown…") : "Resume"}
          </Button>
          <Button
            startIcon={fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            onClick={onToggleFullscreen}
          >
            {fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          </Button>
          <Button startIcon={<GroupsIcon />} onClick={onMultiplayer}>Multiplayer lobby</Button>
          <Button startIcon={<SaveIcon />} onClick={onSave}>Save world</Button>
          <Button color="warning" startIcon={<ExitToAppIcon />} onClick={onSaveAndExit}>Save and exit</Button>
        </Stack>
      </Paper>
    </Box>
  );
}
