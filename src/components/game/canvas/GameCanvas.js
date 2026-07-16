import React, { memo, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
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

function GameCanvas({ playerRef, simulationEnabled, onCanvasReady, onOpenStation, onTerrainError }) {
  const profile = useMemo(getPerformanceProfile, []);
  const blockTargetRef = useRef(null);
  const mobTargetRef = useRef(null);
  const miningVisualRef = useRef(null);
  const actionAnimationRef = useRef(null);
  const mountRef = useRef(null);

  return (
    <div className="game-canvas-wrap">
      <Canvas
        frameloop={simulationEnabled ? "always" : "demand"}
        shadows={false}
        camera={{ fov: 72, near: 0.05, far: profile.cameraFar }}
        dpr={getInitialPixelRatio(profile)}
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
        <PerformanceGovernor enabled={simulationEnabled} />
        <DayNightCycle enabled={simulationEnabled} />
        <ChunkStreamer
          playerRef={playerRef}
          enabled={simulationEnabled}
          onStreamError={onTerrainError}
        />
        <WorldRenderer
          targetRef={blockTargetRef}
          miningVisualRef={miningVisualRef}
          playerRef={playerRef}
        />
        <LiquidSystem enabled={simulationEnabled} />
        <ShoreWaveSystem />
        <ParticleSystem />
        <MobSystem
          playerRef={playerRef}
          targetRef={mobTargetRef}
          mountRef={mountRef}
          enabled={simulationEnabled}
        />
        <PlayerController
          playerRef={playerRef}
          mountRef={mountRef}
          controlsEnabled={simulationEnabled}
        />
        <FirstPersonViewModel actionAnimationRef={actionAnimationRef} enabled={simulationEnabled} />
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
