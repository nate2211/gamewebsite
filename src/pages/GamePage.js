import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import CraftingPanel from "../components/CraftingPanel";
import GameCanvas from "../components/GameCanvas";
import Hud from "../components/Hud";
import PauseOverlay from "../components/PauseOverlay";
import { db, serializeWorld } from "../data/db";
import { clearWorld, loadWorld } from "../features/world/worldSlice";

export default function GamePage() {
  const { worldId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const world = useSelector((state) => state.world);
  const [loading, setLoading] = useState(true);
  const [openStation, setOpenStation] = useState(null);
  const [pointerLocked, setPointerLocked] = useState(false);
  const canvasRef = useRef(null);
  const playerRef = useRef({ x: 0, y: 12, z: 0 });
  const latestWorldRef = useRef(world);

  useEffect(() => {
    latestWorldRef.current = world;
  }, [world]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const record = await db.worlds.get(worldId);
      if (cancelled) return;
      if (!record) {
        navigate("/", { replace: true });
        return;
      }
      dispatch(loadWorld(record));
      playerRef.current = { ...record.player };
      setLoading(false);
    })();

    return () => {
      cancelled = true;
      dispatch(clearWorld());
    };
  }, [dispatch, navigate, worldId]);

  useEffect(() => {
    const onPointerLockChange = () => {
      setPointerLocked(document.pointerLockElement === canvasRef.current);
    };
    document.addEventListener("pointerlockchange", onPointerLockChange);
    return () => document.removeEventListener("pointerlockchange", onPointerLockChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code !== "KeyE" || event.repeat || !world.loaded) return;
      setOpenStation((current) => {
        const next = current ? null : "inventory";
        if (next && document.pointerLockElement) document.exitPointerLock();
        return next;
      });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [world.loaded]);

  const saveWorld = useCallback(async () => {
    const currentWorld = latestWorldRef.current;
    if (!currentWorld.loaded) return;
    await db.worlds.put(
      serializeWorld({
        ...currentWorld,
        player: playerRef.current || currentWorld.player,
      })
    );
  }, []);

  useEffect(() => {
    if (!world.loaded) return undefined;
    const timer = window.setTimeout(() => {
      saveWorld().catch(console.error);
    }, 750);
    return () => window.clearTimeout(timer);
  }, [saveWorld, world.revision, world.loaded]);

  useEffect(() => {
    if (!world.loaded) return undefined;
    const interval = window.setInterval(() => {
      saveWorld().catch(console.error);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [saveWorld, world.loaded]);

  useEffect(() => {
    const saveBeforeUnload = () => {
      if (!world.loaded) return;
      db.worlds.put(
        serializeWorld({
          ...world,
          player: playerRef.current || world.player,
        })
      );
    };
    window.addEventListener("beforeunload", saveBeforeUnload);
    return () => window.removeEventListener("beforeunload", saveBeforeUnload);
  }, [world]);

  const requestResume = () => {
    if (!canvasRef.current || openStation) return;
    canvasRef.current.requestPointerLock?.();
  };

  const openWorkstation = (station) => {
    if (document.pointerLockElement) document.exitPointerLock();
    setOpenStation(station);
  };

  const closeStation = () => {
    setOpenStation(null);
    window.setTimeout(() => {
      canvasRef.current?.requestPointerLock?.();
    }, 0);
  };

  const saveAndExit = async () => {
    await saveWorld();
    if (document.pointerLockElement) document.exitPointerLock();
    navigate("/");
  };

  if (loading || !world.loaded) {
    return (
      <Box sx={{ height: "100%", display: "grid", placeItems: "center" }}>
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Loading survival world…</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box className="game-root">
      <GameCanvas
        playerRef={playerRef}
        controlsEnabled={!openStation}
        onCanvasReady={(canvas) => {
          canvasRef.current = canvas;
        }}
        onOpenStation={openWorkstation}
      />
      <Hud worldName={world.name} />
      <CraftingPanel
        open={Boolean(openStation)}
        station={openStation || "inventory"}
        onClose={closeStation}
      />
      <PauseOverlay
        open={!pointerLocked && !openStation}
        onResume={requestResume}
        onSave={saveWorld}
        onSaveAndExit={saveAndExit}
      />
    </Box>
  );
}
