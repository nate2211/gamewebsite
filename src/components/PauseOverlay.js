import React from "react";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SaveIcon from "@mui/icons-material/Save";
import HomeIcon from "@mui/icons-material/Home";

export default function PauseOverlay({
  open,
  onResume,
  onSave,
  onSaveAndExit,
}) {
  if (!open) return null;

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        zIndex: 10,
        display: "grid",
        placeItems: "center",
        bgcolor: "rgba(3,8,12,0.56)",
        backdropFilter: "blur(4px)",
      }}
    >
      <Paper sx={{ width: "min(92vw, 420px)", p: 3 }} elevation={18}>
        <Typography variant="h4" fontWeight={1000} gutterBottom>
          Voxel Frontier
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2.5 }}>
          Resume to lock the mouse. Hold left click to mine, right click to use
          blocks or place items, and press E for your inventory.
        </Typography>
        <Stack spacing={1.2}>
          <Button
            variant="contained"
            size="large"
            startIcon={<PlayArrowIcon />}
            onClick={onResume}
          >
            Resume game
          </Button>
          <Button variant="outlined" startIcon={<SaveIcon />} onClick={onSave}>
            Save world
          </Button>
          <Button startIcon={<HomeIcon />} onClick={onSaveAndExit}>
            Save and exit
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
