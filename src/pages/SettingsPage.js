import React, { useState } from "react";
import {
  AppBar,
  Box,
  Button,
  Container,
  FormControlLabel,
  Slider,
  Stack,
  Switch,
  Toolbar,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";

export default function SettingsPage() {
  const navigate = useNavigate();
  const [sensitivity, setSensitivity] = useState(
    Number(localStorage.getItem("voxel:sensitivity") || 1)
  );
  const [showFps, setShowFps] = useState(
    localStorage.getItem("voxel:showFps") === "true"
  );

  const save = () => {
    localStorage.setItem("voxel:sensitivity", String(sensitivity));
    localStorage.setItem("voxel:showFps", String(showFps));
    navigate("/");
  };

  return (
    <Box sx={{ minHeight: "100%", overflow: "auto" }}>
      <AppBar position="static">
        <Toolbar>
          <Button color="inherit" startIcon={<ArrowBackIcon />} onClick={() => navigate("/")}>
            Back
          </Button>
          <Typography variant="h6" fontWeight={900} sx={{ ml: 2 }}>
            Settings
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="sm" sx={{ py: 5 }}>
        <Stack spacing={4}>
          <Box>
            <Typography fontWeight={900} gutterBottom>
              Mouse sensitivity
            </Typography>
            <Slider
              min={0.2}
              max={2}
              step={0.1}
              value={sensitivity}
              valueLabelDisplay="auto"
              onChange={(_, value) => setSensitivity(value)}
            />
          </Box>
          <FormControlLabel
            control={<Switch checked={showFps} onChange={(e) => setShowFps(e.target.checked)} />}
            label="Show FPS counter when the debug system is added"
          />
          <Typography color="text.secondary">
            This starter keeps the settings page ready for render distance,
            controls, sound, graphics, and accessibility options as the engine grows.
          </Typography>
          <Button variant="contained" onClick={save}>
            Save settings
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
