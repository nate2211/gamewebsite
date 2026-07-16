import React, { useMemo, useState } from "react";
import {
  AppBar,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SettingsIcon from "@mui/icons-material/Settings";
import TerrainIcon from "@mui/icons-material/Terrain";
import { useLiveQuery } from "dexie-react-hooks";
import { nanoid } from "nanoid";
import { useNavigate } from "react-router-dom";
import { db } from "../data/db";
import { generateWorld } from "../game/worldGenerator";

function randomSeed() {
  return Math.random().toString(36).slice(2, 10);
}

export default function HomePage() {
  const navigate = useNavigate();
  const worlds = useLiveQuery(
    () => db.worlds.orderBy("updatedAt").reverse().toArray(),
    [],
    []
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [worldName, setWorldName] = useState("New Frontier");
  const [seed, setSeed] = useState(randomSeed);
  const [creating, setCreating] = useState(false);
  const background = useMemo(
    () =>
      "radial-gradient(circle at 25% 20%, rgba(99,180,89,.34), transparent 28%), radial-gradient(circle at 75% 30%, rgba(75,156,216,.25), transparent 30%), linear-gradient(145deg, #0a1520, #071017 55%, #111c16)",
    []
  );

  const createWorld = async () => {
    setCreating(true);
    try {
      const id = nanoid();
      const actualSeed = seed.trim() || randomSeed();
      const generated = generateWorld(actualSeed);
      await db.worlds.put({
        id,
        name: worldName.trim() || "New Frontier",
        seed: actualSeed,
        ...generated,
        revision: 0,
        updatedAt: Date.now(),
        version: 2,
      });
      navigate(`/play/${id}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100%", overflow: "auto", background }}>
      <AppBar position="sticky" color="transparent" elevation={0}>
        <Toolbar>
          <TerrainIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6" fontWeight={1000} sx={{ flexGrow: 1 }}>
            Voxel Frontier
          </Typography>
          <IconButton color="inherit" onClick={() => navigate("/settings")}>
            <SettingsIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: { xs: 5, md: 9 } }}>
        <Typography variant="h2" fontWeight={1000} letterSpacing={-2}>
          Build your own world.
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mt: 1, maxWidth: 700 }}>
          An original browser voxel survival sandbox with generated terrain,
          caves, ores, animated mining, tools, crafting tables, furnaces, animals,
          night enemies, building, and local world saves.
        </Typography>

        <Button
          variant="contained"
          size="large"
          startIcon={<AddIcon />}
          sx={{ mt: 4 }}
          onClick={() => setDialogOpen(true)}
        >
          Create world
        </Button>

        <Typography variant="h4" fontWeight={900} sx={{ mt: 7, mb: 2 }}>
          Saved worlds
        </Typography>

        <Stack spacing={1.5}>
          {worlds.length === 0 && (
            <Paper sx={{ p: 3, border: "1px dashed rgba(255,255,255,.2)" }}>
              <Typography color="text.secondary">
                No worlds yet. Create your first generated world above.
              </Typography>
            </Paper>
          )}

          {worlds.map((world) => (
            <Paper key={world.id} sx={{ p: 2 }}>
              <Stack direction="row" alignItems="center" gap={2}>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography fontWeight={900} noWrap>
                    {world.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    Seed: {world.seed} · Updated {new Date(world.updatedAt).toLocaleString()}
                  </Typography>
                </Box>
                <IconButton
                  color="error"
                  onClick={async () => {
                    if (window.confirm(`Delete ${world.name}?`)) {
                      await db.worlds.delete(world.id);
                    }
                  }}
                >
                  <DeleteIcon />
                </IconButton>
                <Button
                  variant="contained"
                  startIcon={<PlayArrowIcon />}
                  onClick={() => navigate(`/play/${world.id}`)}
                >
                  Play
                </Button>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Container>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create a generated world</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="World name"
              value={worldName}
              onChange={(event) => setWorldName(event.target.value)}
              autoFocus
            />
            <TextField
              label="World seed"
              value={seed}
              onChange={(event) => setSeed(event.target.value)}
              helperText="Using the same seed creates the same terrain."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={creating} onClick={createWorld}>
            {creating ? "Generating…" : "Generate and play"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
