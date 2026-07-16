import React, { useState } from "react";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Slider,
  Stack,
  Switch,
  Toolbar,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MemoryIcon from "@mui/icons-material/Memory";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import TuneIcon from "@mui/icons-material/Tune";
import { useNavigate } from "react-router-dom";
import {
  readMobDisplaySettings,
  saveMobDisplaySettings,
} from "../game/config/mobDisplaySettings";
import {
  DEFAULT_RUNTIME_SETTINGS,
  readRuntimeSettings,
  saveRuntimeSettings,
} from "../game/config/runtimeSettings";

function SettingSlider({ label, value, min, max, step = 1, marks = false, onChange, suffix = "" }) {
  return (
    <Box>
      <Typography fontWeight={900}>{label} · {value}{suffix}</Typography>
      <Slider
        min={min}
        max={max}
        step={step}
        marks={marks}
        value={value}
        valueLabelDisplay="auto"
        onChange={(_, next) => onChange(next)}
      />
    </Box>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const initialMobSettings = readMobDisplaySettings();
  const [sensitivity, setSensitivity] = useState(Number(localStorage.getItem("voxel:sensitivity") || 1));
  const [showFps, setShowFps] = useState(localStorage.getItem("voxel:showFps") === "true");
  const [quality, setQuality] = useState(localStorage.getItem("voxel:quality") || "balanced");
  const [showMobNames, setShowMobNames] = useState(initialMobSettings.showNames);
  const [showMobHealthBars, setShowMobHealthBars] = useState(initialMobSettings.showHealthBars);
  const [showMobHealthNumbers, setShowMobHealthNumbers] = useState(initialMobSettings.showHealthNumbers);
  const [engine, setEngine] = useState(readRuntimeSettings);
  const setEngineValue = (key, value) => setEngine((current) => ({ ...current, [key]: value }));

  const save = () => {
    localStorage.setItem("voxel:sensitivity", String(sensitivity));
    localStorage.setItem("voxel:showFps", String(showFps));
    localStorage.setItem("voxel:quality", quality);
    saveMobDisplaySettings({
      showNames: showMobNames,
      showHealthBars: showMobHealthBars,
      showHealthNumbers: showMobHealthNumbers,
    });
    saveRuntimeSettings(engine);
    navigate("/");
  };

  const resetEngine = () => setEngine({ ...DEFAULT_RUNTIME_SETTINGS });

  return (
    <Box sx={{ minHeight: "100%", overflow: "auto" }}>
      <AppBar position="static">
        <Toolbar>
          <Button color="inherit" startIcon={<ArrowBackIcon />} onClick={() => navigate("/")}>Back</Button>
          <Typography variant="h6" fontWeight={900} sx={{ ml: 2 }}>Settings</Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ py: 5 }}>
        <Stack spacing={3}>
          <Paper sx={{ p: 3 }}>
            <Stack spacing={3}>
              <Typography variant="h6" fontWeight={900} display="flex" alignItems="center" gap={1}>
                <TuneIcon /> Controls and graphics
              </Typography>
              <SettingSlider label="Mouse sensitivity" value={sensitivity} min={0.2} max={2} step={0.1} onChange={setSensitivity} />
              <FormControl fullWidth>
                <InputLabel id="quality-label">Graphics profile</InputLabel>
                <Select labelId="quality-label" label="Graphics profile" value={quality} onChange={(event) => setQuality(event.target.value)}>
                  <MenuItem value="performance">Performance · 5 chunk baseline</MenuItem>
                  <MenuItem value="balanced">Balanced · 8 chunk baseline</MenuItem>
                  <MenuItem value="quality">Quality · 12 chunk baseline</MenuItem>
                  <MenuItem value="ultra">Ultra · 16 chunk baseline</MenuItem>
                </Select>
              </FormControl>
              <SettingSlider label="Camera field of view" value={engine.cameraFov} min={55} max={100} step={1} suffix="°" onChange={(value) => setEngineValue("cameraFov", value)} />
              <FormControlLabel control={<Switch checked={showFps} onChange={(event) => setShowFps(event.target.checked)} />} label="Show live FPS counter" />
            </Stack>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Stack spacing={2.4}>
              <Typography variant="h6" fontWeight={900} display="flex" alignItems="center" gap={1}>
                <MemoryIcon /> Engine and world streaming
              </Typography>
              <Alert severity="info">
                Render distance now reaches 16 chunks. The engine streams collision data before visible meshes and keeps a predictive safety floor under unloaded boundaries, so terrain rendering no longer pauses movement or drops the player into the void.
              </Alert>
              <SettingSlider label="Chunk render distance" value={engine.renderDistance} min={2} max={16} marks onChange={(value) => setEngineValue("renderDistance", value)} />
              <SettingSlider label="Simulation distance" value={engine.simulationDistance} min={2} max={12} marks onChange={(value) => setEngineValue("simulationDistance", value)} />
              <SettingSlider label="Chunk generation workers" value={engine.chunkGenerationConcurrency} min={1} max={8} marks onChange={(value) => setEngineValue("chunkGenerationConcurrency", value)} />
              <SettingSlider label="Predictive preload ring" value={engine.chunkPreloadRadius} min={0} max={3} marks onChange={(value) => setEngineValue("chunkPreloadRadius", value)} />
              <SettingSlider label="Chunk unload margin" value={engine.chunkUnloadMargin} min={1} max={6} marks onChange={(value) => setEngineValue("chunkUnloadMargin", value)} />
              <FormControl fullWidth>
                <InputLabel id="camera-far-mode-label">Camera far plane</InputLabel>
                <Select labelId="camera-far-mode-label" label="Camera far plane" value={engine.cameraFarMode} onChange={(event) => setEngineValue("cameraFarMode", event.target.value)}>
                  <MenuItem value="auto">Automatic · follows render distance</MenuItem>
                  <MenuItem value="manual">Manual</MenuItem>
                </Select>
              </FormControl>
              {engine.cameraFarMode === "manual" && (
                <SettingSlider label="Camera far distance" value={engine.cameraFar} min={140} max={900} step={20} onChange={(value) => setEngineValue("cameraFar", value)} />
              )}
              <Divider />
              <FormControlLabel
                control={<Switch checked={engine.continueStreamingWhilePaused} onChange={(event) => setEngineValue("continueStreamingWhilePaused", event.target.checked)} />}
                label="Continue chunk streaming while menus or the pause overlay are open"
              />
              <FormControlLabel
                control={<Switch checked={engine.preventVoidFall} onChange={(event) => setEngineValue("preventVoidFall", event.target.checked)} />}
                label="Enable predictive streaming-boundary safety floor"
              />
              <FormControlLabel
                control={<Switch checked={engine.walkAcrossStreamingBoundary} onChange={(event) => setEngineValue("walkAcrossStreamingBoundary", event.target.checked)} />}
                label="Allow walking before the next chunk mesh has finished rendering"
              />
              <FormControlLabel
                control={<Switch checked={engine.dynamicResolution} onChange={(event) => setEngineValue("dynamicResolution", event.target.checked)} />}
                label="Enable adaptive resolution"
              />
              <Button variant="outlined" startIcon={<RestartAltIcon />} onClick={resetEngine} sx={{ alignSelf: "flex-start" }}>
                Reset engine defaults
              </Button>
            </Stack>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Stack spacing={2.4}>
              <Typography variant="h6" fontWeight={900}>Simulation detail</Typography>
              <SettingSlider label="Particle density" value={engine.particleDensity} min={0.25} max={1.5} step={0.25} suffix="×" onChange={(value) => setEngineValue("particleDensity", value)} />
              <SettingSlider label="Creature density" value={engine.creatureDensity} min={0.5} max={1.5} step={0.25} suffix="×" onChange={(value) => setEngineValue("creatureDensity", value)} />
              <FormControl fullWidth>
                <InputLabel id="water-quality-label">Water and wave quality</InputLabel>
                <Select labelId="water-quality-label" label="Water and wave quality" value={engine.waterQuality} onChange={(event) => setEngineValue("waterQuality", event.target.value)}>
                  <MenuItem value="low">Low · fewer shoreline wave instances</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
              <FormControlLabel control={<Switch checked={engine.shorelineWaves} onChange={(event) => setEngineValue("shorelineWaves", event.target.checked)} />} label="Render shoreline foam waves" />
            </Stack>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Stack spacing={1.5}>
              <Typography variant="h6" fontWeight={900}>Mob overlays</Typography>
              <Typography color="text.secondary" sx={{ pb: 1 }}>Each overlay can be disabled separately to reduce UI and text rendering cost.</Typography>
              <Divider />
              <FormControlLabel control={<Switch checked={showMobNames} onChange={(event) => setShowMobNames(event.target.checked)} />} label="Show mob names" />
              <FormControlLabel control={<Switch checked={showMobHealthBars} onChange={(event) => setShowMobHealthBars(event.target.checked)} />} label="Show mob health bars" />
              <FormControlLabel control={<Switch checked={showMobHealthNumbers} onChange={(event) => setShowMobHealthNumbers(event.target.checked)} />} label="Show numeric mob health" />
            </Stack>
          </Paper>

          <Button variant="contained" size="large" onClick={save}>Save settings</Button>
        </Stack>
      </Container>
    </Box>
  );
}
