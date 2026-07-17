import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import DayNightCycle from "../../../game/systems/DayNightCycle";
import ChunkStreamer from "../../../game/world/streaming/ChunkStreamer";
import InteractionController from "../../../game/systems/InteractionController";
import FirstPersonViewModel from "../../../game/player/FirstPersonViewModel";
import MobSystem from "../../../game/entities/MobSystem";
import PerformanceGovernor from "../../../game/systems/PerformanceGovernor";
import PlayerController from "../../../game/player/PlayerController";
import WorldRenderer from "../../../game/world/rendering/WorldRenderer";
import { getInitialPixelRatio, getPerformanceProfile } from "../../../game/config/performanceProfile";
import ParticleSystem from "../../../game/particles/ParticleSystem";
import LiquidSystem from "../../../game/liquids/LiquidSystem";
import ShoreWaveSystem from "../../../game/ocean/ShoreWaveSystem";
import OceanSwellSystem from "../../../game/ocean/OceanSwellSystem";
import VolcanoEruptionSystem from "../../../game/ocean/VolcanoEruptionSystem";
import ViewportController from "./ViewportController";
import VoxelSky from "../../../game/world/rendering/VoxelSky";
import ColonySystem from "../../../game/colonies/ColonySystem";
import FarmSystem from "../../../game/farming/FarmSystem";
import FishingSystem from "../../../game/fishing/FishingSystem";
import ItemDropSystem from "../../../game/items/drops/ItemDropSystem";
import ProjectileSystem from "../../../game/projectiles/ProjectileSystem";
import WeatherSystem from "../../../game/weather/WeatherSystem";
import RemotePlayersLayer from "../../multiplayer/RemotePlayersLayer";
import ArcaneSystem from "../../../game/arcana/ArcaneSystem";
import ArcaneEffects from "../../../game/arcana/ArcaneEffects";
import HousingSystem from "../../../game/housing/HousingSystem";
import BossSystem from "../../../game/bosses/BossSystem";


function PausedWorldFrameKeeper({ active }) {
  const { gl, invalidate } = useThree();

  useEffect(() => {
    if (!active) return undefined;
    const refresh = () => {
      if (!gl.isContextLost?.()) invalidate();
    };
    refresh();
    const timer = window.setInterval(refresh, 160);
    window.addEventListener("resize", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("resize", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [active, gl, invalidate]);

  return null;
}

function GameCanvas({
  playerRef,
  simulationEnabled,
  terrainReady,
  bootstrapRadius = 0,
  viewModelVisible,
  onCanvasReady,
  onChunkRendered,
  onChunkUnmounted,
  onTerrainRenderable,
  onTerrainUnavailable,
  onOpenStation,
  onTerrainError,
}) {
  const profile = useMemo(getPerformanceProfile, []);
  const blockTargetRef = useRef(null);
  const mobTargetRef = useRef(null);
  const miningVisualRef = useRef(null);
  const actionAnimationRef = useRef(null);
  const mountRef = useRef(null);
  const [renderWarmup, setRenderWarmup] = useState(true);
  const streamingEnabled = terrainReady && (simulationEnabled || profile.continueStreamingWhilePaused);

  useEffect(() => {
    if (!terrainReady) {
      setRenderWarmup(true);
      return undefined;
    }
    const timer = window.setTimeout(() => setRenderWarmup(false), 1800);
    return () => window.clearTimeout(timer);
  }, [terrainReady]);

  return (
    <div className="game-canvas-wrap">
      <Canvas
        frameloop={simulationEnabled || !terrainReady || renderWarmup ? "always" : "demand"}
        shadows={false}
        camera={{ fov: profile.cameraFov, near: 0.05, far: profile.cameraFar }}
        dpr={getInitialPixelRatio(profile)}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", touchAction: "none" }}
        resize={{ scroll: false, debounce: { scroll: 0, resize: 0 } }}
        gl={{
          antialias: false,
          alpha: false,
          depth: true,
          stencil: false,
          powerPreference: "high-performance",
          precision: "mediump",
          preserveDrawingBuffer: false,
        }}
        onCreated={({ gl, scene }) => {
          gl.domElement.id = "voxel-game-canvas";
          gl.domElement.tabIndex = 0;
          gl.domElement.style.imageRendering = "pixelated";
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.NoToneMapping;
          gl.info.autoReset = true;
          scene.matrixWorldAutoUpdate = true;
          onCanvasReady(gl.domElement);
        }}
      >
        <ViewportController />
        <PausedWorldFrameKeeper active={!simulationEnabled && terrainReady} />
        <PerformanceGovernor enabled={simulationEnabled} />
        <VoxelSky />
        <DayNightCycle enabled={simulationEnabled} />
        <ChunkStreamer
          playerRef={playerRef}
          enabled={streamingEnabled}
          bootstrapRadius={bootstrapRadius}
          onStreamError={onTerrainError}
        />
        <WorldRenderer
          targetRef={blockTargetRef}
          miningVisualRef={miningVisualRef}
          playerRef={playerRef}
          onChunkRendered={onChunkRendered}
          onChunkUnmounted={onChunkUnmounted}
          onTerrainRenderable={onTerrainRenderable}
          onTerrainUnavailable={onTerrainUnavailable}
          interactionEnabled={simulationEnabled}
        />
        <LiquidSystem enabled={simulationEnabled} />
        <OceanSwellSystem playerRef={playerRef} enabled={simulationEnabled} />
        <ShoreWaveSystem />
        <VolcanoEruptionSystem playerRef={playerRef} enabled={simulationEnabled} />
        <WeatherSystem playerRef={playerRef} enabled={simulationEnabled} />
        <FarmSystem active={terrainReady} />
        <ColonySystem enabled={simulationEnabled} />
        <HousingSystem enabled={simulationEnabled} />
        <BossSystem playerRef={playerRef} enabled={simulationEnabled} />
        <ParticleSystem />
        <ArcaneSystem enabled={simulationEnabled} />
        <ArcaneEffects />
        <ItemDropSystem playerRef={playerRef} enabled={simulationEnabled} />
        <ProjectileSystem />
        <FishingSystem enabled={simulationEnabled} />
        <MobSystem
          playerRef={playerRef}
          targetRef={mobTargetRef}
          mountRef={mountRef}
          enabled={simulationEnabled}
        />
        <RemotePlayersLayer />
        <PlayerController
          playerRef={playerRef}
          mountRef={mountRef}
          controlsEnabled={simulationEnabled}
          worldReady={terrainReady}
        />
        <FirstPersonViewModel
          actionAnimationRef={actionAnimationRef}
          visible={viewModelVisible}
          animateEnabled={simulationEnabled}
        />
        <InteractionController
          blockTargetRef={blockTargetRef}
          mobTargetRef={mobTargetRef}
          miningVisualRef={miningVisualRef}
          playerRef={playerRef}
          actionAnimationRef={actionAnimationRef}
          enabled={simulationEnabled}
          onOpenStation={onOpenStation}
        />
      </Canvas>
    </div>
  );
}

export default memo(GameCanvas);
