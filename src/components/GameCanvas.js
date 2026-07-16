import React, { memo, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import DayNightCycle from "../game/DayNightCycle";
import ChunkStreamer from "../game/ChunkStreamer";
import InteractionController from "../game/InteractionController";
import FirstPersonViewModel from "../game/FirstPersonViewModel";
import MobSystem from "../game/MobSystem";
import PerformanceGovernor from "../game/PerformanceGovernor";
import PlayerController from "../game/PlayerController";
import WorldRenderer from "../game/WorldRenderer";
import { getInitialPixelRatio, getPerformanceProfile } from "../game/performanceProfile";

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
