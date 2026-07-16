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
import GroupsIcon from "@mui/icons-material/Groups";
import { useLiveQuery } from "dexie-react-hooks";
import { nanoid } from "nanoid";
import { useNavigate } from "react-router-dom";
import { db } from "../data/db";
import { generateWorld, TERRAIN_GENERATOR_VERSION } from "../game/world/generation/worldGenerator";
import {
  CREATE_WORLD_BOOTSTRAP_RADIUS,
  prepareBootstrapChunks,
  stripBootstrapChunksForStorage,
} from "../game/world/loading/worldBootstrap";

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
  const [creationProgress, setCreationProgress] = useState("");
  const [creationError, setCreationError] = useState("");
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinLink, setJoinLink] = useState("");
  const [joinError, setJoinError] = useState("");
  const background = useMemo(
    () =>
      `linear-gradient(rgba(5,12,18,.38), rgba(5,12,18,.82)), url(${process.env.PUBLIC_URL || ""}/assets/ui/main-menu-panorama.png) center/cover fixed`,
    []
  );

  const createWorld = async () => {
    if (creating) return;
    setCreating(true);
    setCreationError("");
    setCreationProgress("Preparing the world seed…");
    try {
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
      const id = nanoid();
      const actualSeed = seed.trim() || randomSeed();
      const generated = generateWorld(actualSeed);
      const bootstrapChunks = await prepareBootstrapChunks({
        seed: actualSeed,
        position: generated.spawn,
        radius: CREATE_WORLD_BOOTSTRAP_RADIUS,
        onProgress: ({ completed, total }) => {
          setCreationProgress(`Building visible spawn terrain ${completed}/${total}…`);
        },
      });

      setCreationProgress("Saving the playable spawn area…");
      const updatedAt = Date.now();
      await db.transaction("rw", db.worlds, db.worldBootstraps, async () => {
        await db.worlds.put({
          id,
          name: worldName.trim() || "New Frontier",
          seed: actualSeed,
          ...generated,
          bootstrapRadius: CREATE_WORLD_BOOTSTRAP_RADIUS,
          revision: 0,
          updatedAt,
          version: 14,
        });
        await db.worldBootstraps.put({
          worldId: id,
          seed: actualSeed,
          radius: CREATE_WORLD_BOOTSTRAP_RADIUS,
          generatorVersion: TERRAIN_GENERATOR_VERSION,
          chunks: stripBootstrapChunksForStorage(bootstrapChunks),
          updatedAt,
        });
      });
      navigate(`/play/${id}`);
    } catch (error) {
      console.error("World creation failed", error);
      setCreationError(error?.message || "The spawn terrain could not be generated.");
      setCreationProgress("");
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
            Voxel Frontier Blockstyle
          </Typography>
          <IconButton color="inherit" onClick={() => navigate("/settings")}>
            <SettingsIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: { xs: 5, md: 9 } }}>
        <Box component="img" src={`${process.env.PUBLIC_URL || ""}/assets/ui/title-badge.png`} alt="Voxel Frontier Blockstyle RPG Physics" sx={{ width: "min(100%, 620px)", display: "block", mb: 2, imageRendering: "pixelated", filter: "drop-shadow(0 14px 25px rgba(0,0,0,.45))" }} />
        <Typography variant="h2" fontWeight={1000} letterSpacing={-2}>
          BUILD. EXPLORE. SURVIVE.
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mt: 1, maxWidth: 700 }}>
          An original pixel-block browser RPG sandbox with worker-generated endless terrain,
          independent chunk rendering, adaptive resolution, oceans, biomes, caves, textured blocks,
          first-person tools, boats, tameable animals, combat, armor sets, perks, quests, recipe-book crafting, original static assets, and compact local saves.
        </Typography>

        <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} sx={{ mt: 4 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
          >
            Create world
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<GroupsIcon />}
            onClick={() => setJoinOpen(true)}
          >
            Join world with link
          </Button>
        </Stack>

        <Typography variant="h4" fontWeight={900} sx={{ mt: 7, mb: 2 }}>
          Saved worlds
        </Typography>

        <Stack spacing={1.5}>
          {worlds.length === 0 && (
            <Paper sx={{ p: 3, border: "1px dashed rgba(255,255,255,.2)" }}>
              <Typography color="text.secondary">
                No worlds yet. Create your first endless generated world above.
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
                      await db.transaction("rw", db.worlds, db.worldBootstraps, async () => {
                        await db.worlds.delete(world.id);
                        await db.worldBootstraps.delete(world.id);
                      });
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


      <Dialog open={joinOpen} onClose={() => setJoinOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Join a browser-hosted world</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Multiplayer join link or invite token"
              value={joinLink}
              onChange={(event) => setJoinLink(event.target.value)}
              multiline
              minRows={4}
              autoFocus
            />
            {joinError && <Typography color="error.main">{joinError}</Typography>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJoinOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => {
            const value = joinLink.trim();
            if (!value) return;
            try {
              if (/^https?:|^file:/i.test(value)) {
                window.location.assign(value);
                return;
              }
              navigate(`/join#invite=${encodeURIComponent(value)}`);
              setJoinOpen(false);
            } catch (error) {
              setJoinError(error?.message || "The join link could not be opened.");
            }
          }}>Open invitation</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">        <DialogTitle>Create an endless generated world</DialogTitle>
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
            {creating && (
              <Typography variant="body2" color="primary.light">
                {creationProgress || "Generating visible spawn terrain…"}
              </Typography>
            )}
            {creationError && (
              <Typography variant="body2" color="error.main">
                {creationError}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={creating} onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={creating} onClick={createWorld}>
            {creating ? "Building playable terrain…" : "Generate and play"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
