import React from "react";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SaveIcon from "@mui/icons-material/Save";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";

export default function PauseOverlay({ open, onResume, onSave, onSaveAndExit, resumeDisabled, pointerError }) {
  if (!open) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 20,
        display: "grid",
        placeItems: "center",
        bgcolor: "rgba(2,6,10,.58)",
        backdropFilter: "blur(3px)",
      }}
    >
      <Paper sx={{ p: 3, width: "min(92vw, 420px)", textAlign: "center" }}>
        <Typography variant="h4" fontWeight={1000}>Game paused</Typography>
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
            {resumeDisabled ? (pointerError?.startsWith("Streaming") ? "Loading terrain…" : "Mouse unlock cooldown…") : "Resume"}
          </Button>
          <Button startIcon={<SaveIcon />} onClick={onSave}>Save world</Button>
          <Button color="warning" startIcon={<ExitToAppIcon />} onClick={onSaveAndExit}>Save and exit</Button>
        </Stack>
      </Paper>
    </Box>
  );
}
