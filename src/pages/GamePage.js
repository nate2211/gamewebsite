import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import MultiplayerDialog from "../components/multiplayer/MultiplayerDialog";
import { multiplayerSession } from "../game/multiplayer/MultiplayerSession";
import { shallowEqual, useDispatch, useSelector, useStore } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import InventoryDialog, { preloadEssentialInventoryPanels, preloadStationPanel } from "../components/inventory/dialog/InventoryDialog";
import GameCanvas from "../components/game/canvas/GameCanvas";
import Hud from "../components/game/hud/Hud";
import { preloadItemIcons } from "../components/items/icons/ItemIcon";
import PauseOverlay from "../components/game/overlays/PauseOverlay";
import { db, serializeWorld } from "../data/db";
import {
  clearWorld,
  completeFurnaceJobs,
  loadWorld,
  setPlayerPosition,
} from "../features/world/worldSlice";
import { worldRuntime } from "../game/core/worldRuntime";
import { liquidRuntime } from "../game/liquids/liquidRuntime";
import { particleRuntime } from "../game/particles/particleRuntime";
import { getChunkIdForPosition, TERRAIN_GENERATOR_VERSION } from "../game/world/generation/worldGenerator";
import {
  LOAD_SAFETY_RADIUS,
  findSafeLoadedPlayerPosition,
  isLoadAreaReady,
  normalizeSavedPlayer,
} from "../game/world/loading/worldLoadSafety";
import {
  applyBootstrapChunks,
  prepareBootstrapChunks,
  stripBootstrapChunksForStorage,
} from "../game/world/loading/worldBootstrap";

const POINTER_RELOCK_COOLDOWN_MS = 700;

export default function GamePage() {
  const { worldId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const store = useStore();
  const world = useSelector((state) => ({
    loaded: state.world.loaded,
    name: state.world.name,
    seed: state.world.seed,
  }), shallowEqual);
  const [loading, setLoading] = useState(true);
  const [openStation, setOpenStation] = useState(null);
  const [pointerLocked, setPointerLocked] = useState(false);
  const [resumeReady, setResumeReady] = useState(true);
  const [pointerError, setPointerError] = useState("");
  const [inventoryResumePending, setInventoryResumePending] = useState(false);
  const [terrainReady, setTerrainReady] = useState(false);
  const [playerLoadReady, setPlayerLoadReady] = useState(false);
  const [terrainError, setTerrainError] = useState("");
  const [renderedChunkIds, setRenderedChunkIds] = useState(() => new Set());
  const [voxelMeshesReady, setVoxelMeshesReady] = useState(false);
  const [loadingStage, setLoadingStage] = useState("Opening world record…");
  const [fatalLoadError, setFatalLoadError] = useState("");
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));
  const [multiplayerOpen, setMultiplayerOpen] = useState(false);
  const gameRootRef = useRef(null);
  const canvasRef = useRef(null);
  const playerRef = useRef({ x: 0, y: 12, z: 0 });
  const resumeTimerRef = useRef(null);
  const requestInFlightRef = useRef(false);
  const saveInFlightRef = useRef(null);
  const resolvedLoadRef = useRef(false);
  const runtimeSubscribe = useCallback(
    (listener) => (terrainReady ? () => {} : worldRuntime.subscribe(listener)),
    [terrainReady]
  );
  const runtimeSnapshot = useSyncExternalStore(
    runtimeSubscribe,
    worldRuntime.getSnapshot,
    worldRuntime.getServerSnapshot
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setFatalLoadError("");
        setLoadingStage("Opening world record…");
        const [record, bootstrapCache] = await Promise.all([
          db.worlds.get(worldId),
          db.worldBootstraps.get(worldId),
        ]);
        if (cancelled) return;
        if (!record) {
          navigate("/", { replace: true });
          return;
        }

        const normalizedPlayer = normalizeSavedPlayer(record.player || record.spawn, record.seed);
        setLoadingStage("Preparing the 3×3 playable spawn area…");
        worldRuntime.reset(record.seed, record.blockEdits || {});
        liquidRuntime.reset(record.liquids || []);
        particleRuntime.clear();

        const bootstrapChunks = await prepareBootstrapChunks({
          seed: record.seed,
          position: normalizedPlayer,
          radius: LOAD_SAFETY_RADIUS,
          storedChunks: bootstrapCache?.seed === record.seed
            && bootstrapCache?.generatorVersion === TERRAIN_GENERATOR_VERSION
            ? bootstrapCache.chunks
            : [],
          onProgress: ({ completed, total }) => {
            if (!cancelled) setLoadingStage(`Loading solid voxel chunks ${completed}/${total}…`);
          },
        });
        if (cancelled) return;

        const appliedCount = applyBootstrapChunks(bootstrapChunks);
        liquidRuntime.rebuildFromSources();
        worldRuntime.pinChunks(bootstrapChunks.map((chunk) => chunk.id));
        if (appliedCount < bootstrapChunks.length) {
          throw new Error("The complete spawn collision area could not be inserted into the world runtime.");
        }

        setLoadingStage("Finding safe ground and positioning the camera…");
        const safePosition = findSafeLoadedPlayerPosition(normalizedPlayer, record.seed);
        const hydrated = {
          ...record,
          player: { x: safePosition.x, y: safePosition.y, z: safePosition.z },
          spawn: normalizeSavedPlayer(record.spawn || safePosition, record.seed),
          blocks: {},
          biomes: {},
          loadedChunks: {},
          bootstrapChunks: undefined,
        };

        playerRef.current = { ...hydrated.player };
        resolvedLoadRef.current = true;
        setTerrainReady(false);
        setPlayerLoadReady(true);
        setVoxelMeshesReady(false);
        setTerrainError("");
        setRenderedChunkIds(new Set());
        dispatch(loadWorld(hydrated));
        dispatch(setPlayerPosition(hydrated.player));

        // Keep a prebuilt spawn cache for the next load. Autosaves may later omit
        // this cache, but every load still has the same direct-generation fallback.
        if (!bootstrapCache
          || bootstrapCache.seed !== record.seed
          || bootstrapCache.generatorVersion !== TERRAIN_GENERATOR_VERSION
          || bootstrapCache.chunks?.length < bootstrapChunks.length) {
          db.worldBootstraps.put({
            worldId: record.id,
            seed: record.seed,
            radius: LOAD_SAFETY_RADIUS,
            generatorVersion: TERRAIN_GENERATOR_VERSION,
            chunks: stripBootstrapChunksForStorage(bootstrapChunks),
            updatedAt: Date.now(),
          }).catch(console.error);
        }
        db.worlds.update(record.id, {
          bootstrapRadius: LOAD_SAFETY_RADIUS,
          player: hydrated.player,
          version: 14,
        }).catch(console.error);

        setLoadingStage("Mounting voxel meshes…");
        setLoading(false);
      } catch (error) {
        if (cancelled) return;
        console.error("World bootstrap failed", error);
        const message = error?.message || "The playable spawn terrain could not be generated.";
        setTerrainError(message);
        setFatalLoadError(message);
        setLoadingStage("World terrain failed to initialize.");
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (document.pointerLockElement) document.exitPointerLock();
      worldRuntime.reset();
      liquidRuntime.reset();
      particleRuntime.clear();
      dispatch(clearWorld());
    };
  }, [dispatch, navigate, worldId]);

  useEffect(() => {
    if (!world.loaded) return undefined;
    return multiplayerSession.bindGame({ store, playerRef, worldId });
  }, [store, world.loaded, worldId]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setFullscreen(Boolean(document.fullscreenElement));
      window.requestAnimationFrame(() => {
        window.dispatchEvent(new Event("resize"));
      });
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    // Preload the lightweight stats panel only after the world shell has had its
    // first paint. Inventory itself is statically imported for an immediate E menu.
    const warm = () => preloadEssentialInventoryPanels().catch(() => undefined);
    const idleId = typeof window.requestIdleCallback === "function"
      ? window.requestIdleCallback(warm, { timeout: 1800 })
      : window.setTimeout(warm, 900);
    return () => {
      if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
    };
  }, []);

  useEffect(() => {
    let lastSignature = "";
    let idleHandle = null;
    const schedule = () => {
      const inventory = store.getState().world.inventory || {};
      const itemIds = Object.entries(inventory).filter(([, count]) => count > 0).map(([itemId]) => itemId).sort();
      const signature = itemIds.join("|");
      if (signature === lastSignature) return;
      lastSignature = signature;
      if (idleHandle != null) {
        if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idleHandle);
        else window.clearTimeout(idleHandle);
      }
      const warm = () => preloadItemIcons(itemIds);
      idleHandle = typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(warm, { timeout: 1000 })
        : window.setTimeout(warm, 220);
    };
    schedule();
    const unsubscribe = store.subscribe(schedule);
    return () => {
      unsubscribe();
      if (idleHandle != null) {
        if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idleHandle);
        else window.clearTimeout(idleHandle);
      }
    };
  }, [store]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen?.();
      } else {
        await gameRootRef.current?.requestFullscreen?.({ navigationUI: "hide" });
      }
      setPointerError("");
    } catch (error) {
      setPointerError(error?.message || "Fullscreen mode could not be changed.");
    } finally {
      window.requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    }
  }, []);

  const armResumeCooldown = useCallback(() => {
    setResumeReady(false);
    if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = window.setTimeout(() => {
      setResumeReady(true);
      setPointerError("");
    }, POINTER_RELOCK_COOLDOWN_MS);
  }, []);

  useEffect(() => {
    const onPointerLockChange = () => {
      const locked = document.pointerLockElement === canvasRef.current;
      setPointerLocked(locked);
      requestInFlightRef.current = false;
      if (!locked) armResumeCooldown();
      else { setPointerError(""); setInventoryResumePending(false); }
    };
    const onPointerLockError = () => {
      requestInFlightRef.current = false;
      setPointerLocked(false);
      setPointerError("The browser declined mouse capture. Wait for the cooldown, then click Resume again.");
      armResumeCooldown();
    };
    document.addEventListener("pointerlockchange", onPointerLockChange);
    document.addEventListener("pointerlockerror", onPointerLockError);
    return () => {
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      document.removeEventListener("pointerlockerror", onPointerLockError);
      if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
    };
  }, [armResumeCooldown]);

  const openWorkstation = useCallback((station) => {
    const nextStation = station || { type: "inventory", key: null };
    // Render the shell in the same keyboard/click task so pressing E feels instant.
    // Heavy station panels are warmed separately and never block the first menu frame.
    preloadStationPanel(nextStation.type).catch(() => undefined);
    flushSync(() => {
      setInventoryResumePending(false);
      setOpenStation(nextStation);
      setPointerError("");
    });
    window.requestAnimationFrame(() => {
      if (document.pointerLockElement) document.exitPointerLock();
      else armResumeCooldown();
    });
  }, [armResumeCooldown]);

  const closeStation = useCallback(() => {
    setOpenStation(null);
    setInventoryResumePending(false);
    setPointerError("");
    armResumeCooldown();
  }, [armResumeCooldown]);

  const closeInventoryWithE = useCallback(() => {
    flushSync(() => {
      setOpenStation(null);
      setInventoryResumePending(true);
      setPointerError("");
    });
    const canvas = canvasRef.current;
    if (!canvas || !terrainReady || !resumeReady || requestInFlightRef.current) return;
    requestInFlightRef.current = true;
    try {
      const result = canvas.requestPointerLock?.();
      if (result && typeof result.catch === "function") result.catch((error) => {
        requestInFlightRef.current = false;
        setPointerError(error?.message || "Click the world once to resume mouse controls.");
      });
    } catch (error) {
      requestInFlightRef.current = false;
      setPointerError(error?.message || "Click the world once to resume mouse controls.");
    }
  }, [resumeReady, terrainReady]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code !== "KeyE" || event.repeat || !store.getState().world.loaded) return;
      event.preventDefault();
      event.stopPropagation();
      if (openStation) closeInventoryWithE();
      else openWorkstation({ type: "inventory", key: null });
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [closeInventoryWithE, openStation, openWorkstation, store]);

  const loadAreaReady = world.loaded
    && isLoadAreaReady(runtimeSnapshot, playerRef.current, LOAD_SAFETY_RADIUS);

  // Defensive recovery for migrated or externally modified saves. Normal new-world
  // creation and loading already resolve the player before the Canvas is mounted.
  useEffect(() => {
    if (!world.loaded || !loadAreaReady || resolvedLoadRef.current) return;
    try {
      const safePosition = findSafeLoadedPlayerPosition(playerRef.current, world.seed);
      playerRef.current = { x: safePosition.x, y: safePosition.y, z: safePosition.z };
      dispatch(setPlayerPosition(playerRef.current));
      resolvedLoadRef.current = true;
      setPlayerLoadReady(true);
      setTerrainError("");
    } catch (error) {
      console.error("Failed to resolve a safe world-load position", error);
      setTerrainError("The player could not be placed on solid terrain.");
    }
  }, [dispatch, loadAreaReady, world.loaded, world.seed]);

  const currentChunkId = getChunkIdForPosition(
    Number(playerRef.current?.x) || 0,
    Number(playerRef.current?.z) || 0
  );
  const currentChunkRendered = renderedChunkIds.has(currentChunkId);

  useEffect(() => {
    if (!world.loaded || !playerLoadReady || terrainReady) return;
    const collisionReady = isLoadAreaReady(runtimeSnapshot, playerRef.current, LOAD_SAFETY_RADIUS);
    const centerId = getChunkIdForPosition(playerRef.current.x, playerRef.current.z);
    const centerRendered = renderedChunkIds.has(centerId);
    const playable = collisionReady && voxelMeshesReady && centerRendered;

    // Readiness is a one-way startup gate. After the initial collision-safe area
    // and center mesh are confirmed, normal streaming can never revoke controls,
    // pause gravity, or force pointer lock to exit.
    if (playable) {
      setTerrainReady(true);
      setTerrainError("");
    }
  }, [playerLoadReady, renderedChunkIds, runtimeSnapshot, terrainReady, voxelMeshesReady, world.loaded]);

  const saveWorld = useCallback(async () => {
    if (saveInFlightRef.current) return saveInFlightRef.current;
    const currentWorld = store.getState().world;
    // Never overwrite a valid save with a pre-terrain or falling startup position.
    if (!currentWorld.loaded || !terrainReady || !playerLoadReady) return undefined;
    const payload = serializeWorld({
      ...currentWorld,
      player: playerRef.current || currentWorld.player,
      liquids: liquidRuntime.serializeSources(),
    });
    const operation = db.worlds.update(payload.id, payload).then((updated) => {
      if (!updated) return db.worlds.put(payload);
      return updated;
    }).finally(() => {
      if (saveInFlightRef.current === operation) saveInFlightRef.current = null;
    });
    saveInFlightRef.current = operation;
    return operation;
  }, [playerLoadReady, store, terrainReady]);

  useEffect(() => {
    if (!world.loaded || !terrainReady) return undefined;
    let lastRevision = store.getState().world.revision;
    let timer = null;
    const unsubscribe = store.subscribe(() => {
      const revision = store.getState().world.revision;
      if (revision === lastRevision) return;
      lastRevision = revision;
      if (timer != null) window.clearTimeout(timer);
      timer = window.setTimeout(() => saveWorld().catch(console.error), 7000);
    });
    return () => {
      unsubscribe();
      if (timer != null) window.clearTimeout(timer);
    };
  }, [saveWorld, store, terrainReady, world.loaded]);

  useEffect(() => {
    if (!world.loaded || !terrainReady) return undefined;
    const saveInterval = window.setInterval(() => saveWorld().catch(console.error), 30000);
    const furnaceInterval = window.setInterval(() => {
      dispatch(completeFurnaceJobs({ now: Date.now() }));
    }, 500);
    return () => {
      window.clearInterval(saveInterval);
      window.clearInterval(furnaceInterval);
    };
  }, [dispatch, saveWorld, terrainReady, world.loaded]);

  useEffect(() => {
    const saveBeforeUnload = () => {
      const currentWorld = store.getState().world;
      if (!currentWorld.loaded || !terrainReady || !playerLoadReady) return;
      const payload = serializeWorld({
        ...currentWorld,
        player: playerRef.current || currentWorld.player,
        liquids: liquidRuntime.serializeSources(),
      });
      db.worlds.update(payload.id, payload);
    };
    window.addEventListener("beforeunload", saveBeforeUnload);
    return () => window.removeEventListener("beforeunload", saveBeforeUnload);
  }, [playerLoadReady, store, terrainReady]);

  const requestResume = async () => {
    const canvas = canvasRef.current;
    if (!canvas || openStation || !resumeReady || !terrainReady || requestInFlightRef.current) return;
    requestInFlightRef.current = true;
    setPointerError("");
    try {
      const result = canvas.requestPointerLock?.();
      if (result && typeof result.then === "function") await result;
    } catch (error) {
      requestInFlightRef.current = false;
      setPointerError(error?.message || "Pointer lock could not be acquired. Click Resume again.");
      armResumeCooldown();
    }
  };

  const saveAndExit = async () => {
    await saveWorld();
    if (document.pointerLockElement) document.exitPointerLock();
    navigate("/");
  };

  const handleChunkRendered = useCallback((chunkId) => {
    setRenderedChunkIds((previous) => {
      if (previous.has(chunkId)) return previous;
      const next = new Set(previous);
      next.add(chunkId);
      return next;
    });
  }, []);

  const handleChunkUnmounted = useCallback((chunkId) => {
    setRenderedChunkIds((previous) => {
      if (!previous.has(chunkId)) return previous;
      const next = new Set(previous);
      next.delete(chunkId);
      return next;
    });
  }, []);

  const handleTerrainRenderable = useCallback(() => {
    setVoxelMeshesReady(true);
    setTerrainError("");
  }, []);

  const handleTerrainUnavailable = useCallback(() => {
    setVoxelMeshesReady(false);
  }, []);

  if (loading || !world.loaded) {
    return (
      <Box sx={{ height: "100%", display: "grid", placeItems: "center", p: 3 }}>
        <Box sx={{ textAlign: "center", maxWidth: 560 }}>
          {!fatalLoadError && <CircularProgress />}
          <Typography sx={{ mt: 2 }}>{loadingStage}</Typography>
          {fatalLoadError && (
            <>
              <Typography color="error.main" sx={{ mt: 1, mb: 2 }}>
                {fatalLoadError}
              </Typography>
              <Button variant="contained" onClick={() => navigate("/", { replace: true })}>
                Return to worlds
              </Button>
            </>
          )}
        </Box>
      </Box>
    );
  }

  const simulationEnabled = pointerLocked && !openStation && terrainReady;
  let terrainStatus = terrainError;
  if (!terrainStatus && !loadAreaReady) terrainStatus = "Generating the 3×3 collision-safe terrain area…";
  else if (!terrainStatus && !playerLoadReady) terrainStatus = "Finding safe ground for the saved player…";
  else if (!terrainStatus && !voxelMeshesReady) terrainStatus = "Mounting visible voxel meshes…";
  else if (!terrainStatus && !currentChunkRendered) terrainStatus = "Confirming the player chunk is on screen…";
  else if (!terrainStatus && !terrainReady) terrainStatus = "Finalizing the playable world…";

  return (
    <Box ref={gameRootRef} className="game-root">
      <GameCanvas
        playerRef={playerRef}
        simulationEnabled={simulationEnabled}
        terrainReady={terrainReady}
        bootstrapRadius={terrainReady ? 0 : LOAD_SAFETY_RADIUS}
        viewModelVisible={terrainReady && !openStation}
        onCanvasReady={(canvas) => {
          canvasRef.current = canvas;
        }}
        onChunkRendered={handleChunkRendered}
        onChunkUnmounted={handleChunkUnmounted}
        onTerrainRenderable={handleTerrainRenderable}
        onTerrainUnavailable={handleTerrainUnavailable}
        onOpenStation={openWorkstation}
        onTerrainError={setTerrainError}
      />
      <Hud worldName={world.name} />
      {openStation && (
        <InventoryDialog
          open
          station={openStation}
          onClose={closeStation}
        />
      )}
      {inventoryResumePending && !pointerLocked && !openStation && (
        <Box sx={{ position: "fixed", inset: 0, zIndex: 18, display: "grid", placeItems: "center", pointerEvents: "none" }}>
          <Box sx={{ pointerEvents: "auto", display: "flex", alignItems: "center", gap: 1, p: 1, pl: 1.5, bgcolor: "rgba(10,18,22,.88)", border: "3px solid rgba(255,255,255,.72)" }}>
            <Typography fontWeight={1000}>Inventory closed · click to resume controls</Typography>
            <Button variant="contained" onClick={requestResume}>Resume</Button>
            <Button color="inherit" onClick={() => setInventoryResumePending(false)}>Pause menu</Button>
          </Box>
        </Box>
      )}
      <PauseOverlay
        open={!pointerLocked && !openStation && !inventoryResumePending && !multiplayerOpen}
        onResume={requestResume}
        onSave={saveWorld}
        onSaveAndExit={saveAndExit}
        resumeDisabled={!resumeReady || !terrainReady}
        fullscreen={fullscreen}
        onToggleFullscreen={toggleFullscreen}
        pointerError={terrainReady ? pointerError : terrainStatus}
        onMultiplayer={() => setMultiplayerOpen(true)}
      />
      <MultiplayerDialog
        open={multiplayerOpen}
        onClose={() => setMultiplayerOpen(false)}
        world={{ id: worldId, name: world.name, seed: world.seed }}
      />
    </Box>
  );
}
